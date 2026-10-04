from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any


SCRIPT = Path(__file__).with_name("queue-divar-laya-shadow-after-v7.py")
SPEC = importlib.util.spec_from_file_location("queue_divar_laya_shadow_after_v7", SCRIPT)
assert SPEC and SPEC.loader
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)


def valid_shadow_row() -> dict[str, Any]:
    return {
        "taskType": QUEUE.OUTPUT_TASK,
        "synthetic": True,
        "derivedFromSupplyListing": True,
        "realNeedGroundTruth": False,
        "trainingEligible": False,
        "shadowOnly": True,
        "laya": {"model": QUEUE.MODEL_ID, "device": "mps"},
        "review": {"trainingUse": "not_approved"},
        "hypotheticalNeed": {"realNeedGroundTruth": False},
        "layaDerivedHypotheticalNeed": {
            "model": QUEUE.MODEL_ID,
            "synthetic": True,
            "realNeedGroundTruth": False,
            "trainingEligible": False,
            "accepted": False,
        },
    }


def test_upstream_gate_waits_and_fails_closed() -> None:
    assert QUEUE.upstream_state({"status": "queued_waiting_for_v6"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": "running"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": QUEUE.READY_STATUS})[0] == "ready"
    assert QUEUE.upstream_state({"status": "evaluation_failed"})[0] == "failed"


def test_health_requires_exact_base_model_and_real_mps() -> None:
    good = {
        "model_loaded": True,
        "model_name": QUEUE.MODEL_ID,
        "adapter_mode": "base",
        "device": "mps",
        "requested_device": "mps",
    }
    QUEUE.validate_health(good)
    for bad in (
        {**good, "model_name": "another/model"},
        {**good, "adapter_mode": "research_only"},
        {**good, "device": "cpu"},
        {**good, "model_loaded": False},
    ):
        try:
            QUEUE.validate_health(bad)
        except ValueError:
            pass
        else:
            raise AssertionError("The queue must refuse an incorrect checkpoint/device.")


def test_shadow_row_must_remain_synthetic_and_unapproved() -> None:
    QUEUE.validate_shadow_row(valid_shadow_row())
    bad = valid_shadow_row()
    bad["trainingEligible"] = True
    try:
        QUEUE.validate_shadow_row(bad)
    except ValueError:
        pass
    else:
        raise AssertionError("A pseudo-need row must never be promoted to training truth.")


def test_completed_full_manifest_and_jsonl_are_verified(tmp_path: Path) -> None:
    output = tmp_path / "shadow.jsonl"
    row = valid_shadow_row()
    output.write_text(__import__("json").dumps(row) + "\n", encoding="utf-8")
    manifest = {
        "status": "complete",
        "scriptVersion": 15,
        "taskType": QUEUE.OUTPUT_TASK,
        "sourceCorpusSha256": "a" * 64,
        "sourceCorpusRows": 999416,
        "model": QUEUE.MODEL_ID,
        "selection": "all",
        "devicesUsed": ["mps"],
        "rowsProcessed": 1,
        "outputBytes": output.stat().st_size,
    }
    sidecar = Path(str(output) + ".manifest.json")
    sidecar.write_text(__import__("json").dumps(manifest), encoding="utf-8")
    plan = {"sourceSha256": "a" * 64, "source": {"rows": 999416}}
    result = QUEUE.validate_shadow_output(output, sidecar, plan, minimum_rows=1)
    assert result["rows"] == 1
    manifest["devicesUsed"] = ["cpu"]
    sidecar.write_text(__import__("json").dumps(manifest), encoding="utf-8")
    try:
        QUEUE.validate_shadow_output(output, sidecar, plan, minimum_rows=1)
    except ValueError:
        pass
    else:
        raise AssertionError("The full result must reject CPU fallback.")


def main() -> None:
    test_upstream_gate_waits_and_fails_closed()
    test_health_requires_exact_base_model_and_real_mps()
    test_shadow_row_must_remain_synthetic_and_unapproved()
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as directory:
        test_completed_full_manifest_and_jsonl_are_verified(Path(directory))
    print("Laya Divar shadow queue CPU gates passed")


if __name__ == "__main__":
    main()
