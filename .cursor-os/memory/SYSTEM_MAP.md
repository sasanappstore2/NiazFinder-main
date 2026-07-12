# SYSTEM_MAP

## User journeys

1. **Need intake:** `/post` → compose → form → preview → publish  
2. **Marketplace:** `/n/{city}` browse needs  
3. **Business browse:** search (Typesense→Prisma fallback)  
4. **Match → chat → proposal**

## Services

| Service | Port / notes |
|---------|----------------|
| Next.js app | :3000 |
| Postgres | docker |
| Typesense | :8108 |
| Chat | :3004 |
| Redis / RabbitMQ / MinIO / worker-go | docker stack |
| Local LLM | optional :1234 |

## Key modules

See `docs/POST_SYSTEM_REPORT.md` §15 and `docs/engineering-constitution/03-MODULE-DIAGRAM.md`.

## Indexes

- Typesense `business_profiles` — business browse only  
- Need understanding — rules/LLM/draft — **not** Typesense
