# 17 — Code Style

## Language & product

| Surface | Language |
|---------|----------|
| UI copy | Persian (RTL) |
| Code identifiers, commits, OS docs | English |
| Match reasons to users | Persian (`*Fa` fields) |

Glossary: see `INDEX.md`.

---

## Project conventions

- Import alias `@/*` → `src/*`
- App Router only for new pages/APIs
- Prefer existing patterns in neighboring files (Tailwind v4, shadcn/Radix, RHF+Zod, TanStack Query, Zustand)
- Do not expand scope with drive-by refactors
- Match local formatting; eslint via `npm run lint`

---

## TypeScript

- Prefer explicit domain types near contracts (`src/contracts/` when present)
- Avoid `any` unless bridging legacy; narrow quickly
- Server-only code must not leak into client bundles — `check:client-server-boundaries`
- Do not import from `mini-services/` into app tsconfig paths casually

---

## React

- Follow existing component structure under `src/components/`
- Preserve intake calm UX patterns; do not add noisy chip storms
- Respect locks and confidence gates when wiring drafts
- Prefer repo’s modern React patterns where already used; do not mass-add useMemo/useCallback unless required

---

## APIs

- `src/app/api/**/route.ts`
- Zod validate inputs
- Consistent JSON error shapes with nearby routes
- Fire-and-forget side effects (Typesense sync) must not fail the request

---

## Intake-specific

- Import confidence constants from `src/intake/rules/config.ts` / understanding helpers — do not duplicate magic numbers
- Keep rules path working with LLM off
- Fixtures: deterministic Persian strings; watch encoding (`test:intake-persian-locale`)

---

## Comments

- Comment **why**, not what
- No narrating comments
- Legal connector scripts: state allowed-use framing

---

## Files to avoid editing as primary

- `src/intake.backup.*`
- Nest legacy backend for new features
- Huge unrelated docs dumps
