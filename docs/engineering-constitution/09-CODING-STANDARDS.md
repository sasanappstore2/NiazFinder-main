# Coding standards

**Status:** Blueprint v1 · Complements `/.cursor-os/17_CODE_STYLE.md`

---

## 1. Language & product

- UI copy: **Persian** (RTL)
- Code, commits, identifiers, Constitution technical docs: **English**
- Import alias: `@/*` → `src/*`

---

## 2. Architecture in code

1. Respect layer boundaries ([03-MODULE-DIAGRAM](./03-MODULE-DIAGRAM.md)).
2. No AI/model clients in `src/components/**`.
3. New HTTP APIs only under `src/app/api/**` (not Nest legacy).
4. Prefer small pure functions for stages; inject IO at edges.
5. Feature flags for Target-state behavior.

---

## 3. TypeScript

- Strict types at stage boundaries (`NeedDraft`, field meta).
- Avoid `any`; unknown + narrow at trust boundaries.
- Zod (or existing validators) at API edges.

---

## 4. React

- Follow repo React Compiler guidance; don’t sprinkle useMemo/useCallback by default.
- Effects: never setState loops (stable deps; bail out on equal data).
- Compose: understanding-first; no confirmation theater for high-conf fills.

---

## 5. Testing

- Every stage change: unit + golden/regression as applicable.
- Bugfix: failing test first when feasible.
- Do not weaken gates to pass.

---

## 6. Git

- **No commit unless user explicitly asks.**
- No force-push main; no secrets in commits.
- Message: why over what; English.

---

## 7. Security

- No secrets in prompts committed to git.
- Redact PII in logs.
- Legal connectors only.

---

## 8. PR checklist (implementation)

- [ ] Constitution / RFC cited  
- [ ] Layers touched listed  
- [ ] Tests run listed  
- [ ] Docs Current truth updated if behavior changed  
- [ ] No Presentation AI leakage  
