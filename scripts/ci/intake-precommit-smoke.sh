#!/usr/bin/env bash
# Fast intake smoke for pre-commit / health gate (< 60s, no LLM).
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "intake-precommit: engine"
npm run test:intake-engine --silent

echo "intake-precommit: invariants"
npm run test:intake-invariants --silent

echo "intake-precommit smoke passed"
