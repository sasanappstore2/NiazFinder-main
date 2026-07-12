# 01 — System Rules (Anti-Drift & Safety)

Operational rules for every agent session. Pair with `00_MASTER_CHARTER.md`.

---

## 1. Hallucination prevention

### Never invent

- Cloud providers, clusters, CDNs, or “prod URLs” not evidenced in repo
- Typesense fields not in `businessProfilesCollectionSchema`
- Prisma models not in `schema.prisma`
- Env vars not in `.env.example` / `docs/ENV_MAP.md` / code readers
- That NestJS is the live API (it is **legacy** profile only)

### Always verify

```text
Claim about stack? → docker-compose.yml + CLAUDE.md + code import
Claim about threshold? → src/intake/rules/config.ts or citing call site
Claim about search? → src/lib/search/typesense-business-index.ts
Claim about model count? → count in prisma/schema.prisma (not CLAUDE.md alone)
```

### Label uncertainty

Use: `Current truth`, `Target state`, `Unverified — need code read`.

---

## 2. Anti-drift rules

| Drift pattern | Countermeasure |
|---------------|----------------|
| “Quick” Nest endpoint | Reject; add Next `route.ts` |
| Index neighborhoods in Typesense silently | ADR-0002 + `07_TYPESENSE.md` |
| AI becomes publish source of truth | ADR-0001; rules validate publish |
| Duplicate matching logic in UI | Keep ranking in `src/lib/need-match/` |
| New markdown novel instead of ADR | Use `adr/` + short CURRENT_STATE note |
| Expanding scope mid-task | Re-read user intent; park extras in roadmap |
| Copying Divar scrape into product path | Legal connector framing only |

### Architecture freeze zones (edit carefully)

- Publish validators / browse parity tests
- Typesense document mapper (`businessProfileToTypesenseDocument`)
- Wallet lead fee + VIP qualify path
- Chat internal secrets handshake
- Intake confidence gates for category auto-apply (**0.85**)

---

## 3. Decision tree — “Should I code now?”

```
Is the task trivial (typo/comment)? → Yes: code.
Does it contradict an ADR? → Stop → propose supersession.
Missing domain facts? → Read INDEX pack → then code.
Needs new cross-cutting behavior? → ADR/RFC first (or with spike behind flag).
Touches money/auth/PII? → Security pass + tests.
User asked for commit? → Only then follow 18_GIT_RULES.
Else → implement smallest slice + tests.
```

---

## 4. Context recovery checklist

On resume / new chat:

1. Read `memory/CURRENT_STATE.md`
2. Read `memory/OPEN_DECISIONS.md`
3. `git status` (dirty tree awareness)
4. Identify task type → INDEX pack
5. Confirm env-sensitive behavior (LLM on/off, Typesense)

Do not assume `.env.local` matches `.env.example` (local often enables hybrid/LLM).

---

## 5. Legal data connectors (Divar & peers)

**Policy:** Any importer resembling marketplace ads must be framed as a **generic legal data connector** for **allowed** sources (licensed feeds, user-exported data, synthetic fixtures, partner APIs with permission).

**Allowed in-repo uses**

- Synthetic Divar-**style** titles for intake stress tests
- Cached fixtures under scripts for regression
- Mapping tables from public category taxonomies when legally obtained

**Forbidden agent behavior**

- Instructions to bypass rate limits, CAPTCHAs, or ToS
- Shipping production scrapers that target third-party sites without clear legal basis
- Storing scraped PII without retention/policy review

When editing `scripts/divar/*` or estate scrapers: add comments that production use requires lawful access; prefer fixture mode defaults.

---

## 6. Product UX invariants

| Invariant | Source |
|-----------|--------|
| Category auto-apply only if confidence ≥ **0.85** | `RULES_DISAMBIG_MIN_CONFIDENCE` / `UNDERSTANDING_CATEGORY_MIN_CONFIDENCE` |
| Auto-apply runs in background; user corrects on later form steps | `NeedIntakePanel` `onDraft` |
| Compose does **not** mount verify/gap/location/category ambiguity prompts | Live panel; components may exist unused/backup — see POST_SYSTEM_REPORT |
| Production launch posture: rules-only LLM off | `docs/ENV_MAP.md` |
| Typesense on by default; neighborhood via DB | `docs/TYPESENSE_SYNC.md` |

Do not reintroduce mandatory confirmation chips for high-confidence category unless ADR says so.

---

## 7. Dual-pipeline discipline

The repo has multiple intake-related engines historically (`src/intake/`, cognitive-engine, semantic-evaluation, CCQS). **Product `/post` path** is the need-intake + intelligence-engine hybrid/rules path. Shadow engines must not silently change publish output without flags and tests.

When unsure which engine owns a bug: start from the API route hit by `/post`, then trace.

---

## 8. Communication rules (agent → user)

- Concise; lead with verdict
- English for OS/engineering; Persian only for UI-facing examples
- No unsolicited commits or pushes
- No dumping huge file trees unless asked
- Surface conflicts with existing docs honestly

---

## 9. Failure handling

| Failure | Response |
|---------|----------|
| Test red after change | Fix or revert; do not leave knowingly broken gates |
| Typesense down | Prisma fallback must work |
| LLM timeout | Rules path must still return usable draft |
| Chat service down | App degrades without socket (`enabled: false`) |
| Doc conflict found | Log in `KNOWN_FAILURES.md`; patch weaker doc |

---

## 10. Expansion discipline

v1 OS covers core reverse-marketplace loop. Do not invent SRE maturity. When adding OS pages later: keep INDEX packs updated in the same PR/change set.
