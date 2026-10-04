#!/usr/bin/env python3
"""Full-parameter, research-only RLCD fine-tuning of the pinned Laya multilingual model.

This is an MPS/CPU adaptation of Laya's official RLCD recipe. It trains the exact
encoder and decision head from source-derived, one-hot counterfactual labels; it
does not train on Laya-generated labels and cannot establish real seeker intent.
"""

from __future__ import annotations

import argparse
import collections
import copy
import hashlib
import importlib.util
import json
import math
import os
import random
import shutil
import time
from pathlib import Path
from typing import Any, Iterable, Iterator


HELPER_PATH = Path(__file__).with_name("train-divar-laya-head-stream.py")
SPEC = importlib.util.spec_from_file_location("divar_laya_stream_helpers", HELPER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Cannot load the audited streaming-corpus helpers.")
HELPERS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HELPERS)
BASE = HELPERS.BASE
TRAIN_FIELDS = HELPERS.TRAIN_FIELDS
CLASS_WEIGHTING_POLICY = "inverse_sqrt_frequency_per_field_capped_5x_v1"
CLASS_WEIGHT_CAP = 5.0


def rlcd_loss(
    logits: Any,
    target: Any,
    qtype: Any,
    mask: Any,
    *,
    sigma: float,
    group_size: int,
    proper_reward: Any,
    sample_weights: Any | None = None,
    w_sph: float = 0.75,
    w_rps: float = 1.0,
) -> tuple[Any, Any, Any]:
    """Official Laya-style noisy-logit policy objective plus soft CE guidance."""
    import torch
    import torch.nn.functional as functional

    if sigma <= 0 or group_size < 2:
        raise ValueError("RLCD requires positive noise and at least two group samples.")
    logits = logits.float()
    target = target.float()
    mask = mask.bool()
    qtype = qtype.long()
    option_count = mask.sum(-1, keepdim=True).float().clamp_min(1)
    noise = torch.randn((group_size,) + tuple(logits.shape), device=logits.device) * sigma
    noise = noise * mask.unsqueeze(0)
    noise = (noise - noise.sum(-1, keepdim=True) / option_count.unsqueeze(0)) * mask.unsqueeze(0)
    sampled_logits = logits.detach().unsqueeze(0) + noise
    sampled_probabilities = torch.softmax(sampled_logits.masked_fill(~mask.unsqueeze(0), -1e4), dim=-1)
    with torch.no_grad():
        rewards = proper_reward(
            sampled_probabilities, target.unsqueeze(0), qtype, mask,
            w_sph=w_sph, w_rps=w_rps,
        )
        # Center and normalize within each state's sampled group. This keeps
        # unrelated examples/question types from setting one another's scale.
        advantages = rewards - rewards.mean(0, keepdim=True)
        advantages = advantages / (rewards.std(0, keepdim=True, unbiased=False) + 1e-6)
    log_probability = -(
        ((sampled_logits - logits.unsqueeze(0)) ** 2) * mask.unsqueeze(0)
    ).sum(-1) / (2.0 * sigma**2)
    policy_loss_by_item = -(advantages * log_probability).mean(dim=0)
    supervised_loss_by_item = -(
        target * functional.log_softmax(logits.masked_fill(~mask, -1e4), dim=-1)
    ).sum(-1)
    per_item_loss = policy_loss_by_item + supervised_loss_by_item
    if sample_weights is None:
        loss = per_item_loss.mean()
        supervised_loss = supervised_loss_by_item.mean()
    else:
        weights = sample_weights.to(device=logits.device, dtype=per_item_loss.dtype).reshape(-1)
        if weights.shape != per_item_loss.shape or not torch.isfinite(weights).all() or (weights <= 0).any():
            raise ValueError("RLCD sample weights must be finite, positive, and aligned with the batch.")
        denominator = weights.sum().clamp_min(1e-6)
        loss = (per_item_loss * weights).sum() / denominator
        supervised_loss = (supervised_loss_by_item * weights).sum() / denominator
    return loss, rewards.mean(), supervised_loss


def inverse_sqrt_class_weight(
    field: str,
    target: str,
    target_counts: dict[str, dict[str, int]],
) -> float:
    """Apply bounded per-field class balancing without letting rare labels dominate."""
    counts = target_counts.get(field, {})
    total = sum(int(value) for value in counts.values())
    support = int(counts.get(target, 0))
    if total < 1 or support < 1:
        raise ValueError(f"Training label {field}={target!r} has no support in the selected training split.")
    return min(CLASS_WEIGHT_CAP, math.sqrt(total / support))


