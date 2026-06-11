from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from database import Base

CATEGORIES = [
    "Dairy", "Bakery", "Meat & Fish", "Fruit & Veg",
    "Frozen", "Drinks", "Snacks", "Household", "Personal Care", "Other"
]

KEYWORD_MAP = {
    "milk": "Dairy", "cheese": "Dairy", "yogurt": "Dairy", "butter": "Dairy", "cream": "Dairy",
    "bread": "Bakery", "baguette": "Bakery", "croissant": "Bakery", "cake": "Bakery",
    "chicken": "Meat & Fish", "beef": "Meat & Fish", "salmon": "Meat & Fish", "tuna": "Meat & Fish",
    "apple": "Fruit & Veg", "banana": "Fruit & Veg", "tomato": "Fruit & Veg", "lettuce": "Fruit & Veg",
    "frozen": "Frozen", "ice cream": "Frozen",
    "water": "Drinks", "juice": "Drinks", "beer": "Drinks", "wine": "Drinks", "soda": "Drinks",
    "chips": "Snacks", "chocolate": "Snacks", "biscuit": "Snacks", "cookie": "Snacks",
    "detergent": "Household", "soap": "Household", "toilet": "Household", "cleaning": "Household",
    "shampoo": "Personal Care", "toothpaste": "Personal Care", "razor": "Personal Care",
}

def guess_category(name: str) -> str:
    name_lower = name.lower()
    for keyword, category in KEYWORD_MAP.items():
        if keyword in name_lower:
            return category
    return "Other"

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, default="Other")
    quantity = Column(Integer, default=1)
    unit = Column(String, default="")
    checked = Column(Boolean, default=False)
    barcode = Column(String, nullable=True)
    photo = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
