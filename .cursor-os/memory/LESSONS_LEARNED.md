# LESSONS_LEARNED

### 2026-07-12 — Merge effect loop

Depending on the whole `location` hook return value caused Maximum update depth exceeded because the object is a new reference every render. Fix: primitive/ref deps + equality-guarded `setSmartProposals`.

### 2026-07-12 — Low-confidence category chips erode trust

Showing “خدمات / تعمیرات” on incomplete text taught: gate category chips/auto-apply at **0.85**; hide stale highlights while analyzing.

### 2026-07-12 — Confirmation theater vs understanding-first

User rejected verify/gap/location ambiguity prompts on compose. High-conf auto-apply + correct on form step matches Constitution philosophy better.

### 2026-07-12 — Typesense “unhealthy” was false

Docker healthcheck used `wget` missing in image; API `/health` was fine. Fixed with bash `/dev/tcp` probe. Always verify real endpoints.

### 2026-07-12 — Docs lag code

Cursor OS / ARCHITECTURE_INDEX can claim sqlite or ambiguity UI after code moved. SoT order + “code wins” is mandatory.
