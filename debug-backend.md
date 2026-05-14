# Backend API Route Audit Report

**Project**: `/home/z/my-project` (Next.js 16 + Prisma + SQLite)
**Date**: 2026-05-11
**Status**: Site is partially functional — several routes work at runtime but contain hidden logic bugs, type errors, and missing data.

---

## Live Endpoint Test Results

| # | Endpoint | Method | HTTP | Status | Notes |
|---|----------|--------|------|--------|-------|
| 1 | `/api` | GET | 200 | ✅ OK | Returns `{"message":"Hello, world!"}` |
| 2 | `/api/auth` | POST | 401 | ✅ OK | No user found (expected — no user registered yet) |
| 3 | `/api/auth/otp` | POST | 200 | ✅ OK | Returns demo code `1234` |
| 4 | `/api/auth/verify` | POST | 200 | ✅ OK | Creates user + token; auto-promotes admin phone |
| 5 | `/api/categories` | GET | 200 | ✅ OK | Returns tree with children |
| 6 | `/api/requests` | GET | 200 | ✅ OK | Paginated list with user/category |
| 7 | `/api/requests` | POST | 201 | ⚠️ PARTIAL | Works but response missing `phone` in user object |
| 8 | `/api/specialists` | GET | 200 | ⚠️ PARTIAL | Works but rating/completionRate logic is wrong |
| 9 | `/api/proposals` | GET | 400 | ✅ OK | Requires `requestId` param |
| 10 | `/api/proposals` | POST | 201 | ⚠️ PARTIAL | Works but rating calculation uses wrong relation |
| 11 | `/api/notifications` | GET | 200 | ✅ OK | Paginated + unreadCount |

**Note**: The Next.js 16 Turbopack dev server crashes when it needs to compile >2 routes in quick succession. This is an infrastructure issue affecting development velocity, not a code bug per se.

---

## Bug Report (Ordered by Severity)

### 🔴 CRITICAL

#### C1. Wrong Prisma relation used for specialist rating (`givenReviews` instead of `reviews`)

**File**: `src/app/api/specialists/route.ts`, **Line 135**

```typescript
const reviewRatings = user.givenReviews.map((r) => r.rating);
```

**Problem**: `givenReviews` is the `Review[] @relation("ReviewAuthor")` on User — it represents reviews **authored BY** this user, not reviews **written ABOUT** this user. A specialist's displayed rating is computed from reviews they wrote about other people, not from reviews they received from clients.

**Fix**: Change to `user.reviews`:
```typescript
const reviewRatings = user.reviews.map((r) => r.rating);
```

Also need to add `reviews` to the `include` block (line 103-128). Currently only `givenReviews` and `_count.reviews` are fetched. The `reviews` relation itself needs to be included:
```typescript
reviews: {
  select: { rating: true },
},
```

---

#### C2. Wrong Prisma relation used for proposal user rating in proposals GET

**File**: `src/app/api/proposals/route.ts`, **Line 230**

```typescript
const ratings = p.user.givenReviews.map((r) => r.rating);
```

**Problem**: Same as C1. When displaying proposals, each specialist's rating is computed from reviews **they gave**, not reviews **they received**. Every specialist shows `rating: 0` in practice.

**Fix**: Change to `p.user.reviews` and add `reviews` to the user select in the query include.

---

#### C3. `completionRate` calculation is semantically wrong

**File**: `src/app/api/specialists/route.ts`, **Lines 140-163**

```typescript
const completedProjects = user.sentProposals.length; // accepted proposals
const totalReviews = user._count.reviews;            // reviews received
// ...
completionRate: totalReviews > 0
  ? Math.round((completedProjects / totalReviews) * 100)
  : 0,
```

**Problem**: `completionRate` divides accepted proposals by review count. These are unrelated metrics. A completion rate should be `acceptedProposals / totalProposals` or similar. Currently a specialist with 1 accepted proposal and 2 reviews gets `completionRate: 50%`, which is meaningless.

**Fix**: Track both accepted and total proposals in the query, then:
```typescript
completionRate: totalProposals > 0
  ? Math.round((completedProjects / totalProposals) * 100)
  : 0,
```

---

### 🟠 HIGH

#### H1. POST `/api/requests` response missing `phone` field in user object

**File**: `src/app/api/requests/route.ts`, **Lines 265-274 (POST) vs 125-134 (GET)**

The POST handler's Prisma `include` for `user` does NOT select `phone`:
```typescript
// POST handler (line 265):
user: {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    avatar: true,     // <-- no phone!
    city: true,
    createdAt: true,
  },
},
```

But the `RequestListItem` interface at line 44 requires `phone: string`:
```typescript
user: {
  id: string;
  phone: string;     // <-- required but missing from POST response
  firstName: string;
  lastName: string;
  avatar: string | null;
  city: string | null;
  createdAt: Date;
};
```

**Actual response** (confirmed live):
```json
"user": {"id":"cmp1s4z8s0000nbbd9ls8lpk3","firstName":"","lastName":"","avatar":null,"city":null,"createdAt":"..."}
// phone is MISSING
```

