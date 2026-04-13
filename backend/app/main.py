from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import d1, r2

# Load root .env first (non-override), then local backend/.env (override)
_root_env = Path(__file__).parents[2] / ".env"
_local_env = Path(__file__).parents[1] / ".env"
load_dotenv(_root_env, override=False)
load_dotenv(_local_env, override=True)


def _required_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


# Validate Cloudflare configuration at startup.
for _env_name in ("CLOUDFLARE_ACCOUNT_ID", "CF_D1_DATABASE_ID", "CF_R2_BUCKET_NAME",
                  "CLOUDFLARE_API_TOKEN", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
                  "R2_ENDPOINT"):
    _required_env(_env_name)

app = FastAPI(title="BUCH Backend", version="0.1.0")

origins = os.environ.get(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:3701,http://localhost:4224",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(d1.router)
app.include_router(r2.router)


@app.get("/health")
async def health() -> dict[str, object]:
    return {"status": "ok", "port": int(os.environ.get("BUCH_PORT", "5180"))}


@app.exception_handler(Exception)
async def global_exception_handler(_, exc: Exception):
    return JSONResponse(status_code=500, content={"ok": False, "error": str(exc)})