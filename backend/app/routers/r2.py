from __future__ import annotations

import json
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from models.r2_models import R2UploadResponse
from services.cf_client import get_cf_client

router = APIRouter()

MAX_UPLOAD_BYTES = 100 * 1024 * 1024


@router.post("/api/r2/upload", response_model=R2UploadResponse)
async def upload_to_r2(
    file: UploadFile = File(...),
    metadata: str | None = Form(None),
    key: str | None = Form(None),
    content_type: str | None = Form(None),
) -> R2UploadResponse:
    cf = get_cf_client()
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 100MB limit")

    if metadata:
        try:
            json.loads(metadata)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid metadata JSON: {exc}")

    object_key = key or f"uploads/{Path(file.filename or 'file.bin').name}"
    object_content_type = content_type or file.content_type or "application/octet-stream"

    result = await cf.r2_put_object(
        bucket=cf.r2_bucket_name,
        key=object_key,
        data=raw,
        content_type=object_content_type,
    )
    return R2UploadResponse(
        key=str(result.get("key", object_key)),
        bucket=str(result.get("bucket", cf.r2_bucket_name)),
        size_bytes=int(result.get("size_bytes", len(raw))),
        etag=str(result.get("etag", "")),
    )


@router.get("/api/r2/get/{key:path}")
async def get_from_r2(key: str):
    if ".." in key or key.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid key")
    cf = get_cf_client()
    try:
        data = await cf.r2_get_object(cf.r2_bucket_name, key)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Object not found")
    return StreamingResponse(BytesIO(data), media_type="application/octet-stream")


@router.get("/api/r2/health")
async def r2_health() -> dict[str, str]:
    cf = get_cf_client()
    return {"status": "ok", "bucket": cf.r2_bucket_name}