from fastapi import APIRouter
from src.models import FeedbackRequest
from src.services.feedback_store import save_feedback

router = APIRouter()


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest):
    ticket_id = await save_feedback(
        outfit_id=req.outfit_id,
        product_id=req.product_id,
        message=req.message,
        vibe_context=req.vibe_context,
    )
    return {"ticket_id": ticket_id, "status": "received"}
