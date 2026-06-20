# NiazFinder Wiring Matrix

Generated: 2026-06-19T14:26:03.924Z

API routes: 212 | User sections: 10 | Admin panels: 30

## User-facing sections

| Section | Routes | Key APIs | Admin panel |
|---------|--------|----------|-------------|
| home | /, /en |  | analytics |
| browse-need | /n/iran, /n/{city}, /n/{city}/{category} | /api/requests, /api/requests/map-pins | requests |
| browse-business | /b/iran, /b/{city}, /b/{profileSlug} | /api/business/browse, /api/business/map-pins… | businesses |
| need-detail | /v/{slug}/{id}, /propose/{id} | /api/requests/{id}, /api/requests/{id}/matched-businesses… | requests |
| intake | /post, /post/edit/{id} | /api/intake/analyze, /api/need-intake/publish… | intake-field-specs |
| user-dashboard | /dashboard, /dashboard/referral | /api/dashboard, /api/requests?mine=1… | users |
| business-hub | /my-business, /pro/{id}/edit | /api/business/me, /api/business/me/* | businesses |
| chat | /chat, /chat/{id}, /messages | /api/chat, /api/chat/{id}… | messages |
| super-admin | /super-admin/* | /api/super-admin/* | overview |
| blog-seo | /blog, /blog/{slug}, /sitemap.xml | /api/blog | blog |

## Super-admin panel → API mapping

### overview
- GET /api/super-admin/overview
- GET /api/super-admin/analytics

### analytics
- GET /api/super-admin/analytics/*

### workflow
- GET /api/super-admin/workflow

### categories
- GET/POST /api/super-admin/categories
- PATCH/DELETE /api/super-admin/categories/[id]

### business-occupations
- GET/POST /api/super-admin/business-occupations

### online-stores
- GET/POST /api/super-admin/online-stores

### locations
- GET/POST/PATCH/DELETE /api/super-admin/locations

### requests
- GET /api/super-admin/requests
- POST /api/super-admin/requests/[id]/moderate

### proposals
- GET /api/super-admin/proposals

### businesses
- GET /api/super-admin/businesses

### outreach
- GET /api/super-admin/outreach

### need-alerts
- GET/PATCH /api/super-admin/need-alerts

### users
- GET/PATCH /api/super-admin/users/[id]
- GET/POST /api/super-admin/rbac/assignments

### reports
- GET /api/super-admin/reports

### messages
- GET /api/super-admin/chat-review/conversations

### voice-calls
- GET /api/super-admin/voice-calls
- GET /api/super-admin/voice-calls/[id]

### notifications
- GET/POST /api/super-admin/notifications/broadcast

### reviews
- GET/PATCH /api/super-admin/reviews

### billing
- GET /api/super-admin/transactions
- GET /api/super-admin/wallets/[userId]

### system
- GET/POST /api/super-admin/rbac/*
- GET /api/super-admin/intake-governance
- GET /api/super-admin/intake-scale

### audit
- GET /api/super-admin/audit

### files
- GET /api/super-admin/files

### settings
- GET/PATCH /api/super-admin/settings

### referrals
- GET /api/super-admin/referrals

### coupons
- GET /api/super-admin/coupons

### blog
- GET/POST /api/super-admin/blog

### intake-migration
- GET /api/super-admin/intake-migration

### intake-ai-evaluation
- GET /api/super-admin/intake-ai-evaluation

### intake-training
- GET/PATCH /api/super-admin/intake-training

### intake-field-specs
- GET/POST /api/super-admin/intake-field-specs
