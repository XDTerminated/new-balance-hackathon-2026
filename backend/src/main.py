import httpx
from pathlib import Path
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from src.routers import search, reroll, feedback, tryon
from src.services.feedback_store import init_db

app = FastAPI(title="New Balance: Try On Your Vibe API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api")
app.include_router(reroll.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(tryon.router, prefix="/api")

# Serve local product images
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
