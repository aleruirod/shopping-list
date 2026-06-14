from fastapi import APIRouter, Depends, HTTPException
from fastapi import status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Item, guess_category
from storage import upload_data_url, is_storage_configured

router = APIRouter()

class ItemCreate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: int = 1
    unit: str = ""
    barcode: Optional[str] = None
    photo: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    checked: Optional[bool] = None
    photo: Optional[str] = None

@router.get("/")
def list_items(db: Session = Depends(get_db)):
    return db.query(Item).order_by(Item.category, Item.name).all()

@router.post("/", status_code=201)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    # allow creating items with only a photo (no name)
    name = item.name or ""
    category = item.category or guess_category(name)
    photo = item.photo
    if photo and photo.startswith("data:image/") and is_storage_configured():
        try:
            photo = upload_data_url(photo)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    # build payload for DB: ensure name is set (may be empty string)
    payload = item.dict(exclude={"category", "photo"})
    payload['name'] = name
    db_item = Item(**payload, category=category, photo=photo)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.patch("/{item_id}")
def update_item(item_id: int, update: ItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    update_data = update.dict(exclude_none=True)
    if "photo" in update_data and update_data["photo"] and update_data["photo"].startswith("data:image/") and is_storage_configured():
        try:
            update_data["photo"] = upload_data_url(update_data["photo"])
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
    for field, value in update_data.items():
        setattr(db_item, field, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()

@router.delete("/checked/all", status_code=204)
def delete_checked(db: Session = Depends(get_db)):
    db.query(Item).filter(Item.checked == True).delete()
    db.commit()