**Fix**: Add `phone: true` to the POST handler's user select.

**TypeScript error confirmed**: `tsc` reports:
```
src/app/api/requests/route.ts(298,7): error TS2741: Property 'phone' is missing in type
```

---

#### H2. Wrong Prisma enum name `EnumServiceRequestStatusFilter` (doesn't exist)

**File**: `src/app/api/requests/route.ts`, **Line 82**

```typescript
where.status = status as Prisma.EnumServiceRequestStatusFilter['equals'];
```

**Problem**: The Prisma enum is `RequestStatus`, so the filter type is `EnumRequestStatusFilter`, not `EnumServiceRequestStatusFilter`.

**TypeScript error confirmed**: `tsc` reports:
```
src/app/api/requests/route.ts(82,39): error TS2724: 'Prisma' has no exported member named 'EnumServiceRequestStatusFilter'. Did you mean 'EnumRequestStatusFilter'?
```

**Fix**: Change to:
```typescript
where.status = status as Prisma.EnumRequestStatusFilter['equals'];
```

Note: This works at runtime with Turbopack because the cast is erased, but it fails strict TypeScript checking and will break if the project ever switches to `tsc` for builds or runs `tsc --noEmit` in CI.

---

#### H3. `User` type from `@/lib/types` incompatible with Prisma User in verify route

**File**: `src/app/api/auth/verify/route.ts`, **Line 4, 132-153**

```typescript
import type { User } from '@/lib/types';
```

The `User` type from `@/lib/types` (line 22-43) has:
- `createdAt: string` (ISO string)
- `email?: string` (optional, undefined when missing)
- `username?: string` (optional)
- etc.

But when building `responseUser`, several fields are force-cast from Prisma types:
```typescript
email: user.email || undefined,     // Prisma: string | null -> Type: string | undefined
username: user.username || undefined, // Prisma: string | null -> Type: string | undefined
createdAt: user.createdAt.toISOString(), // Prisma: Date -> Type: string
```

While this works at runtime, the `User` type is a **client-side type** meant for the frontend store, not for API route responses. If the frontend `User` type changes, it silently breaks the API response contract. Consider creating a dedicated `APIUserResponse` type instead of importing the frontend `User` type.

---

#### H4. `most_projects` sort on specialists uses wrong relation

**File**: `src/app/api/specialists/route.ts`, **Line 86**

```typescript
case 'most_projects':
  orderBy = { requests: { _count: 'desc' } };
  break;
```

**Problem**: `User.requests` is `ServiceRequest[]` — service requests **created by** the user. For a specialist listing, "most projects" should sort by the number of projects they've **completed** (accepted proposals), not the number of requests they've **posted** (which would be zero for most specialists since they're clients' requests).

**Fix**: Use `sentProposals` instead:
```typescript
case 'most_projects':
  orderBy = { sentProposals: { _count: 'desc' } };
  break;
```

---

### 🟡 MEDIUM

#### M1. Insecure password hashing with SHA-256

**File**: `src/app/api/auth/route.ts`, **Lines 36-40**

```typescript
function simpleHash(password: string): string {
  return crypto.createHash('sha256').update(password + '_needfinder_salt').digest('hex');
}
```

**Problem**: SHA-256 with a hardcoded salt is **not** secure password hashing. It's vulnerable to:
- Rainbow table attacks (salt is hardcoded in source code)
- Brute force (SHA-256 is too fast for password hashing)

**Fix**: Use `bcrypt` or `argon2`:
```typescript
import bcrypt from 'bcrypt';
const hashedPassword = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(password, user.password);
```

---

#### M2. `createSlug()` strips Persian characters incorrectly

**File**: `src/lib/auth.ts`, **Lines 95-103**

