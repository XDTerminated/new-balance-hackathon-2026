import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend/ dir regardless of where uvicorn is started from
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DATABASE_PATH = str(_backend_dir / "feedback.db")
CATALOG_PATH = str(_backend_dir.parent / "catalog" / "products.json")
