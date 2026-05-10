# Task 7-c: ProfileCompletionBar Component

## Summary
Created `/home/z/my-project/src/components/dashboard/ProfileCompletionBar.tsx` — a standalone dashboard widget for the NeedFinder Persian marketplace.

## What Was Built

### Component: `ProfileCompletionBar`
- **Export**: Named export `export function ProfileCompletionBar()`
- **Directive**: `'use client'`

### Features Implemented

1. **Circular Progress Indicator** (`CircularProgress` internal component)
   - SVG-based circular progress ring with `stroke-dasharray` / `stroke-dashoffset` animation
   - Emerald gradient (`#10b981` → `#059669` → `#047857`) on the progress stroke
   - Large Persian-digit percentage display centered inside the ring (e.g., "۴۳")
   - "درصد" label below the number
   - Framer Motion `motion.circle` animates from 0% to target with 1.4s ease-out, delayed 0.3s

2. **Horizontal Progress Bar**
   - Custom div-based bar (not shadcn Progress) for gradient control
   - Emerald-to-teal gradient fill animated via Framer Motion `width: 0% → target%`
   - Shimmer/glow effect that loops periodically after initial animation

3. **Completion Checklist** — 7 items with staggered entrance animations:
   - ✅ آواتار پروفایل (Camera icon)
   - ✅ نام و نام خانوادگی (UserCheck icon)
   - ✅ شماره تلفن (Phone icon)
   - ⭕ شهر محل سکونت (MapPin icon) + "تکمیل کنید" link
   - ⭕ حداقل ۳ مهارت (Sparkles icon) + "تکمیل کنید" link
   - ⭕ حداقل ۱ نمونه کار (FileText icon) + "تکمیل کنید" link
   - ⭕ بیوگرافی (UserCheck icon) + "تکمیل کنید" link
   - Completed: emerald checkmark in green circle, green text
   - Incomplete: amber Circle icon, muted text, clickable "تکمیل کنید" link

4. **CTA Button**
   - Full-width emerald gradient button: "تکمیل پروفایل" with ArrowLeft icon
   - Navigates to `'profile'` view via `useAppStore().navigateTo('profile')`

5. **Styling**
   - Card with glass-morphism: `bg-white/70 backdrop-blur-xl border-white/40`
   - Dark mode support: `dark:bg-card/70 dark:border-white/10`
   - Subtle emerald gradient accent line at top of card
   - Responsive layout: stacks vertically on mobile, horizontal on `sm:`
   - RTL-compatible layout
   - All text in Persian with Persian digits

6. **Animations** (all Framer Motion)
   - Container: fade-in + slide-up (0.5s)
   - Circle progress: stroke-dashoffset animation (1.4s, delay 0.3s)
   - Center text: fade-in + scale (0.6s, delay 0.8s)
   - Progress bar: width transition (1.4s, delay 0.3s)
   - Shimmer: infinite loop after initial fill
   - Checklist items: staggered slide-in (0.35s each, +0.07s per item)
   - CTA button: fade-in + slide-up (0.4s, delay 1.1s)

### Dependencies Used
- `framer-motion` — all animations
- `@/components/ui/card` — Card, CardHeader, CardTitle, CardContent
- `@/components/ui/button` — Button
- `@/lib/store` — `useAppStore` for navigation
- `lucide-react` — UserCheck, Check, Circle, Camera, Phone, MapPin, Sparkles, FileText, ArrowLeft

### Lint Result
✅ No errors or warnings in the new file. Only pre-existing warning in unrelated `RequestForm.tsx`.
