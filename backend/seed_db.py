import os
from dotenv import load_dotenv

# Load .env file FIRST
load_dotenv()

from supabase import create_client
from sentence_transformers import SentenceTransformer

# Get environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Please set SUPABASE_URL and SUPABASE_KEY environment variables")

# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer('all-MiniLM-L6-v2')

# Sample market-standard NDA rules
LEGAL_PLAYBOOK_RULES = [
    {
        "rule_name": "Unlimited Indemnification",
        "category": "Indemnification",
        "standard_language": "Each party shall indemnify the other for direct damages caused by material breach, subject to reasonable liability caps.",
        "risk_description": "Unlimited indemnification exposes your company to uncapped financial liability for any breach or claim.",
        "suggested_fix": "Add a liability cap tied to fees paid or a fixed dollar amount (e.g., 'not to exceed 12 months of fees paid')."
    },
    {
        "rule_name": "Broad Indemnity Trigger",
        "category": "Indemnification", 
        "standard_language": "Indemnification should only apply to third-party claims arising from gross negligence or willful misconduct.",
        "risk_description": "Indemnifying for 'any and all claims' including first-party claims creates excessive exposure.",
        "suggested_fix": "Limit indemnification to third-party claims and exclude ordinary negligence."
    },
    {
        "rule_name": "Excessive Non-Solicitation Period",
        "category": "Non-Solicitation",
        "standard_language": "Non-solicitation of employees should be limited to 12 months following termination.",
        "risk_description": "Non-solicitation periods exceeding 12-24 months are considered overreaching and may be unenforceable.",
        "suggested_fix": "Negotiate down to 12 months and limit to employees you directly worked with."
    },
    {
        "rule_name": "Overly Broad Non-Compete",
        "category": "Non-Compete",
        "standard_language": "Non-compete clauses should be narrowly tailored to specific competing products or services.",
        "risk_description": "Broad non-compete language can prevent you from working in your entire industry.",
        "suggested_fix": "Limit non-compete to specific named competitors or narrow product categories."
    },
    {
        "rule_name": "Perpetual Confidentiality",
        "category": "Confidentiality",
        "standard_language": "Confidentiality obligations should survive for 3-5 years after termination, except for trade secrets.",
        "risk_description": "Perpetual or indefinite confidentiality obligations create ongoing compliance burden.",
        "suggested_fix": "Negotiate a 3-5 year term for general confidential information; trade secrets can remain perpetual."
    },
    {
        "rule_name": "Broad Definition of Confidential Information",
        "category": "Confidentiality",
        "standard_language": "Confidential information should be clearly marked or identified in writing within 30 days of disclosure.",
        "risk_description": "Defining 'all information' as confidential makes compliance impossible to track.",
        "suggested_fix": "Require marking of confidential materials or written confirmation for oral disclosures."
    },
    {
        "rule_name": "One-Sided Jurisdiction",
        "category": "Jurisdiction",
        "standard_language": "Disputes should be resolved in a mutually convenient jurisdiction or through neutral arbitration.",
        "risk_description": "Exclusive jurisdiction in the other party's home state increases your litigation costs.",
        "suggested_fix": "Negotiate for your home jurisdiction, defendant's jurisdiction, or neutral arbitration."
    },
    {
        "rule_name": "IP Assignment Without Compensation",
        "category": "Intellectual Property",
        "standard_language": "Any IP assignment should be limited to jointly developed IP and include fair compensation.",
        "risk_description": "Assigning all IP including your pre-existing IP without compensation is overreaching.",
        "suggested_fix": "Carve out pre-existing IP and limit assignment to jointly developed materials only."
    },
    {
        "rule_name": "No Liability Cap",
        "category": "Liability",
        "standard_language": "Total liability should be capped at fees paid in the prior 12 months or a negotiated fixed amount.",
        "risk_description": "Absence of liability caps exposes you to unlimited damages claims.",
        "suggested_fix": "Add mutual liability caps (e.g., 'neither party's liability shall exceed $X or fees paid')."
    },
    {
        "rule_name": "Unilateral Termination Rights",
        "category": "Termination",
        "standard_language": "Both parties should have equal rights to terminate with reasonable notice (30-90 days).",
        "risk_description": "One-sided termination rights without cause create unfair power imbalance.",
        "suggested_fix": "Ensure mutual termination rights with equal notice periods."
    },
    {
        "rule_name": "Automatic Renewal Without Notice",
        "category": "Term",
        "standard_language": "Auto-renewal should require advance notice (60-90 days) and allow opt-out.",
        "risk_description": "Automatic renewal without opt-out notice locks you into unwanted contract extensions.",
        "suggested_fix": "Add requirement for renewal notice and right to decline renewal."
    },
    {
        "rule_name": "Waiver of Jury Trial",
        "category": "Dispute Resolution",
        "standard_language": "Jury trial waivers should be mutual and clearly disclosed.",
        "risk_description": "Waiving jury trial rights may limit your legal remedies in disputes.",
        "suggested_fix": "Ensure waiver is mutual or negotiate to preserve jury trial rights."
    }
]

def seed_database():
    """Seed the legal_playbooks table with sample rules."""
    print("🚀 Starting database seeding...")
    print("📦 Loading embedding model (this may take a moment on first run)...")
    
    for i, rule in enumerate(LEGAL_PLAYBOOK_RULES):
        # Generate embedding from combined text
        text_to_embed = f"{rule['rule_name']} {rule['category']} {rule['standard_language']} {rule['risk_description']}"
        embedding = model.encode(text_to_embed).tolist()
        
        # Insert into Supabase
        data = {
            "rule_name": rule["rule_name"],
            "category": rule["category"],
            "standard_language": rule["standard_language"],
            "risk_description": rule["risk_description"],
            "suggested_fix": rule["suggested_fix"],
            "embedding": embedding
        }
        
        result = supabase.table("legal_playbooks").insert(data).execute()
        print(f"✅ Inserted rule {i+1}/{len(LEGAL_PLAYBOOK_RULES)}: {rule['rule_name']}")
    
    print(f"\n🎉 Successfully seeded {len(LEGAL_PLAYBOOK_RULES)} legal playbook rules!")

if __name__ == "__main__":
    seed_database()