import aiosqlite
from src.config import DATABASE_PATH


async def init_db():
    """Create the feedback table if it doesn't exist."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                outfit_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                message TEXT NOT NULL,
                vibe_context TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()


async def save_feedback(outfit_id: str, product_id: str, message: str, vibe_context: str) -> int:
    """Save a feedback ticket. Returns the ticket ID."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO feedback (outfit_id, product_id, message, vibe_context) VALUES (?, ?, ?, ?)",
            (outfit_id, product_id, message, vibe_context),
        )
        await db.commit()
        return cursor.lastrowid
