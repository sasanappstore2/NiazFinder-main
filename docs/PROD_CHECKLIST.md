# Production Checklist

Review every item before any production deployment. Nothing here is
pre-configured — production values must be set explicitly.

## Secrets (all required, all env-only)

- [ ] `DATABASE_URL` points at the production Postgres (pgvector) instance
- [ ] `INTERNAL_API_SECRET` — fresh 32-byte hex, **never a value that appeared in git history**
- [ ] `JWT_SECRET` / `CHAT_INTERNAL_SECRET` — fresh, unique per environment
- [ ] `POSTGRES_PASSWORD`, `RABBITMQ_PASSWORD`, `MINIO_ROOT_PASSWORD`, `TYPESENSE_API_KEY` — fresh
- [ ] `ZARINPAL_MERCHANT_ID` — production merchant (sandbox off)
- [ ] No `.env*` file deployed or committed; secrets injected by the host

## Auth & access

- [ ] `ALLOW_TEST_OTP` unset (test OTP is code-gated to non-prod, but leave no doubt)
- [ ] `NEXT_PUBLIC_ALLOW_TEST_OTP` unset
- [ ] `NEED_INTAKE_AUTO_APPROVE` / `NEED_AUTO_APPROVE_REQUESTS` unset
- [ ] `SUPER_ADMIN_PHONES` contains only real operator numbers
- [ ] `CHAT_CORS_ORIGINS` set to the production origin (no `*`)

## Intake / AI

- [ ] `NEED_INTAKE_LLM_ENABLED` — conscious choice (default off = rules-only)
- [ ] `LAYA_POST_AUTO_APPLY` stays `false` until calibrated on a human-labeled holdout
- [ ] `INTAKE_PUBLISH_RATE_LIMIT_PER_HOUR` reviewed for launch traffic

## Data & ops

- [ ] Postgres backups scheduled and restore-tested; pgvector extension present
- [ ] MinIO bucket policies reviewed (chat uploads not public-listable)
- [ ] RabbitMQ DLQ (`dlq_failed_tasks`) monitored
- [ ] `npm run check:all` green on the deployed commit; CI required checks passing
- [ ] `npm audit --omit=dev` reviewed (see SECURITY.md advisory table)
