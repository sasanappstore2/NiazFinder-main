---
Task ID: 7-b
Agent: Component Creator Agent
Task: Create RequestShare and SpecialistAvailabilityBadge components

Work Log:
- Read worklog.md and analyzed project context (6 completed development rounds, 50+ custom files)
- Studied existing component patterns: BookmarkButton (animations, toast usage), ReferralPage (social share buttons, copy link), Popover/Badge UI components
- Verified `animate-pulse-online` CSS class exists in globals.css (used in TopSpecialists.tsx)
- Created RequestShare.tsx: Share dropdown/popover with copy link + 3 social buttons (Telegram, WhatsApp, Email)
- Created SpecialistAvailabilityBadge.tsx: Availability badge with 3 size variants (sm/md/lg), online/offline states
- Ran `bun run lint`: 0 errors, 1 pre-existing warning (React Hook Form in RequestForm.tsx)

Components Created:
1. `/src/components/shared/RequestShare.tsx`
   - Uses shadcn Popover with Share2 icon trigger
   - Copy link button with emerald accent and clipboard API
   - 3 social share buttons: Telegram (#0088cc), WhatsApp (#25D366), Email
   - Staggered framer-motion entrance animation for each button
   - AnimatePresence for open/close transitions
   - RTL layout with Persian text
   - Sonner toast on copy success: "لینک در کلیپ‌بورد کپی شد"

2. `/src/components/specialists/SpecialistAvailabilityBadge.tsx`
   - 3 size variants: sm (text-xs, dot-2), md (text-sm, dot-2.5), lg (text-base, dot-3)
   - Online state: green dot with animate-pulse-online + "آنلاین" text
   - Offline state: gray dot + "آفلاین" text + "آخرین فعالیت: اخیراً"
   - lg variant: glass-morphism background, ping animation ring, response time, completed count
   - Uses existing Badge component from shadcn
   - framer-motion entrance animation
   - RTL layout with Persian text

Lint Results: 0 errors, 1 pre-existing warning (React Hook Form incompatible library)
