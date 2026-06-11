from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from src.backend.database import get_db
from src.backend.models import Item, guess_category

router = APIRouter()

class ItemCreate(BaseModel):
    name: str
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

@router.get("/")
def list_items(db: Session = Depends(get_db)):
    return db.query(Item).order_by(Item.category, Item.name).all()

@router.post("/", status_code=201)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    category = item.category or guess_category(item.name)
    db_item = Item(**item.dict(exclude={"category"}), category=category)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.patch("/{item_id}")
def update_item(item_id: int, update: ItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in update.dict(exclude_none=True).items():
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
