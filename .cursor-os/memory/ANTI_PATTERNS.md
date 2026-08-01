# ANTI_PATTERNS

Never do these. If tempted, stop and open RFC/ADR.

1. **Form-first design** — starting from fields instead of understanding
2. **Mega-prompt** — one giant prompt for all stages
3. **Presentation → LLM** — React components calling model HTTP
4. **LLM publish** — gating or deciding publish with LLM
5. **Bypass NeedDraft** — parallel ad-hoc state for intake truth
6. **Bypass merge policy** — writing smart-extract straight into draft
7. **Bypass publishValidator** — client-only “ready” as authority
8. **Typesense as ontology** — using search index to decide need category
9. **Nest new APIs** — product endpoints in legacy backend
10. **Chat-memory truth** — implementing from conversation without SoT re-read
11. **Multi-phase parallel** — starting Phase N+1 early
12. **Silent architecture change** — no ADR/RFC
13. **Lowering 0.85 category gate** without ADR
14. **Illegal scrapers** — Divar/etc without legal basis
15. **Infinite setState loops** — unstable effect deps (`location` object, always-new arrays)
