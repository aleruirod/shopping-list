import asyncio
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

CATEGORY_MAP = {
    "dairy": "Dairy",
    "milk": "Dairy",
    "cheese": "Dairy",
    "yogurt": "Dairy",
    "butter": "Dairy",
    "cream": "Dairy",
    "fromage": "Dairy",
    "bakery": "Bakery",
    "bread": "Bakery",
    "baguette": "Bakery",
    "croissant": "Bakery",
    "cake": "Bakery",
    "pastry": "Bakery",
    "cookie": "Bakery",
    "biscuit": "Bakery",
    "cereal": "Bakery",
    "meat": "Meat & Fish",
    "fish": "Meat & Fish",
    "chicken": "Meat & Fish",
    "beef": "Meat & Fish",
    "pork": "Meat & Fish",
    "lamb": "Meat & Fish",
    "salmon": "Meat & Fish",
    "tuna": "Meat & Fish",
    "ham": "Meat & Fish",
    "fruit": "Fruit & Veg",
    "vegetable": "Fruit & Veg",
    "veg": "Fruit & Veg",
    "apple": "Fruit & Veg",
    "banana": "Fruit & Veg",
    "tomato": "Fruit & Veg",
    "lettuce": "Fruit & Veg",
    "carrot": "Fruit & Veg",
    "salad": "Fruit & Veg",
    "frozen": "Frozen",
    "ice cream": "Frozen",
    "ice-cream": "Frozen",
    "pizza": "Frozen",
    "meal": "Frozen",
    "drink": "Drinks",
    "beverage": "Drinks",
    "juice": "Drinks",
    "soda": "Drinks",
    "water": "Drinks",
    "coffee": "Drinks",
    "tea": "Drinks",
    "beer": "Drinks",
    "wine": "Drinks",
    "snack": "Snacks",
    "chips": "Snacks",
    "crisps": "Snacks",
    "chocolate": "Snacks",
    "candy": "Snacks",
    "cracker": "Snacks",
    "granola": "Snacks",
    "bar": "Snacks",
    "cleaning": "Household",
    "detergent": "Household",
    "soap": "Household",
    "paper": "Household",
    "toilet": "Household",
    "disinfectant": "Household",
    "shampoo": "Personal Care",
    "conditioner": "Personal Care",
    "toothpaste": "Personal Care",
    "razor": "Personal Care",
    "lotion": "Personal Care",
    "deodorant": "Personal Care",
}


def normalize_category(raw: str):
    if not raw:
        return None
    raw = raw.lower().replace("-", " ").replace("_", " ")
    for keyword, category in CATEGORY_MAP.items():
        if keyword in raw:
            return category
    return None


async def fetch_json_with_retries(url: str, max_attempts: int = 3, timeout: float = 5.0):
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            last_error = exc
            if attempt < max_attempts:
                await asyncio.sleep(0.25 * attempt)
                continue
    raise last_error


def infer_category_from_product(product: dict):
    search_fields = [
        product.get("pnns_groups_1", ""),
        product.get("categories", ""),
        product.get("categories_tags", ""),
        product.get("brands", ""),
        product.get("product_name_en", ""),
        product.get("product_name", ""),
    ]
    for field in search_fields:
        category = normalize_category(field)
        if category:
            return category
    return None


async def lookup_open_food_facts(barcode: str):
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    try:
        data = await fetch_json_with_retries(url)
    except Exception:
        return None

    if data.get("status") == 1:
        product = data["product"]
        name = (
            product.get("product_name_en")
            or product.get("product_name_fr")
            or product.get("product_name_nl")
            or product.get("product_name")
            or ""
        ).strip()
        brand = product.get("brands", "").split(",")[0].strip()
        full_name = f"{brand} {name}".strip() if brand else name
        if not full_name:
            return None
        category = infer_category_from_product(product) or "Other"
        return {"name": full_name, "category": category, "source": "openfoodfacts"}
    return None


async def lookup_upc(barcode: str):
    url = f"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}"
    try:
        data = await fetch_json_with_retries(url)
    except Exception:
        return None

    items = data.get("items", [])
    if items:
        item = items[0]
        category = normalize_category(item.get("category", "")) or "Other"
        return {
            "name": item.get("title", "Unknown"),
            "category": category,
            "source": "upcitemdb"
        }
    return None


@router.get("/{barcode}")
async def scan_barcode(barcode: str):
    result = await lookup_open_food_facts(barcode)
    if result and result["name"]:
        return result

    result = await lookup_upc(barcode)
    if result and result["name"]:
        return result

    raise HTTPException(
        status_code=404,
        detail="Product not found. Please enter the name manually."
    )
