import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .database import engine, Base
from .routers import (
    organizations,
    inventory,
    categories,
    transactions,
    suppliers,
    users,
    issuance,
    batches,
    templates,
    custom_fields,
    subscriptions,
    procurement,
    maintenance,
)
from .routers.asset_router import router as asset_router
from .routers.auth_router import router as auth_router
from .routers.class_templates import router as class_templates_router
from .routers.quotations import router as quotations_router

load_dotenv()

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StockPilot API", version="1.0.0")

# CORS — allow the Vite dev server and any VPS-hosted frontend
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(organizations.router)
app.include_router(inventory.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(suppliers.router)
app.include_router(users.router)
app.include_router(issuance.router)
app.include_router(batches.router)
app.include_router(templates.router)
app.include_router(custom_fields.router)
app.include_router(subscriptions.router)
app.include_router(procurement.router)
app.include_router(maintenance.router)
app.include_router(asset_router)
app.include_router(class_templates_router)
app.include_router(quotations_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "StockPilot API"}
