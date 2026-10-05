#!/usr/bin/env python3
"""Tests for streaming corpus validation, bounded sampling, batching and metrics."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
from pathlib import Path


SCRIPT = Path(__file__).with_name("train-divar-si-head-stream.py")
SPEC = importlib.util.spec_from_file_location("train_divar_si_head_stream", SCRIPT)
assert SPEC and SPEC.loader
TRAINER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TRAINER)


def contract() -> dict:
    options = {
        "category_candidate": ["apartment-sale", "shop-rent", "unknown"],
        "property_kind": ["apartment", "shop", "unknown"],
        "transaction_type": ["buy", "rent_monthly", "rent_rahn_full", "unknown"],
    }
    return {
        field: {"type": "choice", "instructions": f"تشخیص {field}",
                "criteria": {value: value for value in values}}
        for field, values in options.items()
    }


def state_for_split(split: str) -> str:
    for index in range(10_000):
        text = f"نیاز ساختگی {split} شماره {index} برای آزمون جداسازی متن."
        if TRAINER.training_split_for_state(text) == split:
            return text
    raise AssertionError(f"Could not find a test state for {split}.")


def row(split: str, group: str, example_id: str, question_hash: str,
        category: str = "apartment-sale", state: str | None = None,
        semantics_version: int = 5) -> dict:
    kind = "shop" if category == "shop-rent" else "apartment"
    is_v6_rent = semantics_version == 6 and category == "shop-rent"
    transaction = "rent_rahn_full" if is_v6_rent else "rent_monthly" if category == "shop-rent" else "buy"
    transaction_source = (
        "explicit_structured_offer_rent_mode_recast_as_hypothetical_need"
        if is_v6_rent else "counterfactual_from_requested_category"
    )
    return {
        "schemaVersion": semantics_version,
        "taskType": TRAINER.BASE.DATA_TASKS[semantics_version],
        "exampleId": example_id,
        "synthetic": True,
        "derivedFromSupplyListing": True,
        "realNeedGroundTruth": False,
        "trainingEligible": False,
        "state": state or state_for_split(split),
        "stateTruncated": False,
        "source": {"dataset": "divarofficial/real_estate_ads", "splitGroup": group},
        "hypotheticalNeed": {
            "schemaVersion": semantics_version,
            "realNeedGroundTruth": False,
            "trainingEligible": False,
            "questionSchemaSha256": question_hash,
            "generation": {"method": "deterministic-counterfactual-template", "version": semantics_version},
            "originalSplit": split,
            "trainingSplit": TRAINER.training_split_for_state(state or state_for_split(split)),
            "targetDecisions": {
                "category_candidate": {"value": category, "source": "source_offer_category_counterfactual"},
                "property_kind": {"value": kind, "source": "source_offer_category_counterfactual"},
                "transaction_type": {"value": transaction, "source": transaction_source},
            },
        },
    }


def main() -> None:
    class FakeMps:
        def __init__(self, available: bool):
            self.available = available

        def is_built(self) -> bool:
            return self.available

        def is_available(self) -> bool:
            return self.available

    class FakeTorch:
        def __init__(self, mps_available: bool):
            self.backends = type("Backends", (), {"mps": FakeMps(mps_available)})()

        @staticmethod
        def device(name: str) -> str:
            return name

    assert TRAINER.resolve_device(FakeTorch(True), "auto") == "mps"
    assert TRAINER.resolve_device(FakeTorch(False), "auto") == "cpu"
    assert TRAINER.resolve_device(FakeTorch(True), "cpu") == "cpu"
    try:
        TRAINER.resolve_device(FakeTorch(False), "mps")
    except RuntimeError:
        pass
    else:
        raise AssertionError("An explicitly requested but unavailable MPS device must fail closed.")

    schema = contract()
    question_hash = hashlib.sha256(json.dumps(schema, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
    rows = [
        row("train", "group-a", "example-a", question_hash),
        row("calibration", "group-b", "example-b", question_hash, "shop-rent"),
        row("test", "group-c", "example-c", question_hash),
    ]
    with tempfile.TemporaryDirectory() as temporary:
        path = Path(temporary) / "synthetic.jsonl"
        path.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in rows), encoding="utf-8")
        report = TRAINER.validate_corpus(path, schema, question_hash)
        assert report["rowCount"] == 3
        assert report["uniqueSourceGroups"] == 3
        assert report["uniqueNormalizedStateGroups"] == 3
        assert report["rowsBySplit"] == {"train": 1, "calibration": 1, "test": 1}
        assert set(report["targetsByField"]) == set(TRAINER.TRAIN_FIELDS)
        sample = TRAINER.select_rows(path, "calibration", 3)
        assert len(sample) == 1 and sample[0]["exampleId"] == "example-b"

        sampling_rows = [
            row("calibration", f"sample-group-{index}", f"sample-{index}", question_hash,
                category="shop-rent" if index == 0 else "apartment-sale")
            for index in range(12)
        ]
        sampling_path = Path(temporary) / "sampling.jsonl"
        sampling_path.write_text(
            "".join(json.dumps(item, ensure_ascii=False) + "\n" for item in sampling_rows),
            encoding="utf-8",
        )
        expected_ids = [
            item["exampleId"] for item in sorted(
                sampling_rows,
                key=lambda item: hashlib.sha256(
                    f"{item['source']['splitGroup']}:{item['exampleId']}".encode()
                ).digest(),
            )[:5]
        ]
        uniform_sample = TRAINER.select_rows(sampling_path, "calibration", 5)
        repeated_sample = TRAINER.select_rows(sampling_path, "calibration", 5)
        assert [item["exampleId"] for item in uniform_sample] == expected_ids
        assert [item["exampleId"] for item in repeated_sample] == expected_ids

        class FakeModel:
            def __init__(self) -> None:
                self.loaded_state = None

            def load_state_dict(self, state, strict):
                self.loaded_state = (state, strict)

        fallback_path = Path(temporary) / "best-adapter.safetensors"
        fake_model = FakeModel()
        original_save_adapter = TRAINER.BASE.save_adapter
        TRAINER.BASE.save_adapter = lambda path, model: path.write_bytes(b"base-adapter")
        try:
            used_fallback = TRAINER.ensure_best_adapter(
                fallback_path, fake_model, {"head.test": "base-weight"},
            )
            assert used_fallback is True
            assert fallback_path.read_bytes() == b"base-adapter"
            assert fake_model.loaded_state == ({"head.test": "base-weight"}, False)
            assert TRAINER.ensure_best_adapter(fallback_path, fake_model, {}) is False
        finally:
            TRAINER.BASE.save_adapter = original_save_adapter

        v6_rows = [
            row("train", "v6-group-a", "v6-example-a", question_hash, semantics_version=6),
            row("calibration", "v6-group-b", "v6-example-b", question_hash, "shop-rent", semantics_version=6),
            row("test", "v6-group-c", "v6-example-c", question_hash, semantics_version=6),
        ]
        v6_path = Path(temporary) / "synthetic-v6.jsonl"
        v6_path.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in v6_rows), encoding="utf-8")
        v6_report = TRAINER.validate_corpus(v6_path, schema, question_hash, TRAINER.BASE.DATA_TASKS[6])
        assert v6_report["rowCount"] == 3
        assert v6_report["targetsByField"]["transaction_type"]["rent_rahn_full"] == 1

        duplicate_path = Path(temporary) / "duplicate.jsonl"
        duplicate_rows = [
            row("train", "group-d", "example-d", question_hash, state="آپارتمان ۱۲۳ متر، ونک."),
            row("train", "group-e", "example-e", question_hash, state="آپارتمان 123 متر ونک"),
            row("calibration", "group-f", "example-f", question_hash),
            row("test", "group-g", "example-g", question_hash),
        ]
        duplicate_path.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in duplicate_rows), encoding="utf-8")
        try:
            TRAINER.validate_corpus(duplicate_path, schema, question_hash)
        except ValueError as error:
            assert "repeats a normalized generated model-input" in str(error)
        else:
            raise AssertionError("normalized duplicate model inputs must be rejected before training")

        legacy_rows = [row("train", "legacy-train", "legacy-a", question_hash),
                       row("calibration", "legacy-cal", "legacy-b", question_hash),
                       row("test", "legacy-test", "legacy-c", question_hash)]
        for item in legacy_rows:
            item["hypotheticalNeed"].pop("trainingSplit")
        legacy_path = Path(temporary) / "legacy.jsonl"
        legacy_path.write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in legacy_rows), encoding="utf-8")
        try:
            TRAINER.validate_corpus(legacy_path, schema, question_hash)
        except ValueError as error:
            assert "corrected model-input split" in str(error)
        else:
            raise AssertionError("legacy rows without text-derived split must fail closed")

    items = [{"n": n} for n in range(100)]
    shuffled = list(TRAINER.batch_iter(items, 7, shuffle=True, seed=8, shuffle_buffer=11))
    assert sum(map(len, shuffled)) == 100 and all(1 <= len(batch) <= 7 for batch in shuffled)
    assert len({item["n"] for batch in shuffled for item in batch}) == 100

    matrix = {
        "category_candidate": {
            "unknown": __import__("collections").Counter({"apartment-sale": 1}),
            "apartment-sale": __import__("collections").Counter({"unknown": 1}),
        }
    }
    metrics = TRAINER.summarize_confusions(matrix)["category_candidate"]
    assert metrics["unknownFalsePositiveRate"] == 1.0
    assert metrics["unknownAbstentionRate"] == 1.0
    print("streaming Si trainer: corpus, uniform-sampling, batching and metric checks passed")


if __name__ == "__main__":
    main()
