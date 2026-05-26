# Home lead landing & filtered browse

## Overview

| Route | Experience |
|-------|------------|
| `/` | AI-first lead landing: chat-style composer, quick chips, city (cookie), optional phone, business CTA below |
| `/s/{city}?type=need` | Browse needs (header city + category filters) |
| `/s/{city}?type=business` | Browse businesses |
| `/post?seed=&city=&phone=` | AI need intake (prefilled from landing) |

## Components

- **`HomeLeadLanding`** (`src/components/home/HomeLeadLanding.tsx`) — full-viewport AI hero on `/`
- **`NeedLeadPromptBox`** (`src/components/home/ai-lead/NeedLeadPromptBox.tsx`) — ai-prompt-box style input with location/contact toggles and send-only button
- **`LeadQuickChips`** (`src/components/home/ai-lead/LeadQuickChips.tsx`) — action shortcuts (city, GPS, browse, business)
- **`useAutoResizeTextarea`** (`src/hooks/use-auto-resize-textarea.ts`) — shared textarea height hook
- **`getBrowseUrl` / `resolveLegacyBrowsePath`** (`src/lib/search/browse-entry-url.ts`) — URLs with saved city from cookies
- **`useLocationSelection({ preservePathOnHome: true })`** — on `/`, city selection updates cookie only (no redirect to `/s/...`)

## UI — AI composer

The home hero is centered like a chat app (Ruixen-inspired, brand gradients — no external background images):

1. Title: **نیازتان را بگویید** + badge «دستیار هوشمند نیاز فایندر»
2. **`AiLeadComposer`**: main textarea; `Enter` submits; circular emerald send when text is present
3. Composer footer: city picker, GPS, collapsible phone (`09123456789`)
4. **`LeadQuickChips`** below composer (action chips only)

### Quick chips

| Chip | Action |
|------|--------|
| انتخاب شهر | Open city popup |
| موقعیت من | GPS detect |
| نیازهای {شهر} | `getBrowseUrl({ type: 'need' })` — requires city |
| کسب‌وکار دارید؟ | Dashboard or auth modal |

Submit (send or Enter) → `/post?seed=&city=&phone=` (same validation as before: city required, phone optional with Iran mobile format).

## City behaviour

1. First visit without city → prominent city picker + optional GPS (`useAutoLocationCity`).
2. After selection → stored in `cookieManager` location prefs; header `LocationSelector` stays in sync.
3. On `/`, changing city in header or landing does **not** navigate away from home.
4. GPS on landing fills city via `preservePathOnHome`; no raw coordinates stored (see `docs/LOCATION_AUTO.md`).

## Lead flow

1. User types need in the AI composer (or taps a seed chip) + optional mobile.
2. Send (↑) or **Enter** → `/post?seed=…&city=…&phone=…`
3. Phone stored in `sessionStorage` (`needfinder_lead_phone`) via `src/lib/lead-draft.ts`.
4. On `/post`: structured questions → AI chat → listing preview (polish/edit) → publish. See [`docs/NEED_INTAKE.md`](NEED_INTAKE.md).
5. Guest publish on intake → login modal; toast mentions saved phone if present.

## Browse entry points

- Landing link **مشاهده نیازهای {شهر}** → `getBrowseUrl({ type: 'need' })`
- Mobile tab **کسب‌وکارها** → `getBrowseUrl({ type: 'business' })` (saved city)
- Category bar / mega menu / `navigateTo('browse-requests')` → `resolveLegacyBrowsePath` (city + category)
- `/s/iran` without `?type=` → **needs** by default (`BrowseDispatcher`)

## Business CTA

**کسب‌وکار دارید؟** → `/dashboard` (guests → auth modal).

## QA checklist

- [ ] `/` without city → pick city → cookie + header show same city
- [ ] GPS on landing → city filled; deny GPS → manual pick still works
- [ ] Prompt box: location toggle triggers GPS; contact toggle shows phone
- [ ] Composer auto-resizes; Enter / ↑ send (no Mic)
- [ ] Submit need → `/post` with `seed`, `city`, optional `phone`
- [ ] Action chips work (city, GPS, browse, business)
- [ ] Light/dark: composer and chips readable
- [ ] **مشاهده نیازها** → `/s/tehran?type=need` when Tehran selected
- [ ] Mobile **کسب‌وکارها** tab → `/s/tehran?type=business` when Tehran selected
- [ ] Category from header → need browse with city + category in URL
- [ ] Business CTA → dashboard or login modal
- [ ] `/s/iran` (no type) shows needs list, not businesses

## Out of scope (this phase)

- Full-screen intake chat on `/` (stays on `/post`)
- IP geolocation
- Dedicated mobile tab for needs only
