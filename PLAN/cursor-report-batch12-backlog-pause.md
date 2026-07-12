## PAUSE LOOP — بعد از Batch 11

Claude paused: ادامهٔ batchهای extractor قبل از فیکس dual-pipeline / stale soft-fill توصیه نمی‌شود.

### انجام‌شده این نشست (۷–۱۱)
| Batch | موضوع | نتیجه |
|-------|--------|--------|
| 7 | user override soft-fill | PASS |
| 8 | rent→buy schema | PASS |
| 9 | پیش‌فروش vs rent-history | PASS |
| 10 | buy→rent correction | PASS |
| 11 | last-intent + budget ranges | PASS |

Suite: **100/100** · batch10/11 self-tests **15/15**

### Backlog اولویت‌دار (Claude)
1. **critical** — stale smartResult / abort race
2. **critical** — dual pipeline merge (smart 300ms vs intelligence 500ms)
3. API rate-limit / body cap / `useAI` default
4. neighborhood soft-fill gaps
5. `area` answered از city alone
6. dealType soft-fill bypass recompute
7. magnitude BUY/RENT خارج از RE
8. fragile billion/million unit detect

Deploy/merge ممنوع تا دستور صریح.
