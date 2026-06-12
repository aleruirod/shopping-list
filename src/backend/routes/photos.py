import io
from fastapi import APIRouter, HTTPException
from starlette.responses import StreamingResponse

from storage import get_photo_bytes, is_storage_configured, list_photo_keys

router = APIRouter()

@router.get("/")
def list_photos():
    if not is_storage_configured():
        return []
    return list_photo_keys()

@router.get("/{photo_key:path}")
def get_photo(photo_key: str):
    if not is_storage_configured():
        raise HTTPException(status_code=404, detail="Photo storage is not configured")

    photo = get_photo_bytes(photo_key)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    data, content_type = photo
    return StreamingResponse(io.BytesIO(data), media_type=content_type)
