# UI Order System (OCD-friendly)

Companion to [`RESPONSIVE.md`](RESPONSIVE.md). Defines visual structure rules for all consumer and admin pages.

## Layer rules

| Layer | Rule | SoT |
|-------|------|-----|
| Shell | Header, footer, bottom nav, one `main` | [`AppShell`](../src/components/layout/AppShell.tsx) |
| Width | Never nest `PageContainer` | [`PageContainer`](../src/components/layout/PageContainer.tsx) |
| Page header | Breadcrumb → separator → H1 → actions | [`PageChrome`](../src/components/layout/PageChrome.tsx) |
| H1 | One visible title per page | [`site-labels.ts`](../src/config/site-labels.ts) + [`page-titles.ts`](../src/config/page-titles.ts) |
| Sections | `space-y-6` or `layout-stack` | [`responsive-golden.css`](../src/styles/responsive-golden.css) |
| Inbox panels | `PanelCard` | [`PanelCard`](../src/components/shared/PanelCard.tsx) |
| Forms | `FieldStack` (label above, gap-2) | [`FieldStack`](../src/components/shared/FieldStack.tsx) |
| Options | Column `gap-3`; chips `flex-wrap gap-2`; bordered glow: `OptionTile` / `BorderGlow` | [`OptionGroup`](../src/components/shared/OptionGroup.tsx), [`OptionTile`](../src/components/shared/OptionTile.tsx), [`border-glow`](../src/components/ui/border-glow.tsx) |
| Empty states | Shared icon + title + description + CTA | [`EmptyState`](../src/components/shared/EmptyState.tsx) |
| Colors | `primary`, `muted`, `border` — no new `emerald-*` | [`globals.css`](../src/app/globals.css) |
| Radius | Interactive: `rounded-lg`; surfaces: `rounded-xl` | shadcn defaults |
| RTL spacing | `ms-`/`me-`/`ps-`/`pe-` | — |

## Route width map

| Page type | `PageContainer.width` | Examples |
|-----------|----------------------|----------|
| List / inbox | `medium` | bookmarks, notifications, edit-profile |
| Dashboard / hub | `wide` | dashboard, business profile hub |
| Text content | `content` | profile, legal, help |
| Intake | `intake` | `/post` |
| Marketplace chrome | `default` | `/n/*`, `/b/*` browse headers |
| Full bleed | `full` | workspace, map immersive |
| Narrow feed | `narrow` | social-feed |

## Labels

All Persian UI labels come from [`SITE_LABELS`](../src/config/site-labels.ts). Do not duplicate strings in components.

## Exceptions (keep domain CSS, align spacing)

- **Intake:** `IntakeStepShell` + `intake-golden.css`
- **Chat:** minimal chrome in `(chat)/layout`
- **Map:** zero padding only inside map viewport

## PR checklist

- [ ] Uses `PageContainer` (not nested)
- [ ] Uses `PageChrome` when applicable
- [ ] One H1, label from `SITE_LABELS`
- [ ] Empty states use `EmptyState`
- [ ] Forms use `FieldStack`
- [ ] No redundant `dir="rtl"`
- [ ] Logical spacing (`ms`/`me`) in touched files

## Viewport QA matrix

Test at 320, 375, 390, 428, 640, 768, 1024, 1280, 1536 px.

Critical routes: `/`, `/post`, `/dashboard`, `/bookmarks`, `/notifications`, `/search`, `/n/*`, `/b/*`, `/chat`, `/super-admin`.

Assert: `#main-content` has no horizontal overflow.
