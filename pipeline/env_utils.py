from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
RAW_CSV_PATH = DATA_DIR / "raw_people.csv"
CLEANED_PATH = DATA_DIR / "cleaned_people.json"
DEDUPE_PATH = DATA_DIR / "deduped_people.json"
ENRICHED_PATH = DATA_DIR / "enriched_people.json"
FIT_SCORED_PATH = DATA_DIR / "fit_scored_people.json"
INTRODUCTIONS_PATH = DATA_DIR / "introductions.json"


def load_project_env() -> None:
    load_dotenv(ROOT / ".env")

