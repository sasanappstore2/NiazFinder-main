# 02 — Memory Protocol

Durable memory lives in `/.cursor-os/memory/`. Keep entries **short, dated, append-friendly**. Memory is not a substitute for ADRs. Mission requires reading these before non-trivial work.

---

## Files (Mission-complete set)

| File | Purpose |
|------|---------|
| `CURRENT_STATE.md` | What is true right now |
| `VISION.md` | Product north star |
| `GOALS.md` | Active / near-term goals |
| `CONSTRAINTS.md` | Hard constraints |
| `DECISIONS.md` | Decision index → ADRs |
| `ARCHITECTURE.md` | Layer snapshot |
| `ROADMAP.md` | Phase pointer |
| `TODO.md` | Active OS/arch todos |
| `DONE.md` | Completed milestones |
| `KNOWN_ISSUES.md` | Open issues |
| `KNOWN_FAILURES.md` | Recurring footguns |
| `ANTI_PATTERNS.md` | Never-do list |
| `LESSONS_LEARNED.md` | Dated lessons |
| `NEXT_PHASE.md` | Single next/current phase |
| `OPEN_QUESTIONS.md` | Unresolved questions |
| `OPEN_DECISIONS.md` | Unresolved product/tech choices |
| `SYSTEM_MAP.md` | Journeys / services map |
| `DEPENDENCIES.md` | Runtime + process deps |

---

## Write rules

1. **One fact per bullet**; include path or constant when possible.
2. Prefix with ISO date (`2026-07-12`).
3. Prefer deltas over rewriting history — strike through obsolete lines.
4. Never store secrets, tokens, phone numbers, or `.env.local` values.
5. If memory contradicts an ADR, **fix the memory** or open ADR supersession.

---

## Read rules

- Non-trivial task: read **all** memory slots (Mission), especially CURRENT_STATE, GOALS, CONSTRAINTS, ARCHITECTURE, NEXT_PHASE, ANTI_PATTERNS.
- Debugging: KNOWN_ISSUES + KNOWN_FAILURES.
- After closing a decision: update OPEN_DECISIONS / OPEN_QUESTIONS and DECISIONS + ADR.

---

## What belongs elsewhere

| Content | Destination |
|---------|-------------|
| Irreversible architecture choice | `adr/` |
| Multi-week design | `rfc/` |
| Sequenced delivery | `phases/` |
| `/post` full report | `docs/POST_SYSTEM_REPORT.md` |
| Vision/layers law | `docs/engineering-constitution/` |
| Operating law | `MISSION.md` |
