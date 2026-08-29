from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import pandas as pd

from pipeline.env_utils import CLEANED_PATH, RAW_CSV_PATH


CORE_FIELDS = ["name", "email", "company", "role_title", "bio_notes"]
OUTPUT_COLUMNS = [
    "source_record_id",
    "name",
    "email",
    "email_normalized",
    "company",
    "role_title",
    "bio_notes",
    "source",
    "source_payload",
    "is_incomplete",
    "missing_fields",
    "role_type",
    "sector_tags",
    "seniority",
    "community_fit_tags",
    "fit_score",
    "fit_score_reasoning",
    "is_duplicate_of",
    "duplicate_confidence",
    "ai_classification",
    "ai_enrichment_status",
    "ai_model",
    "ai_generated_at",
]
NULL_LIKE = {"", "na", "n/a", "none", "null", "-", "nan"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _clean_string(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    text = re.sub(r"\s+", " ", str(value).strip())
    if text.lower() in NULL_LIKE:
        return None
    return text


def _smart_title(value: Any) -> str | None:
    text = _clean_string(value)
    if text is None:
        return None
    titled = text.title()
    replacements = {
        " Ai": " AI",
        "Api": "API",
        "Coo": "COO",
        "Ceo": "CEO",
        "Cto": "CTO",
        "Vp": "VP",
        "D2C": "D2C",
        "Saas": "SaaS",
        "Msme": "MSME",
        "Gcc": "GCC",
        "Sg": "SG",
    }
    for needle, replacement in replacements.items():
        titled = titled.replace(needle, replacement)
    return titled


def _normalize_email(value: Any) -> str | None:
    text = _clean_string(value)
    if text is None:
        return None
    email = text.lower()
    return email if EMAIL_RE.match(email) else None


def load_raw_records(path: Path = RAW_CSV_PATH) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Raw dataset not found: {path}")
    if path.suffix.lower() == ".json":
        return pd.read_json(path, dtype=False)
    return pd.read_csv(path, keep_default_na=False, dtype=str)


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    required = {"source_record_id", "name", "email", "company", "role_title", "bio_notes", "source"}
    missing_columns = required - set(df.columns)
    if missing_columns:
        raise ValueError(f"Missing required raw columns: {sorted(missing_columns)}")

    raw = df.copy()
    raw = raw.rename(columns=lambda column: column.strip())

    cleaned = pd.DataFrame()
    cleaned["source_record_id"] = raw["source_record_id"].map(_clean_string)
    cleaned["name"] = raw["name"].map(_smart_title)
    cleaned["email"] = raw["email"].map(_normalize_email)
    cleaned["email_normalized"] = cleaned["email"]
    cleaned["company"] = raw["company"].map(_smart_title)
    cleaned["role_title"] = raw["role_title"].map(_smart_title)
    cleaned["bio_notes"] = raw["bio_notes"].map(_clean_string)
    cleaned["source"] = raw["source"].map(lambda value: (_clean_string(value) or "unknown").lower())
    cleaned["source_payload"] = raw.to_dict(orient="records")

    missing_matrix = cleaned[CORE_FIELDS].isna()
    cleaned["missing_fields"] = missing_matrix.apply(
        lambda row: [field for field, is_missing in row.items() if is_missing],
        axis=1,
    )
    cleaned["is_incomplete"] = cleaned["missing_fields"].map(bool)

    cleaned["role_type"] = None
    cleaned["sector_tags"] = [[] for _ in range(len(cleaned))]
    cleaned["seniority"] = None
    cleaned["community_fit_tags"] = [[] for _ in range(len(cleaned))]
    cleaned["fit_score"] = None
    cleaned["fit_score_reasoning"] = None
    cleaned["is_duplicate_of"] = None
    cleaned["duplicate_confidence"] = None
    cleaned["ai_classification"] = [{} for _ in range(len(cleaned))]
    cleaned["ai_enrichment_status"] = "pending"
    cleaned["ai_model"] = None
    cleaned["ai_generated_at"] = None

    if cleaned["source_record_id"].isna().any():
        raise ValueError("source_record_id cannot be empty after cleaning")
    if cleaned["name"].isna().any():
        raise ValueError("name cannot be empty after cleaning")
    if cleaned["source_record_id"].duplicated().any():
        duplicates = cleaned.loc[cleaned["source_record_id"].duplicated(), "source_record_id"].tolist()
        raise ValueError(f"Duplicate source_record_id values: {duplicates}")

    return cleaned.loc[:, OUTPUT_COLUMNS]


def clean_records(
    input_path: Path = RAW_CSV_PATH,
    output_path: Path = CLEANED_PATH,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    df = load_raw_records(input_path)
    if limit is not None and limit > 0:
        df = df.iloc[:limit]
    cleaned = clean_dataframe(df)
    records = json.loads(cleaned.to_json(orient="records"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean Offline CRM raw people records.")
    parser.add_argument("--input", type=Path, default=RAW_CSV_PATH)
    parser.add_argument("--output", type=Path, default=CLEANED_PATH)
    parser.add_argument("--limit", type=int, default=None, help="Limit processing to first N records.")
    args = parser.parse_args()

    records = clean_records(args.input, args.output, limit=args.limit)
    incomplete = sum(1 for record in records if record["is_incomplete"])
    print(f"cleaned_records={len(records)}")
    print(f"incomplete_records={incomplete}")
    print(json.dumps(records[:5], indent=2))


if __name__ == "__main__":
    main()

