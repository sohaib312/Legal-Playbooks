"""
NDA Guardrail - Backend API
Legal Redline Assistant using Groq, Supabase pgvector, and local embeddings
"""

import os
from dotenv import load_dotenv

# Load .env file FIRST before accessing env variables
load_dotenv()

import json
import re
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client
from groq import Groq

# Initialize FastAPI
app = FastAPI(title="NDA Guardrail API", version="1.0.0")

# CORS for Next.js frontend (includes Vercel deployment URLs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients (use environment variables)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY]):
    raise ValueError("Missing required environment variables: SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)

# Load embedding model locally (free, no API cost)
print("Loading embedding model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
print("Embedding model loaded!")


# Request/Response Models
class NDARequest(BaseModel):
    nda_text: str


class RiskItem(BaseModel):
    clause: str
    issue: str
    fix: str
    severity: str = "medium"


class RiskReport(BaseModel):
    risks: List[RiskItem]
    summary: str


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """
    Split NDA text into overlapping chunks for analysis.
    Uses sentence-aware splitting for better context preservation.
    """
    # Clean the text
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Split by sentences first
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= chunk_size:
            current_chunk += " " + sentence if current_chunk else sentence
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    # If no good sentence splits, fall back to character-based chunking
    if len(chunks) == 0 or (len(chunks) == 1 and len(chunks[0]) > chunk_size * 2):
        chunks = []
        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i:i + chunk_size]
            if chunk.strip():
                chunks.append(chunk.strip())
    
    return chunks


def generate_embedding(text: str) -> List[float]:
    """Generate embedding using local sentence-transformers model."""
    embedding = embedding_model.encode(text, convert_to_numpy=True)
    return embedding.tolist()


async def search_playbook_rules(query_embedding: List[float], top_k: int = 5) -> List[dict]:
    """
    Search Supabase for similar 'Market Standard' rules using pgvector.
    Requires a function in Supabase: match_legal_rules
    """
    try:
        # Call the Supabase RPC function for similarity search
        response = supabase.rpc(
            'match_legal_rules',
            {
                'query_embedding': query_embedding,
                'match_count': top_k,
                'match_threshold': 0.3
            }
        ).execute()
        
        return response.data if response.data else []
    except Exception as e:
        print(f"Error searching playbook: {e}")
        return []


def analyze_with_groq(nda_chunks: List[str], relevant_rules: List[dict]) -> dict:
    """
    Use Groq's Llama model to analyze NDA against market standard rules.
    Returns structured risk report.
    """
    # Format the rules for the prompt
    rules_text = "\n".join([
        f"- Rule: {rule.get('rule_name', 'Unknown')}\n"
        f"  Standard: {rule.get('standard_clause', '')}\n"
        f"  Red Flags: {rule.get('red_flags', '')}"
        for rule in relevant_rules
    ])
    
    # Combine NDA chunks
    nda_text = "\n\n".join(nda_chunks)
    
    prompt = f"""You are a legal expert specializing in NDA (Non-Disclosure Agreement) review. 
Analyze the following NDA text against the Market Standard Playbook rules provided.

MARKET STANDARD PLAYBOOK RULES:
{rules_text}

NDA TEXT TO ANALYZE:
{nda_text}

INSTRUCTIONS:
1. Identify clauses that deviate from market standards or contain potential risks
2. Focus on: indemnity traps, non-solicitation overreach, overbroad confidentiality definitions, 
   unreasonable term lengths, one-sided obligations, IP assignment issues, and jurisdiction concerns
3. For each risk found, provide:
   - The problematic clause (quote directly)
   - The specific issue/risk
   - A suggested fix or negotiation point
   - Severity level (high, medium, low)

Respond ONLY with valid JSON in this exact format:
{{
    "risks": [
        {{
            "clause": "exact problematic text from the NDA",
            "issue": "explanation of the risk",
            "fix": "suggested revision or negotiation point",
            "severity": "high|medium|low"
        }}
    ],
    "summary": "brief overall assessment of the NDA"
}}

If no significant risks are found, return an empty risks array with a positive summary.
"""

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a legal NDA expert. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )
        
        response_text = chat_completion.choices[0].message.content
        return json.loads(response_text)
    
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return {
            "risks": [],
            "summary": "Error parsing AI response. Please try again."
        }
    except Exception as e:
        print(f"Groq API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "healthy", "service": "NDA Guardrail API"}


@app.post("/analyze", response_model=RiskReport)
async def analyze_nda(request: NDARequest):
    """
    Main endpoint: Analyze NDA text for risks.
    
    Flow:
    1. Chunk the NDA text
    2. Generate embeddings for each chunk
    3. Query Supabase for matching playbook rules
    4. Use Groq to analyze and generate risk report
    """
    if not request.nda_text or len(request.nda_text.strip()) < 50:
        raise HTTPException(
            status_code=400, 
            detail="NDA text is too short. Please provide a complete NDA document."
        )
    
    # Step 1: Chunk the text
    chunks = chunk_text(request.nda_text)
    print(f"Created {len(chunks)} chunks from NDA text")
    
    # Step 2: Generate embeddings and collect relevant rules
    all_relevant_rules = []
    seen_rule_ids = set()
    
    for chunk in chunks:
        embedding = generate_embedding(chunk)
        rules = await search_playbook_rules(embedding, top_k=3)
        
        for rule in rules:
            rule_id = rule.get('id')
            if rule_id and rule_id not in seen_rule_ids:
                seen_rule_ids.add(rule_id)
                all_relevant_rules.append(rule)
    
    print(f"Found {len(all_relevant_rules)} relevant playbook rules")
    
    # Step 3: Analyze with Groq
    risk_report = analyze_with_groq(chunks, all_relevant_rules)
    
    # Step 4: Return structured response
    return RiskReport(
        risks=[RiskItem(**risk) for risk in risk_report.get("risks", [])],
        summary=risk_report.get("summary", "Analysis complete.")
    )


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "embedding_model": "all-MiniLM-L6-v2",
        "llm_model": "llama-3.3-70b-versatile",
        "database": "supabase"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
