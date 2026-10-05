#!/usr/bin/env python3
"""Offline contract tests for the local neighborhood Si benchmark."""

from __future__ import annotations

import importlib.util
import math
from pathlib import Path


SCRIPT = Path(__file__).with_name("benchmark-divar-neighborhood-si.py")
SPEC = importlib.util.spec_from_file_location("benchmark_divar_neighborhood_si", SCRIPT)
assert SPEC and SPEC.loader
BENCHMARK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BENCHMARK)


def test_metrics_include_abstentions_and_group_slices() -> None:
    rows = [
        {"target": "a", "prediction": "a", "city": "tehran", "candidateCount": 2},
        {"target": "b", "prediction": "unknown", "city": "tehran", "candidateCount": 3},
        {"target": "b", "prediction": "a", "city": "mashhad", "candidateCount": 2},
    ]
    result = BENCHMARK.score_rows(rows)
    assert result["rows"] == 3
    assert result["accuracyIncludingAbstentions"] == 1 / 3
    assert result["predictionCoverage"] == 2 / 3
    assert math.isclose(result["unknownAbstentionRate"], 1 / 3)
    assert result["selectiveAccuracy"] == 1 / 2
    assert result["wrongNonAbstainingRate"] == 1 / 3
    assert result["targetClassCount"] == 2


def test_only_held_out_test_rows_are_selected() -> None:
    base = {
        "taskType": BENCHMARK.TASK_TYPE,
        "exampleId": "example-hash",
        "state": {"text": "redacted", "context": {"city": "tehran"}},
        "questions": {
            "neighborhood_candidate": {
                "type": "choice",
                "instructions": "choose only from options",
                "criteria": {"neighborhood-a": "A", "neighborhood-b": "B", "unknown": "unknown"},
            }
        },
        "targetDecisions": {"neighborhood_candidate": {"value": "neighborhood-b"}},
        "source": {
            "dataset": "divarofficial/real_estate_ads",
            "perspective": "seller_or_agent_supply_offer",
            "split": "test",
        },
    }
    validated = BENCHMARK.validate_row(base, 1)
    assert validated == (
        "example-hash", base["questions"], "neighborhood-b", "tehran", 2,
    )
    train = {**base, "source": {**base["source"], "split": "train"}}
    assert BENCHMARK.validate_row(train, 2) is None


def test_invalid_candidate_target_fails_closed() -> None:
    row = {
        "taskType": BENCHMARK.TASK_TYPE,
        "state": {"text": "redacted", "context": {"city": "tehran"}},
        "questions": {"neighborhood_candidate": {
            "type": "choice", "instructions": "choose", "criteria": {"a": "A", "b": "B", "unknown": "?"},
        }},
        "targetDecisions": {"neighborhood_candidate": {"value": "not-offered"}},
        "source": {"dataset": "divarofficial/real_estate_ads", "perspective": "seller_or_agent_supply_offer", "split": "test"},
    }
    try:
        BENCHMARK.validate_row(row, 3)
    except ValueError as error:
        assert "offered candidates" in str(error)
    else:
        raise AssertionError("A target outside the bounded city-scoped choices must be rejected.")


def main() -> None:
    test_metrics_include_abstentions_and_group_slices()
    test_only_held_out_test_rows_are_selected()
    test_invalid_candidate_target_fails_closed()
    print("Divar neighborhood Si benchmark contract tests passed")


if __name__ == "__main__":
    main()
