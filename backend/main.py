"""
CareLine - 化疗周期副作用管理系统
FastAPI 后端主入口
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import (
    auth_router,
    family_router,
    cycle_router,
    daily_router,
    stool_router,
    summary_router,
    message_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown"""
    init_db()
    print("✅ CareLine 数据库已初始化")
    yield
    print("👋 CareLine 关闭")


app = FastAPI(
    title="CareLine API",
    description="化疗周期副作用管理系统 - 直肠癌定制版",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS - allow frontend dev server and WeChat
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["*"],  # V1: permissive; tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router.router)
app.include_router(family_router.router)
app.include_router(cycle_router.router)
app.include_router(daily_router.router)
app.include_router(stool_router.router)
app.include_router(summary_router.router)
app.include_router(message_router.router)


@app.get("/")
def root():
    return {
        "name": "CareLine API",
        "version": "1.0.0",
        "description": "化疗周期副作用管理系统",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
