from pathlib import Path
import sys
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import engine, Base
from routes import items, scan

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Shopping List API")

# Configure allowed origins via the ALLOWED_ORIGINS env var (comma-separated).
# Defaults to the common Vite dev origin used by the frontend.
_origins = os.getenv("ALLOWED_ORIGINS")
if _origins:
    allow_origins = [o.strip() for o in _origins.split(",") if o.strip()]
else:
    allow_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(items.router, prefix="/items", tags=["items"])
app.include_router(scan.router, prefix="/scan", tags=["scan"])

@app.get("/health")
def health():
    return {"status": "ok"}
