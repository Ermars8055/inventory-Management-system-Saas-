"""
Real-time translation via LibreTranslate (self-hosted).
Caches translations in-memory to avoid repeated API calls.
"""
import os
import requests as http_req
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from ..models import User
from ..dependencies import get_current_user

router = APIRouter(prefix="/translate", tags=["translate"])

LIBRE_URL = os.getenv("LIBRETRANSLATE_URL", "http://libretranslate:5000")

# In-memory cache: (text, source, target) → translated_text
_cache: dict[tuple[str, str, str], str] = {}


class TranslateBody(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    texts: list[str]
    target: str  # language code: hi, bn, etc.
    source: str = "en"


class BatchTranslateBody(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    texts: dict[str, str]  # key → english text
    target: str
    source: str = "en"


@router.post("")
def translate(body: TranslateBody, user: User = Depends(get_current_user)):
    """Translate a list of texts. Returns translations in same order."""
    if body.target == body.source:
        return {"translations": body.texts}

    results = []
    for text in body.texts:
        cache_key = (text, body.source, body.target)
        if cache_key in _cache:
            results.append(_cache[cache_key])
            continue

        try:
            resp = http_req.post(f"{LIBRE_URL}/translate", json={
                "q": text, "source": body.source, "target": body.target,
            }, timeout=5)
            if resp.status_code == 200:
                translated = resp.json().get("translatedText", text)
                _cache[cache_key] = translated
                results.append(translated)
            else:
                results.append(text)  # Fallback to original
        except Exception:
            results.append(text)

    return {"translations": results}


@router.post("/batch")
def translate_batch(body: BatchTranslateBody, user: User = Depends(get_current_user)):
    """Translate a dict of key→text pairs. Returns same keys with translated values."""
    if body.target == body.source:
        return {"translations": body.texts}

    results = {}
    for key, text in body.texts.items():
        cache_key = (text, body.source, body.target)
        if cache_key in _cache:
            results[key] = _cache[cache_key]
            continue

        try:
            resp = http_req.post(f"{LIBRE_URL}/translate", json={
                "q": text, "source": body.source, "target": body.target,
            }, timeout=5)
            if resp.status_code == 200:
                translated = resp.json().get("translatedText", text)
                _cache[cache_key] = translated
                results[key] = translated
            else:
                results[key] = text
        except Exception:
            results[key] = text

    return {"translations": results}


@router.get("/languages")
def supported_languages():
    """Return languages supported by the LibreTranslate instance."""
    try:
        resp = http_req.get(f"{LIBRE_URL}/languages", timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return [{"code": "en", "name": "English"}, {"code": "hi", "name": "Hindi"}, {"code": "bn", "name": "Bengali"}]
