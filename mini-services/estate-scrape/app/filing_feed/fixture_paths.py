"""Canonical repo-root fixture paths for filing portal golden tests."""
from __future__ import annotations

from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[4]
FILING_PORTALS_ROOT = _REPO_ROOT / "fixtures" / "filing-portals"


def filing_portals_dir(*parts: str) -> Path:
    return FILING_PORTALS_ROOT.joinpath(*parts)
