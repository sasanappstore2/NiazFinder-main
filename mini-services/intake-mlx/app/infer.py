from __future__ import annotations

import ast
import json
import re
from typing import Any

from app.config import LISTING_TITLE_MAX_LENGTH, MAX_TOKENS, TITLE_MAX_TOKENS
from app.model_loader import get_model_state
from app.prompts import LISTING_COPY_SYSTEM_PROMPT, LISTING_TITLE_SYSTEM_PROMPT, NEED_INTAKE_SYSTEM_PROMPT


def _strip_generation_leak(text: str) -> str:
    """Keep only the first model segment (training rows sometimes leak chat markers)."""
    for marker in ("<|user|>", "<|assistant|>", "<|system|>", "<|user||", "<|assistant|", "\n<|"):
        idx = text.find(marker)
        if idx > 0:
            text = text[:idx]
    return text.strip()


def _extract_json(text: str) -> dict[str, Any]:
    text = _strip_generation_leak(text.strip())
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        try:
            parsed = ast.literal_eval(text)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
        try:
            normalized = text.replace("'", '"')
            return json.loads(normalized)
        except Exception:
            raise e


def generate_with_prompt(system: str, user: str, *, max_tokens: int = MAX_TOKENS) -> str:
    state = get_model_state()
    if state.load_error or state.model is None or state.tokenizer is None:
        raise RuntimeError(state.load_error or "Model not loaded")

    from mlx_lm import generate

    prompt = (
        f"<|system|>\n{system}\n"
        f"<|user|>\n{user.strip()}\n"
        "<|assistant|>\n"
    )

    raw = generate(
        state.model,
        state.tokenizer,
        prompt,
        max_tokens=max_tokens,
        verbose=False,
    )
    return raw.strip() if isinstance(raw, str) else str(raw).strip()


def chat_completion(messages: list[dict[str, str]], *, max_tokens: int = MAX_TOKENS) -> str:
    """OpenAI-style messages → single assistant reply."""
    system_parts: list[str] = []
    user_parts: list[str] = []
    for msg in messages:
        role = msg.get("role", "")
        content = (msg.get("content") or "").strip()
        if not content:
            continue
        if role == "system":
            system_parts.append(content)
        elif role == "user":
            user_parts.append(content)
        elif role == "assistant":
            user_parts.append(f"[assistant]: {content}")

    system = "\n\n".join(system_parts) if system_parts else "You are a helpful assistant."
    user = "\n\n".join(user_parts)
    raw_str = generate_with_prompt(system, user, max_tokens=max_tokens)
    return _strip_generation_leak(raw_str)


def _normalize_title(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:\w+)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    text = text.split("\n", 1)[0].strip()
    text = text.strip('"\'«»')
    if len(text) > LISTING_TITLE_MAX_LENGTH:
        text = text[:LISTING_TITLE_MAX_LENGTH].rstrip()
    return text


def parse_text(text: str) -> tuple[dict[str, Any], str]:
    raw_str = generate_with_prompt(NEED_INTAKE_SYSTEM_PROMPT, text)
    try:
        labels = _extract_json(raw_str)
        return labels, raw_str
    except Exception as e:
        snippet = raw_str[:500]
        raise RuntimeError(f"Model output parse failed: {e}. Raw snippet: {snippet}")


def generate_title(context: dict[str, Any]) -> tuple[str, str]:
    user_payload = json.dumps(context, ensure_ascii=False, indent=2)
    user = f"Write one listing title in Persian for this need:\n{user_payload}"
    raw_str = generate_with_prompt(
        LISTING_TITLE_SYSTEM_PROMPT,
        user,
        max_tokens=TITLE_MAX_TOKENS,
    )
    title = _normalize_title(raw_str)
    if not title:
        raise RuntimeError(f"Empty title from model. Raw snippet: {raw_str[:500]}")
    return title, raw_str


def generate_listing_copy(
    *,
    system_prompt: str | None = None,
    user_prompt: str | None = None,
    context: dict[str, Any] | None = None,
) -> tuple[str, str, str]:
    """Return (title, description, raw)."""
    system = system_prompt or LISTING_COPY_SYSTEM_PROMPT
    if user_prompt:
        user = user_prompt
    else:
        user_payload = json.dumps(context or {}, ensure_ascii=False, indent=2)
        user = f"بر اساس اطلاعات زیر title و description بنویس:\n{user_payload}"

    raw_str = generate_with_prompt(system, user, max_tokens=MAX_TOKENS)
    parsed = _extract_json(raw_str)
    title = _normalize_title(str(parsed.get("title") or ""))
    description = str(parsed.get("description") or "").strip()
    if not title and not description:
        raise RuntimeError(f"Empty listing copy from model. Raw snippet: {raw_str[:500]}")
    return title, description, raw_str
