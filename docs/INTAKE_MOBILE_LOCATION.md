# فاز ۲۸ — موبایل: Location

## هدف

کاهش اسکرول مرحله مکان با bottom sheet دسته، modal شهر، chips محله، نقشه fullscreen، و shard bar جمع‌شونده.

## ۱۰ بخش

| # | کار | خروجی |
|---|-----|--------|
| ۲۸.۱ | دسته bottom sheet | `intake-mobile-category-sheet` |
| ۲۸.۲ | شهر modal | `intake-mobile-city-modal` |
| ۲۸.۳ | محله chips | `IntakeMobileNeighborhoodChips` |
| ۲۸.۴ | نقشه fullscreen | `intake-map-pin-fullscreen` |
| ۲۸.۵ | فیلترها accordion | `intake-category-filters--mobile` |
| ۲۸.۶ | shard bar collapsed | `IntakeMobileShardBar` |
| ۲۸.۷ | GPS دکمه بزرگ | `IntakeMobileGpsButton` |
| ۲۸.۸ | املاک مشهد + pin | `assessMashhadEstatePinGate` |
| ۲۸.۹ | خدمات بدون pin | `assessServicesPublishWithoutPin` |
| ۲۸.۱۰ | scroll depth −۵۰٪ | `meetsLocationScrollTarget` |

## تست

```bash
npm run test:mobile-location
npm run verify:intake-phase -- --phase 28
```
