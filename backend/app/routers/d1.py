from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from models.d1_models import (
    D1QueryRequest,
    D1QueryResponse,
    D1SaveRequest,
    D1SaveResponse,
)
from services.cf_client import get_cf_client

router = APIRouter()


def _ensure_safe_sql(sql: str) -> None:
    upper = sql.upper()
    if any(word in upper for word in ("DROP", "TRUNCATE", "ALTER")):
        raise HTTPException(status_code=400, detail="Forbidden SQL keyword")


@router.post("/api/d1/save", response_model=D1SaveResponse)
async def save_to_d1(request: D1SaveRequest) -> D1SaveResponse:
    cf = get_cf_client()
    record_id = str(uuid4())

    columns = list(request.data.keys()) + ["id", "created_at"]
    placeholders = ["?" for _ in columns]
    values = list(request.data.values()) + [record_id, datetime.utcnow().isoformat()]

    sql = f"INSERT INTO {request.table} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
    _ensure_safe_sql(sql)

    try:
        await cf.d1_query(sql, values)
        return D1SaveResponse(ok=True, record_id=record_id)
    except Exception as exc:
        return D1SaveResponse(ok=False, error=str(exc))


@router.get("/api/d1/query")
async def query_d1(
    table: str = Query(...),
    sql: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    cf = get_cf_client()
    if sql:
        if not sql.strip().upper().startswith("SELECT"):
            raise HTTPException(status_code=400, detail="Only SELECT queries allowed via this endpoint")
        _ensure_safe_sql(sql)
        query_sql = sql
        params: list[object] = []
    else:
        query_sql = f"SELECT * FROM {table} LIMIT ? OFFSET ?"
        params = [limit, offset]

    try:
        payload = await cf.d1_query(query_sql, params)
        result = payload.get("result", [{}])[0] if isinstance(payload, dict) else {}
        rows = result.get("results", []) if isinstance(result, dict) else []
        return {"ok": True, "data": rows, "total": len(rows), "error": None}
    except Exception as exc:
        return {"ok": False, "data": None, "total": None, "error": str(exc)}


@router.post("/api/d1/query", response_model=D1QueryResponse)
async def query_d1_post(request: D1QueryRequest) -> D1QueryResponse:
    _ensure_safe_sql(request.sql)
    cf = get_cf_client()
    payload = await cf.d1_query(request.sql, request.params)
    result = payload.get("result", [{}])[0] if isinstance(payload, dict) else {}
    return D1QueryResponse(results=result.get("results", []), meta=result.get("meta", {}))


@router.get("/api/d1/health")
async def d1_health() -> dict[str, str]:
    cf = get_cf_client()
    return {"status": "ok", "database": cf.d1_database_id}