# 19 — Self Review Checklist

Run mentally (or explicitly) before claiming a task done or opening a PR.

---

## Intent

- [ ] Matches user request; scope not expanded silently
- [ ] INDEX pack followed; ADRs respected
- [ ] Current vs Target labeled if aspirational

---

## Correctness

- [ ] Code paths verified (not hallucinated APIs)
- [ ] Thresholds/constants imported from shared config
- [ ] Edge cases: LLM off, Typesense down, locks, empty geo
- [ ] Rollback/feature flags considered

---

## Tests

- [ ] Targeted tests run or explicitly blocked with reason
- [ ] New logic covered by fixture/self-test when non-trivial
- [ ] No knowingly red `check:all` subset for touched domain

---

## Security & privacy

- [ ] AuthZ on new endpoints
- [ ] No secrets in diff
- [ ] PII logging minimized
- [ ] Legal connector framing if import/scrape-adjacent

---

## Product UX

- [ ] Persian UI strings OK; RTL intact
- [ ] Category auto-apply still ≥0.85 unless ADR
- [ ] No reintroduced mandatory confirmation spam

---

## Docs / OS

- [ ] Update domain OS file if Current truth changed
- [ ] Memory slots updated for durable facts
- [ ] ADR/RFC if gate triggered

---

## Git

- [ ] No unsolicited commit/push
- [ ] Clean unrelated changes

---

## Halt retrospective

If any halt condition was close: document in OPEN_DECISIONS or KNOWN_FAILURES.