def class_weight_summary(
    target_counts: dict[str, dict[str, int]],
) -> dict[str, dict[str, dict[str, float | int]]]:
    """Persist the exact bounded weighting applied to every supported label."""
    return {
        field: {
            target: {
                "support": int(support),
                "weight": inverse_sqrt_class_weight(field, target, target_counts),
            }
            for target, support in counts.items()
        }
        for field, counts in target_counts.items()
        if counts
    }


def selected_contract(contract: dict[str, Any], row: dict[str, Any], seed: int, epoch: int) -> dict[str, Any]:
    """Shuffle choice order per state/epoch so the head cannot learn fixed positions."""
    value = copy.deepcopy(contract)
    seed_material = f"{seed}:{epoch}:{row.get('exampleId', '')}".encode("utf-8")
    rng = random.Random(int.from_bytes(hashlib.sha256(seed_material).digest()[:8], "big"))
    for question in value.values():
        criteria = question.get("criteria") if isinstance(question, dict) else None
        if isinstance(criteria, dict) and len(criteria) > 1:
            entries = list(criteria.items())
            rng.shuffle(entries)
            question["criteria"] = dict(entries)
    return value


def training_items(
    input_path: Path,
    contract: dict[str, Any],
    tokenizer: Any,
    qtypes: dict[str, int],
    max_len: int,
    head_max_len: int,
    *,
    seed: int,
    epoch: int,
    allowed_ids: set[str] | None,
    target_counts: dict[str, dict[str, int]],
) -> Iterator[dict[str, Any]]:
    for row in HELPERS.iter_jsonl(input_path):
        if row["hypotheticalNeed"]["trainingSplit"] != "train":
            continue
        if allowed_ids is not None and str(row["exampleId"]) not in allowed_ids:
            continue
        row_contract = selected_contract(contract, row, seed, epoch)
        for item in HELPERS.make_row_items(row, row_contract, tokenizer, qtypes, max_len, head_max_len):
            item["loss_weight"] = inverse_sqrt_class_weight(
                item["field"], item["gold"], target_counts,
            )
            yield item


def batches_with_info(
    items: Iterable[dict[str, Any]], batch_size: int, seed: int, shuffle_buffer: int,
) -> Iterator[list[dict[str, Any]]]:
    yield from HELPERS.batch_iter(
        items, batch_size=batch_size, shuffle=True, seed=seed,
        shuffle_buffer=shuffle_buffer,
    )


def expected_training_decisions(data_summary: dict[str, Any]) -> int:
    counts = data_summary["trainingTargetsByField"]
    return sum(sum(counts[field].values()) for field in TRAIN_FIELDS)


def sigma_at_step(step: int, total_steps: int, start: float = 0.4, end: float = 0.1) -> float:
    if total_steps < 1 or step < 0:
        raise ValueError("RLCD schedule needs a positive step count and a non-negative current step.")
    fraction = min(1.0, step / max(1, total_steps - 1))
    return start + (end - start) * fraction


