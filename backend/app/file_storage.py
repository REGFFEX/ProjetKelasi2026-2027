import uuid
from pathlib import Path

from fastapi import UploadFile

from app.response import APIException

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
PUBLIC_PREFIX = "uploads"  # mounted at API_PREFIX + "/" + PUBLIC_PREFIX

MAX_UPLOAD_BYTES = 2 * 1024 * 1024  # 2MB — plenty for a logo or a student photo
ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


async def save_image_upload(file: UploadFile, subdir: str) -> str:
    """Validates and stores an uploaded image, returning the path to save on the
    owning record (e.g. School.logo, Student.photo) — relative to the API root."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise APIException(400, "Format d'image non supporté. Utilisez JPG, PNG ou WebP.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise APIException(400, "Image trop volumineuse (2 Mo maximum).")

    extension = ALLOWED_CONTENT_TYPES[file.content_type]
    filename = f"{uuid.uuid4().hex}.{extension}"
    target_dir = UPLOADS_DIR / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / filename).write_bytes(contents)

    return f"{PUBLIC_PREFIX}/{subdir}/{filename}"
