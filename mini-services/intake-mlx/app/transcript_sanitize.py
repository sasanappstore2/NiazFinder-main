from __future__ import annotations

import re
from collections import Counter

# Known Whisper silence / noise hallucinations (Persian + generic).
_HALLUCINATION_PHRASES = frozenset(
    {
        "اینجا",
        "اینجای",
        "اینجاست",
        "ممنون",
        "ممنونم",
        "thank you",
        "thanks",
        "subscribe",
        "subtitles",
        "music",
        "you",
    }
)

# Persian letter often hallucinated on silence/noise.
_LAUGHTER_RE = re.compile(r"^[هھ\s]+$")
_REPEAT_CHAR_RE = re.compile(r"(.)\1{7,}", re.UNICODE)


def _normalize_token(token: str) -> str:
    return re.sub(r"[^\w\u0600-\u06FF]+", "", token).strip().lower()


def _compact(text: str) -> str:
    return re.sub(r"\s+", "", text)


def _is_degenerate_repetition(text: str) -> bool:
    """One character or syllable dominates (هههه…, اینجای اینجای…)."""
    compact = _compact(text)
    if len(compact) < 6:
        return False

    if _LAUGHTER_RE.match(compact) and len(compact) >= 6:
        return True

    counts = Counter(compact)
    _ch, top = counts.most_common(1)[0]
    if top / len(compact) >= 0.62:
        return True

    # Repeated 2-char chunk (e.g. "هه" * 20)
    if len(compact) >= 10:
        for size in (2, 3):
            if len(compact) % size != 0:
                continue
            chunk = compact[:size]
            if chunk * (len(compact) // size) == compact:
                return True

    return False


def _token_dominance_ratio(words: list[str]) -> float:
    normalized = [_normalize_token(w) for w in words]
    normalized = [n for n in normalized if n]
    if len(normalized) < 3:
        return 0.0
    counts = Counter(normalized)
    _token, top = counts.most_common(1)[0]
    return top / len(normalized)


def sanitize_transcript(text: str) -> str:
    """Remove repetitive loops and known silence hallucinations."""
    cleaned = re.sub(r"\s+", " ", (text or "").strip())
    if not cleaned:
        return ""

    if cleaned.lower() in _HALLUCINATION_PHRASES:
        return ""

    if _is_degenerate_repetition(cleaned):
        return ""

    # Strip long runs of a single character inside the string.
    cleaned = _REPEAT_CHAR_RE.sub(r"\1\1", cleaned)
    if _is_degenerate_repetition(cleaned):
        return ""

    words = cleaned.split()
    if _token_dominance_ratio(words) >= 0.4 and len(words) >= 3:
        return ""

    collapsed: list[str] = []
    prev_norm = ""
    run = 0
    for word in words:
        norm = _normalize_token(word)
        if norm and norm == prev_norm:
            run += 1
            if run <= 1:
                collapsed.append(word)
        else:
            collapsed.append(word)
            prev_norm = norm
            run = 0

    result = " ".join(collapsed).strip()
    if not result or result.lower() in _HALLUCINATION_PHRASES:
        return ""
    if _is_degenerate_repetition(result):
        return ""
    if _token_dominance_ratio(result.split()) >= 0.4 and len(result.split()) >= 3:
        return ""

    return result
