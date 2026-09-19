"""Pagination + input sanitization helpers."""
import re
import html
from fastapi import Query


def paginate(query, page: int = 1, limit: int = 50):
    """Apply pagination to a SQLAlchemy query. Returns (items, total)."""
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    return items, total


def paginated_response(items: list, total: int, page: int, limit: int) -> dict:
    """Standard paginated response envelope."""
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


def sanitize(text: str | None) -> str | None:
    """Strip HTML tags and escape special chars to prevent XSS."""
    if text is None:
        return None
    # Remove HTML tags
    clean = re.sub(r'<[^>]+>', '', text)
    # Escape remaining HTML entities
    clean = html.escape(clean)
    return clean.strip()


# File magic bytes for MIME validation
MAGIC_BYTES = {
    b'\xff\xd8\xff': 'image/jpeg',
    b'\x89PNG': 'image/png',
    b'GIF87a': 'image/gif',
    b'GIF89a': 'image/gif',
    b'%PDF': 'application/pdf',
}


def detect_mime(content: bytes) -> str | None:
    """Detect MIME type from file magic bytes."""
    for magic, mime in MAGIC_BYTES.items():
        if content[:len(magic)] == magic:
            return mime
    # CSV/text files start with printable ASCII
    try:
        content[:200].decode('utf-8')
        return 'text/plain'
    except UnicodeDecodeError:
        return None