def save_model_weights(path: Path, model: Any, torch: Any, save_file: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    tensors = {
        name: tensor.detach().to(device="cpu", dtype=torch.float16).contiguous()
        for name, tensor in model.state_dict().items()
    }
    save_file(tensors, str(temporary))
    os.replace(temporary, path)


def eval_items(
    rows: list[dict[str, Any]], contract: dict[str, Any], tokenizer: Any,
    qtypes: dict[str, int], max_len: int, head_max_len: int,
) -> Iterator[dict[str, Any]]:
    for row in rows:
        yield from HELPERS.make_row_items(row, contract, tokenizer, qtypes, max_len, head_max_len)


def collect_calibration(
    model: Any, rows: list[dict[str, Any]], contract: dict[str, Any], tokenizer: Any,
    qtypes: dict[str, int], max_len: int, head_max_len: int, pad_id: int,
    batch_size: int, device: Any, torch: Any,
) -> dict[str, tuple[list[list[float]], list[int]]]:
    from laya.common import collate_items, temp_bucket

    logits_by_bucket: dict[str, list[list[float]]] = collections.defaultdict(list)
    labels_by_bucket: dict[str, list[int]] = collections.defaultdict(list)
    items = eval_items(rows, contract, tokenizer, qtypes, max_len, head_max_len)
    model.eval()
    with torch.inference_mode():
        for batch in HELPERS.batch_iter(items, batch_size, False, 0, 0):
            packed = collate_items([[item] for item in batch], pad_id)
            logits, _ = model(
                packed["input_ids"].to(device), packed["attention_mask"].to(device),
                packed["marker_pos"].to(device), packed["marker_mask"].to(device),
                packed["qtype"].to(device),
            )
            host_logits = logits.detach().float().cpu()
            for index, item in enumerate(batch):
                count = len(item["choices"])
                bucket = temp_bucket(int(item["qtype"]), count)
                logits_by_bucket[bucket].append(host_logits[index, :count].tolist())
                labels_by_bucket[bucket].append(int(item["label"]))
    return {
        bucket: (logits_by_bucket[bucket], labels_by_bucket[bucket])
        for bucket in logits_by_bucket
    }


def fit_bucket_temperatures(
    grouped: dict[str, tuple[list[list[float]], list[int]]], torch: Any,
) -> dict[str, float]:
    import torch.nn.functional as functional

    fitted: dict[str, float] = {}
    for bucket, (rows, labels) in grouped.items():
        if len(rows) < 32:
            continue
        logits = torch.tensor(rows, dtype=torch.float32, device="cpu")
        targets = torch.tensor(labels, dtype=torch.long, device="cpu")
        log_temperature = torch.zeros((), dtype=torch.float32, requires_grad=True)
        optimizer = torch.optim.LBFGS(
            [log_temperature], lr=0.2, max_iter=80, line_search_fn="strong_wolfe",
        )

        def closure() -> Any:
            optimizer.zero_grad()
            temperature = log_temperature.exp().clamp(0.5, 5.0)
            loss = functional.cross_entropy(logits / temperature, targets)
            loss.backward()
            return loss

        optimizer.step(closure)
        fitted[bucket] = float(log_temperature.detach().exp().clamp(0.5, 5.0).item())
    return fitted


def build_preflight_report(
    data_summary: dict[str, Any], rows: dict[str, int], decisions: int,
    selected_targets: dict[str, dict[str, int]],
    args: argparse.Namespace, weight_hash: str, device: str,
) -> dict[str, Any]:
    micro_batches = math.ceil(decisions / args.micro_batch_size)
    optimizer_steps = math.ceil(micro_batches / args.grad_accumulation) * args.epochs
    return {
        "status": "validated_only",
        "trainingPerformed": False,
        "trainingMethod": "official_laya_rlcd_full_parameter_v1",
        "trainableScope": "encoder+decision_head",
        "device": device,
        "baseWeightsSha256": weight_hash,
        "evaluationSamplingPolicy": "deterministic_hash_uniform_within_split_v1",
        "dataSummary": data_summary,
        "selectedRows": rows,
        "expectedTrainingDecisions": decisions,
        "selectedTrainingTargetsByField": selected_targets,
        "microBatchSize": args.micro_batch_size,
        "gradientAccumulation": args.grad_accumulation,
        "effectiveBatchSize": args.micro_batch_size * args.grad_accumulation,
        "expectedOptimizerSteps": optimizer_steps,
        "groupSize": args.group_size,
        "maxLen": args.max_len,
        "headMaxLen": args.head_max_len,
        "classWeightingPolicy": CLASS_WEIGHTING_POLICY,
        "classWeightCap": CLASS_WEIGHT_CAP,
        "classWeightsByField": class_weight_summary(selected_targets),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--experiment-dir", type=Path, required=True)
    parser.add_argument("--allow-synthetic-experiment", action="store_true")
    parser.add_argument("--train-row-limit", type=int, default=0,
                        help="Hash-uniform rows for a hardware smoke only; zero trains on all clean rows.")
    parser.add_argument("--eval-row-limit", type=int, default=5_000)
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--micro-batch-size", type=int, default=4)
    parser.add_argument("--grad-accumulation", type=int, default=8)
    parser.add_argument("--group-size", type=int, default=4)
    parser.add_argument("--encoder-learning-rate", type=float, default=2.5e-5)
    parser.add_argument("--head-learning-rate", type=float, default=1.0e-4)
    parser.add_argument("--threads", type=int, default=8)
    parser.add_argument("--device", choices=("cpu", "mps"), default="mps")
    parser.add_argument("--max-len", type=int, default=1_024)
    parser.add_argument("--head-max-len", type=int, default=256)
    parser.add_argument("--shuffle-buffer", type=int, default=8_192)
    parser.add_argument("--checkpoint-steps", type=int, default=1_000)
    parser.add_argument("--seed", type=int, default=4172026)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    if not args.allow_synthetic_experiment:
        raise SystemExit("Refusing synthetic-only fine-tuning without --allow-synthetic-experiment.")
    positive = (
        args.epochs, args.micro_batch_size, args.grad_accumulation, args.group_size,
        args.threads, args.eval_row_limit, args.max_len, args.head_max_len,
        args.shuffle_buffer, args.checkpoint_steps,
    )
    if min(positive) < 1 or args.group_size < 2 or min(
        args.encoder_learning_rate, args.head_learning_rate,
    ) <= 0 or args.train_row_limit < 0:
        raise SystemExit("Training and evaluation settings are invalid.")
    if args.experiment_dir.exists():
        raise SystemExit("Experiment output already exists; refusing to overwrite it.")

    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    os.environ["USE_TF"] = "0"

    import torch
    from safetensors.torch import load_file, save_file
    from transformers import AutoTokenizer
    from laya.common import QTYPES, build_model, proper_reward

    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    device = HELPERS.resolve_device(torch, args.device)
    input_path = args.input.expanduser().resolve(strict=True)
    corpus_manifest_path = args.manifest.expanduser().resolve(strict=True)
    model_dir = args.model_dir.expanduser().resolve(strict=True)
    data_manifest = json.loads(corpus_manifest_path.read_text(encoding="utf-8"))
    if (
        data_manifest.get("schemaVersion") != 2
        or data_manifest.get("status") != "complete"
        or data_manifest.get("taskType") not in BASE.DATA_TASKS.values()
        or data_manifest.get("model") != BASE.MODEL_ID
        or data_manifest.get("synthetic") is not True
        or data_manifest.get("realNeedGroundTruth") is not False
        or data_manifest.get("trainingEligible") is not False
        or data_manifest.get("layaPredictionsUsedAsLabels") is not False
        or data_manifest.get("targetOrigin") != "deterministic_source_facts_not_laya_output"
        or data_manifest.get("trainingSplitPolicy") != BASE.TRAINING_SPLIT_POLICY
        or data_manifest.get("exactNormalizedStateGroupsDisjoint") is not True
        or data_manifest.get("outputBytes") != input_path.stat().st_size
        or data_manifest.get("outputSha256") != BASE.sha256_file(input_path)
    ):
        raise SystemExit("The corpus manifest does not attest to the reviewed synthetic-only dataset.")
    questions_manifest, contract = BASE.question_manifest(corpus_manifest_path)
    schema_hash = hashlib.sha256(json.dumps(
        contract, ensure_ascii=False, separators=(",", ":"), sort_keys=False,
    ).encode()).hexdigest()
    if schema_hash != data_manifest.get("questionFactory", {}).get("hypotheticalNeedQuestionSchemaSha256"):
        raise SystemExit("The dataset question schema hash is inconsistent.")
    data_summary = HELPERS.validate_corpus(input_path, contract, schema_hash, data_manifest["taskType"])
    if (
        data_summary["rowCount"] != data_manifest.get("outputRows")
        or data_summary["uniqueNormalizedStateGroups"] != data_manifest.get("uniqueNormalizedStateGroups")
        or data_manifest.get("uniqueNormalizedStateGroups") != data_manifest.get("outputRows")
        or data_summary["rowsBySplit"] != data_manifest.get("trainingSplitCounts")
    ):
        raise SystemExit("Corpus row counts or split guarantees do not match the manifest.")

    weights_path = model_dir / "model.safetensors"
    config_path = model_dir / "rl_agent_config.json"
    tokenizer_path = model_dir / "tokenizer"
    encoder_path = model_dir / "encoder"
    if not all(path.exists() for path in (weights_path, config_path, tokenizer_path, encoder_path)):
        raise SystemExit("The pinned local Laya multilingual checkpoint is incomplete; no model is downloaded.")
    weight_hash = BASE.sha256_file(weights_path)
    if weight_hash != BASE.MODEL_WEIGHT_SHA256:
        raise SystemExit("The local weights are not the pinned convaiinnovations/laya-multilingual checkpoint.")

    calibration_rows = HELPERS.select_rows(input_path, "calibration", args.eval_row_limit)
    test_rows = HELPERS.select_rows(input_path, "test", args.eval_row_limit)
    train_rows = (
        HELPERS.select_rows(input_path, "train", args.train_row_limit)
        if args.train_row_limit else None
    )
    selected_rows = data_summary["rowsBySplit"]["train"] if train_rows is None else len(train_rows)
    training_decisions = expected_training_decisions(data_summary)
    if train_rows is not None:
        train_ids = HELPERS.selected_ids(train_rows)
        training_decisions = 0
        for row in train_rows:
            targets = row["hypotheticalNeed"]["targetDecisions"]
            training_decisions += sum(
                1 for field in TRAIN_FIELDS
                if isinstance(targets.get(field), dict)
                and targets[field].get("source") in BASE.TARGET_SOURCES[field]
            )
    else:
        train_ids = None
    if train_rows is None:
        selected_targets = data_summary["trainingTargetsByField"]
    else:
        selected_targets = {field: collections.Counter() for field in TRAIN_FIELDS}
        for row in train_rows:
            targets = row["hypotheticalNeed"]["targetDecisions"]
            for field in TRAIN_FIELDS:
                target = targets.get(field)
                if (
                    isinstance(target, dict)
                    and isinstance(target.get("value"), str)
                    and target.get("source") in BASE.TARGET_SOURCES[field]
                ):
                    selected_targets[field][target["value"]] += 1
        selected_targets = {field: dict(counts) for field, counts in selected_targets.items()}
    if min(len(calibration_rows), len(test_rows), selected_rows, training_decisions) < 1:
        raise SystemExit("The selected training or held-out partitions are empty.")

    report = build_preflight_report(
        data_summary,
        {"train": selected_rows, "calibration": len(calibration_rows), "test": len(test_rows)},
        training_decisions, selected_targets, args, weight_hash, device.type,
    )
    report["questionSchemaSha256"] = schema_hash
    report["model"] = BASE.MODEL_ID
    report["modelRevision"] = BASE.MODEL_REVISION
    if args.validate_only:
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    tokenizer = AutoTokenizer.from_pretrained(
        str(tokenizer_path), local_files_only=True, trust_remote_code=False,
    )
    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["max_len"] = args.max_len
    config["head_max_len"] = args.head_max_len
    model = build_model(config, encoder_dir=str(encoder_path), pretrained=False)
    base_state = load_file(str(weights_path), device="cpu")
    model.load_state_dict(base_state, strict=True)
    model.to(device)
    model.encoder.gradient_checkpointing_enable(
        gradient_checkpointing_kwargs={"use_reentrant": False},
    )
    model.head_checkpointing = True
    trainable_prefixes = ("encoder.", "head.", "type_emb.", "scorer.")
    for name, parameter in model.named_parameters():
        parameter.requires_grad_(name.startswith(trainable_prefixes))
    trainable_parameters = [parameter for parameter in model.parameters() if parameter.requires_grad]
    if not trainable_parameters:
        raise SystemExit("The Laya encoder and typed decision head expose no trainable parameters.")
    model.eval()
    pad_id = tokenizer.pad_token_id
    if pad_id is None:
        raise SystemExit("The pinned tokenizer has no pad token.")
    max_len = args.max_len
    head_max_len = args.head_max_len

    calibration_metrics = HELPERS.evaluate(
        model, eval_items(calibration_rows, contract, tokenizer, QTYPES, max_len, head_max_len),
        pad_id, args.micro_batch_size, device,
    )
    baseline_test_metrics = HELPERS.evaluate(
        model, eval_items(test_rows, contract, tokenizer, QTYPES, max_len, head_max_len),
        pad_id, args.micro_batch_size, device,
    )
    decisions_per_epoch = training_decisions
    microbatches_per_epoch = math.ceil(decisions_per_epoch / args.micro_batch_size)
    steps_per_epoch = math.ceil(microbatches_per_epoch / args.grad_accumulation)
    total_steps = steps_per_epoch * args.epochs
    encoder_parameters = [
        parameter for name, parameter in model.named_parameters()
        if name.startswith("encoder.") and parameter.requires_grad
    ]
    head_parameters = [
        parameter for name, parameter in model.named_parameters()
        if name.startswith(("head.", "type_emb.", "scorer.")) and parameter.requires_grad
    ]
    if not encoder_parameters or not head_parameters:
        raise SystemExit("The exact Laya model did not expose the expected encoder and decision head.")
    optimizer = torch.optim.AdamW([
        {"params": encoder_parameters, "lr": args.encoder_learning_rate},
        {"params": head_parameters, "lr": args.head_learning_rate},
    ], weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=max(1, total_steps), eta_min=1e-6,
    )

    args.experiment_dir.mkdir(parents=True, exist_ok=False)
    manifest = {
        "schemaVersion": 1,
        "status": "running",
        "experimentOnly": True,
        "productionLoadAllowed": False,
        "syntheticTrainingAuthorized": True,
        "syntheticTargetsAreRealNeedGroundTruth": False,
        "layaPredictionsUsedAsLabels": False,
        "sourceRightsReview": "pending; local research artifact only; no redistribution",
        "privacyReview": "derived text only; source audit is not comprehensive content/privacy clearance",
        "model": BASE.MODEL_ID,
        "modelRevision": BASE.MODEL_REVISION,
        "baseWeightsSha256": weight_hash,
        "dataFile": str(input_path),
        "dataSha256": data_manifest["outputSha256"],
        "inputCorpusManifest": str(corpus_manifest_path),
        "inputCorpusRows": data_summary["rowCount"],
        "sourceDataset": questions_manifest.get("sourceDataset"),
        "sourceDatasetSha256": questions_manifest.get("sourceDatasetSha256"),
        "questionSchemaSha256": schema_hash,
        "architecture": "full-parameter adaptation: exact multilingual encoder + typed decision head",
        "trainingMethod": "Laya official RLCD: zero-mean noisy-logit group policy gradient + soft cross-entropy",
        "trainingTargets": "one-hot deterministic source-derived counterfactual labels; not observed seeker behavior",
        "classWeightingPolicy": CLASS_WEIGHTING_POLICY,
        "classWeightCap": CLASS_WEIGHT_CAP,
        "classWeightsByField": class_weight_summary(selected_targets),
        "selectedTrainingTargetsByField": selected_targets,
        "trainingFields": list(TRAIN_FIELDS),
        "optionOrderAugmentation": "deterministic per-example shuffle, varies by epoch",
        "encoderGradientCheckpointing": True,
        "headGradientCheckpointing": True,
        "precision": "float32 on requested device; no unverified MPS autocast",
        "device": device.type,
        "threads": args.threads,
        "trainableParameters": sum(parameter.numel() for parameter in trainable_parameters),
        "frozenUnsupervisedActionHead": True,
        "dataSummary": data_summary,
        "selectedRows": {"train": selected_rows, "calibration": len(calibration_rows), "test": len(test_rows)},
        "trainingDecisions": training_decisions,
        "microBatchSize": args.micro_batch_size,
        "gradientAccumulation": args.grad_accumulation,
        "effectiveBatchSize": args.micro_batch_size * args.grad_accumulation,
        "expectedOptimizerSteps": total_steps,
        "epochsRequested": args.epochs,
        "groupSize": args.group_size,
        "maxLen": max_len,
        "headMaxLen": head_max_len,
        "sigmaSchedule": {"start": 0.4, "end": 0.1},
        "wSpherical": 0.75,
        "wRankedProbability": 1.0,
        "encoderLearningRate": args.encoder_learning_rate,
        "headLearningRate": args.head_learning_rate,
        "evaluationSamplingPolicy": "deterministic_hash_uniform_within_split_v1",
        "calibrationScope": "held-out calibration rows only; choice temperature fitted per option-count bucket",
        "evaluationScope": "synthetic template-text generalization only, not accuracy on real user needs",
        "checkpointing": "atomic full-model weights every N optimizer steps; optimizer state is not persisted",
        "startedAtUnix": time.time(),
    }
    BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
    BASE.atomic_json(args.experiment_dir / "training-progress.json", {
        "epoch": 0, "step": 0, "totalSteps": total_steps, "meanLoss": None,
        "checkpoint": "last-model.safetensors",
    })
    BASE.atomic_json(args.experiment_dir / "baseline-metrics.json", {
        "syntheticOnly": True,
        "calibration": calibration_metrics,
        "test": baseline_test_metrics,
        "samplingPolicy": "deterministic_hash_uniform_within_split_v1",
    })
    model.encoder.config.save_pretrained(str(args.experiment_dir / "encoder"))
    tokenizer.save_pretrained(str(args.experiment_dir / "tokenizer"))
    shutil.copyfile(config_path, args.experiment_dir / "base-rl-agent-config.json")

    baseline_values = [
        calibration_metrics[field]["macroF1"] for field in TRAIN_FIELDS
        if calibration_metrics.get(field, {}).get("macroF1") is not None
    ]
    best_score = sum(baseline_values) / max(1, len(baseline_values))
    best_epoch = 0
    progress = 0
    loss_total = 0.0
    micro_count = 0
    epoch_history: list[dict[str, Any]] = []
    started = time.monotonic()
    try:
        for epoch in range(args.epochs):
            model.train()
            model.encoder.train()
            model.encoder.gradient_checkpointing_enable(
                gradient_checkpointing_kwargs={"use_reentrant": False},
            )
            model.head_checkpointing = True
            optimizer.zero_grad(set_to_none=True)
            stream = training_items(
                input_path, contract, tokenizer, QTYPES, max_len, head_max_len,
                seed=args.seed, epoch=epoch, allowed_ids=train_ids,
                target_counts=selected_targets,
            )
            epoch_loss = 0.0
            batches = batches_with_info(
                stream, args.micro_batch_size, args.seed + epoch, args.shuffle_buffer,
            )
            last_group_size = microbatches_per_epoch % args.grad_accumulation or args.grad_accumulation
            for micro_index, batch in enumerate(batches):
                packed = __import__("laya.common", fromlist=["collate_items"]).collate_items(
                    [[item] for item in batch], pad_id,
                )
                logits, action_logits = model(
                    packed["input_ids"].to(device), packed["attention_mask"].to(device),
                    packed["marker_pos"].to(device), packed["marker_mask"].to(device),
                    packed["qtype"].to(device),
                )
                # The action head has no target in this corpus and is frozen.
                del action_logits
                mask = packed["marker_mask"].to(device).bool()
                labels = packed["label"].to(device)
                target = torch.nn.functional.one_hot(
                    labels, num_classes=logits.shape[-1],
                ).to(dtype=torch.float32)
                target = target * mask
                sigma = sigma_at_step(progress, total_steps)
                loss, mean_reward, ce_loss = rlcd_loss(
                    logits, target, packed["qtype"].to(device), mask,
                    sigma=sigma, group_size=args.group_size, proper_reward=proper_reward,
                    sample_weights=torch.tensor(
                        [item["loss_weight"] for item in batch],
                        dtype=torch.float32, device=device,
                    ),
                    w_sph=0.75, w_rps=1.0,
                )
                accumulation_group = micro_index // args.grad_accumulation
                current_group_size = (
                    last_group_size if accumulation_group == steps_per_epoch - 1
                    else args.grad_accumulation
                )
                scaled_loss = loss / current_group_size
                scaled_loss.backward()
                loss_value = float(loss.detach().cpu().item())
                epoch_loss += loss_value
                loss_total += loss_value
                micro_count += 1
                should_step = (
                    (micro_index + 1) % args.grad_accumulation == 0
                    or micro_index + 1 == microbatches_per_epoch
                )
                if not should_step:
                    continue
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad(set_to_none=True)
                progress += 1
                if progress % args.checkpoint_steps == 0 or progress == total_steps:
                    save_model_weights(
                        args.experiment_dir / "last-model.safetensors", model, torch, save_file,
                    )
                    BASE.atomic_json(args.experiment_dir / "training-progress.json", {
                        "epoch": epoch + 1, "step": progress, "totalSteps": total_steps,
                        "meanLoss": loss_total / max(1, micro_count),
                        "meanRewardLastBatch": float(mean_reward.detach().cpu().item()),
                        "softCrossEntropyLastBatch": float(ce_loss.detach().cpu().item()),
                        "elapsedSeconds": time.monotonic() - started,
                        "checkpoint": "last-model.safetensors",
                    })
                    print(
                        f"epoch={epoch + 1}/{args.epochs} optimizer_step={progress}/{total_steps} "
                        f"mean_loss={loss_total / max(1, micro_count):.4f} "
                        f"reward={float(mean_reward.detach().cpu().item()):.4f}",
                        flush=True,
                    )

            calibration = HELPERS.evaluate(
                model, eval_items(calibration_rows, contract, tokenizer, QTYPES, max_len, head_max_len),
                pad_id, args.micro_batch_size, device,
            )
            values = [
                calibration[field]["macroF1"] for field in TRAIN_FIELDS
                if calibration.get(field, {}).get("macroF1") is not None
            ]
            score = sum(values) / max(1, len(values))
            if score > best_score + 1e-6:
                best_score, best_epoch = score, epoch + 1
                save_model_weights(
                    args.experiment_dir / "best-model.safetensors", model, torch, save_file,
                )
            epoch_history.append({
                "epoch": epoch + 1,
                "meanTrainingLoss": epoch_loss / max(1, microbatches_per_epoch),
                "calibrationMeanFieldMacroF1": score,
                "calibration": calibration,
            })
            BASE.atomic_json(args.experiment_dir / "epoch-metrics.json", {
                "epochs": epoch_history, "bestEpoch": best_epoch,
            })
            print(f"epoch={epoch + 1}/{args.epochs} calibration_mean_macro_f1={score:.4f}", flush=True)

        best_path = args.experiment_dir / "best-model.safetensors"
        if not best_path.is_file():
            shutil.copyfile(weights_path, best_path)
            selected_source = "pinned_base_no_calibration_improvement"
        else:
            selected_source = "best_calibration_epoch"
        selected_state = load_file(str(best_path), device="cpu")
        model.load_state_dict(selected_state, strict=True)
        model.to(device)
        calibration_logits = collect_calibration(
            model, calibration_rows, contract, tokenizer, QTYPES, max_len, head_max_len,
            pad_id, args.micro_batch_size, device, torch,
        )
        temperatures = fit_bucket_temperatures(calibration_logits, torch)
        final_config = json.loads(config_path.read_text(encoding="utf-8"))
        base_temperatures = list(final_config.get("temperature", [1.0, 1.0, 1.0]))
        if len(base_temperatures) != 3:
            base_temperatures = [1.0, 1.0, 1.0]
        final_config["fine_tuned"] = True
        final_config["model_name"] = "niazfinder-divar-real-estate-rlcd-research"
        final_config["temperature"] = base_temperatures
        final_config["temperature_by_options"] = temperatures
        final_config["max_len"] = max_len
        final_config["head_max_len"] = head_max_len
        final_config["training_method"] = "official_laya_rlcd_full_parameter_v1"
        final_config["research_only"] = True
        args.experiment_dir.joinpath("rl_agent_config.json").write_text(
            json.dumps(final_config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
        )
        save_model_weights(args.experiment_dir / "model.safetensors", model, torch, save_file)
        selected_calibration = HELPERS.evaluate(
            model, eval_items(calibration_rows, contract, tokenizer, QTYPES, max_len, head_max_len),
            pad_id, args.micro_batch_size, device,
        )
        selected_test = HELPERS.evaluate(
            model, eval_items(test_rows, contract, tokenizer, QTYPES, max_len, head_max_len),
            pad_id, args.micro_batch_size, device,
        )
        BASE.atomic_json(args.experiment_dir / "evaluation.json", {
            "syntheticOnly": True,
            "notEvidenceOfRealUserNeedAccuracy": True,
            "baseline": {"calibration": calibration_metrics, "test": baseline_test_metrics},
            "selectedModel": {"calibration": selected_calibration, "boundedTest": selected_test},
            "fittedTemperatureByOptions": temperatures,
            "selectedBestEpoch": best_epoch,
            "selectedCheckpointSource": selected_source,
            "epochs": epoch_history,
            "elapsedSeconds": time.monotonic() - started,
        })
        manifest["status"] = "research_run_complete"
        manifest["selectedBestEpoch"] = best_epoch
        manifest["selectedCheckpointSource"] = selected_source
        manifest["fittedTemperatureByOptions"] = temperatures
        manifest["completedAtUnix"] = time.time()
        manifest["result"] = "full-model research checkpoint; synthetic-only; never production-authorized"
        BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        BASE.atomic_json(args.experiment_dir / "training-progress.json", {
            "epoch": args.epochs, "step": total_steps, "totalSteps": total_steps,
            "meanLoss": loss_total / max(1, micro_count),
            "elapsedSeconds": time.monotonic() - started,
            "checkpoint": "model.safetensors",
        })
        print(json.dumps({
            "status": manifest["status"],
            "experimentDirectory": str(args.experiment_dir),
            "device": device.type,
            "trainingDecisions": training_decisions,
            "optimizerSteps": total_steps,
            "selectedCheckpointSource": selected_source,
            "temperatureByOptions": temperatures,
            "elapsedSeconds": time.monotonic() - started,
        }, ensure_ascii=False, indent=2), flush=True)
        return 0
    except KeyboardInterrupt:
        save_model_weights(args.experiment_dir / "last-model.safetensors", model, torch, save_file)
        progress_record = json.loads((args.experiment_dir / "training-progress.json").read_text(encoding="utf-8"))
        progress_record["status"] = "interrupted_weights_preserved_optimizer_not_saved"
        progress_record["lastCheckpointSavedAtUnix"] = time.time()
        BASE.atomic_json(args.experiment_dir / "training-progress.json", progress_record)
        manifest["status"] = "interrupted_weights_preserved_optimizer_not_saved"
        manifest["interruptedAtUnix"] = time.time()
        BASE.atomic_json(args.experiment_dir / "manifest.json", manifest)
        print("Training interrupted; last full-model weights were atomically preserved.", flush=True)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
