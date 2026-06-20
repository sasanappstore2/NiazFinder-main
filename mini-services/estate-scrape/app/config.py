"""Estate scrape service — ScrapeGraphAI + local GGUF gateway (gemma4-intake)."""
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRAPEGRAPH_ROOT = REPO_ROOT / "Scrapegraph-ai-main"
DATA_DIR = REPO_ROOT / "data" / "estate-knowledge"
RAW_DIR = DATA_DIR / "raw"
CHUNKS_DIR = DATA_DIR / "chunks"
JSONL_PATH = REPO_ROOT / "data" / "need-intake-training" / "estate-knowledge-10k.jsonl"
MANIFEST_PATH = DATA_DIR / "manifest.json"

INTAKE_MLX_URL = os.environ.get("NEED_INTAKE_LLM_URL", "http://127.0.0.1:8100")
INTAKE_MLX_CHAT_URL = f"{INTAKE_MLX_URL.rstrip('/')}/v1/chat/completions"
INTAKE_LLM_MODEL = os.environ.get("NEED_INTAKE_LLM_MODEL", "gemma-4-e2b-q4_0-it")

DEFAULT_TARGET = 10_000
DEFAULT_HOLDOUT = 200

ESTATE_AGENT_SYSTEM = (
    "تو یک مشاور املاک خبره و باتجربه در بازار ایران هستی. "
    "به فارسی روان، دقیق و کاربردی پاسخ می‌دهی. "
    "از اصطلاحات رایج املاک ایران (رهن، اجاره، پیش‌فروش، سند تک‌برگ، بنچاق و ...) درست استفاده می‌کنی. "
    "اگر سوال خارج از حوزه املاک بود، مودبانه محدودیت خود را بگو."
)

EXTRACT_ARTICLE_SYSTEM = (
    "تو یک استخراج‌کننده محتوای آموزشی املاک فارسی هستی. "
    "از متن صفحه وب فقط یک JSON معتبر برگردان با ساختار:\n"
    '{"title":"...","summary":"...","topics":["..."],"qa_pairs":[{"question":"...","answer":"..."}]}\n'
    "حداقل ۳ جفت سوال-جواب آموزشی به فارسی. بدون توضیح اضافه."
)
