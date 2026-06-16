# Environment variable map

## Need intake — production launch (rules-only)

| Variable | Production | Staging | Local dev |
|----------|------------|---------|-----------|
| `NEED_INTAKE_LLM_ENABLED` | **`false`** | **`false`** | `true` (optional MLX) |
| `NEED_INTAKE_TITLE_AI_ENABLED` | **`false`** | `false` | optional |

Production `/post` uses **`intake-rules`** engine only. Qwen/MLX is for local evaluation and post-launch experiments.

## Need intake — local MLX (optional)

| Variable | Purpose |
|----------|---------|
| `NEED_INTAKE_LLM_URL` | MLX service URL (default `http://127.0.0.1:8100`) |
| `NEED_INTAKE_LLM_TIMEOUT_MS` | Analyze timeout |
| `INTAKE_MLX_ADAPTER_PATH` | LoRA adapter path (see `scripts/dev/resolve-intake-mlx-adapter.sh`) |

## Security (required in production)

See `.env.example` for `INTERNAL_API_SECRET`, `CHAT_INTERNAL_SECRET`, `SUPER_ADMIN_PHONES`, etc.

## Verify after deploy

```bash
npm run smoke:routes
npm run smoke:need-intake-home-parse
NEED_INTAKE_LLM_ENABLED=false npm run test:post-estate-scenarios
```

Analyze responses should include `meta.engine: "intake-rules"` when LLM is disabled.
