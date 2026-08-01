# Audit 06 — Risk Map

**Date:** 2026-07-12  
**Phase:** PHASE-01

---

## If Rule Engine changes

**Blast radius:** `src/intake/rules/**`, orchestrator, hybrid pipeline, golden/post-pipeline tests, category auto-apply thresholds, matching occupation maps.

**Breaks:** publish readiness (indirect), compose category/location, CI gates.

**Mitigation:** ADR + pack fixtures + `test:post-pipeline` mandatory.

---

## If NeedDraft changes

**Blast radius:** contracts, store, merge policy, templates, publish validator, analyze response, UI form projection, training snapshots.

**Breaks:** `/api/intake/analyze`, `/api/need-intake/publish`, client hooks, any consumer of draft JSON.

**Mitigation:** versioned schema / migration notes; dual-read if needed; full intake test pack.

---

## If Publish Validator changes

**Blast radius:** publish route, preview CTA, shadow publish, vertical required fields.

**Breaks:** ability to publish; false rejects/accepts.

**Mitigation:** `test:publish-validator` + vertical scenarios; never LLM-gate.

---

## If Merge Policy changes

**Blast radius:** `NeedIntakePanel` compose, smart proposals, locks.

**Breaks:** dual-pipeline races; user lock violations; UI loops.

**Mitigation:** `test:intake-merge-policy`; equality-stable React updates.

---

## If Prisma schema changes

**Blast radius:** all APIs, Typesense sync documents, chat, matching, migrations.

**Breaks:** runtime queries; Typesense field mismatch; nest legacy schemas diverge further.

**Mitigation:** migrate root Prisma first; sync Typesense schema via ADR; never edit Nest schema as SoT.

---

## If LLM / hybrid flags flip in prod

**Blast radius:** analyze latency, category quality, cost.

**Breaks:** UX timeouts — **must not** break publish.

**Mitigation:** ADR-0001; soft-fail to rules; RFC-0003 cutover.

---

## If Typesense schema / downtime

**Blast radius:** business browse only.

**Breaks:** search quality; fallback to Prisma.

**Mitigation:** health probe + Prisma fallback (ADR-0002); neighborhoods already DB.

---

## If Presentation gains AI calls

**Blast radius:** architecture violation; nondeterministic UI.

**Breaks:** Mission hard rules; testability.

**Mitigation:** reject PR; lint boundary (future Phase 21).
