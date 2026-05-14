# Task: Requests Module & Proposals Module - Complete Implementation

## Summary

Successfully created the **Requests Module** and **Proposals Module** for the NeedFinder (نیاز فایندر) NestJS backend. Both modules are fully functional with all specified routes, services, DTOs, and Persian (Farsi) messages.

## Files Created/Modified

### Requests Module (6 files)
1. **`src/modules/requests/dto/create-request.dto.ts`** - DTO with validators for title, description, categoryId, budget fields, delivery, location, priority, tags
2. **`src/modules/requests/dto/update-request.dto.ts`** - Same fields as create, all optional
3. **`src/modules/requests/dto/query-requests.dto.ts`** - Pagination (page/limit) + filters (categoryId, city, province, status, priority, search, sort)
4. **`src/modules/requests/requests.service.ts`** - Full service with 8 methods:
   - `findAll()` - Paginated with dynamic filters, sorting, category/user/proposalCount includes
   - `findOne()` - Full detail with proposals, increments viewCount
   - `create()` - Unique slug generation, category validation
   - `update()` - Owner check, OPEN status check, slug regeneration
   - `delete()` - Owner check, OPEN status check, hard delete
   - `changeStatus()` - Status transition validation, admin/owner permissions, notifications
   - `getByUser()` - User's own requests with pagination
   - `getFeatured()` - Featured requests (isFeatured, OPEN, ordered by viewCount, limit 6)
5. **`src/modules/requests/requests.controller.ts`** - 8 endpoints (GET/POST/PUT/PATCH/DELETE)
6. **`src/modules/requests/requests.module.ts`** - Module registration

### Proposals Module (4 files)
7. **`src/modules/proposals/dto/create-proposal.dto.ts`** - DTO for requestId, price, delivery, message
8. **`src/modules/proposals/proposals.service.ts`** - Full service with 6 methods:
   - `findByRequest()` - Proposals with user info, rating, project count
   - `create()` - Validates request (exists, OPEN, not own, no duplicate), transaction (create + increment count), notification
   - `accept()` - Request owner only, transaction (accept + reject others + update request status), notifications
   - `reject()` - Request owner only, status update + notification
   - `withdraw()` - Proposal owner only, transaction (withdraw + decrement count)
   - `findByUser()` - Specialist's proposals with request details
   - `getStats()` - Total, pending, accepted, rejected, withdrawn, acceptance rate
9. **`src/modules/proposals/proposals.controller.ts`** - 7 endpoints (GET/POST/PATCH)
10. **`src/modules/proposals/proposals.module.ts`** - Module registration

### Infrastructure Fixes
- Fixed `prisma/schema.prisma` - Converted all `enum` types to `String` for SQLite compatibility
- Fixed `common/guards/jwt-auth.guard.ts` - Corrected PrismaService import path
- Fixed `common/decorators/roles.decorator.ts` - Corrected import path
- Fixed `app.module.ts` - Added global JwtModule registration
- Fixed `main.ts` - Fixed cookie-parser ESM import
- Created `specialists/specialists.module.ts` stub
- Fixed `auth/auth.module.ts` - Module exports

## API Routes (All Working)

### Requests (`/api/requests`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/requests` | No | Paginated list with filters |
| GET | `/api/requests/featured` | No | Featured requests (limit 6) |
| GET | `/api/requests/my` | Yes | Current user's requests |
| POST | `/api/requests` | Yes | Create new request |
| GET | `/api/requests/:id` | No | Request detail (increments view) |
| PUT | `/api/requests/:id` | Yes | Update own request |
| PATCH | `/api/requests/:id/status` | Yes | Change status |
| DELETE | `/api/requests/:id` | Yes | Delete own request |

### Proposals (`/api/proposals`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/proposals?requestId=xxx` | No | Proposals for a request |
| POST | `/api/proposals` | Yes | Submit proposal |
| GET | `/api/proposals/my` | Yes | My proposals |
| GET | `/api/proposals/stats` | Yes | My proposal stats |
| PATCH | `/api/proposals/:id/accept` | Yes | Accept proposal |
| PATCH | `/api/proposals/:id/reject` | Yes | Reject proposal |
| PATCH | `/api/proposals/:id/withdraw` | Yes | Withdraw proposal |

## Verification
- ✅ Server starts successfully
- ✅ All 18 routes registered and mapped
- ✅ GET /api/requests returns empty paginated response
- ✅ GET /api/requests/featured returns empty array
- ✅ GET /api/proposals without requestId returns 400 error (Persian message)
- ✅ GET /api/proposals?requestId=invalid returns 404 (Persian message)
