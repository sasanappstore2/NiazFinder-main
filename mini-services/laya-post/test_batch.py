from __future__ import annotations

import asyncio
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError
import torch
from safetensors.torch import save_file

from app import (
    BASE_WEIGHT_SHA256,
    DIVAR_SOURCE_SHA256,
    MODEL_NAME,
    MODEL_REVISION,
    TRAINING_DATA_SHA256,
    PredictBatchRequest,
    PredictRequest,
    _apply_research_adapter,
    predict,
    predict_batch,
    worker,
)


class FakeTokenizer:
    mask_token = "[MASK]"

    def __call__(self, text, add_special_tokens=False, truncation=False, max_length=None):
        tokens = text.split()
        if truncation and max_length is not None:
            tokens = tokens[:max_length]
        return {"input_ids": list(range(len(tokens)))}


class FakeAgent:
    device = "cpu"
    cfg = {"head_max_len": 256}
    tok = FakeTokenizer()

    def __init__(self) -> None:
        self.calls = []
        self.single_calls = []

    def predict(self, state, questions, **kwargs):
        self.single_calls.append((state, questions, kwargs))
        return {"answers": {}, "usage": {"input_tokens": 4}}

    def predict_batch(self, states, questions, **kwargs):
        self.calls.append((states, questions, kwargs))
        return [
            {"answers": {"transaction_type": {"choice": "unknown"}}, "usage": {"input_tokens": 4}}
            for _ in states
        ]


class PredictBatchTests(unittest.TestCase):
    def setUp(self) -> None:
        self.previous_agent = worker.agent
        self.agent = FakeAgent()
        worker.agent = self.agent

    def tearDown(self) -> None:
        worker.agent = self.previous_agent

    def test_batch_calls_one_shared_question_set_and_preserves_alignment(self) -> None:
        payload = PredictBatchRequest(
            states=["آپارتمان در تهران", "دفتر در مشهد"],
            questions={
                "transaction_type": {
                    "type": "choice",
                    "instructions": "نوع معامله را مشخص کن.",
                    "criteria": {"buy": "خرید", "unknown": "نامشخص"},
                }
            },
        )

        response = asyncio.run(predict_batch(payload))

        self.assertEqual(len(response["results"]), 2)
        self.assertEqual(response["model"], "convaiinnovations/laya-multilingual")
        self.assertEqual(len(self.agent.calls), 1)
        states, questions, kwargs = self.agent.calls[0]
        self.assertEqual(states, payload.states)
        self.assertEqual(questions, payload.questions)
        self.assertEqual(kwargs, {
            "batch_size": 2,
            "lang": "fa",
            "max_len": 1024,
            "head_max_len": 256,
        })
        self.assertEqual(response["headMaxLen"], 256)

    @staticmethod
    def wide_questions(option_word_count: int) -> dict:
        description = " ".join(["توضیح"] * option_word_count)
        return {
            "category_candidate": {
                "type": "choice",
                "instructions": "دسته‌بندی مناسب ملک را از روی متن مشخص کن.",
                "criteria": {
                    f"category-{index}": description for index in range(19)
                },
            }
        }

    def test_wide_category_options_get_a_dynamic_head_budget(self) -> None:
        payload = PredictBatchRequest(
            states=["یک نیاز ملکی"],
            questions=self.wide_questions(option_word_count=20),
        )

        response = asyncio.run(predict_batch(payload))

        kwargs = self.agent.calls[0][2]
        self.assertGreater(kwargs["head_max_len"], 256)
        self.assertLessEqual(kwargs["head_max_len"], 768)
        self.assertEqual(kwargs["head_max_len"], response["headMaxLen"])

    def test_single_prediction_uses_the_same_dynamic_head_budget(self) -> None:
        payload = PredictRequest(
            state="آپارتمان برای خرید",
            questions=self.wide_questions(option_word_count=20),
        )

        response = asyncio.run(predict(payload))

        kwargs = self.agent.single_calls[0][2]
        self.assertGreater(kwargs["head_max_len"], 256)
        self.assertEqual(kwargs["max_len"], 1024)
        self.assertEqual(kwargs["head_max_len"], response["headMaxLen"])

    def test_question_that_cannot_fit_is_rejected_before_inference(self) -> None:
        payload = PredictBatchRequest(
            states=["یک نیاز ملکی"],
            questions=self.wide_questions(option_word_count=48),
        )

        with self.assertRaises(HTTPException) as error:
            asyncio.run(predict_batch(payload))

        self.assertEqual(error.exception.status_code, 422)
        self.assertEqual(self.agent.calls, [])

    def test_batch_rejects_more_than_configured_states(self) -> None:
        with self.assertRaises(ValidationError):
            PredictBatchRequest(
                states=["متن"] * 33,
                questions={
                    "transaction_type": {
                        "type": "choice",
                        "instructions": "انتخاب کن.",
                        "criteria": {"unknown": "نامشخص"},
                    }
                },
            )

    def test_single_and_batch_share_question_validation(self) -> None:
        invalid_questions = {
            "unknown_question": {
                "type": "choice",
                "instructions": "انتخاب کن.",
                "criteria": {"unknown": "نامشخص"},
            }
        }
        with self.assertRaises(ValidationError):
            PredictRequest(state="متن نیاز", questions=invalid_questions)
        with self.assertRaises(ValidationError):
            PredictBatchRequest(states=["متن آگهی"], questions=invalid_questions)

    def test_batch_rejects_overlong_state(self) -> None:
        with self.assertRaises(ValidationError):
            PredictBatchRequest(
                states=["x" * 12_001],
                questions={
                    "transaction_type": {
                        "type": "choice",
                        "instructions": "انتخاب کن.",
                        "criteria": {"unknown": "نامشخص"},
                    }
                },
            )


