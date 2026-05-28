from __future__ import annotations

import ast
import json
import re
from typing import Any

from app.config import MAX_TOKENS, TEMPERATURE
from app.model_loader import get_model_state
from app.prompts import NEED_INTAKE_SYSTEM_PROMPT


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
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
        # Some models output Python-like dicts with single quotes.
        try:
            parsed = ast.literal_eval(text)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        # Heuristic: convert single quotes → double quotes.
        # (Works when the only issue is quote style.)
        try:
            normalized = text.replace("'", '"')
            return json.loads(normalized)
        except Exception:
            raise e


def parse_text(text: str) -> tuple[dict[str, Any], str]:
    state = get_model_state()
    if state.load_error or state.model is None or state.tokenizer is None:
        raise RuntimeError(state.load_error or "Model not loaded")

    from mlx_lm import generate

    # Keep prompt format consistent with our training text conversion.
    prompt = (
        f"<|system|>\n{NEED_INTAKE_SYSTEM_PROMPT}\n"
        f"<|user|>\n{text.strip()}\n"
        "<|assistant|>\n"
    )

    raw = generate(
        state.model,
        state.tokenizer,
        prompt,
        max_tokens=MAX_TOKENS,
        verbose=False,
    )
    raw_str = raw.strip() if isinstance(raw, str) else str(raw).strip()
    try:
        labels = _extract_json(raw_str)
        return labels, raw_str
    except Exception as e:
        snippet = raw_str[:500]
        raise RuntimeError(f"Model output parse failed: {e}. Raw snippet: {snippet}")
