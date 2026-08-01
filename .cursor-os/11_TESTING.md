# 11 — Testing

## Philosophy

Prefer fast `tsx` self-tests colocated under `**/fixtures/**` or `scripts/`. Full gate is heavy — use targeted suites while iterating; run broader gates before release-grade claims.

---

## Primary gates

| Command | When |
|---------|------|
| `npm run check:all` | Release / large cross-cutting changes |
| `npm run lint` | TS/JS changes in `src` |
| `npx tsc --noEmit` | Types (also in check:all) |
| `prisma validate` | Schema edits |

`check:all` includes: prisma validate, tsc, eslint, build, category parity, intake parser/flow, post-pipeline, estate/scenarios, listing titles, publish validators, browse/neighborhood parity, shadow publish, map/dashboard guards, etc. (see `package.json`).

---

## Intake / post packs

| Script | Notes |
|--------|-------|
| `test:post-pipeline` | `NEED_INTAKE_LLM_ENABLED=false` |
| `test:post-estate-scenarios` | Estate |
| `test:post-intake-scenarios` | Broad |
| `test:intake-merge-policy` | Merge/stale |
| `test:hybrid-runtime` | Hybrid flags |
| `test:vertical-expansion` | Loc skip prisma often |
| `test:publish-validator` / `test:publish-readiness` | Publish |
| `test:publish-browse-parity` / `test:neighborhood-filter-parity` | Parity |
| `test:post-production-gate:smoke` / `:full` | Production gate runner |
| `test:post-pipeline-100k:smoke` | Scale subset |

Hybrid golden: intelligence-engine fixtures (audit loop targeted 100%).

---

## Search / business

- Typesense: manual `ensure:typesense` + browse smoke; keep Prisma fallback tested
- `test:occupations-parity`, category filter tests in check:all
- Public business profile self-tests

---

## Matching / chat / security

| Script | Role |
|--------|------|
| `test:smart-matching-stress` | Matching load |
| `test:communication-e2e` | Comms |
| `test:append-incoming-order` | Chat ordering |
| `smoke:chat-attachment-mime` | Attachments |
| `test:security-smoke` | Security smoke |
| `test:wallet-api` | Wallet |

---

## Smokes

`smoke:routes`, `smoke:api`, `smoke:map`, `smoke:need-intake-home-parse`, mobile/a11y/viewport smokes, `smoke:intake-precommit`.

---

## Decision tree — what to run

```
Changed intake rules/confidence? → post-pipeline + merge-policy (+ hybrid if hybrid touched)
Changed Typesense mapper/schema? → sync script dry run + browse; neighborhood parity if geo
Changed publish validator? → publish-* + browse parity
Changed matching fees/scores? → smart-matching-stress + wallet if fee
Changed chat protocol? → communication-e2e / append order
Touch many domains? → check:all
```

---

## Writing new tests

1. Prefer deterministic fixtures; no network unless smoke
2. Set LLM flags explicitly in script
3. Use `NEED_INTAKE_LOC_SKIP_PRISMA=true` when location DB not required
4. Name `run-*-self-test.ts` consistently
5. Wire npm script if it should enter gates
6. Do not commit secrets; bypass rate limits only via explicit test env flags already used in repo

---

## Flaky / known heavy

- Full 100k pipeline — smoke first
- LLM-on tests — require local gateway
- Browser smokes — need running app

Log persistent flakes in `memory/KNOWN_FAILURES.md`.
