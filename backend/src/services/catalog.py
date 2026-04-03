import json
import os
from src.config import CATALOG_PATH


def load_catalog() -> list[dict]:
    """Load the fallback product catalog from JSON."""
    if not os.path.exists(CATALOG_PATH):
        return []
    with open(CATALOG_PATH, "r") as f:
        return json.load(f)


def filter_by_category(products: list[dict], category: str) -> list[dict]:
    """Filter products by category."""
    return [p for p in products if p.get("category") == category]


def exclude_products(products: list[dict], excluded_names: list[str]) -> list[dict]:
    """Remove products by name."""
    excluded = set(excluded_names)
    return [p for p in products if p.get("name") not in excluded]
