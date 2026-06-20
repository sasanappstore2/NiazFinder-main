#!/usr/bin/env python3
"""
Line-by-line clean + dedupe smart_marketplace JSONL for NiazFinder intake training.

Does NOT modify the source file. Writes:
  - reports/smart-marketplace-clean.jsonl
  - reports/smart-marketplace-clean-manifest.json

Run:
  python3 scripts/datasets/clean-smart-marketplace-dataset.py
  python3 scripts/datasets/clean-smart-marketplace-dataset.py --input=/path/to/file.jsonl
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = Path.home() / "Downloads" / "smart_marketplace_500000.jsonl"
DEFAULT_OUTPUT = ROOT / "reports" / "smart-marketplace-clean.jsonl"
MANIFEST_OUTPUT = ROOT / "reports" / "smart-marketplace-clean-manifest.json"

CATEGORIES_TREE = ROOT / "src/data/iran-categories-tree.json"
LOCATIONS_TREE = ROOT / "src/data/iran-locations-tree.json"

PATH_SEP = " \u203a "

SYSTEM_PROMPT_FA = (
    "\u062a\u0648 \u06cc\u06a9 \u0645\u0648\u062a\u0648\u0631 \u0627\u0633\u062a\u062e\u0631\u0627\u062c \u0627\u0637\u0644\u0627\u0639\u0627\u062a "
    "\u0628\u0631\u0627\u06cc \u0628\u0627\u0632\u0627\u0631 \u0646\u06cc\u0627\u0632\u0641\u0627\u06cc\u0646\u062f\u0631 (\u0641\u0627\u0631\u0633\u06cc) \u0647\u0633\u062a\u06cc. "
    "\u0627\u0632 \u0645\u062a\u0646 \u06a9\u0627\u0631\u0628\u0631 \u0641\u0642\u0637 \u06cc\u06a9 JSON \u0645\u0639\u062a\u0628\u0631 \u0628\u0631\u06af\u0631\u062f\u0627\u0646 \u0628\u0627 \u0641\u06cc\u0644\u062f\u0647\u0627\u06cc: "
    "location (province/city/neighborhood \u0648 cityId/neighborhoodId \u062f\u0631 \u0635\u0648\u0631\u062a \u0642\u0637\u0639\u06cc\u062a\u060c "
    "categories (\u0622\u0631\u0627\u06cc\u0647\u200c\u0627\u06cc \u0627\u0632 slug \u0648 \u0646\u0627\u0645 \u0641\u0627\u0631\u0633\u06cc/\u0627\u0646\u06af\u0644\u06cc\u0633\u06cc)\u060c "
    "categorySlugs\u060c status\u060c options. "
    "\u0628\u062f\u0648\u0646 markdown \u0648 \u0628\u062f\u0648\u0646 \u062a\u0648\u0636\u06cc\u062d. "
    'Schema: {"location":{"province":string|null,"city":string|null,"neighborhood":string|null,'
    '"cityId":string|null,"neighborhoodId":string|null},'
    '"categories":[{"slug":string,"pathFa":string,"nameFa":string,"nameEn":string}],'
    '"categorySlugs":string[],'
    '"status":"resolved"|"ambiguous_location"|"missing_location"|"missing_intent",'
    '"options":[{"city":string,"province":string,"cityId":string}]}. '
    "\u0627\u06af\u0631 \u0634\u0647\u0631 \u0648 \u0645\u062d\u0644\u0647 \u0648 \u062f\u0633\u062a\u0647 \u0645\u0634\u062e\u0635 \u0627\u0633\u062a status=resolved. "
    "\u0627\u06af\u0631 \u0646\u0627\u0645 \u0645\u062d\u0644\u0647 \u062f\u0631 \u0686\u0646\u062f \u0634\u0647\u0631 \u062a\u06a9\u0631\u0627\u0631 \u0627\u0633\u062a ambiguous_location \u0648 options \u0628\u062f\u0647. "
    "\u0627\u06af\u0631 \u062f\u0633\u062a\u0647 \u0645\u0634\u062e\u0635 \u0627\u0633\u062a \u0648\u0644\u06cc \u0645\u06a9\u0627\u0646 \u0646\u0647 missing_location. "
    "\u0627\u06af\u0631 \u0645\u06a9\u0627\u0646 \u0645\u0634\u062e\u0635 \u0627\u0633\u062a \u0648\u0644\u06cc \u062f\u0633\u062a\u0647 \u0646\u0647 missing_intent. "
    "\u062f\u0633\u062a\u0647\u200c\u0647\u0627 \u0631\u0627 \u0641\u0642\u0637 \u0627\u0632 slug\u0647\u0627\u06cc \u06a9\u0627\u062a\u0627\u0644\u0648\u06af \u0646\u06cc\u0627\u0632\u0641\u0627\u06cc\u0646\u062f\u0631 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646."
)

MIN_USER_LEN = 12
MAX_USER_LEN = 200

_ARABIC_TO_PERSIAN = str.maketrans("\u064a\u0643\u0629\u0640", "\u06cc\u06a9\u0647\u200c")


def norm_match(text: str) -> str:
    """Normalize for catalog lookup (ZWNJ-insensitive, stable spacing)."""
    t = text.strip().translate(_ARABIC_TO_PERSIAN)
    t = t.replace("\u200c", "")
    t = re.sub(r"\s+", " ", t)
    t = t.replace("\u0643", "\u06a9").replace("\u064a", "\u06cc")
    return t.strip()


def norm_fa(text: str) -> str:
    t = norm_match(text)
    return t


def norm_category_path(text: str) -> str:
    t = norm_match(text)
    for sep in (PATH_SEP, " > ", " / ", " \u00bb ", "->"):
        t = t.replace(sep.strip(), PATH_SEP.strip())
    # re-insert canonical separators after stripping inner spaces around ?
    parts = [p.strip() for p in re.split(r"\s*\u203a\s*|\s*>\s*|\s*/\s*", t) if p.strip()]
    return PATH_SEP.join(parts) if len(parts) > 1 else parts[0] if parts else t


def norm_user_key(text: str) -> str:
    t = norm_fa(text).lower()
    t = re.sub(r"[\W_]+", " ", t, flags=re.UNICODE).strip()
    return t


@dataclass
class Indexes:
    path_to_cat: dict[str, dict[str, str]]
    slug_to_cat: dict[str, dict[str, str]]
    city_by_name: dict[str, dict[str, Any]]
    hood_by_city: dict[str, dict[str, dict[str, str]]]
    hood_locations: dict[str, list[dict[str, str]]]


def walk_categories(nodes: list[dict], prefix: str = "") -> dict[str, dict[str, str]]:
    out: dict[str, dict[str, str]] = {}
    for n in nodes:
        fa = n["nameFa"]
        path = f"{prefix}{PATH_SEP}{fa}" if prefix else fa
        info = {
            "slug": n["slug"],
            "pathFa": path,
            "nameFa": fa,
            "nameEn": n.get("nameEn") or n["slug"],
        }
        out[path] = info
        out[norm_match(path)] = info
        out[n["slug"]] = info
        if n.get("children"):
            out.update(walk_categories(n["children"], path))
    return out


def load_indexes() -> Indexes:
    cat_doc = json.loads(CATEGORIES_TREE.read_text(encoding="utf-8"))
    path_to_cat = walk_categories(cat_doc["categories"])

    loc_doc = json.loads(LOCATIONS_TREE.read_text(encoding="utf-8"))
    city_by_name: dict[str, dict[str, Any]] = {}
    hood_by_city: dict[str, dict[str, dict[str, str]]] = {}
    hood_locations: dict[str, list[dict[str, str]]] = {}

    for prov in loc_doc["countries"][0]["provinces"]:
        pname = prov["name"]
        for city in prov["cities"]:
            cname = city["name"]
            city_by_name[cname] = {
                "cityId": city["id"],
                "city": cname,
                "province": pname,
                "nameEn": city.get("nameEn") or city["id"],
            }
            city_by_name[norm_match(cname)] = city_by_name[cname]
            hood_map: dict[str, dict[str, str]] = {}
            for hood in city.get("neighborhoods") or []:
                hname = hood["name"]
                entry = {
                    "cityId": city["id"],
                    "city": cname,
                    "province": pname,
                    "neighborhoodId": hood["id"],
                    "neighborhood": hname,
                }
                hood_map[hname] = entry
                hood_map[norm_match(hname)] = entry
                hood_locations.setdefault(hname, []).append(entry)
                hood_locations.setdefault(norm_match(hname), []).append(entry)
            hood_by_city[cname] = hood_map
            hood_by_city[norm_match(cname)] = hood_map

    slug_to_cat = {v["slug"]: v for v in path_to_cat.values() if "pathFa" in v}

    return Indexes(
        path_to_cat=path_to_cat,
        slug_to_cat=slug_to_cat,
        city_by_name=city_by_name,
        hood_by_city=hood_by_city,
        hood_locations=hood_locations,
    )


def map_categories(raw_cats: list[str], idx: Indexes) -> tuple[list[dict], list[str]] | None:
    mapped: list[dict] = []
    slugs: list[str] = []
    for path in raw_cats:
        key = norm_category_path(str(path))
        info = idx.path_to_cat.get(key)
        if not info:
            return None
        mapped.append(
            {
                "slug": info["slug"],
                "pathFa": info["pathFa"],
                "nameFa": info["nameFa"],
                "nameEn": info["nameEn"],
            }
        )
        slugs.append(info["slug"])
    return mapped, slugs


def validate_status(payload: dict) -> str | None:
    st = payload.get("status")
    loc = payload.get("location") or {}
    cats = payload.get("categories") or payload.get("categorySlugs") or []
    opts = payload.get("options") or []

    has_loc = bool(loc.get("city") or loc.get("neighborhood"))
    has_cat = len(cats) > 0

    if st == "resolved":
        if not has_cat:
            return "resolved_without_category"
        if not (loc.get("city") and loc.get("neighborhood")):
            return "resolved_without_full_location"
        if not loc.get("cityId") or not loc.get("neighborhoodId"):
            return "resolved_without_ids"
    elif st == "ambiguous_location":
        if not opts:
            return "ambiguous_without_options"
        if loc.get("city"):
            return "ambiguous_with_city_set"
        if not loc.get("neighborhood"):
            return "ambiguous_without_neighborhood"
    elif st == "missing_location":
        if has_loc:
            return "missing_location_with_location"
        if not has_cat:
            return "missing_location_without_category"
    elif st == "missing_intent":
        if has_cat:
            return "missing_intent_with_category"
        if not has_loc:
            return "missing_intent_without_location"
    else:
        return "unknown_status"
    return None


def resolve_location(
    loc: dict[str, Any], idx: Indexes
) -> tuple[dict[str, Any] | None, str | None, bool]:
    """Returns (location, error, was_fixed)."""
    city = loc.get("city")
    hood = loc.get("neighborhood")
    prov = loc.get("province")

    if not city or not hood:
        return None, "incomplete_location", False

    city = norm_match(str(city))
    hood = norm_match(str(hood))

    if city not in idx.city_by_name:
        return None, "unknown_city", False

    fixed = False

    if hood in idx.hood_by_city.get(city, {}):
        entry = idx.hood_by_city[city][hood]
        out = {
            "province": entry["province"],
            "city": entry["city"],
            "neighborhood": entry["neighborhood"],
            "cityId": entry["cityId"],
            "neighborhoodId": entry["neighborhoodId"],
        }
        if prov and norm_fa(str(prov)) != entry["province"]:
            fixed = True
        return out, None, fixed

    candidates = idx.hood_locations.get(hood, [])
    if not candidates:
        return None, "unknown_neighborhood", False

    if len(candidates) == 1:
        entry = candidates[0]
        return {
            "province": entry["province"],
            "city": entry["city"],
            "neighborhood": entry["neighborhood"],
            "cityId": entry["cityId"],
            "neighborhoodId": entry["neighborhoodId"],
        }, None, True

    matching = [c for c in candidates if c["city"] == city]
    if matching:
        entry = matching[0]
        return {
            "province": entry["province"],
            "city": entry["city"],
            "neighborhood": entry["neighborhood"],
            "cityId": entry["cityId"],
            "neighborhoodId": entry["neighborhoodId"],
        }, None, True

    return None, "hood_city_mismatch", False


def build_ambiguous_options(hood: str, idx: Indexes) -> list[dict]:
    opts: list[dict] = []
    seen: set[str] = set()
    for entry in idx.hood_locations.get(norm_fa(hood), []):
        key = entry["cityId"]
        if key in seen:
            continue
        seen.add(key)
        opts.append(
            {
                "city": entry["city"],
                "province": entry["province"],
                "cityId": entry["cityId"],
            }
        )
    return sorted(opts, key=lambda o: o["city"])


def quality_score(user: str, status: str, fixed: bool) -> int:
    score = min(len(user), 100)
    if status == "resolved":
        score += 30
    elif status == "ambiguous_location":
        score += 20
    elif status == "missing_location":
        score += 15
    else:
        score += 10
    if fixed:
        score -= 3
    return score


@dataclass
class Stats:
    total: int = 0
    accepted: int = 0
    rejected: Counter = field(default_factory=Counter)
    duplicates: int = 0
    location_fixed: int = 0
    converted_to_ambiguous: int = 0
    status_counts: Counter = field(default_factory=Counter)


def process_record(
    line_no: int,
    raw: dict,
    idx: Indexes,
) -> tuple[dict | None, str | None, dict]:
    meta: dict[str, Any] = {"line": line_no}

    msgs = raw.get("messages")
    if not isinstance(msgs, list) or len(msgs) != 3:
        return None, "bad_message_structure", meta
    if [m.get("role") for m in msgs] != ["system", "user", "assistant"]:
        return None, "bad_roles", meta

    user = norm_fa(str(msgs[1].get("content") or ""))
    if len(user) < MIN_USER_LEN:
        return None, "user_too_short", meta
    if len(user) > MAX_USER_LEN:
        return None, "user_too_long", meta

    try:
        assistant_raw = json.loads(str(msgs[2].get("content") or ""))
    except json.JSONDecodeError:
        return None, "assistant_not_json", meta

    status = assistant_raw.get("status")
    raw_cats = assistant_raw.get("categories") or []
    if not isinstance(raw_cats, list):
        return None, "bad_categories", meta

    cat_mapped = map_categories([str(c) for c in raw_cats], idx)
    if cat_mapped is None and status != "missing_intent":
        return None, "unknown_category", meta

    categories: list[dict] = []
    category_slugs: list[str] = []
    if cat_mapped:
        categories, category_slugs = cat_mapped

    loc_in = assistant_raw.get("location") or {}
    options_in = assistant_raw.get("options") or []
    fixed = False
    converted = False

    location_out: dict[str, Any] | None = None
    options_out: list[dict] = []

    if status == "resolved":
        resolved, err, fixed = resolve_location(loc_in, idx)
        if err == "hood_city_mismatch":
            hood = norm_fa(str(loc_in.get("neighborhood") or ""))
            options_out = build_ambiguous_options(hood, idx)
            if len(options_out) >= 2:
                status = "ambiguous_location"
                converted = True
                location_out = {
                    "province": None,
                    "city": None,
                    "neighborhood": hood,
                    "cityId": None,
                    "neighborhoodId": None,
                }
            else:
                return None, err, meta
        elif err:
            return None, err, meta
        else:
            location_out = resolved
    elif status == "ambiguous_location":
        hood = norm_fa(str(loc_in.get("neighborhood") or ""))
        options_out = []
        for opt in options_in:
            cname = norm_fa(str(opt.get("city") or ""))
            if cname not in idx.city_by_name:
                continue
            cm = idx.city_by_name[cname]
            options_out.append(
                {
                    "city": cm["city"],
                    "province": cm["province"],
                    "cityId": cm["cityId"],
                }
            )
        if len(options_out) < 2:
            rebuilt = build_ambiguous_options(hood, idx)
            if len(rebuilt) >= 2:
                options_out = rebuilt
                converted = True
            else:
                return None, "ambiguous_without_valid_options", meta
        location_out = {
            "province": None,
            "city": None,
            "neighborhood": hood or None,
            "cityId": None,
            "neighborhoodId": None,
        }
    elif status == "missing_location":
        location_out = {
            "province": None,
            "city": None,
            "neighborhood": None,
            "cityId": None,
            "neighborhoodId": None,
        }
    elif status == "missing_intent":
        resolved, err, fixed = resolve_location(loc_in, idx)
        if err == "hood_city_mismatch":
            hood = norm_fa(str(loc_in.get("neighborhood") or ""))
            options_out = build_ambiguous_options(hood, idx)
            if len(options_out) >= 2:
                status = "ambiguous_location"
                converted = True
                categories = []
                category_slugs = []
                location_out = {
                    "province": None,
                    "city": None,
                    "neighborhood": hood,
                    "cityId": None,
                    "neighborhoodId": None,
                }
            else:
                return None, err, meta
        elif err:
            return None, err, meta
        else:
            location_out = resolved
    else:
        return None, "unknown_status", meta

    payload = {
        "location": location_out,
        "categories": categories,
        "categorySlugs": category_slugs,
        "status": status,
        "options": options_out,
    }

    err = validate_status(payload)
    if err:
        return None, err, meta

    assistant_str = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    out = {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT_FA},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant_str},
        ],
        "_meta": {
            "sourceLine": line_no,
            "locationFixed": fixed,
            "convertedToAmbiguous": converted,
        },
    }

    meta.update(
        {
            "status": status,
            "fixed": fixed,
            "converted": converted,
            "quality": quality_score(user, status, fixed),
        }
    )
    return out, None, meta


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if not args.input.is_file():
        print(f"Input not found: {args.input}", file=sys.stderr)
        return 1

    idx = load_indexes()
    stats = Stats()
    best_by_user: dict[str, tuple[int, dict, dict]] = {}

    with args.input.open("r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            stats.total += 1
            line = line.strip()
            if not line:
                stats.rejected["empty_line"] += 1
                continue
            try:
                raw = json.loads(line)
            except json.JSONDecodeError:
                stats.rejected["line_not_json"] += 1
                continue

            cleaned, reason, meta = process_record(line_no, raw, idx)
            if reason:
                stats.rejected[reason] += 1
                continue

            user_key = norm_user_key(cleaned["messages"][1]["content"])
            q = meta["quality"]
            prev = best_by_user.get(user_key)
            if prev and prev[0] >= q:
                stats.duplicates += 1
                continue
            if prev:
                stats.duplicates += 1
            best_by_user[user_key] = (q, cleaned, meta)
            if meta.get("fixed"):
                stats.location_fixed += 1
            if meta.get("converted"):
                stats.converted_to_ambiguous += 1

            if line_no % 100000 == 0:
                print(f"  scanned {line_no:,}...", flush=True)

    records = sorted(best_by_user.values(), key=lambda x: x[2].get("line", 0))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as out:
        for _, rec, meta in records:
            train = {k: v for k, v in rec.items() if not k.startswith("_")}
            out.write(json.dumps(train, ensure_ascii=False) + "\n")
            stats.accepted += 1
            stats.status_counts[meta["status"]] += 1

    manifest = {
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "source": str(args.input),
        "output": str(args.output),
        "summary": {
            "sourceLines": stats.total,
            "acceptedUnique": stats.accepted,
            "rejected": sum(stats.rejected.values()),
            "duplicatesRemoved": stats.duplicates,
            "locationFixed": stats.location_fixed,
            "convertedToAmbiguous": stats.converted_to_ambiguous,
            "acceptanceRate": round(stats.accepted / stats.total * 100, 2) if stats.total else 0,
            "status": dict(stats.status_counts),
        },
        "rejectedReasons": dict(stats.rejected.most_common()),
    }
    MANIFEST_OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Source lines: {stats.total:,}")
    print(f"Accepted unique: {stats.accepted:,}")
    print(f"Rejected: {sum(stats.rejected.values()):,}")
    print(f"Duplicates removed: {stats.duplicates:,}")
    print(f"Location auto-fixed: {stats.location_fixed:,}")
    print(f"Converted to ambiguous: {stats.converted_to_ambiguous:,}")
    print(f"Output -> {args.output}")
    print(f"Manifest -> {MANIFEST_OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
