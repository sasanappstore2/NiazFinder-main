---
Task ID: 6b-7
Agent: Routing Migration Agent (Layout Components)
Task: Migrate layout components from Zustand SPA navigation (navigateTo/goBack/currentView) to Next.js App Router (useAppRouter/next/link)

Work Log:
- Updated 6 component files to remove all references to `navigateTo`, `goBack`, `currentView` from Zustand store
- Replaced with `useAppRouter()` hook from `@/hooks/use-router` and `Link` from `next/link`
- Used `ROUTE_MAP` from `@/lib/routing` for view-name-to-URL-path mapping
- Added local `viewToPath()` helper in Header, MobileBottomNav, Footer for active state detection
- Kept `useAppStore` for non-navigation state (auth, notifications, chat, location, mobileMenuOpen, etc.)

**Files Updated:**

1. **src/components/layout/Header.tsx**
   - Replaced `useAppStore` for navigation with `useAppRouter` (`push`, `pathname`)
   - `MobileNavItem`: `currentView === item.view` → `pathname === viewToPath(item.view)`
   - `SearchBar`: `navigateTo('browse-requests', { search })` → `push('/browse-requests?search=...')`
   - `NotificationsButton`: `navigateTo('notifications')` → `push('notifications')`
   - `MessagesButton`: `navigateTo('messages')` → `push('messages')`
   - `UserMenu`: all `navigateTo(...)` → `push(...)` including parametric routes
   - `AddButton`: `navigateTo(...)` → `push(...)` with auth guard preserved
   - Main `Header`: `navigateTo('home')` → `push('home')`, active state via `viewToPath()`
   - Removed `AppView` import dependency for navigation (kept for type annotations)

2. **src/components/layout/MobileBottomNav.tsx**
   - Replaced `useAppStore` for navigation with `useAppRouter`
   - Active detection: `currentView === tab.view` → `pathname === viewToPath(tab.view)`
   - All `navigateTo(...)` → `push(...)`
   - Auth guard for messages tab preserved via `useAppStore` for `isAuthenticated`/`setAuthModalOpen`
   - Add menu actions: `navigateTo('post-need')` → `push('post-need')`, etc.

3. **src/components/layout/Footer.tsx**
   - Replaced `useAppStore` navigation with `useAppRouter` + `next/link`
   - Compact footer links changed from `<button onClick={navigateTo}>` to `<Link href={viewToPath(view)}>`
   - Full footer link columns changed to `<Link>` for static navigation
   - Removed `useAppStore` import entirely (was only used for navigateTo)
   - Added `viewToPath()` helper using ROUTE_MAP

4. **src/components/layout/MegaMenu.tsx**
   - DesktopMegaMenu: `navigateTo('browse-requests')` → `push('browse-requests')`
   - MobileMegaMenu: same replacement
   - Main MegaMenu: removed `useAppStore.subscribe(state => state.currentView)` subscription
   - Added route-change detection using derived state pattern (useState for prevPathname)
   - Uses `usePathname()` from `next/navigation` directly
   - Removed `useAppStore` import entirely

5. **src/components/shared/Breadcrumb.tsx**
   - Replaced `currentView`/`navigateTo` from store with `pathname`/`push` from `useAppRouter`
   - Added `pathnameToView()` function to reverse-map URL paths to AppView names
   - Supports exact matches (static routes) and prefix matches (dynamic routes like `/request/[id]`)
   - Returns null early if no matching view found
   - Removed `useAppStore` import entirely

6. **src/components/shared/QuickActions.tsx**
   - Replaced `navigateTo(view)` with `push(view)` using `useAppRouter`
   - Removed `useAppStore` import entirely
   - Simplified: single `useAppRouter()` call provides both `push` and `pathname`

**Lint Status:** 0 errors, 0 warnings

Stage Summary:
- 6 component files migrated from Zustand SPA navigation to Next.js App Router
- Zero references to `navigateTo`, `goBack`, `currentView` from `useAppStore` remain in these files
- `useAppStore` retained for non-navigation state (auth, notifications, chat, location, UI toggles)
- All route navigation now uses `useAppRouter()` hook → Next.js `router.push()`
- Static links in Footer use `next/link` component
- Active state detection uses `pathname === ROUTE_MAP[view]` pattern
- MegaMenu uses derived state pattern for route-change detection (React 19 lint compliant)
