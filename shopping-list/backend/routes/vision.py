import os, base64, json, httpx
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

async def call_claude_vision(image_b64: str, media_type: str, prompt: str) -> str:
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 512,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_b64}},
                {"type": "text", "text": prompt}
            ]
        }]
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.post("https://api.anthropic.com/v1/messages", json=body, headers=headers)
    r.raise_for_status()
    return r.json()["content"][0]["text"]

@router.post("/recognize")
async def recognize_object(file: UploadFile = File(...)):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    data = await file.read()
    b64 = base64.b64encode(data).decode()
    media_type = file.content_type or "image/jpeg"
    prompt = (
        "Look at this image and identify the main grocery or household product visible. "
        "Return ONLY a JSON object with keys: name (string, short product name), "
        "category (one of: Dairy, Bakery, Meat & Fish, Fruit & Veg, Frozen, Drinks, Snacks, Household, Personal Care, Other). "
        "Example: {\"name\": \"Whole milk\", \"category\": \"Dairy\"}. No other text."
    )
    try:
        text = await call_claude_vision(b64, media_type, prompt)
        result = json.loads(text.strip())
        return {"name": result.get("name", ""), "category": result.get("category", "Other"), "source": "vision"}
    except Exception:
        raise HTTPException(status_code=422, detail="Could not identify the product. Try again or enter manually.")

@router.post("/handwriting")
async def transcribe_handwriting(file: UploadFile = File(...)):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
    data = await file.read()
    b64 = base64.b64encode(data).decode()
    media_type = file.content_type or "image/jpeg"
    prompt = (
        "This image contains a handwritten shopping list. "
        "Transcribe every item you can read. "
        "Return ONLY a JSON array of objects, each with: name (string) and category "
        "(one of: Dairy, Bakery, Meat & Fish, Fruit & Veg, Frozen, Drinks, Snacks, Household, Personal Care, Other). "
        "Example: [{\"name\": \"Eggs\", \"category\": \"Dairy\"}, {\"name\": \"Pasta\", \"category\": \"Other\"}]. "
        "No other text, just the JSON array."
    )
    try:
        text = await call_claude_vision(b64, media_type, prompt)
        items = json.loads(text.strip())
        if not isinstance(items, list):
            raise ValueError("Expected a list")
        return {"items": items, "source": "handwriting"}
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read the handwriting. Try a clearer photo.")
