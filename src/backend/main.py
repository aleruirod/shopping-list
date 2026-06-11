from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.backend.routes import vision
from src.backend.database import engine, Base
from src.backend.routes import items, scan

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Shopping List API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router, prefix="/items", tags=["items"])
app.include_router(scan.router, prefix="/scan", tags=["scan"])
app.include_router(vision.router, prefix="/vision", tags=["vision"])

@app.get("/health")
def health():
    return {"status": "ok"}
