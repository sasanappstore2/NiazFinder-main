#!/usr/bin/env bash
# Resolve LoRA adapter path for local dev (estate default, safe fallbacks).
# Usage:
#   source scripts/dev/resolve-intake-mlx-adapter.sh   # sets INTAKE_MLX_ADAPTER_PATH
#   scripts/dev/resolve-intake-mlx-adapter.sh          # prints path only (for npm subshell)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

_resolve_from_cwd() {
  local rel="$1"
  local abs="$ROOT/$rel"
  if [[ -f "$abs/adapters.safetensors" ]]; then
    echo "$rel"
    return 0
  fi
  return 1
}

# Explicit override wins (absolute or repo-relative)
if [[ -n "${INTAKE_MLX_ADAPTER_PATH:-}" ]]; then
  if [[ "$INTAKE_MLX_ADAPTER_PATH" != /* ]]; then
    if [[ -f "$ROOT/$INTAKE_MLX_ADAPTER_PATH/adapters.safetensors" ]]; then
      :
    elif [[ -f "$INTAKE_MLX_ADAPTER_PATH/adapters.safetensors" ]]; then
      INTAKE_MLX_ADAPTER_PATH="$(cd "$(dirname "$INTAKE_MLX_ADAPTER_PATH")" && pwd)/$(basename "$INTAKE_MLX_ADAPTER_PATH")"
    else
      echo "WARN: INTAKE_MLX_ADAPTER_PATH set but adapters.safetensors missing: $INTAKE_MLX_ADAPTER_PATH" >&2
    fi
  fi
  export INTAKE_MLX_ADAPTER_PATH
  echo "$INTAKE_MLX_ADAPTER_PATH"
  exit 0
fi

# Prefer estate LoRA (default dev), then legacy adapters
CANDIDATES=(
  "models/estate-intake-lora-v1"
  "models/intake-lora-v2"
  "models/intake-lora-v1"
  "models/intake-lora"
)

for rel in "${CANDIDATES[@]}"; do
  if resolved=$(_resolve_from_cwd "$rel"); then
    if [[ "$rel" != "models/estate-intake-lora-v1" ]]; then
      echo "WARN: estate-intake-lora-v1 not found; using fallback $rel" >&2
      echo "  Train: npm run train:estate-lora-10h" >&2
    fi
    # npm dev:intake-mlx runs from mini-services/intake-mlx — use relative path from there
    export INTAKE_MLX_ADAPTER_PATH="../../$rel"
    echo "$INTAKE_MLX_ADAPTER_PATH"
    exit 0
  fi
done

echo "ERROR: No LoRA adapter found under models/ (need adapters.safetensors)" >&2
echo "  Expected: models/estate-intake-lora-v1 or models/intake-lora-v2" >&2
exit 1
