import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from .database import admin_engine, AdminBase
from .routers.auth_router import router as auth_router
from .routers.organizations import router as orgs_router
from .routers.admin_users import router as admin_users_router
from .routers.stats import router as stats_router
from .routers.audit import router as audit_router
from .routers.coupons import router as coupons_router

AdminBase.metadata.create_all(bind=admin_engine)

app = FastAPI(title="StockPilot Admin API", version="1.0.0")

admin_origins = [o.strip() for o in os.getenv("ADMIN_CORS_ORIGINS", "http://localhost:8061,http://localhost:5174").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=admin_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(orgs_router)
app.include_router(admin_users_router)
app.include_router(stats_router)
app.include_router(audit_router)
app.include_router(coupons_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "StockPilot Admin API"}
