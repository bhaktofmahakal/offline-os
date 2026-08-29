from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time
from pathlib import Path
from typing import Any, Type, TypeVar

from google import genai
from google.genai import types
from google.genai.errors import APIError, ClientError, ServerError
from pydantic import BaseModel

from pipeline.env_utils import DATA_DIR, ROOT, load_project_env

T = TypeVar("T", bound=BaseModel)

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"
CACHE_DB_PATH = DATA_DIR / "gemini_cache.sqlite"
MAX_RETRIES = 6
INITIAL_BACKOFF = 26.0
MIN_SECONDS_BETWEEN_LIVE_CALLS = 4.2

_client: genai.Client | None = None
_last_live_call_time: float = 0.0
_cache_stats = {"hits": 0, "misses": 0}


def get_gemini_client() -> genai.Client:
    global _client
    if _client is None:
        load_project_env()
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is missing from environment. Set it in .env.")
        _client = genai.Client(api_key=api_key)
    return _client


def _init_cache_db(db_path: Path = CACHE_DB_PATH) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS gemini_cache (
                cache_key TEXT PRIMARY KEY,
                call_type TEXT NOT NULL,
                model TEXT NOT NULL,
                input_hash TEXT NOT NULL,
                request_payload TEXT NOT NULL,
                response_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_model ON gemini_cache(model)")
    return conn


def _make_cache_key(call_type: str, model: str, payload_str: str) -> str:
    hasher = hashlib.sha256()
    hasher.update(f"{call_type}:{model}:{payload_str}".encode("utf-8"))
    return hasher.hexdigest()


def get_from_cache(call_type: str, model: str, payload_str: str) -> str | None:
    cache_key = _make_cache_key(call_type, model, payload_str)
    try:
        conn = _init_cache_db()
        with conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT response_text FROM gemini_cache WHERE cache_key = ?",
                (cache_key,),
            )
            row = cursor.fetchone()
            if row:
                _cache_stats["hits"] += 1
                return row[0]
    except Exception as e:
        print(f"[CACHE WARNING] Error reading cache: {e}")
    _cache_stats["misses"] += 1
    return None


def save_to_cache(call_type: str, model: str, payload_str: str, response_text: str) -> None:
    cache_key = _make_cache_key(call_type, model, payload_str)
    input_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()
    try:
        conn = _init_cache_db()
        with conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO gemini_cache 
                (cache_key, call_type, model, input_hash, request_payload, response_text)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (cache_key, call_type, model, input_hash, payload_str, response_text),
            )
    except Exception as e:
        print(f"[CACHE WARNING] Error saving cache: {e}")


def get_cache_stats() -> dict[str, Any]:
    total = _cache_stats["hits"] + _cache_stats["misses"]
    hit_rate = (
        round((_cache_stats["hits"] / total) * 100, 2)
        if total > 0
        else 0.0
    )
    return {
        "hits": _cache_stats["hits"],
        "misses": _cache_stats["misses"],
        "total": total,
        "hit_rate_pct": hit_rate,
    }


def reset_cache_stats() -> None:
    _cache_stats["hits"] = 0
    _cache_stats["misses"] = 0


def _rate_limit_throttle() -> None:
    global _last_live_call_time
    now = time.time()
    elapsed = now - _last_live_call_time
    if elapsed < MIN_SECONDS_BETWEEN_LIVE_CALLS:
        time.sleep(MIN_SECONDS_BETWEEN_LIVE_CALLS - elapsed)
    _last_live_call_time = time.time()


def generate_structured_json(
    prompt_payload: dict[str, Any] | str,
    response_schema: Type[T],
    model: str = DEFAULT_MODEL,
    temperature: float = 0.0,
    use_cache: bool = True,
) -> T:
    """Generate structured JSON conforming to a Pydantic model with disk caching & backoff."""
    client = get_gemini_client()
    payload_str = (
        json.dumps(prompt_payload, sort_keys=True)
        if isinstance(prompt_payload, dict)
        else str(prompt_payload)
    )
    schema_name = response_schema.__name__
    cache_payload_str = f"schema:{schema_name}|temp:{temperature}|{payload_str}"

    if use_cache:
        cached_response = get_from_cache("structured_json", model, cache_payload_str)
        if cached_response is not None:
            return response_schema.model_validate_json(cached_response)

    backoff = INITIAL_BACKOFF
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            _rate_limit_throttle()
            response = client.models.generate_content(
                model=model,
                contents=payload_str,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    response_mime_type="application/json",
                    response_schema=response_schema,
                ),
            )
            raw_text = response.text
            parsed = response_schema.model_validate_json(raw_text)
            if use_cache:
                save_to_cache("structured_json", model, cache_payload_str, raw_text)
            return parsed
        except (ClientError, ServerError, APIError, Exception) as e:
            is_rate_limit = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e).upper()
            if is_rate_limit and attempt < MAX_RETRIES:
                print(f"[RATE LIMIT] 429 encountered on attempt {attempt}/{MAX_RETRIES}. Sleeping {backoff:.1f}s...")
                time.sleep(backoff)
                backoff *= 2.0
            elif attempt < MAX_RETRIES:
                print(f"[RETRY] Error on attempt {attempt}/{MAX_RETRIES}: {e}. Retrying in {backoff:.1f}s...")
                time.sleep(backoff)
                backoff *= 1.5
            else:
                raise


def generate_embedding(
    text: str,
    model: str = DEFAULT_EMBEDDING_MODEL,
    use_cache: bool = True,
) -> list[float]:
    """Generate 768-dim embeddings with disk caching & backoff."""
    client = get_gemini_client()
    text_clean = text.strip()
    cache_payload_str = f"text:{text_clean}"

    if use_cache:
        cached_response = get_from_cache("embedding", model, cache_payload_str)
        if cached_response is not None:
            return json.loads(cached_response)

    backoff = INITIAL_BACKOFF
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            _rate_limit_throttle()
            response = client.models.embed_content(
                model=model,
                contents=text_clean,
                config={"output_dimensionality": 768},
            )
            embedding_values = response.embeddings[0].values
            if use_cache:
                save_to_cache("embedding", model, cache_payload_str, json.dumps(embedding_values))
            return embedding_values
        except Exception as e:
            is_rate_limit = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e).upper()
            if is_rate_limit and attempt < MAX_RETRIES:
                print(f"[RATE LIMIT] 429 embedding error on attempt {attempt}/{MAX_RETRIES}. Sleeping {backoff:.1f}s...")
                time.sleep(backoff)
                backoff *= 2.0
            elif attempt < MAX_RETRIES:
                print(f"[RETRY] Embedding error on attempt {attempt}/{MAX_RETRIES}: {e}. Retrying in {backoff:.1f}s...")
                time.sleep(backoff)
                backoff *= 1.5
            else:
                raise

