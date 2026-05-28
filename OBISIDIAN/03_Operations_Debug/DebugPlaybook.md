---
title: Debug Playbook
tags: [operations, debug]
---

# Debug Playbook

## Source of truth

- [docs/DEBUG_PLAYBOOK.md](../../docs/DEBUG_PLAYBOOK.md) · [open](file:///Users/sasan/Desktop/NiazFinder%20main/docs/DEBUG_PLAYBOOK.md)

## Quick fixes

```bash
rm -rf .next && npm run dev
npx prisma migrate deploy
npm run smoke:routes
npm run smoke:api
```

## Common symptoms

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| White page / 500 all routes | Stale `.next` or route conflict | `rm -rf .next` |
| Chat won't connect | Nest down or wrong `NEXT_PUBLIC_CHAT_SOCKET_URL` | Start Nest :4000 |
| `business/me` 403 | Role not SPECIALIST | Upgrade user role |
| parse-intent 500 | Empty JSON body | Fixed: returns 400 |

## Related

- [[E2EChecklist]]
- [[HealthScripts]]
- [[../00_Index/LocalRunbook|LocalRunbook]]
