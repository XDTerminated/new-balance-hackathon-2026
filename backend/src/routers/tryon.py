import traceback
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from src.services.image_gen import generate_tryon, TRYON_AVAILABLE
from src.routers.search import outfit_sessions

router = APIRouter()


@router.post("/tryon")
async def virtual_tryon(
    person_image: UploadFile = File(...),
    outfit_id: str = Form(...),
):
    if not TRYON_AVAILABLE:
        raise HTTPException(status_code=503, detail="Virtual try-on not available.")

    session = outfit_sessions.get(outfit_id)
    if not session:
        raise HTTPException(status_code=404, detail="Outfit session not found. Search for a vibe first.")

    # Find the best item for try-on (tops work best with IDM-VTON)
    target_item = None
    for slot_priority in ["top", "bottom", "shoes", "accessory"]:
        for item in session["items"]:
            if item.slot == slot_priority and item.product.image:
                target_item = item
                break
        if target_item:
            break

    if not target_item or not target_item.product.image:
        raise HTTPException(status_code=400, detail="No item with image found for try-on")

    try:
        image_bytes = await person_image.read()
        image_url = await generate_tryon(
            person_image_bytes=image_bytes,
            garment_image_url=target_item.product.image,
            garment_description=f"{target_item.product.name}",
        )
        return {"image_url": image_url}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Try-on generation failed: {str(e)}")
