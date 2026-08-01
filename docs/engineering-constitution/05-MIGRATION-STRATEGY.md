# Migration strategy

**Status:** Blueprint v1

---

## 1. Principle

Migrate **behavior and boundaries** without a big-bang rewrite. Prefer strangler patterns around `src/intake` and `NeedIntakePanel`.

---

## 2. Current → Target bridges

| Area | Current truth | Target | Migration step |
|------|---------------|--------|----------------|
| Vision | Mixed form + understanding UX | Understanding-first | Constitution + UX RFCs |
| Publish | Rules-first ADR-001 | Unchanged | Keep; test always |
| Compose AI | Hybrid optional locally | Router explicit | Feature-flag router |
| Prompts | Scattered strings / engine | Versioned modules | Extract behind registry |
| Presentation AI | Mostly clean | Strict ban | Lint + review |
| Typesense | Business only; no neighborhoods | Optional hood index | RFC-0002 |
| Nest API | Legacy present | No new routes | Refuse PRs adding Nest product APIs |
| Corpus | Golden ~tens–hundreds | ≥1000 RE | Phased corpus growth |
| Docs | Many INTAKE_* + Cursor OS | Constitution pack owns vision | Cross-link; don’t duplicate forever |

---

## 3. Cutover checklist (per phase)

1. Docs: Current truth / Target updated  
2. Feature flag default **off** in prod  
3. Shadow metrics (if applicable)  
4. Golden + regression green  
5. Corpus subset green  
6. Flag on for internal  
7. Rollback switch documented  
8. Flag on for prod  
9. Remove dead path only after soak  

---

## 4. Rollback

- Env flags first (`NEED_INTAKE_*`, `TYPESENSE_ENABLED=false`)
- Revert PR second
- Data migrations must be backward-compatible for one release

---

## 5. Data connectors

Any Divar-like or external ingest must ship as a **generic legal connector**:

- documented license/ToS basis
- no credentials in git
- normalized into Knowledge Layer, not Presentation

See `/.cursor-os/rfc/RFC-0001-legal-data-connectors.md`.
