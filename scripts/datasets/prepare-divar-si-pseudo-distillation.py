#!/usr/bin/env python3
"""Prepare a local, research-only Si self-distillation corpus from v9 proposals.

The output is explicitly pseudo-labeled by Si, never real-need ground truth.
It contains generated request text, hashed source-group ids, and three typed
categorical decisions only; raw Divar offer text and identifiers are omitted.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
import re
import shutil
import sqlite3
import tempfile
from pathlib import Path
from typing import Any, Iterator


ROOT = Path(__file__).resolve().parents[2]
MODEL_ID = "convaiinnovations/si-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
MODEL_WEIGHTS_SHA256 = "9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204"
TASK = "divar-si-pseudo-distillation/v1"
HYPOTHETICAL_TASK = "divar-si-pseudo-need/v1"
PSEUDO_SOURCE = "si_pseudo_label_v1"
FIELDS = ("category_candidate", "property_kind", "transaction_type")
MIN_ROWS_DEFAULT = 100_000
RESERVE_BYTES = 512 * 1024 * 1024
PHONE_RE = re.compile(r"(?<!\d)(?:\+?98|0098|0)?9\d{9}(?!\d)")
EMAIL_RE = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_json(value: Any) -> str:
    return hashlib.sha256(json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=False,
    ).encode("utf-8")).hexdigest()


def normalized_text(value: str) -> str:
    import unicodedata

    text = unicodedata.normalize("NFKC", value)
    text = text.translate(str.maketrans({
        "ي": "ی", "ى": "ی", "ك": "ک",
        **{chr(code): str(code - 0x06F0) for code in range(0x06F0, 0x06FA)},
        **{chr(code): str(code - 0x0660) for code in range(0x0660, 0x066A)},
    }))
    normalized: list[str] = []
    for character in text:
        if character in {"\u200c", "\u200e", "\u200f"}:
            continue
        if character.isspace() or unicodedata.category(character)[0] in {"P", "S"}:
            normalized.append(" ")
        else:
            normalized.append(character)
    return " ".join("".join(normalized).lower().split())


def split_for_state_digest(state_digest: str) -> str:
    bucket = int(state_digest[:8], 16) % 100
    return "train" if bucket < 80 else "calibration" if bucket < 90 else "test"


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}.")
    return value


def iter_jsonl(path: Path) -> Iterator[tuple[int, dict[str, Any]]]:
    with path.open(encoding="utf-8") as stream:
        for line_number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Malformed JSONL at line {line_number}.") from exc
            if not isinstance(value, dict):
                raise ValueError(f"Expected a JSON object at line {line_number}.")
            yield line_number, value


def decision_fingerprint(decisions: dict[str, Any]) -> str:
    values = {field: decisions[field]["value"] for field in FIELDS}
    return hashlib.sha256(json.dumps(values, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def row_to_training_record(
    source_row: dict[str, Any], questions: dict[str, Any], question_hash: str,
) -> tuple[dict[str, Any] | None, str]:
    proposal = source_row.get("siDerivedHypotheticalNeed")
    source = source_row.get("source")
    hypothetical = source_row.get("hypotheticalNeed")
    si = source_row.get("si")
    review = source_row.get("review")
    rights = source_row.get("rights")
    if not isinstance(proposal, dict) or not isinstance(source, dict) or not isinstance(hypothetical, dict):
        return None, "missing_proposal_or_provenance"
    if (
        source_row.get("taskType") != "divar-counterfactual-post-need-si-proposal/v5"
        or source_row.get("synthetic") is not True
        or source_row.get("derivedFromSupplyListing") is not True
        or source_row.get("realNeedGroundTruth") is not False
        or source_row.get("trainingEligible") is not False
        or source.get("dataset") != "divarofficial/real_estate_ads"
        or not isinstance(si, dict)
        or si.get("model") != MODEL_ID
        or not isinstance(review, dict)
        or review.get("trainingUse") != "not_approved"
        or not isinstance(rights, dict)
        or rights.get("redistributionAllowed") is not False
    ):
        return None, "source_provenance_not_eligible"
    if proposal.get("taskType") != "divar-si-derived-hypothetical-need/v1":
        return None, "unsupported_proposal_task"
    if proposal.get("conversionStatus") != "rendered_from_compatible_si_choices":
        return None, "not_renderable_or_not_source_compatible"
    if (
        proposal.get("accepted") is not False
        or proposal.get("realNeedGroundTruth") is not False
        or proposal.get("trainingEligible") is not False
        or proposal.get("synthetic") is not True
        or proposal.get("model") != MODEL_ID
    ):
        return None, "proposal_provenance_invalid"
    if hypothetical.get("questionSchemaSha256") != question_hash:
        return None, "question_schema_mismatch"
    state = proposal.get("state")
    if not isinstance(state, str) or not state.strip() or len(state) > 1_000:
        return None, "invalid_generated_state"
    normalized = normalized_text(state)
    if PHONE_RE.search(normalized) or EMAIL_RE.search(normalized):
        return None, "contact_pattern"
    source_group = source.get("normalizedTextGroupSha256")
    if not isinstance(source_group, str) or not re.fullmatch(r"[a-f0-9]{64}", source_group):
        return None, "invalid_source_group_hash"
    agreement = proposal.get("decisionAgreementWithSource")
    if not isinstance(agreement, dict) or any(agreement.get(key) is not True for key in (
        "transactionCategoryCompatible", "propertyKindCategoryCompatible",
        "categoryMatchesSource", "propertyKindMatchesSource", "transactionMatchesSource",
    )):
        return None, "decision_compatibility_gate_failed"
    decisions = proposal.get("decisions")
    if not isinstance(decisions, dict):
        return None, "missing_typed_decisions"

    target_decisions: dict[str, dict[str, Any]] = {}
    for field in FIELDS:
        decision = decisions.get(field)
        question = questions.get(field)
        choices = question.get("criteria") if isinstance(question, dict) else None
        if (
            not isinstance(decision, dict)
            or decision.get("source") != "si_offer_inspection"
            or decision.get("accepted") is not False
            or not isinstance(decision.get("value"), str)
            or question.get("type") != "choice"
            or not isinstance(choices, dict)
            or len(choices) > 20
            or decision["value"] not in choices
        ):
            return None, f"invalid_teacher_decision:{field}"
        confidence = decision.get("confidence")
        if confidence is not None and (
            not isinstance(confidence, (int, float)) or isinstance(confidence, bool)
            or confidence < 0 or confidence > 1
        ):
            return None, f"invalid_teacher_confidence:{field}"
        target_decisions[field] = {
            "value": decision["value"],
            "source": PSEUDO_SOURCE,
            "teacher": MODEL_ID,
            "teacherConfidenceUncalibrated": confidence,
            "humanReviewed": False,
        }

    state_digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    if not normalized:
        return None, "empty_normalized_state"
    source_id_digest = hashlib.sha256(
        f"{source_group}:{state_digest}".encode("utf-8")
    ).hexdigest()
    row = {
        "schemaVersion": 1,
        "taskType": TASK,
        "exampleId": source_id_digest,
        "state": state,
        "stateSha256": state_digest,
        "trainingSplit": split_for_state_digest(state_digest),
        "synthetic": True,
        "derivedFromSupplyListing": True,
        "realNeedGroundTruth": False,
        "trainingEligible": False,
        "targetOrigin": "si_pseudo_labels_not_gold",
        "source": {
            "dataset": "divarofficial/real_estate_ads",
            "splitGroup": source_group,
        },
        "hypotheticalNeed": {
            "taskType": HYPOTHETICAL_TASK,
            "schemaVersion": 1,
            "trainingSplit": split_for_state_digest(state_digest),
            "questionSchemaSha256": question_hash,
            "targetDecisions": target_decisions,
        },
        "teacher": {
            "model": MODEL_ID,
            "source": "local_typed_decisions_on_original_offer_then_template_rendering",
            "humanReviewed": False,
            "confidencePolicy": "stored_for_audit_only_uncalibrated_not_used_as_threshold_or_loss_weight",
        },
        "review": {"status": "pending", "trainingUse": "research_self_distillation_only"},
    }
    return row, "eligible"


def register_signature(
    connection: sqlite3.Connection, table: str, key: str, fingerprint: str, line_number: int,
) -> None:
    cursor = connection.execute(
        f"SELECT fingerprint, first_line, conflict FROM {table} WHERE group_key = ?", (key,),
    )
    previous = cursor.fetchone()
    if previous is None:
        connection.execute(
            f"INSERT INTO {table}(group_key, fingerprint, first_line, conflict) VALUES(?,?,?,0)",
            (key, fingerprint, line_number),
        )
    elif previous[0] != fingerprint:
        connection.execute(f"UPDATE {table} SET conflict = 1 WHERE group_key = ?", (key,))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--input-manifest", type=Path, required=True)
    parser.add_argument("--questions-manifest", type=Path, required=True,
                        help="Completed v8 Si shadow sidecar with the pinned typed questions.")
    parser.add_argument("--expected-input-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--quarantine", type=Path, required=True)
    parser.add_argument("--min-rows", type=int, default=MIN_ROWS_DEFAULT)
    args = parser.parse_args()

    input_path = args.input.expanduser().resolve(strict=True)
    input_manifest_path = args.input_manifest.expanduser().resolve(strict=True)
    questions_manifest_path = args.questions_manifest.expanduser().resolve(strict=True)
    output_path = args.output.expanduser().resolve()
    quarantine_path = args.quarantine.expanduser().resolve()
    manifest_path = Path(str(output_path) + ".manifest.json")
    final_paths = (output_path, quarantine_path, manifest_path)
    if args.min_rows < 32:
        raise SystemExit("The minimum eligible row count must be at least 32.")
    if len(set(final_paths)) != len(final_paths) or any(path.exists() for path in final_paths):
        raise SystemExit("Refusing to overwrite an existing v10 output artifact.")
    if output_path.parent != input_path.parent or quarantine_path.parent != input_path.parent:
        raise SystemExit("v10 outputs must be written beside the pinned Divar corpus.")

    upstream_manifest = read_json(input_manifest_path)
    questions_manifest = read_json(questions_manifest_path)
    source_rows_audited = upstream_manifest.get("sourceRowsAudited")
    duplicate_rows = upstream_manifest.get("duplicateRowsCollapsed", 0)
    conflict_rows = upstream_manifest.get("conflictingRowsQuarantined", 0)
    if (
        upstream_manifest.get("status") != "complete"
        or upstream_manifest.get("taskType") != "divar-counterfactual-post-need-si-proposal/v5"
        or upstream_manifest.get("model") != MODEL_ID
        or upstream_manifest.get("synthetic") is not True
        or upstream_manifest.get("derivedFromSupplyListing") is not True
        or upstream_manifest.get("realNeedGroundTruth") is not False
        or upstream_manifest.get("trainingEligible") is not False
        or upstream_manifest.get("rightsReview") != "pending"
        or not all(isinstance(value, int) and not isinstance(value, bool) and value >= 0
                   for value in (source_rows_audited, duplicate_rows, conflict_rows,
                                 upstream_manifest.get("keptUniqueCounterfactualRows")))
        or upstream_manifest.get("keptUniqueCounterfactualRows") != source_rows_audited - duplicate_rows - conflict_rows
        or sha256_file(input_path) != args.expected_input_sha256
    ):
        raise SystemExit("The v9 sidecar is not a complete, hash-matched, research-only proposal corpus.")
    question_factory = questions_manifest.get("questionFactory")
    questions = question_factory.get("hypotheticalNeedQuestions") if isinstance(question_factory, dict) else None
    if not isinstance(questions, dict) or any(field not in questions for field in FIELDS):
        raise SystemExit("The v8 sidecar lacks the exact typed question contract.")
    question_hash = sha256_json(questions)
    if question_factory.get("hypotheticalNeedQuestionSchemaSha256") != question_hash:
        raise SystemExit("The v8 question contract hash is inconsistent.")

    required_space = int(input_path.stat().st_size * 0.55) + RESERVE_BYTES
    if shutil.disk_usage(output_path.parent).free < required_space:
        raise SystemExit("Insufficient local disk for the bounded v10 output and safety reserve.")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fd, db_name = tempfile.mkstemp(prefix="niazfinder-v10-pseudo-index-", suffix=".sqlite3")
    os.close(fd)
    database_path = Path(db_name)
    temporary_outputs: list[Path] = []
    created_finals: list[Path] = []
    try:
        connection = sqlite3.connect(database_path)
        connection.execute("PRAGMA journal_mode=OFF")
        connection.execute("PRAGMA synchronous=OFF")
        connection.execute("PRAGMA temp_store=FILE")
        connection.execute("CREATE TABLE source_groups(group_key TEXT PRIMARY KEY, fingerprint TEXT, first_line INTEGER, conflict INTEGER)")
        connection.execute("CREATE TABLE generated_states(group_key TEXT PRIMARY KEY, fingerprint TEXT, first_line INTEGER, conflict INTEGER)")
        skipped: collections.Counter[str] = collections.Counter()
        source_rows = 0
        eligible_candidates = 0
        for line_number, raw_row in iter_jsonl(input_path):
            source_rows += 1
            converted, reason = row_to_training_record(raw_row, questions, question_hash)
            if converted is None:
                skipped[reason] += 1
                continue
            source_group = converted["source"]["splitGroup"]
            state_digest = converted["stateSha256"]
            fingerprint = decision_fingerprint(converted["hypotheticalNeed"]["targetDecisions"])
            register_signature(connection, "source_groups", source_group,
                               f"{state_digest}:{fingerprint}", line_number)
            register_signature(connection, "generated_states", state_digest, fingerprint, line_number)
            eligible_candidates += 1
            if eligible_candidates % 10_000 == 0:
                connection.commit()
        connection.commit()

        unique_source_groups = int(connection.execute("SELECT COUNT(*) FROM source_groups").fetchone()[0])
        unique_states = int(connection.execute("SELECT COUNT(*) FROM generated_states").fetchone()[0])
        conflict_source_groups = int(connection.execute("SELECT COUNT(*) FROM source_groups WHERE conflict=1").fetchone()[0])
        conflict_states = int(connection.execute("SELECT COUNT(*) FROM generated_states WHERE conflict=1").fetchone()[0])
        expected_source_rows = upstream_manifest.get("keptUniqueCounterfactualRows")
        if not isinstance(expected_source_rows, int) or source_rows != expected_source_rows:
            raise ValueError("The v9 JSONL row count does not match its finalized manifest.")
        if unique_source_groups == 0 or unique_states == 0:
            raise SystemExit("No compatible Si proposals survived v10 structural checks.")

        output_temp = output_path.with_name(output_path.name + ".partial")
        quarantine_temp = quarantine_path.with_name(quarantine_path.name + ".partial")
        manifest_temp = manifest_path.with_name(manifest_path.name + ".partial")
        temporary_outputs.extend((output_temp, quarantine_temp, manifest_temp))
        for path in temporary_outputs:
            if path.exists():
                raise SystemExit("A v10 partial output already exists; refusing to overwrite it.")

        split_counts: collections.Counter[str] = collections.Counter()
        targets_by_field: dict[str, collections.Counter[str]] = {field: collections.Counter() for field in FIELDS}
        cities: set[str] = set()
        neighborhoods: set[str] = set()
        emitted = quarantined = duplicate_rows = 0
        output_hash = hashlib.sha256()
        with output_temp.open("x", encoding="utf-8") as out_stream, quarantine_temp.open("x", encoding="utf-8") as quarantine_stream:
            os.chmod(output_temp, 0o600)
            os.chmod(quarantine_temp, 0o600)
            for line_number, raw_row in iter_jsonl(input_path):
                converted, _reason = row_to_training_record(raw_row, questions, question_hash)
                if converted is None:
                    continue
                source_group = converted["source"]["splitGroup"]
                state_digest = converted["stateSha256"]
                source_record = connection.execute(
                    "SELECT fingerprint, first_line, conflict FROM source_groups WHERE group_key=?", (source_group,),
                ).fetchone()
                state_record = connection.execute(
                    "SELECT fingerprint, first_line, conflict FROM generated_states WHERE group_key=?", (state_digest,),
                ).fetchone()
                if source_record is None or state_record is None:
                    raise RuntimeError("The temporary duplicate index lost an eligible row.")
                if source_record[2] or state_record[2]:
                    quarantine_stream.write(json.dumps({
                        "sourceGroupSha256": source_group,
                        "stateSha256": state_digest,
                        "inputLine": line_number,
                        "reason": "conflicting_si_pseudo_labels_or_states",
                    }) + "\n")
                    quarantined += 1
                    continue
                if source_record[1] != line_number or state_record[1] != line_number:
                    duplicate_rows += 1
                    continue
                record = json.dumps(converted, ensure_ascii=False, separators=(",", ":")) + "\n"
                out_stream.write(record)
                output_hash.update(record.encode("utf-8"))
                emitted += 1
                split_counts[converted["trainingSplit"]] += 1
                for field in FIELDS:
                    targets_by_field[field][converted["hypotheticalNeed"]["targetDecisions"][field]["value"]] += 1
                source_location = raw_row.get("sourceOfferLocation") or raw_row.get("hypotheticalNeed", {}).get("sourceOfferLocation") or {}
                if isinstance(source_location, dict):
                    city = source_location.get("appCitySlug")
                    neighborhood = source_location.get("appNeighborhoodSlug")
                    if isinstance(city, str) and city:
                        cities.add(city)
                    if isinstance(neighborhood, str) and neighborhood:
                        neighborhoods.add(neighborhood)
            out_stream.flush()
            os.fsync(out_stream.fileno())
            quarantine_stream.flush()
            os.fsync(quarantine_stream.fileno())

        if emitted < args.min_rows or min(split_counts.get(split, 0) for split in ("train", "calibration", "test")) < 32:
            raise SystemExit(f"Only {emitted} eligible rows survived; v10 minimums were not met.")
        output_bytes = output_temp.stat().st_size
        manifest = {
            "schemaVersion": 1,
            "status": "complete",
            "taskType": TASK,
            "hypotheticalTask": HYPOTHETICAL_TASK,
            "model": MODEL_ID,
            "modelRevision": MODEL_REVISION,
            "teacherWeightsSha256": MODEL_WEIGHTS_SHA256,
            "questionFactory": {"hypotheticalNeedQuestions": questions},
            "questionSchemaSha256": question_hash,
            "source": {
                "taskType": upstream_manifest["taskType"],
                "path": input_path.name,
                "sha256": sha256_file(input_path),
                "rows": source_rows,
                "v9ManifestSha256": sha256_file(input_manifest_path),
            },
            "outputRows": emitted,
            "outputBytes": output_bytes,
            "outputSha256": output_hash.hexdigest(),
            "uniqueNormalizedStateGroups": emitted,
            "trainingSplitPolicy": "sha256(normalized_generated_state) first32bits % 100; 0-79=train, 80-89=calibration, 90-99=test",
            "exactNormalizedStateGroupsDisjoint": True,
            "trainingSplitCounts": {split: split_counts.get(split, 0) for split in ("train", "calibration", "test")},
            "targetCountsByField": {field: dict(values) for field, values in targets_by_field.items()},
            "candidateRows": eligible_candidates,
            "uniqueSourceGroups": unique_source_groups,
            "uniqueGeneratedStates": unique_states,
            "sourceGroupsDisjoint": True,
            "exactNormalizedStateGroupsDisjoint": True,
            "conflictingSourceGroupsQuarantined": conflict_source_groups,
            "conflictingGeneratedStatesQuarantined": conflict_states,
            "duplicateRowsCollapsed": duplicate_rows,
            "quarantinedRows": quarantined,
            "skippedRowsByReason": dict(skipped),
            "cityCatalogsObservedForAuditOnly": len(cities),
            "neighborhoodCatalogEntriesObservedForAuditOnly": len(neighborhoods),
            "synthetic": True,
            "derivedFromSupplyListing": True,
            "realNeedGroundTruth": False,
            "trainingEligible": False,
            "targetOrigin": "si_pseudo_labels_not_gold",
            "siPredictionsUsedAsLabels": True,
            "humanReviewed": False,
            "rightsReview": "pending_local_research_only_no_redistribution",
            "cloudTransferAllowed": False,
            "confidencePolicy": "raw_si_confidence_is_uncalibrated_and_stored_for_audit_only; no arbitrary threshold or loss weighting",
            "evaluationMeaning": "held-out agreement with the same pinned Si teacher on deterministic generated request text; not accuracy on real seekers",
            "createdAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        }
        manifest_temp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        os.chmod(manifest_temp, 0o600)
        if any(path.exists() for path in final_paths):
            raise FileExistsError("A final v10 artifact appeared during preparation; refusing to overwrite it.")
        os.replace(output_temp, output_path)
        created_finals.append(output_path)
        os.replace(quarantine_temp, quarantine_path)
        created_finals.append(quarantine_path)
        os.replace(manifest_temp, manifest_path)
        created_finals.append(manifest_path)
        temporary_outputs.clear()
        created_finals.clear()
        print(json.dumps({
            "status": "complete",
            "rows": emitted,
            "splits": manifest["trainingSplitCounts"],
            "targetsByField": manifest["targetCountsByField"],
            "conflictingSourceGroups": conflict_source_groups,
            "conflictingGeneratedStates": conflict_states,
            "duplicateRowsCollapsed": duplicate_rows,
            "quarantinedRows": quarantined,
            "skippedRowsByReason": dict(skipped),
            "cityCatalogsObservedForAuditOnly": len(cities),
            "neighborhoodCatalogEntriesObservedForAuditOnly": len(neighborhoods),
            "output": str(output_path),
            "outputSha256": manifest["outputSha256"],
            "trainingEligible": False,
            "realNeedGroundTruth": False,
        }, ensure_ascii=False, indent=2))
        return 0
    finally:
        try:
            connection.close()
        except UnboundLocalError:
            pass
        database_path.unlink(missing_ok=True)
        for path in temporary_outputs:
            path.unlink(missing_ok=True)
        for path in created_finals:
            path.unlink(missing_ok=True)


if __name__ == "__main__":
    raise SystemExit(main())
