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
from .routers.vendors import router as vendors_router
from .routers.support import router as support_router
from .routers.signup import router as signup_router

load_dotenv()

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="StockPilot API", version="1.0.0")

# CORS — allow the Vite dev server and configured origins
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8060").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(organizations.router)
app.include_router(inventory.router)
app.include_router(categories.router)
app.include_router(transactions.router)
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
app.include_router(vendors_router)
app.include_router(support_router)
app.include_router(signup_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "StockPilot API"}
