# Stage 5 — PWA / Service Worker

**Decision: CANCELLED**

`@ducanh2912/next-pwa` injects a webpack config. Next.js 16.2.6 uses Turbopack by default and fails with:

```
ERROR: This build is using Turbopack, with a `webpack` config and no `turbopack` config.
```

**Not changed:**
- Existing [`public/manifest.json`](../public/manifest.json) and layout metadata link remain
- No new manifest created

**Possible follow-up:** manual service worker, or `next build --webpack` in CI only (trade-off: slower builds)
