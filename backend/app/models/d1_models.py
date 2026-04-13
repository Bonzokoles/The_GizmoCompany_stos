from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, Field, field_validator

TABLE_NAME_REGEX = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


class D1SaveRequest(BaseModel):
    table: str
    data: dict[str, Any]
    tags: list[str] = Field(default_factory=list)

    @field_validator("table")
    @classmethod
    def validate_table(cls, value: str) -> str:
        if not TABLE_NAME_REGEX.match(value):
            raise ValueError("Invalid table name")
        return value


class D1SaveResponse(BaseModel):
    ok: bool
    record_id: str | None = None
    error: str | None = None


class D1QueryRequest(BaseModel):
    sql: str
    params: list[Any] = Field(default_factory=list)

    @field_validator("sql")
    @classmethod
    def validate_sql(cls, value: str) -> str:
        upper = value.upper()
        blocked = ("DROP", "TRUNCATE", "ALTER")
        if any(word in upper for word in blocked):
            raise ValueError("Forbidden SQL keyword")
        return value


class D1QueryResponse(BaseModel):
    results: list[Any]
    meta: dict[str, Any] = Field(default_factory=dict)