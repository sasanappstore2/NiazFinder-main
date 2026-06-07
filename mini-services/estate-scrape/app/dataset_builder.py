from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from app.config import CHUNKS_DIR, DATA_DIR, DEFAULT_HOLDOUT, DEFAULT_TARGET, JSONL_PATH, MANIFEST_PATH, RAW_DIR, SCRAPEGRAPH_ROOT
from app.qwen_client import mlx_health_ok
from app.scraper import discover_article_urls, scrape_article, search_urls_via_scrapegraph
from app.url_seeds import ESTATE_ARTICLE_SEEDS, ESTATE_SEARCH_QUERIES
from app.validate import article_to_rows, dedupe_rows, validate_article


def _chunk_path(url: str) -> Path:
    h = hashlib.sha1(url.encode()).hexdigest()[:16]
    return CHUNKS_DIR / f"{h}.json"


def _load_chunk(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text("utf8"))
    except Exception:
        return []


def collect_candidate_urls(*, max_search_queries: int = 12) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()

    def add(u: str) -> None:
        u = u.strip()
        if not u or u in seen:
            return
        seen.add(u)
        urls.append(u)

    for seed in ESTATE_ARTICLE_SEEDS:
        for u in discover_article_urls(seed, limit=25):
            add(u)

    for query in ESTATE_SEARCH_QUERIES[:max_search_queries]:
        for u in search_urls_via_scrapegraph(query, max_results=5):
            add(u)

    return urls


def build_dataset(
    *,
    target: int = DEFAULT_TARGET,
    holdout: int = DEFAULT_HOLDOUT,
    resume: bool = True,
    use_scrapegraph: bool = True,
    max_urls: int = 2500,
) -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    JSONL_PATH.parent.mkdir(parents=True, exist_ok=True)

    if not mlx_health_ok():
        raise RuntimeError(
            "intake-mlx (Qwen) is not running. Start: npm run dev:intake-mlx"
        )

    all_rows: list[dict] = []
    crawl_log: list[dict] = []
    candidate_urls = collect_candidate_urls()[:max_urls]

    from app.schemas import EstateKnowledgeRow

    for url in candidate_urls:
        chunk = _chunk_path(url)
        if resume and chunk.exists():
            existing = _load_chunk(chunk)
            if existing:
                all_rows.extend(existing)
                crawl_log.append({"url": url, "skipped": True, "rows": len(existing)})
                if len(dedupe_rows([EstateKnowledgeRow.model_validate(r) for r in all_rows])) >= target + holdout:
                    break
                continue

        started = datetime.now(timezone.utc).isoformat()
        raw = scrape_article(url, use_scrapegraph=use_scrapegraph)
        if not raw:
            crawl_log.append({"url": url, "ok": False, "error": "scrape_failed", "started": started})
            continue

        article = validate_article(raw)
        if not article:
            crawl_log.append({"url": url, "ok": False, "error": "validation_failed", "started": started})
            continue

        prefix = hashlib.sha1(url.encode()).hexdigest()[:10]
        rows = article_to_rows(article, source_url=url, row_id_prefix=prefix)
        row_dicts = [r.model_dump() for r in rows]

        chunk.write_text(json.dumps(row_dicts, ensure_ascii=False), "utf8")
        (RAW_DIR / f"{prefix}.json").write_text(json.dumps(raw, ensure_ascii=False, indent=2), "utf8")

        all_rows.extend(row_dicts)
        crawl_log.append(
            {
                "url": url,
                "ok": True,
                "title": article.title,
                "rows": len(row_dicts),
                "started": started,
            }
        )

        if len(dedupe_rows([EstateKnowledgeRow.model_validate(r) for r in all_rows])) >= target + holdout:
            break

    parsed = [EstateKnowledgeRow.model_validate(r) for r in all_rows]
    deduped = dedupe_rows(parsed)

    holdout_rows = deduped[:holdout]
    train_rows = deduped[holdout : holdout + target]

    def to_jsonl(rows: list[EstateKnowledgeRow]) -> str:
        lines = []
        for row in rows:
            lines.append(json.dumps({"messages": [m.model_dump() for m in row.messages]}, ensure_ascii=False))
        return "\n".join(lines) + ("\n" if lines else "")

    JSONL_PATH.write_text(to_jsonl(train_rows), "utf8")
    holdout_path = JSONL_PATH.with_name("estate-knowledge-holdout.jsonl")
    holdout_path.write_text(to_jsonl(holdout_rows), "utf8")

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "target": target,
        "holdout": holdout,
        "candidateUrls": len(candidate_urls),
        "poolSize": len(deduped),
        "trainSize": len(train_rows),
        "holdoutSize": len(holdout_rows),
        "trainPath": str(JSONL_PATH),
        "holdoutPath": str(holdout_path),
        "scrapegraphRoot": str(SCRAPEGRAPH_ROOT),
        "crawlLogSample": crawl_log[:50],
        "crawlLogTotal": len(crawl_log),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Persian estate knowledge dataset (10k)")
    parser.add_argument("--target", type=int, default=DEFAULT_TARGET)
    parser.add_argument("--holdout", type=int, default=DEFAULT_HOLDOUT)
    parser.add_argument("--no-resume", action="store_true")
    parser.add_argument("--no-scrapegraph", action="store_true")
    parser.add_argument("--max-urls", type=int, default=2500)
    args = parser.parse_args()

    manifest = build_dataset(
        target=args.target,
        holdout=args.holdout,
        resume=not args.no_resume,
        use_scrapegraph=not args.no_scrapegraph,
        max_urls=args.max_urls,
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
