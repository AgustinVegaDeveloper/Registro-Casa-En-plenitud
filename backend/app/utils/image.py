import uuid
from io import BytesIO
from pathlib import Path

from PIL import Image

UPLOAD_DIR = Path("app/uploads")
MAX_SIZE = (800, 800)
WEBP_QUALITY = 80


def process_photo(file_bytes: bytes, original_filename: str) -> str:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    image = Image.open(BytesIO(file_bytes))
    image = image.convert("RGB")
    image.thumbnail(MAX_SIZE, Image.LANCZOS)

    safe_name = f"{uuid.uuid4().hex}.webp"
    out_path = UPLOAD_DIR / safe_name
    image.save(out_path, "WEBP", quality=WEBP_QUALITY)

    return safe_name


def remove_photo(filename: str) -> None:
    file_path = UPLOAD_DIR / filename
    if file_path.exists():
        file_path.unlink()
