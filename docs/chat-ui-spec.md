# Chat UI specification (RTL / φ)

## Thread layout (RTL)

- Container: `dir="rtl"`, class `chat-thread`
- Sent (me): `chat-thread-row--sent` → `justify-content: flex-start` (visual right)
- Received: `chat-thread-row--received` → `justify-content: flex-end` (visual left)

## Bubble sizing

| Token | Value |
|-------|--------|
| max width | `min(61.8%, 26.25rem)` |
| min width | `4.5rem` |
| padding | `0.618rem × 1rem` |
| group gap | `0.618rem` |
| tight stack | `0.125rem` |

## Text wrap

- Default: `overflow-wrap: break-word`, `word-break: normal`
- Long unbroken runs (spam/URL): `.chat-message-text--unbroken` → `overflow-wrap: anywhere`

## Grouping

- Same sender within 5 minutes → one cluster
- Positions: `single | first | middle | last` → corner radii via `getBubbleRadiusStyle()`

## Gestures

| Platform | Action |
|----------|--------|
| Mobile | Swipe toward visual left (dragX ≤ −56px) → reply |
| Mobile | Long-press 480ms → action sheet |
| Desktop | Hover rail: reply + menu |
| All | Context menu → same actions |

## Message types

TEXT, IMAGE, VOICE, FILE, NEED_CARD, OFFER_CARD, contact share, tombstone (deleted)

## Breakpoints

- Mobile: `<768px` — gestures active, hover rail hidden
- Desktop: `≥768px` — hover rail, no long-press sheet required
