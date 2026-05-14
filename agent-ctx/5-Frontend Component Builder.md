---
Task ID: 5
Agent: Frontend Component Builder
Task: Build UserDiscovery component

Work Log:
- Created `/src/components/social/UserDiscovery.tsx`
- Features implemented:
  1. **Search bar**: Search by name, username, phone with debounce; clear button
  2. **Role filter**: Toggle buttons (همه / کاربران / متخصص‌ها / مدیران) with emerald active state
  3. **Sort options**: Select dropdown (جدیدترین / بیشترین فالوور / فعال‌ترین)
  4. **Featured users carousel**: 6 suggested verified users with high follower count; horizontal scroll with snap; auto-scroll animation (pauses on hover, resumes on leave); each card has avatar, name, role icon, bio preview, stats (followers/projects), follow button, view button
  5. **Users grid**: Responsive 1/2/3 columns; each card includes avatar with online indicator, display name + verified badge, @username, bio (line-clamp-2), stats (followers + projects), role badge with icon, follow/unfollow button, "مشاهده پروفایل" button; click card navigates to user-profile view
  6. **Pagination**: Page-based with numbered buttons, prev/next, ellipsis, Persian numerals
  7. **Empty state**: When no users match filters
  8. **Loading state**: Skeleton cards matching the layout
- API integration: Fetches from GET /api/users with search, role, sort, page params; falls back to mock data (12 users from MOCK_SPECIALISTS + 6 new client/specialist users)
- Follow toggle: POST /api/users/[id]/follow with optimistic fallback; module-level shared follow state via custom hook pattern; toast notifications
- Navigation: Click card or "مشاهده پروفایل" → navigateTo('user-profile', { id: userId })
- Auth: Uses localStorage nf_auth_token; prompts auth modal if not authenticated
- All text in Persian (Farsi), RTL layout
- Emerald color theme with glassmorphism effects
- framer-motion animations: staggered grid entrance, hover effects on cards, carousel card lift, fadeIn for sections
- shadcn/ui components: Input, Button, Badge, Card, CardContent, Avatar, AvatarFallback, Select

Stage Summary:
- UserDiscovery component created successfully at /src/components/social/UserDiscovery.tsx
- 0 lint errors
- Dev server compiles successfully
- Note: The 'discover' view already exists in AppView type but is not yet wired in page.tsx SPA router (the orchestrator should add the route)
