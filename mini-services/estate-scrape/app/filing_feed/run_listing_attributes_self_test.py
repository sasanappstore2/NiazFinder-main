"""Self-test: listing attribute parser on detail fixtures."""

from __future__ import annotations

import json
from app.filing_feed.fixture_paths import filing_portals_dir

from app.filing_feed.listing_attribute_parser import parse_listing_attributes

FIXTURE_DIR = filing_portals_dir("detail-samples")


def _field_count(row: dict) -> int:
    skip = {"dealType", "propertyKind", "city", "neighborhood", "location", "postedAtText"}
    return sum(1 for k, v in row.items() if k not in skip and v not in (None, "", []))


def main() -> None:
    expected = json.loads((FIXTURE_DIR / "expected.json").read_text(encoding="utf-8"))
    for name, spec in expected.items():
        html = (FIXTURE_DIR / f"{name}.html").read_text(encoding="utf-8")
        parsed = parse_listing_attributes(html)
        assert str(parsed.get("fileCode")) == spec["fileCode"], f"{name}: fileCode"
        assert parsed.get("dealType") == spec["dealType"], f"{name}: dealType {parsed.get('dealType')}"
        assert parsed.get("propertyKind") == spec["propertyKind"], f"{name}: kind"
        for key in spec.get("required", []):
            assert parsed.get(key), f"{name}: missing {key}"
        for key in spec.get("forbidden", []):
            assert not parsed.get(key), f"{name}: forbidden {key}={parsed.get(key)}"
        meta = parsed.get("sourceMeta") or {}
        for key in spec.get("requiredSourceMeta", []):
            assert meta.get(key), f"{name}: missing sourceMeta.{key}"
        assert _field_count(parsed) >= spec["minFieldCount"], f"{name}: field count {_field_count(parsed)}"
        print(f"[OK] {name}: deal={parsed['dealType']} fields={_field_count(parsed)}")

    print("[OK] listing attribute parser self-test passed")


if __name__ == "__main__":
    main()
