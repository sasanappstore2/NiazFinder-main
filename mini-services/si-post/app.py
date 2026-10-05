"""Private Si Multilingual inference worker for the /post natural intake flow.

This process deliberately loads one explicit checkpoint and exposes only the typed
decision primitive required by the intake route. It is intended to bind to loopback
and to be reached through the Next.js server route, never directly by the browser.
"""

from __future__ import annotations

import asyncio
import hashlib
import importlib
import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator


MODEL_NAME = os.environ.get("SI_MODEL_NAME", "si/multilingual")
MODEL_REVISION = "e4e9ddf21a7b1903b7acffd8814ad4307bf63a67"
BASE_WEIGHT_SHA256 = "9d628fd971b700382ac6f65920a86f149777b2e748e0c955fb3b19695aa8f204"
TRAINING_DATA_SHA256 = "aeb532dc7fbeafd7a74bcc4d597d50eae1722eb6d558f4f09ed267e071f63641"
DIVAR_SOURCE_SHA256 = "e5760fe1325a195e6682c371457bfecd51d255c518756e3cbea234b8163a801f"
RESEARCH_TRAINING_FIELDS = ["category_candidate", "property_kind", "transaction_type"]
RESEARCH_ADAPTER_PREFIXES = ("head.", "scorer.", "type_emb.")
FA_BUYER_SOURCE_DATASET = "niazfinder-fa-buyer-persian-templates"
FA_BUYER_LABEL_PROVENANCE = "deterministic_fa_template_from_catalog_label"
MAX_STATE_CHARS = 12_000
MAX_QUESTIONS = 16
MAX_BATCH_STATES = 32
MAX_REQUEST_BYTES = 1_000_000
MODEL_MAX_LEN = 1024
BASE_HEAD_MAX_LEN = 256
MAX_HEAD_MAX_LEN = 768
HEAD_BUDGET_SLACK = 16
HEAD_BUDGET_ROUNDING = 32
MAX_OPTION_TOKENS = 48
ALLOWED_QUESTION_IDS = {
    "transaction_type",
    "property_kind",
    "deed_type",
    "usage",
    "parking",
    "elevator",
    "storage",
    "category_candidate",
    "neighborhood_candidate",
}
ALLOWED_QUESTION_TYPES = {"choice", "noul", "score"}


class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: str | dict[str, Any] | list[Any]
    questions: dict[str, dict[str, Any]] = Field(min_length=1, max_length=MAX_QUESTIONS)

    @field_validator("state")
    @classmethod
    def validate_state(cls, value: str | dict[str, Any] | list[Any]):
        if len(str(value)) > MAX_STATE_CHARS:
            raise ValueError("state is too large")
        return value

    @field_validator("questions")
    @classmethod
    def validate_questions(cls, value: dict[str, dict[str, Any]]):
        return validate_question_definitions(value)


class PredictBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    states: list[str | dict[str, Any] | list[Any]] = Field(min_length=1, max_length=MAX_BATCH_STATES)
    questions: dict[str, dict[str, Any]] = Field(min_length=1, max_length=MAX_QUESTIONS)

    @field_validator("states")
    @classmethod
    def validate_states(cls, values: list[str | dict[str, Any] | list[Any]]):
        if any(len(str(value)) > MAX_STATE_CHARS for value in values):
            raise ValueError("a state is too large")
        return values

    @field_validator("questions")
    @classmethod
    def validate_questions(cls, value: dict[str, dict[str, Any]]):
        return validate_question_definitions(value)


def validate_question_definitions(value: dict[str, dict[str, Any]]):
    unknown = set(value) - ALLOWED_QUESTION_IDS
    if unknown:
        raise ValueError("unsupported question")
    for question in value.values():
        if question.get("type") not in ALLOWED_QUESTION_TYPES:
            raise ValueError("unsupported question type")
        if not isinstance(question.get("instructions"), str) or not question["instructions"].strip():
            raise ValueError("question instructions are required")
        criteria = question.get("criteria")
        if not isinstance(criteria, (dict, list)):
            raise ValueError("question criteria are required")
        if len(str(question)) > 12_000:
            raise ValueError("question is too large")
    return value


