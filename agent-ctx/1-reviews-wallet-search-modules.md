# Task: Reviews, Wallet, Search Modules for NeedFinder Backend

## Status: ✅ Completed

## Files Created

### Reviews Module (5 files)
- `src/modules/reviews/reviews.module.ts` — Module registration
- `src/modules/reviews/reviews.service.ts` — Full CRUD + business logic
- `src/modules/reviews/reviews.controller.ts` — 5 endpoints with Swagger decorators
- `src/modules/reviews/dto/create-review.dto.ts` — Validation for 11 fields
- `src/modules/reviews/dto/respond-review.dto.ts` — Response validation

### Wallet Module (6 files)
- `src/modules/wallet/wallet.module.ts` — Module registration
- `src/modules/wallet/wallet.service.ts` — Wallet ops with Prisma transactions
- `src/modules/wallet/wallet.controller.ts` — 5 endpoints, all guarded
- `src/modules/wallet/dto/charge.dto.ts` — Min 10,000 Rial
- `src/modules/wallet/dto/withdraw.dto.ts` — Min 50,000 Rial
- `src/modules/wallet/dto/query-transactions.dto.ts` — Filtered pagination

### Search Module (3 files)
- `src/modules/search/search.module.ts` — Module registration
- `src/modules/search/search.service.ts` — Global search across requests/specialists/categories
- `src/modules/search/search.controller.ts` — Public GET /search endpoint

## Key Implementation Details

### Reviews
- **Duplicate check**: Prevents multiple reviews for same request by same author
- **Self-review prevention**: Validates author ≠ reviewed user
- **Auto rating**: Calculates overall from category ratings (quality, timing, communication, professionalism)
- **Response**: Only reviewed user can respond to a review
- **Delete**: Author or admin/SUPER_ADMIN only

### Wallet
- **Prisma transactions**: Used for charge, withdraw, and transfer operations
- **Charge**: Simulated — immediately COMPLETED, balance incremented
- **Withdraw**: PENDING status, balance decremented, frozen amount incremented
- **Transfer**: Validates recipient, uses $transaction for atomic debit/credit
- **Auto-create wallet**: Wallet created on first access if missing

### Search
- **Grouped results**: Returns {requests, specialists, categories} with counts
- **Max 10 per group**: Efficient pagination
- **Skills search**: Searches specialist skills via relation
- **Average rating**: Attached to specialist search results via groupBy
- **Status filter**: Only OPEN/IN_PROGRESS requests shown

## Notes
- All user-facing messages in Persian (Farsi)
- Swagger decorators on all endpoints
- Prisma namespace type imports removed (SQLite enum compatibility issue with Prisma 5.22.0)
- No TypeScript compilation errors in created modules
- Modules already imported in `app.module.ts`
