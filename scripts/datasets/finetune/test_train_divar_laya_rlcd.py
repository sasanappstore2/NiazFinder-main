#!/usr/bin/env python3
"""CPU-only contract checks for the queued RLCD trainer objective."""

from __future__ import annotations

import importlib.util
from argparse import Namespace
from pathlib import Path

import torch
from laya.common import QTYPES, proper_reward


SCRIPT = Path(__file__).with_name("train-divar-laya-rlcd.py")
SPEC = importlib.util.spec_from_file_location("divar_laya_rlcd", SCRIPT)
assert SPEC and SPEC.loader
RLCD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RLCD)


def test_rlcd_loss_is_finite_and_differentiable() -> None:
    torch.manual_seed(417)
    logits = torch.tensor(
        [[0.1, 0.7, -0.2, -1e4], [0.4, -0.1, 0.8, 0.2]],
        dtype=torch.float32,
        requires_grad=True,
    )
    mask = torch.tensor([[True, True, True, False], [True, True, True, True]])
    target = torch.tensor([[0.0, 1.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0]])
    qtype = torch.full((2,), QTYPES["choice"], dtype=torch.long)

    loss, reward, supervised = RLCD.rlcd_loss(
        logits,
        target,
        qtype,
        mask,
        sigma=0.25,
        group_size=4,
        proper_reward=proper_reward,
    )
    assert torch.isfinite(loss)
    assert torch.isfinite(reward)
    assert torch.isfinite(supervised)
    loss.backward()
    assert logits.grad is not None
    assert torch.isfinite(logits.grad).all()
    assert logits.grad[0, 3].item() == 0.0


def test_per_example_weights_are_validated_and_applied_to_rlcd_loss() -> None:
    logits = torch.tensor([[0.1, 0.7, -0.2], [0.4, -0.1, 0.8]], requires_grad=True)
    target = torch.tensor([[0.0, 1.0, 0.0], [0.0, 0.0, 1.0]])
    mask = torch.ones_like(target, dtype=torch.bool)
    qtype = torch.full((2,), QTYPES["choice"], dtype=torch.long)

    torch.manual_seed(123)
    unweighted, _, _ = RLCD.rlcd_loss(
        logits, target, qtype, mask, sigma=0.25, group_size=4, proper_reward=proper_reward,
    )
    torch.manual_seed(123)
    unit_weighted, _, _ = RLCD.rlcd_loss(
        logits, target, qtype, mask, sigma=0.25, group_size=4, proper_reward=proper_reward,
        sample_weights=torch.ones(2),
    )
    assert torch.allclose(unweighted, unit_weighted, atol=1e-7)

    torch.manual_seed(123)
    class_weighted, _, _ = RLCD.rlcd_loss(
        logits, target, qtype, mask, sigma=0.25, group_size=4, proper_reward=proper_reward,
        sample_weights=torch.tensor([1.0, 3.0]),
    )
    assert not torch.allclose(unweighted, class_weighted, atol=1e-6)
    class_weighted.backward()
    assert logits.grad is not None and torch.isfinite(logits.grad).all()

    for bad in (torch.tensor([1.0, 0.0]), torch.tensor([1.0]), torch.tensor([1.0, float("nan")])):
        try:
            RLCD.rlcd_loss(
                logits.detach(), target, qtype, mask,
                sigma=0.25, group_size=4, proper_reward=proper_reward, sample_weights=bad,
            )
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid class weights must be rejected before training.")


def test_inverse_sqrt_class_weights_are_field_scoped_and_capped() -> None:
    counts = {
        "category_candidate": {"apartment-sale": 90_000, "workspace-short-rent": 1_000},
        "property_kind": {"apartment": 90_000, "office": 10_000},
    }
    assert abs(
        RLCD.inverse_sqrt_class_weight("category_candidate", "apartment-sale", counts)
        - (91_000 / 90_000) ** 0.5
    ) < 1e-12
    assert RLCD.inverse_sqrt_class_weight("category_candidate", "workspace-short-rent", counts) == 5.0
    assert abs(
        RLCD.inverse_sqrt_class_weight("property_kind", "office", counts)
        - (100_000 / 10_000) ** 0.5
    ) < 1e-12
    for field, target in (("missing", "x"), ("category_candidate", "missing")):
        try:
            RLCD.inverse_sqrt_class_weight(field, target, counts)
        except ValueError:
            pass
        else:
            raise AssertionError("Unsupported or zero-support training labels must fail closed.")

    summary = RLCD.class_weight_summary(counts)
    assert summary["category_candidate"]["workspace-short-rent"] == {
        "support": 1_000,
        "weight": 5.0,
    }
    assert summary["property_kind"]["office"]["support"] == 10_000


def test_preflight_exposes_the_exact_weighting_policy() -> None:
    report = RLCD.build_preflight_report(
        {"rowsBySplit": {"train": 100}},
        {"train": 100, "calibration": 10, "test": 10},
        200,
        {"category_candidate": {"a": 999, "b": 1}},
        Namespace(
            micro_batch_size=4,
            grad_accumulation=2,
            epochs=1,
            group_size=4,
            max_len=1024,
            head_max_len=256,
        ),
        "base-hash",
        "cpu",
    )
    assert report["classWeightingPolicy"] == RLCD.CLASS_WEIGHTING_POLICY
    assert report["classWeightCap"] == RLCD.CLASS_WEIGHT_CAP
    assert report["classWeightsByField"]["category_candidate"]["b"]["weight"] == 5.0


def test_choice_order_augmentation_is_repeatable_and_epoch_specific() -> None:
    contract = {
        "category_candidate": {
            "criteria": {f"option-{index}": f"Meaning {index}" for index in range(12)}
        }
    }
    row = {"exampleId": "listing-42"}
    first = RLCD.selected_contract(contract, row, seed=9, epoch=0)
    repeated = RLCD.selected_contract(contract, row, seed=9, epoch=0)
    next_epoch = RLCD.selected_contract(contract, row, seed=9, epoch=1)
    assert first == repeated
    assert list(first["category_candidate"]["criteria"]) != list(
        next_epoch["category_candidate"]["criteria"]
    )
    assert list(contract["category_candidate"]["criteria"]) == [
        f"option-{index}" for index in range(12)
    ]


def test_sigma_schedule_covers_the_full_single_epoch_run() -> None:
    assert RLCD.sigma_at_step(0, 1) == 0.4
    assert RLCD.sigma_at_step(0, 20) == 0.4
    assert abs(RLCD.sigma_at_step(19, 20) - 0.1) < 1e-12
    assert abs(RLCD.sigma_at_step(25, 20) - 0.1) < 1e-12


def main() -> None:
    test_rlcd_loss_is_finite_and_differentiable()
    test_per_example_weights_are_validated_and_applied_to_rlcd_loss()
    test_inverse_sqrt_class_weights_are_field_scoped_and_capped()
    test_preflight_exposes_the_exact_weighting_policy()
    test_choice_order_augmentation_is_repeatable_and_epoch_specific()
    test_sigma_schedule_covers_the_full_single_epoch_run()
    print("RLCD trainer CPU checks passed")


if __name__ == "__main__":
    main()
