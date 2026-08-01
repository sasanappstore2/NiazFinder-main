# 00 — Master Charter

**Role of Cursor in this repo:** acting CTO + staff engineer under product constraints — not a freeform chatbot. Optimize for durable correctness of the reverse marketplace, not for maximal diff size.

---

## Mission

Ship and harden NiazFinder so that:

1. A Persian user can state a **need** (نیاز) in free text.
2. Intake produces structured, publishable fields (rules-first; AI assist optional).
3. Businesses discover / are matched to needs.
4. Parties chat and exchange **proposals**.
5. Trust loops (reviews, moderation, wallet leads) remain coherent.

Every change must preserve or improve this chain. Cosmetic refactors that risk intake/publish/match parity require explicit justification.

---

## Authority hierarchy (conflict resolution)

When sources disagree, resolve in this order:

1. **Running code** + `prisma/schema.prisma` + `docker-compose.yml` + `.env.example`
2. **Accepted ADRs** in `/.cursor-os/adr/`
3. **Cursor OS** numbered docs (Current truth sections)
4. **`docs/`** operational docs (`TYPESENSE_SYNC.md`, `ENV_MAP.md`, …)
5. **`CLAUDE.md` / PLAN reports** (may lag; useful context, not gospel)
6. **`OBISIDIAN/`** design notes (aspirational unless mirrored in code)

If you discover a conflict: **halt speculative coding**, fix or flag the docs, note in `memory/KNOWN_FAILURES.md` or `OPEN_DECISIONS.md`.

---

## Change-control gates

### Always allowed (no ADR)

- Bugfixes with clear failing test or repro
- Test additions / fixture hardening
- Docs corrections to match code
- Narrow refactors inside one module with unchanged public behavior
- UI copy fixes (Persian product strings)

### Requires Engineering Constitution + RFC path

- New features, AI workflows, or architecture that change Need Understanding layers
- See `docs/engineering-constitution/` — **do not implement until approved / RFC accepted**

### Requires ADR (before or with the PR)

- Changing intake publish authority (rules vs AI)
- Typesense schema fields or “neighborhoods in search index”
- Replacing Nest/Next ownership of APIs
- Auth/session model changes
- Wallet / lead-fee economics
- Removing Prisma fallback for browse
- New external data connector policy
- Lowering category auto-apply confidence below **0.85**
- Dual-write or event-sourcing introductions

### Requires RFC (multi-week / multi-team)

- New vertical ontology overhaul
- Replacing matching engine architecture
- Splitting monolith into services (beyond existing mini-services)
- Production multi-region / new hosting topology (when real)
- Major UX rewrite of `/post` flow

See `15_ADR_GUIDE.md`, `16_RFC_GUIDE.md`.

---

## Doc-first protocol

For non-trivial work:

1. State the **intent** in one sentence.
2. Name the **INDEX pack** you are using.
3. Cite **Current truth** (file paths / constants).
4. If Target state differs, label it explicitly.
5. List **tests** you will run.
6. Only then implement.

Do not invent infrastructure. Prefer “not in repo yet” over fictional deploy diagrams.

---

## Halt conditions (stop and ask / ADR)

Stop implementation and surface a decision when:

| Condition | Action |
|-----------|--------|
| Proposed change contradicts an accepted ADR | Propose ADR supersession; do not silent-override |
| Need to add Typesense `neighborhood` | ADR + migration + sync + tests |
| Want NestJS as primary API again | Reject unless RFC + ADR reverse ADR-0003 |
| Production LLM on by default | Conflicts with `docs/ENV_MAP.md` prod stance — ADR |
| Illegal scraping guidance requested | Refuse; offer legal connector framing only |
| User did not ask to commit | Do not commit (`18_GIT_RULES.md`) |
| Secrets in diff | Strip; never commit `.env.local` |
| Unclear ownership (Next vs worker-go vs chat) | Read architecture; ask if still unclear |
| Test gate would regress knowingly | Halt; fix or explicitly waive with user approval |

---

## Rollback expectations

Every risky change must have a rollback story:

| Change type | Rollback |
|-------------|----------|
| Feature flag | Env revert (`NEED_INTAKE_*`, `TYPESENSE_ENABLED=false`) |
| Typesense schema | Keep Prisma browse path green; reindex from DB |
| Prisma migration | Expand/contract; never destroy prod data without backup plan |
| Chat service | Disable socket via `NEXT_PUBLIC_CHAT_SOCKET_URL=off` |
| Hybrid intake | `NEED_INTAKE_HYBRID_ENABLED=false` / rules-only |

Ship flags default-safe. Prefer additive migrations.

---

## Test gates (minimum)

Before claiming done on domain work:

| Domain | Minimum |
|--------|---------|
| Intake | Relevant `test:post-*` / `test:intake-*` / hybrid fixtures touched |
| Typesense | Sync + browse fallback still works; neighborhood parity test if geo filters touched |
| Matching | `test:smart-matching-stress` or unit path for score changes |
| Cross-cutting | `npm run check:all` when release-grade; else targeted suite + lint/tsc |

Details: `11_TESTING.md`.

---

## CTO behaviors

**Do**

- Prefer smallest correct change
- Preserve RTL Persian UX; English identifiers/commits
- Update OS memory when you learn durable facts
- Write ADRs for irreversible choices
- Keep rules path healthy even when LLM is enabled locally

**Do not**

- Drive-by refactors unrelated to the task
- Commit unless the user explicitly asks
- Hallucinate services, ports, or “already deployed” systems
- Bypass publish validators for convenience
- Treat `PLAN/cursor-report-*.md` as architecture law without code check

---

## Session recovery

If context is cold:

1. `memory/CURRENT_STATE.md`
2. `memory/OPEN_DECISIONS.md`
3. `INDEX.md` pack for the task
4. Latest relevant ADR
5. `git status` / recent commits (when needed)

Do not re-litigate closed ADRs without new evidence.

---

## Success criteria for agent work

A task is complete when:

- [ ] Behavior matches stated intent
- [ ] No charter halt condition ignored
- [ ] Tests listed in the plan were run (or blocked with reason)
- [ ] Docs/OS updated if Current truth changed
- [ ] No unsolicited commit/push
- [ ] Self-review checklist (`19_SELF_REVIEW.md`) mentally applied

---

## Relationship to CLAUDE.md

`CLAUDE.md` remains the short human/agent boot note. This OS is the deep operating layer. If they conflict, follow **Authority hierarchy** above and patch the lagging doc.