def _required_head_max_len(agent: Any, questions: dict[str, dict[str, Any]]) -> int:
    """Keep complete typed options/instructions inside Si's per-question head budget.

    Si defaults to a 256-token question head. With many choice options,
    ``build_sequence`` shortens every option evenly and then truncates the
    instructions. Calculate the minimum from the exact installed Si renderer
    and tokenizer so rich property-category choices are not silently clipped.
    """
    tokenizer = getattr(agent, "tok", None)
    config = getattr(agent, "cfg", {})
    configured = int(config.get("head_max_len", BASE_HEAD_MAX_LEN)) if isinstance(config, dict) else BASE_HEAD_MAX_LEN
    if tokenizer is None:
        raise HTTPException(status_code=503, detail="inference unavailable")

    inference_package = os.environ.get("SI_INFERENCE_PACKAGE", "")
    if not inference_package:
        raise HTTPException(status_code=503, detail="inference package not configured")
    common = importlib.import_module(f"{inference_package}.common")
    render_options = common.render_options

    required = max(BASE_HEAD_MAX_LEN, configured)
    try:
        mask_token = tokenizer.mask_token
        for definition in questions.values():
            question_type = definition["type"]
            instruction = definition["instructions"].replace(mask_token, " ")
            rendered_question = {
                "t": question_type,
                "ins": instruction,
                "crit": definition["criteria"],
            }
            if "labels" in definition:
                rendered_question["labels"] = definition["labels"]

            option_tokens = 0
            for option in render_options(rendered_question):
                encoded = tokenizer(
                    " " + option.replace(mask_token, " "),
                    add_special_tokens=False,
                    truncation=True,
                    max_length=MAX_OPTION_TOKENS,
                )["input_ids"]
                # build_sequence prepends one mask token to every rendered option.
                option_tokens += 1 + len(encoded)

            instruction_tokens = len(tokenizer(
                f"{question_type} question: {instruction}",
                add_special_tokens=False,
            )["input_ids"])
            required = max(
                required,
                option_tokens + instruction_tokens + HEAD_BUDGET_SLACK,
            )
    except Exception:
        # Do not run with Si's truncating default if the exact tokenizer cannot
        # establish a safe budget. Keep this response free of prompt/tokenizer data.
        raise HTTPException(status_code=503, detail="inference unavailable") from None

    if required > MAX_HEAD_MAX_LEN:
        raise HTTPException(
            status_code=422,
            detail="question options exceed the supported Si token budget",
        )
    return min(
        MAX_HEAD_MAX_LEN,
        ((required + HEAD_BUDGET_ROUNDING - 1) // HEAD_BUDGET_ROUNDING) * HEAD_BUDGET_ROUNDING,
    )


class WorkerState:
    def __init__(self) -> None:
        self.agent: Any | None = None
        self.device = "unknown"
        self.requested_device = "unknown"
        self.error: str | None = None
        self.loaded_at: float | None = None
        self.adapter_mode = "base"
        self.adapter_sha256: str | None = None
        self.lock = asyncio.Lock()


worker = WorkerState()


def _resolve_device() -> str:
    requested = os.getenv("SI_DEVICE", "auto").strip().lower()
    if requested not in {"auto", "mps", "cuda", "cpu"}:
        raise RuntimeError("SI_DEVICE must be auto, mps, cuda, or cpu")
    if requested != "auto":
        return requested

    import torch

    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def _actual_device(agent: Any) -> str:
    device = getattr(agent, "device", None)
    return str(device) if device is not None else "unknown"


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _apply_research_adapter(
    agent: Any,
    model_path: str | Path,
    adapter_path: str | Path,
    manifest_path: str | Path,
) -> str:
    """Apply only a completed local research adapter to the pinned base model.

    This deliberately cannot make the synthetic experiment production-loadable.
    Every file and tensor is validated before mutating the in-memory model.
    """
    try:
        base_dir = Path(model_path).expanduser().resolve(strict=True)
        weights_path = base_dir / "model.safetensors"
        selected_adapter = Path(adapter_path).expanduser().resolve(strict=True)
        manifest_file = Path(manifest_path).expanduser().resolve(strict=True)
        if not base_dir.is_dir() or not weights_path.is_file():
            raise ValueError
        if selected_adapter.name != "best-adapter.safetensors":
            raise ValueError

        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            raise ValueError
        if (
            manifest.get("status") != "research_run_complete"
            or manifest.get("experimentOnly") is not True
            or manifest.get("productionLoadAllowed") is not False
            or manifest.get("syntheticTrainingAuthorized") is not True
            or manifest.get("syntheticTargetsAreRealNeedGroundTruth") is not False
            or next((v for k, v in manifest.items() if k.endswith("PredictionsUsedAsLabels")), None) is not False
            or manifest.get("model") != MODEL_NAME
            or manifest.get("modelRevision") != MODEL_REVISION
            or manifest.get("baseWeightsSha256") != BASE_WEIGHT_SHA256
            or manifest.get("dataSha256") != TRAINING_DATA_SHA256
            or manifest.get("sourceDataset") != "divarofficial/real_estate_ads"
            or manifest.get("sourceDatasetSha256") != DIVAR_SOURCE_SHA256
            or manifest.get("trainingFields") != RESEARCH_TRAINING_FIELDS
            or not isinstance(manifest.get("selectedBestEpoch"), int)
            or manifest["selectedBestEpoch"] < 1
        ):
            raise ValueError
        if _sha256_file(weights_path) != BASE_WEIGHT_SHA256:
            raise ValueError

        import torch
        from safetensors.torch import load_file

        model = getattr(agent, "model", None)
        if model is None:
            raise ValueError
        adapter_state = load_file(str(selected_adapter), device="cpu")
        model_state = model.state_dict()
        expected_parameters = {
            name
            for name, _ in model.named_parameters()
            if name.startswith(RESEARCH_ADAPTER_PREFIXES)
        }
        if (
            not adapter_state
            or set(adapter_state) != expected_parameters
            or any(
                not isinstance(tensor, torch.Tensor)
                or not torch.isfinite(tensor).all().item()
                or name not in model_state
                or tuple(tensor.shape) != tuple(model_state[name].shape)
                for name, tensor in adapter_state.items()
            )
        ):
            raise ValueError
        parameter_count = sum(tensor.numel() for tensor in adapter_state.values())
        if parameter_count != manifest.get("trainableParameters"):
            raise ValueError

        incompatibility = model.load_state_dict(adapter_state, strict=False)
        if incompatibility.unexpected_keys:
            raise ValueError
        return _sha256_file(selected_adapter)
    except Exception:
        # Keep local paths, training data, and tensor details out of API errors/logs.
        raise RuntimeError("research_adapter_validation_failed") from None


def _apply_fa_buyer_adapter(
    agent: Any,
    model_path: str | Path,
    adapter_path: str | Path,
    manifest_path: str | Path,
) -> str:
    """Apply the local fa-buyer experiment adapter under its own explicit opt-in.

    The fa-buyer adapter trains the same three decision fields as the research
    adapter, but on NiazFinder Persian template data instead of Divar listings.
    Its manifest cannot claim real-user ground truth or production load
    eligibility, and every file and tensor is validated before mutating the
    in-memory model.
    """
    try:
        base_dir = Path(model_path).expanduser().resolve(strict=True)
        weights_path = base_dir / "model.safetensors"
        selected_adapter = Path(adapter_path).expanduser().resolve(strict=True)
        manifest_file = Path(manifest_path).expanduser().resolve(strict=True)
        if not base_dir.is_dir() or not weights_path.is_file():
            raise ValueError
        if selected_adapter.name != "best-adapter.safetensors":
            raise ValueError

        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
        if not isinstance(manifest, dict):
            raise ValueError
        if (
            manifest.get("status") != "complete"
            or manifest.get("experimentOnly") is not True
            or manifest.get("productionLoadAllowed") is not False
            or manifest.get("syntheticTrainingAuthorized") is not True
            or manifest.get("syntheticTargetsAreRealNeedGroundTruth") is not False
            or next((v for k, v in manifest.items() if k.endswith("PredictionsUsedAsLabels")), None) is not False
            or manifest.get("labelProvenance") != FA_BUYER_LABEL_PROVENANCE
            or manifest.get("sourceDataset") != FA_BUYER_SOURCE_DATASET
            or manifest.get("model") != MODEL_NAME
            or manifest.get("modelRevision") != MODEL_REVISION
            or manifest.get("baseWeightsSha256") != BASE_WEIGHT_SHA256
            or manifest.get("trainingFields") != RESEARCH_TRAINING_FIELDS
            or not isinstance(manifest.get("dataSha256"), str)
            or len(manifest["dataSha256"]) != 64
            or not isinstance(manifest.get("questionSchemaSha256"), str)
            or len(manifest["questionSchemaSha256"]) != 64
            or not isinstance(manifest.get("selectedBestEpoch"), int)
            or manifest["selectedBestEpoch"] < 1
            or not isinstance(manifest.get("trainableParameters"), int)
            or manifest["trainableParameters"] < 1
        ):
            raise ValueError
        if _sha256_file(weights_path) != BASE_WEIGHT_SHA256:
            raise ValueError

        import torch
        from safetensors.torch import load_file

        model = getattr(agent, "model", None)
        if model is None:
            raise ValueError
        adapter_state = load_file(str(selected_adapter), device="cpu")
        model_state = model.state_dict()
        expected_parameters = {
            name
            for name, _ in model.named_parameters()
            if name.startswith(RESEARCH_ADAPTER_PREFIXES)
        }
        if (
            not adapter_state
            or set(adapter_state) != expected_parameters
            or any(
                not isinstance(tensor, torch.Tensor)
                or not torch.isfinite(tensor).all().item()
                or name not in model_state
                or tuple(tensor.shape) != tuple(model_state[name].shape)
                for name, tensor in adapter_state.items()
            )
        ):
            raise ValueError
        parameter_count = sum(tensor.numel() for tensor in adapter_state.values())
        if parameter_count != manifest.get("trainableParameters"):
            raise ValueError

        incompatibility = model.load_state_dict(adapter_state, strict=False)
        if incompatibility.unexpected_keys:
            raise ValueError
        return _sha256_file(selected_adapter)
    except Exception:
        # Keep local paths, training data, and tensor details out of API errors/logs.
        raise RuntimeError("fa_buyer_adapter_validation_failed") from None


def _load_agent() -> None:
    configured_model = os.getenv("SI_MODEL_NAME", MODEL_NAME).strip() or MODEL_NAME
    if configured_model != MODEL_NAME:
        raise RuntimeError("SI_MODEL_NAME must remain the approved checkpoint")

    cache_dir = os.getenv("SI_CACHE_DIR", "").strip()
    if cache_dir:
        os.environ.setdefault("HF_HOME", cache_dir)
        os.environ.setdefault("HUGGINGFACE_HUB_CACHE", os.path.join(cache_dir, "hub"))

    model_path = os.getenv("SI_MODEL_PATH", "").strip() or configured_model
    requested_device = _resolve_device()
    adapter_path = os.getenv("SI_ADAPTER_PATH", "").strip()
    fa_adapter_path = os.getenv("SI_FA_BUYER_ADAPTER_PATH", "").strip()
    local_model_path = os.getenv("SI_MODEL_PATH", "").strip()
    if adapter_path and fa_adapter_path:
        raise RuntimeError("only_one_adapter_opt_in_allowed")
    if adapter_path:
        if os.getenv("SI_ALLOW_RESEARCH_ADAPTER", "").strip().lower() != "true":
            raise RuntimeError("research_adapter_opt_in_required")
        if not local_model_path:
            raise RuntimeError("research_adapter_requires_local_base_checkpoint")
    if fa_adapter_path:
        if os.getenv("SI_ALLOW_FA_BUYER_ADAPTER", "").strip().lower() != "true":
            raise RuntimeError("fa_buyer_adapter_opt_in_required")
        if not local_model_path:
            raise RuntimeError("fa_buyer_adapter_requires_local_base_checkpoint")

    # Import lazily so /health can still explain an unavailable worker when the
    # optional Python environment has not been installed yet. The package name
    # comes from the runtime environment (never hardcoded here).
    inference_package = os.environ.get("SI_INFERENCE_PACKAGE", "")
    if not inference_package:
        raise HTTPException(status_code=503, detail="inference package not configured")
    load = importlib.import_module(inference_package).load

    agent = load(model_path, device=requested_device)
    adapter_sha256 = None
    adapter_mode = "base"
    if adapter_path:
        manifest_path = os.getenv("SI_ADAPTER_MANIFEST", "").strip()
        if not manifest_path:
            manifest_path = str(Path(adapter_path).expanduser().parent / "manifest.json")
        adapter_sha256 = _apply_research_adapter(
            agent, local_model_path, adapter_path, manifest_path
        )
        adapter_mode = "research_only"
    elif fa_adapter_path:
        fa_manifest_path = os.getenv("SI_FA_BUYER_ADAPTER_MANIFEST", "").strip()
        if not fa_manifest_path:
            fa_manifest_path = str(Path(fa_adapter_path).expanduser().parent / "manifest.json")
        adapter_sha256 = _apply_fa_buyer_adapter(
            agent, local_model_path, fa_adapter_path, fa_manifest_path
        )
        adapter_mode = "fa_buyer_experiment"

    worker.agent = agent
    worker.requested_device = requested_device
    # Si may fall back (for example MPS -> CPU) when the requested device
    # cannot initialize. Report the loaded agent's actual device, not the
    # request, so health and benchmark metadata remain truthful.
    worker.device = _actual_device(worker.agent)
    worker.adapter_mode = adapter_mode
    worker.adapter_sha256 = adapter_sha256
    worker.loaded_at = time.time()
    worker.error = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await asyncio.to_thread(_load_agent)
    except Exception:
        # Keep the process alive for a useful local health response. Do not put
        # model paths, tokens, or user text into the error body/logs.
        worker.agent = None
        worker.error = "model_load_failed"
    yield
    worker.agent = None


app = FastAPI(title="NiazFinder private post Si worker", lifespan=lifespan)


@app.middleware("http")
async def loopback_and_size_guard(request: Request, call_next):
    client = request.client.host if request.client else None
    if client not in {"127.0.0.1", "::1", "localhost"}:
        raise HTTPException(status_code=403, detail="loopback only")
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_REQUEST_BYTES:
        raise HTTPException(status_code=413, detail="payload too large")
    return await call_next(request)


@app.get("/health")
async def health():
    return {
        "ok": worker.agent is not None,
        "model_loaded": worker.agent is not None,
        "model_name": MODEL_NAME,
        "device": worker.device,
        "requested_device": worker.requested_device,
        "adapter_mode": worker.adapter_mode,
        "adapter_sha256": worker.adapter_sha256,
        "error": worker.error,
    }


@app.post("/predict")
async def predict(payload: PredictRequest):
    if worker.agent is None:
        raise HTTPException(status_code=503, detail="model unavailable")

    started = time.perf_counter()
    async with worker.lock:
        head_max_len = await asyncio.to_thread(
            _required_head_max_len, worker.agent, payload.questions
        )
        try:
            result = await asyncio.to_thread(
                worker.agent.predict,
                payload.state,
                payload.questions,
                lang="fa",
                max_len=MODEL_MAX_LEN,
                head_max_len=head_max_len,
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=503, detail="inference unavailable") from None

    return {
        "answers": result.get("answers", {}),
        "usage": result.get("usage", {}),
        "latencyMs": round((time.perf_counter() - started) * 1000, 2),
        "model": MODEL_NAME,
        "device": worker.device,
        "headMaxLen": head_max_len,
    }


@app.post("/predict-batch")
async def predict_batch(payload: PredictBatchRequest):
    if worker.agent is None:
        raise HTTPException(status_code=503, detail="model unavailable")
    if len(payload.model_dump_json().encode("utf-8")) > MAX_REQUEST_BYTES:
        raise HTTPException(status_code=413, detail="payload too large")

    started = time.perf_counter()
    async with worker.lock:
        head_max_len = await asyncio.to_thread(
            _required_head_max_len, worker.agent, payload.questions
        )
        try:
            results = await asyncio.to_thread(
                worker.agent.predict_batch,
                payload.states,
                payload.questions,
                batch_size=len(payload.states),
                lang="fa",
                max_len=MODEL_MAX_LEN,
                head_max_len=head_max_len,
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=503, detail="inference unavailable") from None
    if len(results) != len(payload.states):
        raise HTTPException(status_code=503, detail="inference response mismatch")

    return {
        "results": results,
        "latencyMs": round((time.perf_counter() - started) * 1000, 2),
        "model": MODEL_NAME,
        "device": worker.device,
        "headMaxLen": head_max_len,
    }
