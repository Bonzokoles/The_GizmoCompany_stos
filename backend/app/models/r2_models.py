from pydantic import BaseModel


class R2UploadResponse(BaseModel):
    key: str
    bucket: str
    size_bytes: int
    etag: str


class R2ObjectMeta(BaseModel):
    key: str
    size: int
    last_modified: str