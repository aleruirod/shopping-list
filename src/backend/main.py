from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import engine, Base
from routes import items, scan, photos
from storage import is_storage_configured

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Shopping List API")

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten this once it works
    allow_credentials=False,   # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import Response

@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request):
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
    )

app.include_router(items.router, prefix="/items", tags=["items"])
app.include_router(scan.router, prefix="/scan", tags=["scan"])
app.include_router(photos.router, prefix="/photos", tags=["photos"])

@app.get("/health")
def health():
    return {"status": "ok"}
