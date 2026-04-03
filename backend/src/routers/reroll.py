import random
from fastapi import APIRouter, HTTPException
from src.models import RerollRequest, OutfitItem, Product
from src.services.catalog import exclude_products
from src.routers.search import outfit_sessions, classify_product

router = APIRouter()


@router.post("/reroll", response_model=OutfitItem)
async def reroll_item(req: RerollRequest):
    session = outfit_sessions.get(req.outfit_id)
    if not session:
        raise HTTPException(status_code=404, detail="Outfit session not found")

    products = session["products"]

    # Filter to products that actually belong to this slot
    candidates = [p for p in products if classify_product(p) == req.slot]

    # Exclude already-seen products
    candidates = exclude_products(candidates, req.excluded_ids)

    if not candidates:
        raise HTTPException(status_code=404, detail="No more products to try for this slot")

    pick = random.choice(candidates)

    new_item = OutfitItem(
        slot=req.slot,
        product=Product(**pick),
        reason="Rerolled pick",
    )

    # Update session
    for i, item in enumerate(session["items"]):
        if item.slot == req.slot:
            session["items"][i] = new_item
            break

    return new_item
