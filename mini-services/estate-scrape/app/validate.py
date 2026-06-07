from __future__ import annotations

import re

from app.schemas import ArticleExtract, EstateKnowledgeRow, QAPair, TrainingMessage
from app.config import ESTATE_AGENT_SYSTEM


def is_valid_persian(text: str) -> bool:
    if len(text.strip()) < 8:
        return False
    if not re.search(r"[\u0600-\u06FF]", text):
        return False
    if re.search(r"بروزرسانی|دانلود نسخه|404 not found", text, re.I):
        return False
    return True


def validate_article(data: dict) -> ArticleExtract | None:
    try:
        qa = []
        for pair in data.get("qa_pairs") or []:
            if not isinstance(pair, dict):
                continue
            q = str(pair.get("question", "")).strip()
            a = str(pair.get("answer", "")).strip()
            if is_valid_persian(q) and is_valid_persian(a) and len(a) >= 30:
                qa.append(QAPair(question=q, answer=a))
        if len(qa) < 2:
            return None
        title = str(data.get("title", "")).strip() or "مقاله املاک"
        summary = str(data.get("summary", "")).strip()
        if not is_valid_persian(summary):
            return None
        topics = [str(t).strip() for t in (data.get("topics") or []) if str(t).strip()]
        return ArticleExtract(title=title, summary=summary, topics=topics, qa_pairs=qa)
    except Exception:
        return None


def article_to_rows(article: ArticleExtract, *, source_url: str, row_id_prefix: str) -> list[EstateKnowledgeRow]:
    rows: list[EstateKnowledgeRow] = []

    rows.append(
        EstateKnowledgeRow(
            id=f"{row_id_prefix}-summary",
            messages=[
                TrainingMessage(role="system", content=ESTATE_AGENT_SYSTEM),
                TrainingMessage(
                    role="user",
                    content=f"خلاصه‌ای درباره «{article.title}» بده.",
                ),
                TrainingMessage(role="assistant", content=article.summary),
            ],
            meta={"type": "summary", "source_url": source_url, "topics": article.topics},
        )
    )

    for i, pair in enumerate(article.qa_pairs):
        rows.append(
            EstateKnowledgeRow(
                id=f"{row_id_prefix}-qa-{i}",
                messages=[
                    TrainingMessage(role="system", content=ESTATE_AGENT_SYSTEM),
                    TrainingMessage(role="user", content=pair.question),
                    TrainingMessage(role="assistant", content=pair.answer),
                ],
                meta={
                    "type": "qa",
                    "source_url": source_url,
                    "title": article.title,
                },
            )
        )

    return rows


def dedupe_rows(rows: list[EstateKnowledgeRow]) -> list[EstateKnowledgeRow]:
    seen: set[str] = set()
    out: list[EstateKnowledgeRow] = []
    for row in rows:
        user = next((m.content for m in row.messages if m.role == "user"), "")
        key = re.sub(r"\s+", " ", user.strip().lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out
