---
title: Need Intake
tags: [feature, need-intake]
---

# Need Intake (`/post`)

جریان ثبت نیاز هوشمند: parse → سؤالات ساختاریافته → چت → پیش‌نمایش → publish.

## Docs (منبع حقیقت)

- [docs/NEED_INTAKE.md](../../docs/NEED_INTAKE.md) · [open](file:///Users/sasan/Desktop/NiazFinder%20main/docs/NEED_INTAKE.md)

## UI

| Component | Link |
|-----------|------|
| Main panel | [NeedIntakePanel.tsx](../../src/components/need-intake/NeedIntakePanel.tsx) · [open](file:///Users/sasan/Desktop/NiazFinder%20main/src/components/need-intake/NeedIntakePanel.tsx) |
| Realtime input | [realtime/](../../src/components/need-intake/realtime/) |
| Page | [post/page.tsx](../../src/app/%28main%29/post/page.tsx) |

## API routes (Next)

| Route | Handler |
|-------|---------|
| `POST /api/need-intake/parse-intent` | [parse-intent/route.ts](../../src/app/api/need-intake/parse-intent/route.ts) |
| `POST /api/need-intake/next-question` | [next-question/route.ts](../../src/app/api/need-intake/next-question/route.ts) |
| `POST /api/need-intake/extract-slots` | [extract-slots/route.ts](../../src/app/api/need-intake/extract-slots/route.ts) |
| `POST /api/need-intake/chat-turn` | [chat-turn/route.ts](../../src/app/api/need-intake/chat-turn/route.ts) |
| `POST /api/need-intake/preview-listing` | [preview-listing/route.ts](../../src/app/api/need-intake/preview-listing/route.ts) |
| `POST /api/need-intake/publish` | [publish/route.ts](../../src/app/api/need-intake/publish/route.ts) |
| `POST /api/need-intake/typing-analyze` | [typing-analyze/route.ts](../../src/app/api/need-intake/typing-analyze/route.ts) |

→ کاتالوگ کامل: [[../00_Index/APIRoutesCatalogue#need-intake|API — need-intake]]

## Domain (rules engine)

| Module | Path |
|--------|------|
| Orchestrator | [internal-orchestrator.ts](../../src/lib/need-intake/internal-orchestrator.ts) |
| Intent parser | [intent-parser.ts](../../src/lib/need-intake/intent-parser.ts) |
| Question engine | [question-engine.ts](../../src/lib/need-intake/question-engine.ts) |
| Listing composer | [listing-composer.ts](../../src/lib/need-intake/listing-composer.ts) |
| Client API | [intake-client.ts](../../src/lib/need-intake/intake-client.ts) |
| Contracts | [contracts/need-intake.ts](../../src/contracts/need-intake.ts) |
| Schemas | [config/need-schemas/](../../src/config/need-schemas/) |

## Nest (heavy jobs)

- Enqueue after publish: [enqueue-heavy.ts](../../src/lib/need-intake/enqueue-heavy.ts) → `POST {NEST}/api/intake-typing/heavy`
- Module: [[../02_Technical_Refs/NestBackendModules#intake-typing|intake-typing]]

## Tests

```bash
npm run test:intake-parser
npm run test:intake-flow
```

## Related

- [[TypingAnalysisRealtime]]
- [[LeadOutreach]]
- [[../00_Index/Home|Home]]
