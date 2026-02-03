# 🛡️ NDA Guardrail

**AI-Powered Legal Redline Assistant** - Analyze NDAs against market standard terms to identify risks and get suggested fixes.

## Features

- 📄 **Paste & Analyze**: Simply paste your NDA text to get instant risk analysis
- 🔍 **Smart Comparison**: Compares clauses against a "Market Standard Playbook" using vector similarity
- ⚠️ **Risk Detection**: Identifies common traps like indemnity issues, non-solicitation overreach, and more
- ✅ **Suggested Fixes**: Get actionable recommendations to negotiate better terms
- 🆓 **Zero-Cost AI**: Uses free tiers of Groq, Supabase, and local embeddings

## Tech Stack

### Backend
- **Python FastAPI** - Modern, fast web framework
- **Groq** - LLama 3.3 70B for AI reasoning (free tier)
- **Supabase** - PostgreSQL with pgvector for similarity search (free tier)
- **Sentence Transformers** - Local embeddings with `all-MiniLM-L6-v2` (no API cost)

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **CSS-in-JS** - Styled components for dark mode UI

## Getting Started

### Prerequisites

1. **Supabase Account** (free): https://supabase.com
2. **Groq API Key** (free): https://console.groq.com
3. **Python 3.10+**
4. **Node.js 18+**

### 1. Setup Supabase Database

1. Create a new Supabase project
2. Go to **SQL Editor** and run the following:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the legal_playbooks table
CREATE TABLE IF NOT EXISTS legal_playbooks (
    id BIGSERIAL PRIMARY KEY,
    rule_name TEXT NOT NULL,
    category TEXT NOT NULL,
    standard_clause TEXT NOT NULL,
    red_flags TEXT NOT NULL,
    suggested_language TEXT,
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS legal_playbooks_embedding_idx 
ON legal_playbooks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create the similarity search function
CREATE OR REPLACE FUNCTION match_legal_playbooks(
    query_embedding vector(384),
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id BIGINT,
    rule_name TEXT,
    category TEXT,
    standard_clause TEXT,
    red_flags TEXT,
    suggested_language TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        lp.id,
        lp.rule_name,
        lp.category,
        lp.standard_clause,
        lp.red_flags,
        lp.suggested_language,
        1 - (lp.embedding <=> query_embedding) AS similarity
    FROM legal_playbooks lp
    WHERE 1 - (lp.embedding <=> query_embedding) > match_threshold
    ORDER BY lp.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
```

### 2. Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your Supabase and Groq credentials

# Seed the database with sample rules
python seed_db.py

# Start the server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.local.example .env.local
# Edit if backend is not on localhost:8000

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## API Endpoints

### `POST /analyze`

Analyze NDA text for risks.

**Request:**
```json
{
  "nda_text": "Your NDA text here..."
}
```

**Response:**
```json
{
  "risks": [
    {
      "clause": "problematic text from the NDA",
      "issue": "explanation of the risk",
      "fix": "suggested revision",
      "severity": "high|medium|low"
    }
  ],
  "summary": "overall assessment"
}
```

### `GET /health`

Health check endpoint.

## Market Standard Rules

The playbook includes rules for:

- 🔴 **Indemnification** - One-sided or uncapped liability
- 📅 **Confidentiality Term** - Perpetual or excessive duration
- 📝 **Definition of Confidential Info** - Overbroad definitions
- 👥 **Non-Solicitation** - Overreaching employee restrictions
- 🚫 **Non-Compete** - Clauses that don't belong in NDAs
- 🌍 **Jurisdiction** - Inconvenient forum selection
- 📤 **Permitted Disclosures** - Missing standard exceptions
- 💡 **Residuals** - Missing knowledge retention rights
- ⏰ **Term & Termination** - No exit rights
- 📦 **Return of Materials** - Unreasonable requirements
- 💼 **IP Rights** - Hidden IP assignments
- ⚖️ **Liability Limits** - Missing damage caps

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
GROQ_API_KEY=your-groq-api-key
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Cost Breakdown

| Service | Usage | Cost |
|---------|-------|------|
| Groq API | 14,400 requests/day free | $0 |
| Supabase | 500MB database, 2GB bandwidth | $0 |
| Sentence Transformers | Runs locally | $0 |
| Vercel (optional) | Hobby tier hosting | $0 |

**Total: $0/month** 🎉

## Disclaimer

⚠️ **This tool is for informational purposes only and does not constitute legal advice.** Always consult with a qualified attorney for legal matters.

## License

MIT
