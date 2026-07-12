# Risks

**Status:** Blueprint v1

| ID | Risk | Impact | Likelihood | Mitigation |
|----|------|--------|------------|------------|
| R1 | Context drift vs Constitution | Architecture rot | High | Skill + Cursor OS boot; halt on ADR conflict |
| R2 | Form-first feature pressure | Vision failure | High | Reject designs that start from fields |
| R3 | LLM publish dependency | Outages / nondeterminism | Med | ADR-001; CI rules-only gates |
| R4 | Hallucinated categories | Bad drafts / UX distrust | High | ≥0.85 gate; registries; corpus |
| R5 | Mega-prompt sprawl | Unmaintainable AI | Med | Modular prompts + owners |
| R6 | Typesense ≠ need understanding | False confidence | Med | Document scope; separate need knowledge |
| R7 | Corpus too small | Silent regressions | High | Grow to 1000; failure replay |
| R8 | Claude implements instead of reviews | Role collapse | Med | Explicit role table; Cursor implements |
| R9 | Cursor invents architecture | Inconsistent system | Med | RFC required; skill gate |
| R10 | Illegal data connectors | Legal risk | Low–Med | Legal-only RFC; no scrape guidance |
| R11 | Local hybrid ≠ prod | Surprise prod behavior | High | ENV_MAP separation; cutover RFC |
| R12 | Panel complexity / update loops | UX outages | Med | Merge effect hygiene; slim panel phases |
| R13 | Doc duplication (INTAKE_* vs Constitution) | Conflicting truth | Med | Constitution owns vision; link ops docs |
| R14 | Over-asking clarifications | Friction | Med | Auto-apply high conf; ask only on gaps |

---

## Risk review cadence

Architect reviews open risks each RFC. Update this table when a phase lands or an incident occurs (`KNOWN_FAILURES` in Cursor OS memory).
