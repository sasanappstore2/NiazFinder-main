# 15 — ADR Guide

Architecture Decision Records capture **irreversible or cross-cutting** choices.

---

## When to write an ADR

See charter gates. Examples: Typesense schema fields, intake publish authority, Nest vs Next, wallet economics, auth model, confidence threshold policy changes.

Skip ADR for: typo fixes, single-file bugfixes, test-only changes.

---

## Location & naming

```text
/.cursor-os/adr/ADR-NNNN-short-kebab-title.md
```

Numbers are monotonic. Status in header: `proposed` | `accepted` | `superseded` | `rejected`.

Template inspired by `OBISIDIAN/_templates/ADR.md`, expanded for engineering use.

---

## Template

```markdown
---
title: "ADR-NNNN: Title"
date: YYYY-MM-DD
status: proposed
supersedes: []
superseded_by: null
---

# ADR-NNNN: Title

## Context
What problem? Current truth citations (paths).

## Decision
What we will do.

## Consequences
### Positive
### Negative / risks
### Rollback

## Alternatives considered
| Option | Why not |

## Implementation notes
Flags, migrations, tests, docs to update.

## Validation
How we know it worked.
```

---

## Process

1. Draft as `proposed` (can live with spike behind flag)
2. Link from `OPEN_DECISIONS.md`
3. Implement minimal proof if needed
4. Mark `accepted` when adopted; update `CURRENT_STATE.md`
5. To reverse: new ADR that `supersedes` old; never silent overwrite

---

## Quality bar

- Cite real code/docs
- Separate Current vs Target
- Explicit rollback
- Name test gates
- No secret values
