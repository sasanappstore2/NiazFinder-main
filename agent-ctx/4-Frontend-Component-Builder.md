---
Task ID: 4
Agent: Frontend Component Builder
Task: Build UserProfile component at /src/components/social/UserProfile.tsx

Work Log:
- Created `/src/components/social/UserProfile.tsx` — full-featured social profile page
- Analyzed project context from worklog.md (7 rounds completed, 50+ files, emerald theme, Persian text, RTL layout)
- Studied existing SpecialistProfile.tsx for consistent animation patterns, avatar helpers, and visual language
- Read all relevant API routes: /api/users/profile (GET+PUT), /api/users/[id] (GET), /api/users/[id]/follow (GET+POST)
- Verified all required shadcn/ui components exist (Avatar, Button, Badge, Card, Tabs, Separator)

Features Implemented:
1. **Cover image + avatar section**:
   - Large emerald gradient cover area with decorative circles and mesh pattern overlay
   - Real cover image support with fallback gradient
   - Avatar overlapping cover (28x28 rounded-2xl, solid color with gradient border)
   - Online/offline indicator badge (green/gray dot)
   - Verified badge (BadgeCheck icon, positioned top-right of avatar)
   - Cover edit button for own profile

2. **User info section**:
   - Display name + role badge (CLIENT=کاربر, SPECIALIST=متخصص, ADMIN=مدیر)
   - @username (or generated from phone last 4 digits)
   - Bio text
   - Location (city, province) with MapPin icon
   - Website link with Globe icon (opens in new tab)
   - Member since date in Persian calendar format (۱۴۰۳/۰۱/۱۵)
   - Online/offline status text

3. **Stats bar** (5 items):
   - Followers count (دنبال‌کنندگان)
   - Following count (دنبال‌شوندگان)
   - Posts count (پست‌ها)
   - Projects count (پروژه‌ها)
   - Rating with interactive stars

4. **Action buttons**:
   - Follow/Unfollow toggle with animated icon swap (UserPlus/UserMinus)
   - Message button → navigates to messages view with userId param
   - Call button → navigates to messages view with userId + action=call param
   - Share profile button (Web Share API with clipboard fallback, copy confirmation)
   - Own profile: Edit Profile button → navigates to dashboard
   - Auth-gated: Follow/Message/Call open auth modal if not logged in

5. **Profile tabs**:
   - پست‌ها (Posts): User's posts feed with PostMiniCard (title, description, city, date, priority badge, category badge)
   - درباره (About): Extended bio in quote card, detailed info rows, skills badges, verified card
   - پروژه‌ها (Projects): Project list with completion badges

Technical Details:
- API integration: GET /api/users/profile (own), GET /api/users/[id] (public), GET/POST /api/users/[id]/follow
- Auth header from localStorage.getItem('nf_auth_token')
- 5-second timeout with AbortSignal.timeout
- Graceful fallback to currentUser store data if API fails
- Loading skeleton with shimmer animation (ProfileSkeleton)
- framer-motion staggered entrance animations (fadeIn, container, item, scaleIn)
- AnimatePresence for follow button toggle animation
- RTL layout with dir="rtl"
- Emerald color theme with teal accents
- Glass-morphism elements (backdrop-blur, white/60 bg)
- Persian text throughout
- Responsive design (mobile-first, grid breakpoints)
- Sonner toast notifications for follow/share actions
- Custom scrollbar for long post lists

Lint: 0 errors, 0 warnings

Stage Summary:
- UserProfile component created at /src/components/social/UserProfile.tsx
- Full-featured profile page with cover, avatar, stats, tabs, actions
- All 5 required sections implemented with animations
- 0 lint errors
