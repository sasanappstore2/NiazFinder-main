# Need Finder - Worklog

---
Task ID: 3
Agent: Main Architect
Task: Enterprise App Router Architecture Overhaul

Work Log:
- Analyzed current SPA architecture (Zustand-based navigation on single / route)
- Created 16 core infrastructure files (modular store, SEO utilities, route config, API client, hooks)
- Created 37 App Router route files with 5 route groups
- Created 18 skeleton/streaming components for performance UX
- Updated main page.tsx with Suspense boundaries, SEO hooks, and route guards
- Updated root layout.tsx with parallel routes support, JSON-LD, enhanced metadata
- All lint checks pass (0 errors, 1 pre-existing warning)
- Homepage: HTTP 200 ✅, Categories API: 8 ✅, Login: admin ✅

Stage Summary:
- Complete enterprise-grade App Router architecture implemented
- 70+ new files created across 9 architectural categories
- Backward compatibility maintained (old store.ts still works)
- Key new features: URL deep linking, route guards, JSON-LD, streaming, parallel routes

## Architecture Overview

### 1. Folder Structure (Domain-Based)
```
src/
├── app/
│   ├── layout.tsx              # Enhanced root layout (parallel routes, JSON-LD)
│   ├── page.tsx                # SPA controller with Suspense boundaries
│   ├── template.tsx            # Page transition animations
│   ├── loading.tsx             # Root loading skeleton
│   ├── error.tsx               # Error boundary (Persian)
│   ├── not-found.tsx           # 404 page
│   ├── global-error.tsx        # Root error handler
│   │
│   ├── (auth)/                 # Auth route group
│   │   ├── layout.tsx          # Centered card, no header/footer
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── loading.tsx
│   │
│   ├── (marketplace)/          # Marketplace route group
│   │   ├── layout.tsx          # Header/Footer + sidebar filters
│   │   ├── requests/page.tsx
│   │   ├── requests/[slug]/page.tsx
│   │   ├── requests/new/page.tsx
│   │   ├── specialists/page.tsx
│   │   ├── specialists/[id]/page.tsx
│   │   └── loading.tsx
│   │
│   ├── (dashboard)/            # Dashboard route group
│   │   ├── layout.tsx          # Persistent sidebar + mobile sheet
│   │   ├── dashboard/page.tsx
│   │   ├── dashboard/settings/page.tsx
│   │   ├── dashboard/requests/page.tsx
│   │   ├── dashboard/payments/page.tsx
│   │   ├── dashboard/referral/page.tsx
│   │   └── loading.tsx
│   │
│   ├── (chat)/                 # Chat route group
│   │   ├── layout.tsx          # Full-height split view
│   │   ├── chat/page.tsx
│   │   ├── chat/[conversationId]/page.tsx
│   │   ├── chat/new/page.tsx
│   │   └── loading.tsx
│   │
│   ├── (admin)/                # Admin route group
│   │   ├── layout.tsx          # Admin sidebar with guard
│   │   ├── admin/page.tsx
│   │   └── loading.tsx
│   │
│   ├── @modal/                 # Parallel routes (modal slot)
│   │   ├── default.tsx
│   │   ├── (.)requests/[slug]/page.tsx
│   │   └── (.)specialists/[id]/page.tsx
│   │
│   ├── pricing/page.tsx
│   ├── notifications/page.tsx
│   └── compare/page.tsx
│
├── lib/
│   ├── store/                  # Modular Zustand stores
│   │   ├── index.ts            # Combined useAppStore
│   │   ├── navigation-store.ts # URL-aware routing + history
│   │   ├── auth-store.ts       # Token persistence + role helpers
│   │   ├── ui-store.ts         # Modal stack + theme + loading
│   │   ├── notification-store.ts # Polling + preferences
│   │   ├── chat-store.ts       # Message cache + typing indicators
│   │   ├── bookmark-store.ts   # localStorage sync
│   │   └── compare-store.ts    # Max 3 comparison
│   │
│   ├── seo/                    # SEO utilities
│   │   ├── index.ts
│   │   ├── metadata.ts         # createMetadata() helper
│   │   ├── json-ld.ts          # 8 schema generators
│   │   └── sitemap.ts          # URL config + sitemap helpers
│   │
│   ├── route-config.ts         # 23 routes + RBAC + Persian metadata
│   ├── api-client.ts           # Typed fetch wrapper
│   └── store.ts                # Legacy (backward compatible)
│
├── hooks/
│   ├── use-seo.ts              # Auto page title/meta
│   ├── use-RouteGuard.ts       # Role-based access control
│   ├── use-chat-url.ts         # Deep linking + message anchors
│   └── use-optimized-fetch.ts  # Cache + dedup + prefetch
│
├── components/
│   ├── skeletons/              # 11 skeleton components
│   ├── streaming/              # 4 streaming components
│   ├── suspense-patterns/      # 3 Suspense-wrapped pages
│   ├── seo/                    # JsonLdScript component
│   └── ...existing components...
```

### 2. SEO Architecture
- Dynamic metadata per route (createMetadata helper)
- OpenGraph with Persian locale (fa_IR)
- Twitter Card (summary_large_image)
- JSON-LD structured data (Organization, WebSite, Service, etc.)
- Canonical URLs + language alternates (fa-IR, en-US)
- robots configuration per page

### 3. URL Architecture
- 23 semantic routes defined in route-config.ts
- Route groups: auth, marketplace, dashboard, chat, admin
- RBAC permissions per route
- Hash-based deep linking (#/requests?slug=xyz)
- Browser back/forward via pushState

### 4. Chat Architecture
- /chat/[conversationId] dynamic routes
- /chat/new for new sessions
- Message anchor support (?msg=123)
- Online status tracking
- Typing indicators (5s expiry)
- Message cache (100 msgs/conversation)

### 5. Dashboard Architecture
- Persistent sidebar navigation
- Role-based routing (user/admin/specialist)
- Nested layouts: settings, requests, payments, referral
- Mobile-responsive (Sheet sidebar)
- Route guards with auth modal trigger

### 6. Nested Layouts
- Root layout: fonts + theme + toaster + JSON-LD
- Auth layout: centered, no header/footer
- Marketplace layout: header/footer + filter sidebar
- Dashboard layout: persistent sidebar + breadcrumb
- Chat layout: full-height split view
- Admin layout: admin sidebar + guard component

### 7. Parallel Routes
- @modal slot for intercepting navigation
- Modal stack management in UI store
- Default returns null when no modal active

### 8. Intercepting Routes
- (.)requests/[slug] → request detail in modal
- (.)specialists/[id] → specialist preview in modal
- Back-navigation preservation

### 9. Streaming & Performance
- 11 skeleton components (per-page, per-section)
- Suspense boundaries on homepage (7 sections)
- StreamBoundary wrapper component
- ProgressiveGrid for staggered loading
- InfiniteScrollList with IntersectionObserver
- Root loading.tsx with full-page skeleton

### Unresolved / Next Steps
- Production deployment needs route file activation (remove SPA-only mode)
- Implement actual WebSocket chat service
- Add ISR/SSG for static pages (categories, pricing)
- Add middleware for auth redirects in production routing
- Performance testing with 10K+ concurrent users
