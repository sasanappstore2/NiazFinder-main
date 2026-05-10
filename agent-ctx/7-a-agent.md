---
Task ID: 7-a
Agent: Component Development Agent
Task: Create 3 new components - MobileBottomNav, CookieConsent, ReportUser

Work Log:
- Read `/home/z/my-project/worklog.md` to understand project context (6 completed rounds, 52+ files)
- Examined existing patterns: store.ts, types.ts, Header.tsx, BackToTop.tsx, dialog/radio-group/checkbox UI components
- Verified all required UI components exist in `src/components/ui/` (dialog, button, textarea, badge, checkbox, label, radio-group)
- Created MobileBottomNav component with all specified features
- Created CookieConsent component with all specified features
- Created ReportUser component with all specified features
- Ran `bun run lint`: 0 errors, 1 pre-existing warning (React Hook Form in RequestForm.tsx)
- Dev server compiles successfully (HTTP 200 on /)

Components Created:

1. **MobileBottomNav** (`/src/components/layout/MobileBottomNav.tsx`)
   - Fixed bottom navigation bar, hidden on `lg:` breakpoint
   - 5 tabs: خانه, نیازها, متخصص‌ها, پیام‌ها, پروفایل
   - Lucide icons: Home, FileText, Users, MessageCircle, User
   - Active tab highlighted with emerald primary color + animated layoutId background
   - Badge indicator on Messages tab (unread count from conversations in store)
   - framer-motion entrance animation
   - Glass-morphism background (backdrop-blur-xl + bg-background/80)
   - RTL layout with `dir="rtl"`
   - z-40, iOS safe area support via `pb-[env(safe-area-inset-bottom)]`
   - Auth check: Profile/Messages tabs open auth modal if not authenticated

2. **CookieConsent** (`/src/components/shared/CookieConsent.tsx`)
   - Bottom-positioned GDPR compliance banner (above MobileBottomNav: bottom-20)
   - localStorage persistence (key: 'needfinder-cookie-consent')
   - Animated entrance with framer-motion (slide up from bottom)
   - Full Persian text: title, description, accept/reject/settings buttons
   - Shield icon, emerald-themed primary button, outline reject button
   - Glass card with backdrop-blur, rounded-2xl, gradient decorations
   - AnimatePresence for dismiss animation
   - Settings link shows placeholder toast
   - Close (X) button also triggers reject behavior

3. **ReportUser** (`/src/components/shared/ReportUser.tsx`)
   - Dialog component for reporting users/requests/comments
   - Props: open, onOpenChange, targetName, targetType
   - Persian title: "گزارش تخلف یا نقض قوانین"
   - Target info badge showing target name and type
   - RadioGroup with 6 report reasons (Persian text)
   - Staggered entrance animation on reason items
   - Textarea with 500-char limit and counter (color changes near limit)
   - Checkbox: "می‌خواهم ناشناس بمانم" (checked by default)
   - Submit button with loading state (Loader2 spinner)
   - Sonner toast on success, auto-closes after 1.5s
   - Cancel button, form reset on close
   - RTL layout, emerald-themed primary button
   - Animated entrance with framer-motion

Lint Results:
- 0 errors
- 1 pre-existing warning (React Hook Form incompatible library in RequestForm.tsx:205)

Stage Summary:
- 3 new components created as named exports
- All text in Persian (Farsi) with RTL layout
- Follows existing project patterns and code style
- Clean TypeScript with proper types
- No existing files modified
- Total: ~55 custom source files
