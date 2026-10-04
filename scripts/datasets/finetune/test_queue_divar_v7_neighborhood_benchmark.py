#!/usr/bin/env python3
"""Offline tests for the sequential v6-to-v7 benchmark gate."""

from __future__ import annotations

import importlib.util
from pathlib import Path


SCRIPT = Path(__file__).with_name("queue-divar-v7-neighborhood-benchmark-after-v6.py")
SPEC = importlib.util.spec_from_file_location("queue_divar_v7_neighborhood_benchmark", SCRIPT)
assert SPEC and SPEC.loader
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)


def test_v6_must_finish_its_full_evaluation_before_benchmark() -> None:
    assert QUEUE.upstream_state({"status": "running"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": "evaluating"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": "queued_waiting_for_v3"})[0] == "waiting"
    assert QUEUE.upstream_state({"status": "research_evaluation_complete"})[0] == "ready"
    assert QUEUE.upstream_state({"status": "failed"})[0] == "failed"


def test_queue_paths_cannot_escape_repository() -> None:
    try:
        QUEUE.repo_path(Path("/tmp/repository"), "../outside.json")
    except ValueError as error:
        assert "inside the repository" in str(error)
    else:
        raise AssertionError("Queue artifacts outside the repository must be rejected.")


def main() -> None:
    test_v6_must_finish_its_full_evaluation_before_benchmark()
    test_queue_paths_cannot_escape_repository()
    print("v7 queue gate: sequential MPS and fail-closed status checks passed")


if __name__ == "__main__":
    main()
