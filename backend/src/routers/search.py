import uuid
import random
from fastapi import APIRouter
from src.models import SearchRequest, SearchResponse, OutfitItem, Product
from src.services.vibe_matcher import match_vibe_to_outfit
from src.services.catalog import load_catalog

router = APIRouter()

# In-memory outfit session store
outfit_sessions: dict = {}

REQUIRED_SLOTS = ["shoes", "top", "bottom", "accessory"]

# Keywords to classify products into slots when category is unknown
SLOT_KEYWORDS = {
    "shoes": ["shoe", "sneaker", "runner", "574", "990", "550", "530", "1080", "1906", "2002", "9060", "foam", "boot"],
    "top": ["hoodie", "hoody", "jacket", "tee", "t-shirt", "shirt", "crewneck", "crew neck", "windbreaker", "pullover", "sweater", "fleece", "tank", "polo", "vest", "long sleeve", "top"],
    "bottom": ["pant", "jogger", "short", "legging", "bottom", "trouser", "cargo", "jean", "sweatpant"],
    "accessory": ["hat", "cap", "beanie", "bag", "backpack", "sock", "belt", "scarf", "glove", "wallet", "watch", "sunglasses", "bucket"],
}


def classify_product(product: dict) -> str:
    """Determine which slot a product belongs to based on category and name/description."""
    cat = product.get("category", "unknown")
    if cat in REQUIRED_SLOTS:
        return cat

    # Category is unknown — classify by keywords in name + description
    text = (product.get("name", "") + " " + product.get("description", "")).lower()
    for slot, keywords in SLOT_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return slot

    return "unknown"


@router.post("/search", response_model=SearchResponse)
async def search_outfit(req: SearchRequest):
    # Use scraped products from extension, fall back to catalog
    products = [p.model_dump() for p in req.products] if req.products else load_catalog()

    if not products:
        raise ValueError("No products available. Browse newbalance.com or add a fallback catalog.")

    # Classify every product into a slot and build index
    product_slots = {}  # product name -> actual slot
    by_slot = {}        # slot -> [products]
    for p in products:
        slot = classify_product(p)
        product_slots[p["name"]] = slot
        by_slot.setdefault(slot, []).append(p)

    # Ask Groq to pick an outfit
    result = await match_vibe_to_outfit(req.vibe, products)

    # Build product lookup by name
    product_map = {p["name"]: p for p in products}

    # Map LLM picks — use the PRODUCT'S real slot, not what the LLM says
    items_by_slot = {}
    used_names = set()

    for pick in result.get("items", []):
        name = pick.get("product_name", "")
        if name in used_names or name not in product_map:
            continue

        # Use the product's actual category, not the LLM's slot label
        real_slot = product_slots.get(name, "unknown")
        if real_slot not in REQUIRED_SLOTS or real_slot in items_by_slot:
            continue

        items_by_slot[real_slot] = OutfitItem(
            slot=real_slot,
            product=Product(**product_map[name]),
            reason=pick.get("reason", ""),
        )
        used_names.add(name)

    # Fill any missing slots with a random product from that slot
    for slot in REQUIRED_SLOTS:
        if slot in items_by_slot:
            continue
        candidates = [p for p in by_slot.get(slot, []) if p["name"] not in used_names]
        if candidates:
            pick = random.choice(candidates)
            items_by_slot[slot] = OutfitItem(
                slot=slot,
                product=Product(**pick),
                reason="Auto-selected to complete outfit",
            )
            used_names.add(pick["name"])

    # Build final list in slot order
    items = [items_by_slot[s] for s in REQUIRED_SLOTS if s in items_by_slot]

    outfit_id = str(uuid.uuid4())[:8]

    # Store session for reroll
    outfit_sessions[outfit_id] = {
        "vibe": req.vibe,
        "products": products,
        "items": items,
    }

    return SearchResponse(
        outfit_id=outfit_id,
        vibe_interpretation=result.get("vibe_interpretation", ""),
        items=items,
    )
