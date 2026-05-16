# Task: Create/Enhance Auth, Users, Bookmarks Modules for NeedFinder Backend

## Agent: Main
## Status: ✅ COMPLETED

---

## Summary

All three NestJS backend modules have been created/enhanced following the existing project patterns (Prisma ORM, bcrypt, JWT, class-validator DTOs, Persian error messages).

---

## Files Created/Updated

### Prisma Schema (1 file)
| File | Action |
|------|--------|
| `prisma/schema.prisma` | **UPDATED** — Added `Bookmark` model + `bookmarks` relation on `User` |

### Module 1: Auth (7 files)
| File | Action |
|------|--------|
| `src/modules/auth/auth.module.ts` | **UPDATED** — Added PassportModule, UsersModule imports; JwtStrategy provider |
| `src/modules/auth/auth.service.ts` | **REWRITTEN** — Full service with dual-token (access 30d + refresh 7d), email verification, password reset |
| `src/modules/auth/auth.controller.ts` | **REWRITTEN** — 8 routes: register, login, refresh, verify-email, forgot-password, reset-password, logout, me, change-password |
| `src/modules/auth/jwt.strategy.ts` | **NEW** — Passport JWT strategy with Bearer token extraction and DB user validation |
| `src/modules/auth/dto/register.dto.ts` | **UPDATED** — Stronger password validation (min 8, 1 uppercase, 1 number) |
| `src/modules/auth/dto/refresh-token.dto.ts` | **NEW** — refreshToken field |
| `src/modules/auth/dto/forgot-password.dto.ts` | **NEW** — email field |
| `src/modules/auth/dto/reset-password.dto.ts` | **NEW** — token + newPassword (with strong validation) |

### Module 2: Users (6 files)
| File | Action |
|------|--------|
| `src/modules/users/users.module.ts` | **KEPT** — Already correct structure |
| `src/modules/users/users.service.ts` | **REWRITTEN** — Full service with profile completion, deactivate, change password, search, admin methods |
| `src/modules/users/users.controller.ts` | **REWRITTEN** — 11 routes: list (admin), search, me (GET/PUT), avatar, password, completion, dashboard, profile, deactivate, toggle-status |
| `src/modules/users/dto/query-users.dto.ts` | **UPDATED** — Added sortBy, sortOrder fields |
| `src/modules/users/dto/update-profile.dto.ts` | **NEW** — Proper DTO with class-validator decorators |
| `src/modules/users/dto/change-password.dto.ts` | **NEW** — oldPassword + newPassword with strong validation |
| `src/modules/users/dto/search-users.dto.ts` | **NEW** — query field (min 2 chars) |

### Module 3: Bookmarks (5 files) — ENTIRELY NEW
| File | Action |
|------|--------|
| `src/modules/bookmarks/bookmarks.module.ts` | **NEW** — Module definition |
| `src/modules/bookmarks/bookmarks.service.ts` | **NEW** — toggle, getUserBookmarks (with enriched target data), isBookmarked, removeBookmark |
| `src/modules/bookmarks/bookmarks.controller.ts` | **NEW** — 4 protected routes: list, toggle, check, remove |
| `src/modules/bookmarks/dto/toggle-bookmark.dto.ts` | **NEW** — type (REQUEST|SPECIALIST) + targetId |
| `src/modules/bookmarks/dto/query-bookmarks.dto.ts` | **NEW** — page, limit, type |

### App Module (1 file)
| File | Action |
|------|--------|
| `src/app.module.ts` | **UPDATED** — Registered BookmarksModule |

---

## Key Features Implemented

### Auth Module
- **Dual JWT tokens**: Access (30d) + Refresh (7d) with separate secrets
- **Password hashing**: bcrypt with salt rounds 10
- **Email verification**: Token-based with 24h expiry, stored in AuthToken table
- **Password reset**: Token-based with 1h expiry, invalidates all tokens on reset
- **Welcome notification**: Sent on registration via Prisma transaction
- **Token blacklist**: All tokens deleted on logout/change-password (DB-based since no Redis)

### Users Module
- **Profile completion**: Weighted 12-field calculation (name, avatar, bio, city, skills, etc.)
- **Soft deactivate**: Sets isActive=false, invalidates all tokens
- **Change password**: Verifies old password, hashes new, invalidates all tokens
- **Search**: Searches by name, email, city, and skills
- **Admin controls**: List all users, toggle ban/active status

### Bookmarks Module
- **Toggle**: Add/remove bookmark in single endpoint (uses unique constraint)
- **Enriched listing**: Fetches target data (request title/budget or specialist profile/rating)
- **Check**: Simple boolean response for bookmark status
- **Validation**: Ensures target exists before bookmarking

---

## Pre-existing TS Errors (NOT from this task)
The following modules have pre-existing TypeScript errors that were not introduced by this work:
- `categories/categories.service.ts` (5 errors)
- `dashboard/dashboard.service.ts` (1 error)
- `requests/requests.service.ts` (4 errors)
- `reviews/reviews.service.ts` (6 errors)
- `search/search.service.ts` (2 errors)
- `wallet/wallet.service.ts` (1 error)
- `proposals/proposals.service.ts` (3 errors)
- `referrals/referrals.service.ts` (4 errors)
- `reports/reports.service.ts` (5 errors)

All modules created/updated by this task (auth, users, bookmarks) compile with **0 errors**.
