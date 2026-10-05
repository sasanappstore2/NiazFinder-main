# Contributing to NiazFinder

Thanks for your interest in contributing. This project is primarily Persian-language (RTL UI) with code, identifiers, and commit messages in English.

## Getting Started

1. Read `README.md` (architecture + setup) and `AGENTS.md` (repo conventions).
2. Copy `.env.example` → `.env.local` and start infra: `docker compose up -d`.
3. Run the app: `npm run dev` (also see `npm run dev:chat`, `npm run dev:si-post` for optional services).

## Workflow

1. Fork the repository and create a feature branch from `main`.
2. Use **npm** (`package-lock.json` is the single lockfile). Bun is only the
   runtime for `mini-services/chat-service`, which keeps its own lockfile.
2. Keep changes focused; do not reformat unrelated code.
3. Verify before opening a PR:
   - `npx tsc --noEmit`
   - `npm run lint`
   - The relevant self-test, e.g. `npm run test:intake-engine` or `npm run test:post-pipeline`
   - For intake changes: `npm run test:intake-baseline`
4. Open a PR using the pull-request template (what / why / testing / security / breaking changes).

## Conventions

- Import alias `@/*` → `src/*`. UI copy in Persian; code and comments in English.
- Backend endpoints are `src/app/api/**/route.ts` (Next.js App Router). Validate all user input with Zod.
- Internal/worker routes (`src/app/api/internal/*`) must use `verifyInternalApiSecret` and fail closed.
- Never commit secrets, `.env` files, model weights, `__pycache__`, or generated `reports/` outputs.
- Tests are `tsx` self-tests (`scripts/` + `**/fixtures/run-*-self-test.ts`), not jest/vitest.

## AI/ML Components (preserve, do not replace)

The Si Multilingual worker (`mini-services/si-post`, `src/lib/need-intake/si/`) and the Gemma 4 / embedding sidecars are intentional parts of the architecture. Do not remove them, swap models, or bypass the loopback-only proxying and research-adapter gates without maintainer approval. If an AI integration looks broken, document it and ask — don't delete it.

## Reporting Issues

- Bugs and feature requests: use the GitHub issue templates.
- Security vulnerabilities: **do not** file a public issue — see `SECURITY.md`.
