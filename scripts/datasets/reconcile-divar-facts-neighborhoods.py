#!/usr/bin/env python3
"""Apply a pinned, exact Divar→app neighborhood crosswalk to normalized facts.

This changes only ``offerLocation`` in an already normalized local Divar facts
corpus. It does not generate seeker text, infer a user's intent, or call a model.
The output is a separate local-only derivative; the source facts and active
training inputs are never overwritten.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterator


ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_TYPE = "location-reference-crosswalk-not-training-data"
EXACT_BASES = {
    "unique-exact-normalized-official-name",
    "unique-literal-official-name",
}
LEGACY_BASIS = "unique-exact-normalized-name-after-removing-legacy-suffix"


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}.")
    return value


def iter_jsonl(path: Path) -> Iterator[tuple[int, bytes, dict[str, Any]]]:
    with path.open("rb") as stream:
        for line_number, raw_line in enumerate(stream, 1):
            if not raw_line.strip():
                raise ValueError(f"Blank JSONL row at line {line_number}.")
            try:
                row = json.loads(raw_line)
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise ValueError(f"Invalid UTF-8 JSON at line {line_number}.") from exc
            if not isinstance(row, dict):
                raise ValueError(f"Expected an object at line {line_number}.")
            yield line_number, raw_line, row


def load_crosswalk(path: Path) -> tuple[dict[tuple[str, str], dict[str, str]], dict[str, Any]]:
    payload = read_json(path)
    if payload.get("artifactType") != ARTIFACT_TYPE:
        raise ValueError("The supplied file is not an official Divar/app location crosswalk.")
    source_hash = payload.get("source", {}).get("snapshotSha256")
    if not isinstance(source_hash, str) or len(source_hash) != 64:
        raise ValueError("The crosswalk has no pinned Divar snapshot SHA-256.")

    mapped: dict[tuple[str, str], dict[str, str]] = {}
    for entry in payload.get("entries", []):
        if not isinstance(entry, dict):
            continue
        status = entry.get("status")
        basis = entry.get("matchBasis")
        if status == "exact" and basis in EXACT_BASES:
            match_kind = "exact_official_crosswalk"
            source_kind = (
                "official_divar_district_and_unique_literal_app_catalog_name_match"
                if basis == "unique-literal-official-name"
                else "official_divar_district_and_unique_exact_app_catalog_match"
            )
        elif (
            status == "legacy_alias"
            and basis == LEGACY_BASIS
            and entry.get("legacyNameSuffix") == "قدیمی"
            and isinstance(entry.get("divarDistrictId"), int)
        ):
            match_kind = "legacy_suffix_alias"
            source_kind = "official_divar_district_and_unique_app_name_after_legacy_suffix_alias"
        else:
            continue

        source_city = entry.get("sourceCitySlug")
        source_neighborhood = entry.get("sourceNeighborhoodSlug")
        app_city = entry.get("appCitySlug")
        app_neighborhood_id = entry.get("appNeighborhoodId")
        app_neighborhood_name = entry.get("appNeighborhoodName")
        if not all(isinstance(value, str) and value.strip() for value in (
            source_city,
            source_neighborhood,
            app_city,
            app_neighborhood_id,
            app_neighborhood_name,
        )):
            raise ValueError("A resolved crosswalk entry is missing a required city/neighborhood key.")
        key = (source_city.strip().lower(), source_neighborhood.strip().lower())
        value = {
            "appCitySlug": app_city.strip(),
            "appNeighborhoodId": app_neighborhood_id.strip(),
            "appNeighborhoodName": app_neighborhood_name.strip(),
            "matchKind": match_kind,
            "sourceKind": source_kind,
            "matchBasis": basis,
        }
        prior = mapped.get(key)
        if prior is not None and prior != value:
            raise ValueError(f"Conflicting resolved crosswalk entries for {key!r}.")
        mapped[key] = value
    if not mapped:
        raise ValueError("The crosswalk has no validated exact or legacy-alias mappings.")
    return mapped, payload


def reconcile_row(
    row: dict[str, Any],
    mapping: dict[tuple[str, str], dict[str, str]],
) -> tuple[dict[str, Any], str]:
    location = row.get("offerLocation")
    if not isinstance(location, dict):
        raise ValueError("A facts row has no offerLocation object.")
    source_city = location.get("sourceCitySlug")
    source_neighborhood = location.get("sourceNeighborhoodSlug")
    if not isinstance(source_city, str) or not source_city.strip() or not isinstance(source_neighborhood, str):
        return row, "not_eligible"
    target = mapping.get((source_city.strip().lower(), source_neighborhood.strip().lower()))
    if target is None:
        return row, "not_in_crosswalk"

    old_id = location.get("appNeighborhoodId")
    old_city = location.get("appCitySlug")
    if old_city and old_city != target["appCitySlug"]:
        raise ValueError("Crosswalk city conflicts with the existing app city mapping.")
    if old_id and old_id != target["appNeighborhoodId"]:
        raise ValueError("Crosswalk neighborhood conflicts with the existing app neighborhood mapping.")
    if old_id == target["appNeighborhoodId"]:
        return row, "already_mapped"

    updated = dict(row)
    updated_location = dict(location)
    updated_location.update({
        "appCitySlug": target["appCitySlug"],
        "appNeighborhoodId": target["appNeighborhoodId"],
        "appNeighborhoodName": target["appNeighborhoodName"],
        "neighborhoodMatch": target["matchKind"],
        "neighborhoodSource": target["sourceKind"],
    })
    updated["offerLocation"] = updated_location
    return updated, "newly_mapped_literal_exact" if target["matchBasis"] == "unique-literal-official-name" else "newly_mapped_crosswalk"


def reconcile_facts(
    input_path: Path,
    input_manifest_path: Path,
    crosswalk_path: Path,
    output_path: Path,
    output_manifest_path: Path,
    *,
    dry_run: bool = False,
) -> dict[str, Any]:
    for path in (input_path, input_manifest_path, crosswalk_path):
        if not path.is_file():
            raise FileNotFoundError(f"Required source artifact is missing: {path}")
    if input_path.resolve() == output_path.resolve() or output_path.resolve() == output_manifest_path.resolve():
        raise ValueError("Output paths must be distinct from source paths and each other.")
    if output_path.exists() or output_manifest_path.exists():
        raise FileExistsError("Refusing to overwrite an existing facts or manifest output.")

    input_manifest = read_json(input_manifest_path)
    mapping, crosswalk = load_crosswalk(crosswalk_path)
    facts_snapshot_hash = input_manifest.get("datasetSha256")
    if facts_snapshot_hash != crosswalk["source"]["snapshotSha256"]:
        raise ValueError("The facts and neighborhood crosswalk refer to different Divar source snapshots.")

    input_digest = hashlib.sha256()
    output_digest = hashlib.sha256()
    counts: Counter[str] = Counter()
    rows = 0
    output_bytes = 0
    temporary_path: Path | None = None
    manifest_temp_path: Path | None = None
    output_published = False
    manifest_published = False
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_manifest_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        output_stream = None
        if not dry_run:
            handle = tempfile.NamedTemporaryFile(
                mode="wb",
                prefix=f".{output_path.name}.",
                suffix=".partial",
                dir=output_path.parent,
                delete=False,
            )
            temporary_path = Path(handle.name)
            output_stream = handle

        try:
            for line_number, raw_line, row in iter_jsonl(input_path):
                input_digest.update(raw_line)
                result, disposition = reconcile_row(row, mapping)
                counts[disposition] += 1
                rows += 1
                if output_stream is not None:
                    encoded = (json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
                    output_stream.write(encoded)
                    output_digest.update(encoded)
                    output_bytes += len(encoded)
            if output_stream is not None:
                output_stream.flush()
                os.fsync(output_stream.fileno())
        finally:
            if output_stream is not None:
                output_stream.close()

        expected_rows = input_manifest.get("outputRows")
        if isinstance(expected_rows, int) and rows != expected_rows:
            raise ValueError(f"Facts row count changed: expected {expected_rows}, read {rows}.")
        expected_input_digest = input_manifest.get("outputSha256")
        if isinstance(expected_input_digest, str) and input_digest.hexdigest() != expected_input_digest:
            raise ValueError("The facts file SHA-256 does not match its source manifest.")

        result = {
            "status": "dry_run_complete" if dry_run else "complete",
            "schemaVersion": 1,
            "taskType": "divar-property-offer-facts-neighborhood-reconciled/v1",
            "input": {
                "path": str(input_path),
                "rows": rows,
                "bytes": input_path.stat().st_size,
                "sha256": input_digest.hexdigest(),
                "taskType": input_manifest.get("taskType", "divar-property-offer-facts/v2"),
            },
            "source": {
                "dataset": "divarofficial/real_estate_ads",
                "snapshotSha256": facts_snapshot_hash,
                "sourceType": "seller_or_agent_property_offer",
                "realNeedGroundTruth": False,
                "syntheticSeekerIntent": False,
            },
            "crosswalk": {
                "path": str(crosswalk_path),
                "sha256": hashlib.sha256(crosswalk_path.read_bytes()).hexdigest(),
                "resolvedCityNeighborhoodPairs": len(mapping),
                "coverage": crosswalk.get("coverage", {}),
                "fuzzyMatching": False,
            },
            "reconciliation": {
                "rowCounts": dict(sorted(counts.items())),
                "newlyMappedRows": counts["newly_mapped_literal_exact"] + counts["newly_mapped_crosswalk"],
                "newlyMappedLiteralExactRows": counts["newly_mapped_literal_exact"],
                "conflicts": 0,
                "nonLocationFieldsChanged": 0,
            },
            "qualityAndUse": {
                "outputRows": rows,
                "outputBytes": None if dry_run else output_bytes,
                "outputSha256": None if dry_run else output_digest.hexdigest(),
                "realNeedGroundTruth": False,
                "trainingEligibleForProduction": False,
                "redistributionAllowed": False,
                "cloudTransferAllowed": False,
                "privacyReview": "inherited from normalized source; regex-based contact redaction is not comprehensive",
                "rightsReview": "pending; local research artifact only",
            },
            "output": None if dry_run else str(output_path),
            "manifest": None if dry_run else str(output_manifest_path),
        }
        if dry_run:
            return result

        manifest_temp = tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            prefix=f".{output_manifest_path.name}.",
            suffix=".partial",
            dir=output_manifest_path.parent,
            delete=False,
        )
        manifest_temp_path = Path(manifest_temp.name)
        try:
            json.dump(result, manifest_temp, ensure_ascii=False, indent=2)
            manifest_temp.write("\n")
            manifest_temp.flush()
            os.fsync(manifest_temp.fileno())
        finally:
            manifest_temp.close()

        if output_path.exists() or output_manifest_path.exists():
            manifest_temp_path.unlink(missing_ok=True)
            raise FileExistsError("An output path appeared during reconciliation; refusing to overwrite it.")
        os.link(temporary_path, output_path)
        output_published = True
        temporary_path.unlink()
        temporary_path = None
        os.link(manifest_temp_path, output_manifest_path)
        manifest_published = True
        manifest_temp_path.unlink()
        manifest_temp_path = None
        return result
    except Exception:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        if manifest_temp_path is not None:
            manifest_temp_path.unlink(missing_ok=True)
        if output_published and not manifest_published:
            output_path.unlink(missing_ok=True)
        raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--input-manifest", type=Path, required=True)
    parser.add_argument("--crosswalk", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--output-manifest", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true", help="Validate every source row and print counts without writing output.")
    args = parser.parse_args(argv)
    paths = [args.input, args.input_manifest, args.crosswalk, args.output, args.output_manifest]
    resolved = [path if path.is_absolute() else ROOT / path for path in paths]
    result = reconcile_facts(*resolved, dry_run=args.dry_run)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
