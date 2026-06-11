from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import vision
from database import engine, Base
from routes import items, scan

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

@app.get("/health")
def health():
    return {"status": "ok"}