```typescript
export function createSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

**Problem**: While the regex `[^\u0600-\u06FFa-z0-9-]` preserves Persian Unicode range `\u0600-\u06FF`, it **strips ALL Latin characters** outside a-z0-9 (like accented chars). More importantly, for a title like "طراحی وب‌سایت", the ZWNJ (zero-width non-joiner, `\u200C`) used in Persian text will be stripped, causing words to merge incorrectly. This creates meaningless slugs for Persian content.

**Impact**: Persian titles produce garbled slugs (confirmed: `"test"` slug was created for a Persian title).

---

#### M3. Hardcoded admin phone number

**File**: `src/app/api/auth/verify/route.ts`, **Line 69**

```typescript
const isAdmin = phone === '09374333028';
```

**Problem**: Admin role is determined by a hardcoded phone number in the source code. This is:
- A security risk (anyone who reads the source knows the admin number)
- Not configurable (requires code change to add/remove admins)
- Not scalable (can't have multiple admins)

**Fix**: Use a database flag or environment variable for admin promotion.

---

#### M4. No token expiration cleanup mechanism

**Files**: `src/app/api/auth/route.ts` (line 111-118), `src/app/api/auth/verify/route.ts` (line 115-123)

**Problem**: Auth tokens are created with 30-day expiry but there's no background job or cron to clean up expired tokens. Only `getAuthUser()` deletes expired tokens on lookup (one at a time). Over time, the `AuthToken` table will grow unbounded with expired tokens.

**Fix**: Add a periodic cleanup or use a Prisma middleware. Alternatively, use a TTL approach.

---

#### M5. Rate limiting is in-memory only and per-process

**File**: `src/app/api/auth/otp/route.ts`, **Lines 8-11**

```typescript
const otpAttempts = new Map<string, { count: number; lastAttempt: number }>();
```

**Problem**: Rate limiting uses an in-memory `Map` that:
- Is lost on server restart
- Doesn't work across multiple server instances
- Doesn't work in serverless environments (each invocation gets a fresh Map)

---

#### M6. `notification.data` JSON.parse can throw at runtime

**File**: `src/app/api/notifications/route.ts`, **Line 61**

```typescript
data: JSON.parse(n.data),
```

**Problem**: If `n.data` ever contains invalid JSON (due to a bug in notification creation, manual DB edit, or migration), `JSON.parse` will throw and the entire notifications endpoint will return a 500 error for ALL notifications.

**Fix**: Wrap in try-catch:
```typescript
data: (() => { try { return JSON.parse(n.data); } catch { return {}; } })(),
```

---

#### M7. `serviceRequest.tags` JSON.parse can throw at runtime

**Files**: `src/app/api/requests/route.ts`, **Lines 155, 292**

```typescript
tags: JSON.parse(r.tags),
```

Same issue as M6. If `tags` column contains malformed JSON, the entire requests endpoint crashes.

---

### 🟢 LOW

#### L1. OTP code is always `1234` in demo mode

**File**: `src/app/api/auth/otp/route.ts`, **Line 71**

```typescript
const otpCode = DEMO_OTP_CODE; // always '1234'
```

**Problem**: The `generateOtpCode()` function in `auth.ts` exists but is never used. The demo code is hardcoded. If deployed to staging or pre-production, the OTP is always guessable.

---

#### L2. Auth route imports `getAuthUser` but never uses it

**File**: `src/app/api/auth/route.ts`, **Line 5**

```typescript
import { getAuthUser } from '@/lib/auth';
```

**Problem**: `getAuthUser` is imported but not used anywhere in this file. Dead import.

---

#### L3. `PaginatedResponse` import unused in requests route

**File**: `src/app/api/requests/route.ts`, **Line 3**

```typescript
import { getAuthUser, createSlug, type PaginatedResponse } from '@/lib/auth';
```

`PaginatedResponse` is used (line 166), but `getAuthUser` is used only in the POST handler. This is fine — just noting for completeness.

---

#### L4. `AuthResponseBody` dates as `Date` objects (not serialized)

**File**: `src/app/api/auth/route.ts`, **Line 131**

```typescript
createdAt: user.createdAt,  // Date object
```

**Problem**: `NextResponse.json()` does serialize `Date` objects to ISO strings automatically, but the TypeScript type says `createdAt: Date` while the actual JSON response contains an ISO string. This is a type mismatch between the declared interface and the actual wire format.

---

#### L5. Proposal POST doesn't verify user is a SPECIALIST

**File**: `src/app/api/proposals/route.ts`, **Lines 41-49**

**Problem**: Anyone with a valid auth token can submit a proposal, including CLIENT-role users. While not necessarily wrong (clients might want to collaborate), typically only specialists should be allowed to propose.

---

#### L6. No `DELETE` method on any route

**Problem**: None of the API routes implement DELETE. Users cannot delete their requests, proposals, or account. Proposals have a `WITHDRAWN` status but no endpoint to set it.

---

#### L7. Category `icon` field stores Lucide icon names (strings) not emoji

**Files**: `src/lib/constants.ts` uses emoji icons (`'💻'`), but the actual database categories store Lucide icon names (`'Globe'`, `'Smartphone'`). The constants file and database are out of sync. If the frontend uses constants for fallback, the icons won't match.

---

## Summary Table

| Severity | Count | IDs |
|----------|-------|-----|
| 🔴 Critical | 3 | C1, C2, C3 |
| 🟠 High | 4 | H1, H2, H3, H4 |
| 🟡 Medium | 7 | M1–M7 |
| 🟢 Low | 7 | L1–L7 |
| **Total** | **21** | |

## Recommended Priority Fixes

1. **C1 + C2**: Fix `givenReviews` → `reviews` in both specialists and proposals routes (directly affects data correctness)
2. **H1**: Add `phone: true` to POST `/api/requests` user select
3. **H2**: Fix `EnumServiceRequestStatusFilter` → `EnumRequestStatusFilter`
4. **H3**: Fix `most_projects` sort to use `sentProposals` instead of `requests`
5. **M1**: Replace SHA-256 hashing with bcrypt
6. **M6 + M7**: Wrap JSON.parse calls in try-catch
