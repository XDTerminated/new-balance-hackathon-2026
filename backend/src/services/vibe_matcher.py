import json
from groq import AsyncGroq
from src.config import GROQ_API_KEY

_client = None


def get_client():
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=GROQ_API_KEY)
    return _client


SYSTEM_PROMPT = """You are a fashion stylist. Pick exactly 4 products from the list to build an outfit matching the user's vibe.

Rules:
- Pick exactly 1 shoe, 1 top, 1 bottom, 1 accessory
- ONLY use product names that appear in the provided list. Do not invent names.
- Each "product_name" must be copy-pasted exactly from the list
- Keep "reason" under 15 words

Return valid JSON only:
{"vibe_interpretation":"...", "items":[{"slot":"shoes","product_name":"...","reason":"..."},{"slot":"top","product_name":"...","reason":"..."},{"slot":"bottom","product_name":"...","reason":"..."},{"slot":"accessory","product_name":"...","reason":"..."}]}"""


async def match_vibe_to_outfit(vibe: str, products: list[dict]) -> dict:
    """Send products + vibe to Groq (Llama), get outfit picks."""
    # Group products by category so the LLM sees clear sections
    by_cat = {}
    for p in products:
        cat = p.get("category", "unknown")
        by_cat.setdefault(cat, []).append(p["name"])

    product_text = ""
    for cat in ["shoes", "top", "bottom", "accessory"]:
        names = by_cat.get(cat, [])
        if names:
            product_text += f"\n{cat.upper()}: {', '.join(names)}"

    # If there are unknown items, add them too
    unknown = by_cat.get("unknown", [])
    if unknown:
        product_text += f"\nOTHER: {', '.join(unknown)}"

    client = get_client()
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Products:{product_text}\n\nVibe: \"{vibe}\""},
        ],
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    text = response.choices[0].message.content.strip()
    result = json.loads(text)

    # Deduplicate
    seen = set()
    deduped = []
    for item in result.get("items", []):
        name = item.get("product_name", "")
        if name not in seen:
            seen.add(name)
            deduped.append(item)
    result["items"] = deduped

    return result
