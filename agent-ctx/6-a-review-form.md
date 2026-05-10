# Task 6-a: ReviewForm Component

## Status: ✅ Completed

## Summary
Created `/home/z/my-project/src/components/specialists/ReviewForm.tsx` — a comprehensive star-rating + comment submission form for reviewing specialists after project completion on the NeedFinder Persian marketplace platform.

## What Was Built

### Component: `ReviewForm.tsx`
A `'use client'` component with three sub-components:

1. **`InteractiveStarRating`** — Reusable star rating with:
   - Half-star support (click left/right half of a star)
   - Hover preview with amber glow effect (`drop-shadow`)
   - Keyboard navigation (arrow keys, Enter, Space)
   - ARIA labels in Persian
   - Uses `Star`, `StarHalf` from lucide-react

2. **`ConfettiEffect`** — Celebration animation with:
   - 16 emoji particles (🎉⭐✨🎊💫🌟👏🥳)
   - Staggered Framer Motion animations
   - Random positions and rotation

3. **`SuccessState`** — Post-submission thank-you card with:
   - Animated green checkmark (spring animation)
   - Confetti overlay
   - Overall rating display with stars
   - "بازگشت" (Go back) button

4. **`ReviewForm`** (default export) — Main form with:
   - **Overall rating display** — Auto-calculated average of 4 categories, large number + stars in emerald card
   - **4 rating categories** (staggered slide-in animations):
     - کیفیت کار (Work Quality)
     - رعایت زمان‌بندی (Timeliness)
     - ارتباط و پاسخگویی (Communication)
     - حرفه‌ای بودن (Professionalism)
   - **Comment textarea** — Min 20 / Max 2000 chars with live counter and color feedback
   - **Pros input** (نقاط قوت) — Max 500 chars with ThumbsUp icon
   - **Cons input** (نقاط ضعف) — Max 500 chars with ThumbsDown icon
   - **Recommended toggle** (Switch) — "آیا این متخصص را پیشنهاد می‌دهید؟"
   - **Submit button** — Loading spinner, disabled state when form invalid
   - **Validation** — AnimatePresence for error messages
   - **Success flow** — Simulated API call → toast notification → success state → navigation back

### Technical Details
- **RTL layout** with `dir="rtl"` on text inputs
- **All text in Persian (Farsi)**
- **shadcn/ui components**: Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Textarea, Label, Badge, Separator, Switch
- **lucide-react icons**: Star, StarHalf, Send, CheckCircle2, ThumbsUp, ThumbsDown, MessageSquare, ChevronLeft
- **Framer Motion**: Staggered category animations, spring checkmark, confetti particles, AnimatePresence for errors
- **Sonner toast**: `toast.success('نظر شما با موفقیت ثبت شد')`
- **Zustand store**: `useAppStore` for `navigateTo`, `goBack`, `viewParams` (specialist ID)
- **Emerald color theme** throughout
- **Lint**: ✅ Passes (0 errors, 0 warnings)
