import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

async def lookup_open_food_facts(barcode: str):
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(url)
        data = r.json()
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
        category = product.get("pnns_groups_1") or product.get("categories", "").split(",")[0].strip()
        return {"name": full_name, "category": category, "source": "openfoodfacts"}
    return None

async def lookup_upc(barcode: str):
    url = f"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}"
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(url)
        data = r.json()
    items = data.get("items", [])
    if items:
        item = items[0]
        return {
            "name": item.get("title", "Unknown"),
            "category": item.get("category", ""),
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
