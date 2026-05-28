## Today start point (recommended first scope)

You said today includes **feature + bugfix + refactor + perf/SEO** (excluding CI/deploy).

The highest-leverage “first scope” in this codebase is the **Need Intake flow** because:

- It touches **core UX** (`/post`) and influences conversion.
- It has **self-tests** already wired (`test:intake-parser`, `test:intake-flow`, `test:typing-analysis`).
- It spans **UI + domain rules + API routes** (easy to ship iterative improvements).

### Code path (end-to-end)

```text
UI (/post)                         Domain rules                         API (Next route handlers)               Optional Nest
───────────────────────────────    ────────────────────────────────     ───────────────────────────────────      ─────────────────────────
src/components/need-intake/**  ->  src/lib/need-intake/**           ->   src/app/api/need-intake/**/route.ts  ->  mini-services/backend (heavy jobs)
                                   src/lib/typing-analysis/**            src/app/api/internal/** (moderation)
```

### Practical entry points

- **Main UI flow**: `src/components/need-intake/NeedIntakePanel.tsx` (documented in `docs/NEED_INTAKE.md`)
- **Orchestrator**: `src/lib/need-intake/internal-orchestrator.ts`
- **Typing analysis**: `src/lib/typing-analysis/analyze.ts` and `src/app/api/need-intake/typing-analyze/route.ts`
- **Next question & slot extraction**: `src/app/api/need-intake/next-question/route.ts` and related routes

### “Baseline” commands (fast feedback loop)

```bash
npm run test:intake-parser
npm run test:intake-flow
npm run test:typing-analysis
```

