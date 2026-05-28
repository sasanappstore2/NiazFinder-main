# Fine-tune Qwen3.5-2B with Unsloth (phase 2)

Run **after** `npm run test:intake-dataset` is green and manual QA on `/post` is complete.

## Prerequisites

- NVIDIA GPU with enough VRAM for 2B + LoRA (or Colab)
- Python 3.10+
- Training file from repo:

```bash
npm run export:intake-dataset
# → data/need-intake-training/need-intake-train.jsonl
```

## Install (example)

```bash
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
pip install --no-deps trl peft accelerate bitsandbytes
```

See [Unsloth docs](https://docs.unsloth.ai/) for the exact Qwen3.5-2B model id on Hugging Face.

## Train

```bash
cd scripts/ml/unsloth
python train_qwen35_2b.py \
  --dataset ../../../data/need-intake-training/need-intake-train.jsonl \
  --output_dir ./output/need-intake-lora
```

Hold out ~10% of fixture ids for eval before merging the adapter into the app.

## Next (app integration)

- Serve adapter via vLLM / Ollama / custom endpoint
- Set `NEED_INTAKE_LLM_URL` and hybrid fallback to rules in `parse-intent`
