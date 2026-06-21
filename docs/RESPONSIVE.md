# Responsive layout standards

Breakpoints align with [`src/styles/responsive-golden.css`](../src/styles/responsive-golden.css) and Tailwind (`tailwind.config.ts`).

## Device tiers

| Tier | Width | Layout rules |
|------|-------|--------------|
| Phone | &lt;640px | Single column; full-width CTAs; `overflow-guard` on long Persian titles |
| Tablet | 640–1023px | Prefer stack unless there is clear horizontal space; avoid `sm:flex-row` for dense headers — use `md:` or `lg:` |
| Laptop+ | ≥1024px | Multi-column splits, sticky sidebars |

## Component checklist

- Add `min-w-0` on flex/grid children that hold text
- Use `overflow-guard` (or `text-balance-safe`) on headings and business names
- Popovers/sheets: `w-[min(840px,calc(100vw-2rem))]` — never fixed px wider than viewport
- Tables: card-stack below `md`, or intentional `overflow-x-auto` with hidden low-priority columns
- Page padding: use [`PageContainer`](../src/components/layout/PageContainer.tsx) / `PAGE_PADDING_CLASS` — do not duplicate `px-*` inside

## Utilities (`responsive-golden.css`)

| Class | Use |
|-------|-----|
| `overflow-guard` | Long RTL text, titles |
| `layout-golden-split` | Main + aside (intake, detail pages) |
| `layout-stack` | Vertical rhythm with `--stack-gap` |
| `min-h-viewport-content` | Hero sections minus header + mobile nav |

## Anti-patterns to avoid

- `sm:flex-row` when three+ blocks compete (logo + title + actions)
- `min-w-[720px]` tables without mobile fallback
- Nested `PageContainer` + extra `px-4 mx-auto`

## Manual viewport matrix

Test at: 320, 375, 390, 428, 640, 768, 1024, 1280, 1536 px.

Critical routes: `/`, business profile `/b/{slug}`, business browse, `/post`, `/post-need`, `/profile/{id}`, `/dashboard`, `/super-admin`, `/chat`.

Mobile UX roadmap and QA gates: [`MOBILE_UX_ROADMAP.md`](MOBILE_UX_ROADMAP.md).

Assert: `#main-content` has no horizontal overflow (`scrollWidth <= clientWidth`).