class ResearchAdapterTests(unittest.TestCase):
    class Model(torch.nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.head = torch.nn.Linear(2, 2, bias=False)
            self.scorer = torch.nn.Linear(2, 1, bias=False)
            self.type_emb = torch.nn.Embedding(2, 2)

    class Agent:
        def __init__(self) -> None:
            self.model = ResearchAdapterTests.Model()

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.base = self.root / "base"
        self.experiment = self.root / "experiment"
        self.base.mkdir()
        self.experiment.mkdir()
        self.weights = self.base / "model.safetensors"
        self.weights.write_bytes(b"test-only-base-weights")
        self.base_hash = hashlib.sha256(self.weights.read_bytes()).hexdigest()
        self.adapter = self.experiment / "best-adapter.safetensors"
        self.manifest_path = self.experiment / "manifest.json"
        self.agent = self.Agent()
        self.manifest = {
            "status": "research_run_complete",
            "experimentOnly": True,
            "productionLoadAllowed": False,
            "syntheticTrainingAuthorized": True,
            "syntheticTargetsAreRealNeedGroundTruth": False,
            "layaPredictionsUsedAsLabels": False,
            "model": MODEL_NAME,
            "modelRevision": MODEL_REVISION,
            "baseWeightsSha256": self.base_hash,
            "dataSha256": TRAINING_DATA_SHA256,
            "sourceDataset": "divarofficial/real_estate_ads",
            "sourceDatasetSha256": DIVAR_SOURCE_SHA256,
            "trainingFields": ["category_candidate", "property_kind", "transaction_type"],
            "selectedBestEpoch": 1,
            "trainableParameters": sum(parameter.numel() for parameter in self.agent.model.parameters()),
        }
        self.adapter_state = {
            name: torch.ones_like(parameter, device="cpu").contiguous()
            for name, parameter in self.agent.model.named_parameters()
        }
        save_file(self.adapter_state, str(self.adapter))
        self.write_manifest()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_manifest(self) -> None:
        self.manifest_path.write_text(json.dumps(self.manifest), encoding="utf-8")

    def apply_adapter(self) -> str:
        return _apply_research_adapter(
            self.agent, self.base, self.adapter, self.manifest_path
        )

    def test_valid_research_adapter_is_applied_and_hashed(self) -> None:
        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            adapter_hash = self.apply_adapter()

        self.assertEqual(adapter_hash, hashlib.sha256(self.adapter.read_bytes()).hexdigest())
        for parameter in self.agent.model.parameters():
            self.assertTrue(torch.all(parameter == 1))

    def test_incomplete_run_or_production_flag_is_rejected_before_mutation(self) -> None:
        self.manifest["status"] = "running"
        self.write_manifest()
        before = {name: value.clone() for name, value in self.agent.model.state_dict().items()}

        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                self.apply_adapter()

        for name, value in self.agent.model.state_dict().items():
            self.assertTrue(torch.equal(value, before[name]))

        self.manifest["status"] = "research_run_complete"
        self.manifest["productionLoadAllowed"] = True
        self.write_manifest()
        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                self.apply_adapter()

    def test_wrong_base_weight_hash_is_rejected(self) -> None:
        with patch("app.BASE_WEIGHT_SHA256", BASE_WEIGHT_SHA256):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                self.apply_adapter()

    def test_non_divar_or_changed_training_corpus_is_rejected(self) -> None:
        self.manifest["sourceDataset"] = "another/source"
        self.write_manifest()
        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                self.apply_adapter()

    def test_previous_v1_training_corpus_is_rejected(self) -> None:
        self.manifest["dataSha256"] = "d0d092e27aa27796500ffc5d70baf1c9eb8e87c96a96a701e9cfb344ae019380"
        self.write_manifest()
        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                self.apply_adapter()

    def test_previous_v2_training_corpus_is_rejected(self) -> None:
        self.manifest["dataSha256"] = "3ae812456595f5d82107934fd67ff0b712403c3c285e510788d733566c4c2019"
        self.write_manifest()
        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                self.apply_adapter()

    def test_non_selected_adapter_name_is_rejected(self) -> None:
        other = self.experiment / "last-adapter.safetensors"
        other.write_bytes(self.adapter.read_bytes())
        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                _apply_research_adapter(self.agent, self.base, other, self.manifest_path)

    def test_out_of_scope_tensor_is_rejected(self) -> None:
        save_file({"encoder.weight": torch.ones((1,))}, str(self.adapter))
        before = {name: value.clone() for name, value in self.agent.model.state_dict().items()}

        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                self.apply_adapter()

        for name, value in self.agent.model.state_dict().items():
            self.assertTrue(torch.equal(value, before[name]))

    def test_non_finite_tensor_is_rejected(self) -> None:
        unsafe_state = {name: value.clone() for name, value in self.adapter_state.items()}
        unsafe_state["head.weight"][0, 0] = float("nan")
        save_file(unsafe_state, str(self.adapter))
        before = {name: value.clone() for name, value in self.agent.model.state_dict().items()}

        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                self.apply_adapter()

        for name, value in self.agent.model.state_dict().items():
            self.assertTrue(torch.equal(value, before[name]))

    def test_tensor_count_must_match_manifest(self) -> None:
        self.manifest["trainableParameters"] += 1
        self.write_manifest()
        before = {name: value.clone() for name, value in self.agent.model.state_dict().items()}

        with patch("app.BASE_WEIGHT_SHA256", self.base_hash):
            with self.assertRaisesRegex(RuntimeError, "research_adapter_validation_failed"):
                self.apply_adapter()

        for name, value in self.agent.model.state_dict().items():
            self.assertTrue(torch.equal(value, before[name]))

if __name__ == "__main__":
    unittest.main()
