#!/usr/bin/env python3
"""
Scaffold: LoRA fine-tune on need-intake JSONL (chat messages format).
Adjust MODEL_NAME to the exact Hugging Face id for Qwen3.5-2B when starting phase 2.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path("data/need-intake-training/need-intake-train.jsonl"),
    )
    parser.add_argument("--output_dir", type=Path, default=Path("output/need-intake-lora"))
    parser.add_argument(
        "--model_name",
        default="Qwen/Qwen2.5-1.5B-Instruct",
        help="Replace with Qwen3.5-2B HF id when available in your environment",
    )
    parser.add_argument("--max_seq_length", type=int, default=2048)
    args = parser.parse_args()

    if not args.dataset.is_file():
        raise SystemExit(f"Dataset not found: {args.dataset}. Run: npm run export:intake-dataset")

    samples = load_jsonl(args.dataset)
    print(f"Loaded {len(samples)} training rows from {args.dataset}")
    print(f"Model: {args.model_name}")
    print(f"Output: {args.output_dir}")

    try:
        from unsloth import FastLanguageModel  # type: ignore
        import torch  # type: ignore
        from trl import SFTTrainer  # type: ignore
        from transformers import TrainingArguments  # type: ignore
        from datasets import Dataset  # type: ignore
    except ImportError as e:
        raise SystemExit(
            "Install unsloth, trl, transformers, datasets, torch. See README.md"
        ) from e

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.model_name,
        max_seq_length=args.max_seq_length,
        dtype=None,
        load_in_4bit=True,
    )
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
    )

    def format_row(row: dict) -> dict:
        messages = row["messages"]
        text = tokenizer.apply_chat_template(messages, tokenize=False)
        return {"text": text}

    ds = Dataset.from_list([format_row(r) for r in samples])

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=ds,
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        args=TrainingArguments(
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_steps=5,
            max_steps=60,
            learning_rate=2e-4,
            logging_steps=1,
            output_dir=str(args.output_dir),
            optim="adamw_8bit",
            seed=42,
        ),
    )
    trainer.train()
    model.save_pretrained(str(args.output_dir))
    tokenizer.save_pretrained(str(args.output_dir))
    print("Done.")


if __name__ == "__main__":
    main()
