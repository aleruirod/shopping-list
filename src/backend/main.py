from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import engine, Base
from routes import items, scan

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Shopping List API")

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router, prefix="/items", tags=["items"])
app.include_router(scan.router, prefix="/scan", tags=["scan"])

@app.get("/health")
def health():
    return {"status": "ok"}
