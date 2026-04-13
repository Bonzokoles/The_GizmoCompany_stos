from __future__ import annotations

import asyncio
import os
from typing import Any

import boto3
import httpx
from botocore.exceptions import ClientError
from functools import lru_cache


class CloudflareClient:
    def __init__(self) -> None:
        # D1 — Cloudflare REST API
        self.account_id = self._required_env("CLOUDFLARE_ACCOUNT_ID")
        self.d1_database_id = self._required_env("CF_D1_DATABASE_ID")
        self.api_token = self._required_env("CLOUDFLARE_API_TOKEN")
        self.base_url = "https://api.cloudflare.com/client/v4"

        # R2 — S3-compatible API
        self.r2_bucket_name = self._required_env("CF_R2_BUCKET_NAME")
        self._s3 = boto3.client(
            "s3",
            endpoint_url=self._required_env("R2_ENDPOINT"),
            aws_access_key_id=self._required_env("R2_ACCESS_KEY_ID"),
            aws_secret_access_key=self._required_env("R2_SECRET_ACCESS_KEY"),
            region_name="auto",
        )

    @staticmethod
    def _required_env(name: str) -> str:
        value = os.environ.get(name)
        if not value:
            raise RuntimeError(f"Missing required environment variable: {name}")
        return value

    @property
    def _d1_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

    async def _request_with_retry(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(method, url, **kwargs)
            if response.status_code == 429:
                await asyncio.sleep(0.5)
                async with httpx.AsyncClient(timeout=30.0) as retry_client:
                    response = await retry_client.request(method, url, **kwargs)
            response.raise_for_status()
            return response

    async def d1_query(self, sql: str, params: list[Any]) -> dict[str, Any]:
        url = (
            f"{self.base_url}/accounts/{self.account_id}"
            f"/d1/database/{self.d1_database_id}/query"
        )
        response = await self._request_with_retry(
            "POST",
            url,
            headers=self._d1_headers,
            json={"sql": sql, "params": params},
        )
        return response.json()

    async def r2_put_object(
        self,
        bucket: str,
        key: str,
        data: bytes,
        content_type: str,
    ) -> dict[str, Any]:
        s3 = self._s3

        def _upload() -> dict[str, Any]:
            return s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )

        resp = await asyncio.to_thread(_upload)
        etag = resp.get("ETag", "").strip('"')
        return {"ok": True, "bucket": bucket, "key": key, "size_bytes": len(data), "etag": etag}

    async def r2_get_object(self, bucket: str, key: str) -> bytes:
        s3 = self._s3

        def _get() -> bytes:
            try:
                resp = s3.get_object(Bucket=bucket, Key=key)
                return resp["Body"].read()
            except ClientError as exc:
                if exc.response["Error"]["Code"] in ("NoSuchKey", "404"):
                    raise FileNotFoundError(f"Object not found: {key}")
                raise

        return await asyncio.to_thread(_get)

    async def r2_delete_object(self, bucket: str, key: str) -> None:
        s3 = self._s3
        await asyncio.to_thread(s3.delete_object, Bucket=bucket, Key=key)


@lru_cache(maxsize=1)
def get_cf_client() -> CloudflareClient:
    return CloudflareClient()
