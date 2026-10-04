#!/usr/bin/env python3
"""Research-only typed-head self-distillation from the exact local Laya teacher.

This experiment learns from Laya's own unreviewed predictions on deterministic
Divar-derived request templates. Held-out results are teacher agreement only;
they are not real-seeker accuracy, gold labels, or production authorization.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import json
import math
import os
import random
import re
import shutil
import time
from pathlib import Path
from typing import Any


HELPER_PATH = Path(__file__).with_name("train-divar-laya-head-stream.py")
SPEC = importlib.util.spec_from_file_location("divar_laya_stream_helpers_v10", HELPER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Cannot load the existing bounded Laya head-training helpers.")
HELPERS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HELPERS)
BASE = HELPERS.BASE
MODEL_ID = "convaiinnovations/laya-multilingual"
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
MODEL_WEIGHT_SHA256 = "9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204"
DATA_TASK = "divar-laya-pseudo-distillation/v1"
PSEUDO_SOURCE = "laya_pseudo_label_v1"
TRAIN_FIELDS = tuple(BASE.TRAIN_FIELDS)

# This isolated process only: teach the shared item serializer to accept the
# explicit pseudo-label source. The standard supervised trainer remains locked.
for field in TRAIN_FIELDS:
    BASE.TARGET_SOURCES[field] = {PSEUDO_SOURCE}


def sha256_file(path: Path) -> str:
    return BASE.sha256_file(path)


def question_hash(contract: dict[str, Any]) -> str:
    packed = json.dumps(contract, ensure_ascii=False, separators=(",", ":"), sort_keys=False)
    return hashlib.sha256(packed.encode("utf-8")).hexdigest()


def validate_pseudo_corpus(path: Path, manifest: dict[str, Any], contract: dict[str, Any]) -> dict[str, Any]:
    if (
        manifest.get("taskType") != DATA_TASK
        or manifest.get("model") != MODEL_ID
        or manifest.get("modelRevision") != MODEL_REVISION
        or manifest.get("teacherWeightsSha256") != MODEL_WEIGHT_SHA256
        or manifest.get("synthetic") is not True
        or manifest.get("realNeedGroundTruth") is not False
        or manifest.get("trainingEligible") is not False
        or manifest.get("targetOrigin") != "laya_pseudo_labels_not_gold"
        or manifest.get("layaPredictionsUsedAsLabels") is not True
        or manifest.get("humanReviewed") is not False
        or manifest.get("cloudTransferAllowed") is not False
        or manifest.get("sourceGroupsDisjoint") is not True
        or manifest.get("exactNormalizedStateGroupsDisjoint") is not True
        or manifest.get("outputBytes") != path.stat().st_size
        or manifest.get("outputSha256") != sha256_file(path)
        or manifest.get("questionSchemaSha256") != question_hash(contract)
    ):
        raise ValueError("The input manifest is not a hash-matched, pseudo-label-only local corpus.")

    choices: dict[str, set[str]] = {}
    for field in TRAIN_FIELDS:
        question = contract.get(field)
        criteria = question.get("criteria") if isinstance(question, dict) else None
        if not isinstance(criteria, dict) or len(criteria) < 2:
            raise ValueError(f"The typed Laya contract is missing choice criteria for {field}.")
        choices[field] = set(criteria)

    state_digests: set[str] = set()
    source_groups: set[str] = set()
    rows_by_split: collections.Counter[str] = collections.Counter()
    targets: dict[str, collections.Counter[str]] = {field: collections.Counter() for field in TRAIN_FIELDS}
    train_targets: dict[str, collections.Counter[str]] = {field: collections.Counter() for field in TRAIN_FIELDS}
    rows = 0
    for line_number, row in enumerate(HELPERS.iter_jsonl(path), 1):
        source = row.get("source")
        hypothetical = row.get("hypotheticalNeed")
        state = row.get("state")
        if (
            row.get("taskType") != DATA_TASK
            or row.get("synthetic") is not True
            or row.get("derivedFromSupplyListing") is not True
            or row.get("realNeedGroundTruth") is not False
            or row.get("trainingEligible") is not False
            or row.get("targetOrigin") != "laya_pseudo_labels_not_gold"
            or row.get("teacher", {}).get("model") != MODEL_ID
            or not isinstance(source, dict)
            or source.get("dataset") != "divarofficial/real_estate_ads"
            or not isinstance(source.get("splitGroup"), str)
            or not re.fullmatch(r"[a-f0-9]{64}", source["splitGroup"])
            or not isinstance(hypothetical, dict)
            or hypothetical.get("taskType") != "divar-laya-pseudo-need/v1"
            or hypothetical.get("questionSchemaSha256") != manifest.get("questionSchemaSha256")
            or not isinstance(state, str)
            or not state.strip()
        ):
            raise ValueError(f"Pseudo-label row {line_number} violates its provenance contract.")
        group = source["splitGroup"]
        if group in source_groups:
            raise ValueError("A source text group was duplicated after corpus preparation.")
        source_groups.add(group)
        digest = hashlib.sha256(BASE.normalize_model_input(state).encode("utf-8")).hexdigest()
        if digest != row.get("stateSha256") or digest in state_digests:
            raise ValueError("A generated model input is malformed or duplicated across the held-out split.")
        state_digests.add(digest)
        split = hypothetical.get("trainingSplit")
        if split not in {"train", "calibration", "test"} or split != BASE.training_split_for_state(state):
            raise ValueError("The deterministic generated-text split is missing or inconsistent.")
        rows_by_split[split] += 1
        decisions = hypothetical.get("targetDecisions")
        if not isinstance(decisions, dict):
            raise ValueError(f"Pseudo-label row {line_number} has no typed decisions.")
        for field in TRAIN_FIELDS:
            target = decisions.get(field)
            if (
                not isinstance(target, dict)
                or target.get("source") != PSEUDO_SOURCE
                or target.get("teacher") != MODEL_ID
                or target.get("humanReviewed") is not False
                or not isinstance(target.get("value"), str)
                or target.get("value") not in choices[field]
            ):
                raise ValueError(f"Pseudo-label row {line_number} has an invalid {field} target.")
            targets[field][target["value"]] += 1
            if split == "train":
                train_targets[field][target["value"]] += 1
        rows += 1

    expected_splits = {split: rows_by_split.get(split, 0) for split in ("train", "calibration", "test")}
    if (
        rows != manifest.get("outputRows")
        or expected_splits != manifest.get("trainingSplitCounts")
        or {field: dict(values) for field, values in targets.items()} != manifest.get("targetCountsByField")
        or any(value < 32 for value in expected_splits.values())
        or any(not targets[field] for field in TRAIN_FIELDS)
    ):
        raise ValueError("Corpus counts, disjoint splits, or target support do not match the manifest.")
    return {
        "rowCount": rows,
        "uniqueSourceGroups": len(source_groups),
        "uniqueNormalizedStateGroups": len(state_digests),
        "rowsBySplit": expected_splits,
        "targetsByField": {field: dict(values) for field, values in targets.items()},
        "trainingTargetsByField": {field: dict(values) for field, values in train_targets.items()},
        "choicesByField": {field: sorted(values) for field, values in choices.items()},
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--experiment-dir", type=Path, required=True)
    parser.add_argument("--allow-synthetic-experiment", action="store_true")
    parser.add_argument("--allow-laya-pseudo-label-distillation", action="store_true")
    parser.add_argument("--train-row-limit", type=int, default=0)
    parser.add_argument("--eval-row-limit", type=int, default=5_000)
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=0.00005)
    parser.add_argument("--threads", type=int, default=8)
    parser.add_argument("--device", choices=("cpu", "mps"), default="mps")
    parser.add_argument("--shuffle-buffer", type=int, default=8_192)
    parser.add_argument("--checkpoint-steps", type=int, default=1_000)
    parser.add_argument("--seed", type=int, default=4172026)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    if not args.allow_synthetic_experiment or not args.allow_laya_pseudo_label_distillation:
        raise SystemExit("Explicit synthetic and Laya pseudo-label experiment flags are both required.")
    if args.experiment_dir.exists():
        raise SystemExit("Experiment output already exists; refusing to overwrite it.")
    if min(args.epochs, args.batch_size, args.threads, args.eval_row_limit,
           args.shuffle_buffer, args.checkpoint_steps) < 1 or args.learning_rate <= 0 or args.train_row_limit < 0:
        raise SystemExit("Training limits and learning rate are invalid.")

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    os.environ["USE_TF"] = "0"
    import torch
    import torch.nn.functional as F
    from safetensors.torch import load_file
    from transformers import AutoTokenizer
    from laya.common import QTYPES, build_model, collate_items, proper_reward

    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    device = HELPERS.resolve_device(torch, args.device)
    input_path = args.input.expanduser().resolve(strict=True)
    manifest_path = args.manifest.expanduser().resolve(strict=True)
    model_dir = args.model_dir.expanduser().resolve(strict=True)
    data_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    factory = data_manifest.get("questionFactory")
    contract = factory.get("hypotheticalNeedQuestions") if isinstance(factory, dict) else None
    if not isinstance(contract, dict):
        raise SystemExit("The pseudo-corpus manifest does not include its exact typed questions.")
    data_summary = validate_pseudo_corpus(input_path, data_manifest, contract)
    weights_path = model_dir / "model.safetensors"
    config_path = model_dir / "rl_agent_config.json"
    tokenizer_path = model_dir / "tokenizer"
    encoder_path = model_dir / "encoder"
    if not all(path.exists() for path in (weights_path, config_path, tokenizer_path, encoder_path)):
        raise SystemExit("The exact local Laya checkpoint is incomplete; the trainer never downloads models.")
    weight_hash = sha256_file(weights_path)
    if weight_hash != MODEL_WEIGHT_SHA256:
        raise SystemExit("Local weights do not match the pinned Laya Multilingual checkpoint.")

    calibration_rows = HELPERS.select_rows(input_path, "calibration", args.eval_row_limit)
    test_rows = HELPERS.select_rows(input_path, "test", args.eval_row_limit)
    train_rows_sample = HELPERS.select_rows(input_path, "train", args.train_row_limit) if args.train_row_limit else None
    train_ids = HELPERS.selected_ids(train_rows_sample) if train_rows_sample is not None else None
    selected_train_rows = len(train_rows_sample) if train_rows_sample is not None else data_summary["rowsBySplit"]["train"]
    if min(selected_train_rows, len(calibration_rows), len(test_rows)) < 32:
        raise SystemExit("The selected training/calibration/test samples are too small.")

    if args.validate_only:
        print(json.dumps({
            "status": "validated_only",
            "dataSummary": data_summary,
            "selectedRows": {"train": selected_train_rows, "calibration": len(calibration_rows), "test": len(test_rows)},
            "model": MODEL_ID,
            "modelRevision": MODEL_REVISION,
            "baseWeightsSha256": weight_hash,
            "device": device.type,
            "trainingPerformed": False,
            "metricMeaning": "agreement with Laya pseudo labels only; not real-need accuracy",
        }, ensure_ascii=False, indent=2))
        return 0

    if args.device == "mps" and device.type != "mps":
        raise SystemExit("MPS was requested but unavailable; refusing silent CPU training.")
    config = json.loads(config_path.read_text(encoding="utf-8"))
    tokenizer = AutoTokenizer.from_pretrained(str(tokenizer_path), local_files_only=True, trust_remote_code=False)
    model = build_model(config, encoder_dir=str(encoder_path), pretrained=False)
    model.load_state_dict(load_file(str(weights_path), device="cpu"), strict=True)
    model.to(device)
    model.eval()
    for parameter in model.parameters():
        parameter.requires_grad_(False)
    for module in (model.head, model.type_emb, model.scorer):
        if module is not None:
            for parameter in module.parameters():
                parameter.requires_grad_(True)
    trainable = [parameter for parameter in model.parameters() if parameter.requires_grad]
    if not trainable:
        raise SystemExit("The exact Laya model exposed no trainable typed-decision parameters.")

    max_len = min(512, int(config.get("max_len", 512)))
    head_max_len = int(config.get("head_max_len", 256))
    pad_id = tokenizer.pad_token_id
    if pad_id is None:
        raise SystemExit("The local Laya tokenizer has no pad token.")
    make_eval_items = lambda rows: (
        item for row in rows
        for item in HELPERS.make_row_items(row, contract, tokenizer, QTYPES, max_len, head_max_len)
    )
    baseline_calibration = HELPERS.evaluate(model, make_eval_items(calibration_rows), pad_id, args.batch_size, device)
    baseline_test = HELPERS.evaluate(model, make_eval_items(test_rows), pad_id, args.batch_size, device)
    loss_counts = {
        field: collections.Counter(data_summary["trainingTargetsByField"][field])
        for field in TRAIN_FIELDS
    }
    if train_rows_sample is not None:
        loss_counts = {field: collections.Counter() for field in TRAIN_FIELDS}
        for row in train_rows_sample:
            for field, target in row["hypotheticalNeed"]["targetDecisions"].items():
                if field in TRAIN_FIELDS and target.get("source") == PSEUDO_SOURCE:
                    loss_counts[field][target["value"]] += 1
    selected_decisions = sum(sum(counter.values()) for counter in loss_counts.values())
    if selected_decisions < 1:
        raise SystemExit("No pseudo-labeled decisions are available for training.")
    total_steps = math.ceil(selected_decisions / args.batch_size) * args.epochs

    args.experiment_dir.mkdir(parents=True, exist_ok=False)
    BASE.atomic_json(args.experiment_dir / "baseline-metrics.json", {
        "metricMeaning": "agreement with the same pinned Laya teacher's unreviewed pseudo-labels",
        "notRealNeedAccuracy": True,
        "calibration": baseline_calibration,
        "test": baseline_test,
    })
    manifest = {
        "schemaVersion": 1,
        "status": "running",
        "experimentOnly": True,
        "productionLoadAllowed": False,
        "syntheticTrainingAuthorized": True,
        "syntheticTargetsAreRealNeedGroundTruth": False,
        "layaPredictionsUsedAsLabels": True,
        "targetOrigin": "laya_pseudo_labels_not_gold",
        "teacherModel": MODEL_ID,
        "teacherRevision": MODEL_REVISION,
        "teacherWeightsSha256": MODEL_WEIGHT_SHA256,
        "studentBaseModel": MODEL_ID,
        "studentBaseWeightsSha256": weight_hash,
        "sourceRightsReview": "pending; local research only; no redistribution",
        "privacyReview": "generated Persian template text and hashed source groups only; not comprehensive content/legal clearance",
        "dataFile": str(input_path),
        "dataSha256": data_manifest["outputSha256"],
        "inputCorpusManifest": str(manifest_path),
        "inputCorpusRows": data_summary["rowCount"],
        "questionSchemaSha256": data_manifest["questionSchemaSha256"],
        "trainingFields": list(TRAIN_FIELDS),
        "excludedFields": {
            "city_and_neighborhood": "not trained; keep exact local-catalog resolution separate",
            "numbers_amenities_deed_usage": "not teacher pseudo-labels in this experiment",
        },
        "architecture": "frozen exact multilingual encoder; train typed decision head, question-type embedding and scorer only",
        "device": device.type,
        "threads": args.threads,
        "trainableParameters": sum(parameter.numel() for parameter in trainable),
        "trainingTargets": "unreviewed same-model Laya pseudo-labels on deterministic Divar-derived request templates",
        "confidencePolicy": "uncalibrated raw confidence stored for audit only; not used as a threshold or loss weight",
        "evaluationScope": "held-out teacher agreement on pseudo-labeled template text only; not user-need accuracy",
        "dataSummary": data_summary,
        "selectedRows": {"train": selected_train_rows, "calibration": len(calibration_rows), "test": len(test_rows)},
        "selectedDecisionCount": selected_decisions,
        "optimizer": "AdamW",
        "objective": "balanced categorical cross-entropy plus Laya proper score against teacher pseudo-labels",
        "learningRate": args.learning_rate,
        "batchSize": args.batch_size,
        "epochsRequested": args.epochs,
        "expectedOptimizerSteps": total_steps,
        "trainingSplitPolicy": data_manifest["trainingSplitPolicy"],
        "startedAtUnix": time.time(),
    }
    BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
    BASE.atomic_json(args.experiment_dir / "training-progress.json", {
        "epoch": 0, "step": 0, "totalSteps": total_steps,
        "meanLoss": None, "checkpoint": "last-adapter.safetensors",
    })
    best_values = [baseline_calibration[field]["macroF1"] for field in TRAIN_FIELDS
                   if baseline_calibration[field].get("macroF1") is not None]
    best_score = sum(best_values) / max(1, len(best_values))
    best_epoch = 0
    optimizer = torch.optim.AdamW(trainable, lr=args.learning_rate, weight_decay=0.01)
    base_state = {name: parameter.detach().clone() for name, parameter in model.named_parameters() if parameter.requires_grad}
    history: list[dict[str, Any]] = []
    global_step = 0
    started = time.monotonic()
    try:
        for epoch in range(args.epochs):
            model.train()
            model.encoder.eval()
            model.head_checkpointing = True
            loss_sum = torch.zeros((), dtype=torch.float32, device=device)
            batch_count = 0
            items = HELPERS.decision_stream(
                input_path, "train", contract, tokenizer, QTYPES, max_len, head_max_len,
                allow_ids=train_ids, loss_counts=loss_counts,
            )
            for batch in HELPERS.batch_iter(
                items, args.batch_size, shuffle=True, seed=args.seed + epoch,
                shuffle_buffer=args.shuffle_buffer,
            ):
                optimizer.zero_grad(set_to_none=True)
                packed = collate_items([[item] for item in batch], pad_id)
                logits, _ = model(
                    packed["input_ids"].to(device), packed["attention_mask"].to(device),
                    packed["marker_pos"].to(device), packed["marker_mask"].to(device),
                    packed["qtype"].to(device),
                )
                labels = packed["label"].to(device)
                per_item = F.cross_entropy(logits.float(), labels, reduction="none")
                score = proper_reward(
                    torch.softmax(logits.float(), dim=-1),
                    F.one_hot(labels, num_classes=logits.shape[-1]).to(dtype=torch.float32),
                    packed["qtype"].to(device), packed["marker_mask"].to(device),
                )
                per_item = 0.5 * per_item - 0.5 * score
                weights = torch.tensor([item["loss_weight"] for item in batch], dtype=torch.float32, device=device)
                loss = (per_item * weights).sum() / weights.sum().clamp_min(1e-6)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(trainable, max_norm=1.0)
                optimizer.step()
                loss_sum += loss.detach()
                batch_count += 1
                global_step += 1
                if global_step % args.checkpoint_steps == 0 or global_step == total_steps:
                    BASE.save_adapter(args.experiment_dir / "last-adapter.safetensors", model)
                    mean_loss = float((loss_sum / max(1, batch_count)).cpu().item())
                    BASE.atomic_json(args.experiment_dir / "training-progress.json", {
                        "epoch": epoch + 1, "step": global_step, "totalSteps": total_steps,
                        "meanLoss": mean_loss, "elapsedSeconds": time.monotonic() - started,
                        "checkpoint": "last-adapter.safetensors",
                    })
                    print(f"epoch={epoch + 1}/{args.epochs} step={global_step}/{total_steps} mean_loss={mean_loss:.4f}", flush=True)

            calibration = HELPERS.evaluate(model, make_eval_items(calibration_rows), pad_id, args.batch_size, device)
            scores = [calibration[field]["macroF1"] for field in TRAIN_FIELDS
                      if calibration[field].get("macroF1") is not None]
            score = sum(scores) / max(1, len(scores))
            history.append({"epoch": epoch + 1, "teacherAgreementMacroF1": score, "calibration": calibration})
            if score > best_score + 1e-6:
                best_score, best_epoch = score, epoch + 1
                BASE.save_adapter(args.experiment_dir / "best-adapter.safetensors", model)
            BASE.atomic_json(args.experiment_dir / "epoch-metrics.json", {"epochs": history, "bestEpoch": best_epoch})
            print(f"epoch={epoch + 1} calibration_teacher_agreement_macro_f1={score:.4f}", flush=True)

        best_adapter = args.experiment_dir / "best-adapter.safetensors"
        fallback = False
        if not best_adapter.is_file():
            model.load_state_dict(base_state, strict=False)
            BASE.save_adapter(best_adapter, model)
            fallback = True
        model.load_state_dict(load_file(str(best_adapter), device="cpu"), strict=False)
        model.to(device)
        best_test = HELPERS.evaluate(model, make_eval_items(test_rows), pad_id, args.batch_size, device)
        report = {
            "metricMeaning": "agreement with the same pinned Laya teacher's unreviewed pseudo-labels",
            "notRealNeedAccuracy": True,
            "baseline": {"calibration": baseline_calibration, "test": baseline_test},
            "selectedCheckpointTestTeacherAgreement": best_test,
            "selectedBestEpoch": best_epoch,
            "selectedCheckpointSource": "pinned_base_no_calibration_improvement" if fallback else "best_calibration_epoch",
            "epochs": history,
            "elapsedSeconds": time.monotonic() - started,
        }
        BASE.atomic_json(args.experiment_dir / "evaluation.json", report)
        manifest["status"] = "research_pseudo_distillation_complete"
        manifest["selectedBestEpoch"] = best_epoch
        manifest["selectedCheckpointSource"] = report["selectedCheckpointSource"]
        manifest["completedAtUnix"] = time.time()
        manifest["result"] = "research-only head adapter; teacher agreement only; not real-need accuracy; never production-authorized"
        BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        print(json.dumps({
            "status": manifest["status"],
            "experimentDir": str(args.experiment_dir),
            "trainingRows": selected_train_rows,
            "trainingDecisions": selected_decisions,
            "baselineTeacherAgreement": baseline_test["overall"]["accuracy"],
            "selectedTeacherAgreement": best_test["overall"]["accuracy"],
            "bestEpoch": best_epoch,
            "elapsedSeconds": report["elapsedSeconds"],
            "realNeedAccuracyEstablished": False,
        }, ensure_ascii=False, indent=2), flush=True)
        return 0
    except KeyboardInterrupt:
        BASE.save_adapter(args.experiment_dir / "interrupted-adapter.safetensors", model)
        manifest["status"] = "interrupted_pseudo_distillation_weights_preserved"
        manifest["interruptedAtUnix"] = time.time()
        BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        print("Training interrupted; research adapter checkpoint preserved.", flush=True)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
