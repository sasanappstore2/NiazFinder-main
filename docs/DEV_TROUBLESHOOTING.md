# Dev troubleshooting

Common console messages during local development and how to handle them.

## WebSocket `/_next/webpack-hmr` failed (192.168.x.x)

**Symptom:** Browser console shows repeated failures connecting to `ws://192.168.x.x:3000/_next/webpack-hmr`. The homepage may show header/footer but stay stuck on a loading spinner (React hydration incomplete).

**Cause:** Next.js 16 blocks cross-origin access to dev-only assets unless the origin is in `allowedDevOrigins`. Opening the app via a LAN IP while the dev server only allowlists `localhost` triggers this.

**Fix:**

1. Dev server already binds to all interfaces (`npm run dev` uses `-H 0.0.0.0`).
2. Add your LAN origin to `.env.local`:

   ```env
   ALLOWED_DEV_ORIGINS=192.168.254.5:3000
   ```

   The parser also adds the host-only form (`192.168.254.5`) because Next.js may match either.

   Multiple origins (comma-separated):

   ```env
   ALLOWED_DEV_ORIGINS=192.168.254.5:3000,192.168.1.100:3000
   ```

3. Restart `npm run dev`.
4. On server startup, if `ALLOWED_DEV_ORIGINS` is set, a `[dev] allowedDevOrigins` line is logged.

**Alternative:** Use `http://localhost:3000` on the same machine — no extra config needed.

---

## `contentscript.js` — MaxListenersExceededWarning / ObjectMultiplex

**Symptom:** Console shows errors like:

- `MaxListenersExceededWarning: Possible EventEmitter memory leak detected`
- `ObjectMultiplex - orphaned data for stream "app-init-liveness"`
- `ObjectMultiplex - malformed chunk without name`

**Cause:** These come from **browser extensions** (often MetaMask or other wallet extensions), not from NeedFinder code. The stack trace points at `contentscript.js`, which is injected by the extension.

**Fix (for a clean console):**

- Test in an Incognito/Private window with extensions disabled, or
- Disable wallet extensions on `localhost` / your dev LAN IP, or
- Ignore — they do not affect app behavior in most cases.

NeedFinder cannot fix these in application code.

---

## Font preload warning (Vazirmatn)

**Symptom:** `The resource … vazirmatn … was preloaded using link preload but not used within a few seconds`.

**Cause:** Chrome devtools warning when a preloaded font is not applied immediately. `next/font` requires literal config values, so preload is disabled (`preload: false`); the font loads via `className` on `<body>` instead.

**Impact:** Cosmetic warning only — no functional issue.

---

## React DevTools message

`Download the React DevTools for a better development experience` is informational in development mode. Safe to ignore.

---

## Quick checklist

| Issue | App bug? | Action |
|-------|----------|--------|
| webpack-hmr WebSocket failed on LAN IP | Config | Set `ALLOWED_DEV_ORIGINS` |
| contentscript.js / ObjectMultiplex | No (extension) | Disable extension or ignore |
| Font preload unused | No (dev noise) | Ignore in dev |
| React DevTools | No | Ignore |
