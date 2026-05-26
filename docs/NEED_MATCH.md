# Need match — rule-based business ranking

## Overview

When a need is published, [`rank-businesses.ts`](../src/lib/need-match/rank-businesses.ts) finds candidate businesses and scores them deterministically:

- Category slug overlap
- Same city / province
- Address / neighborhood proximity
- Keyword overlap in title/description

No LLM re-ranking. Results exposed via `GET /api/requests/[id]/matched-businesses`.

## API response meta

```json
{
  "meta": {
    "source": "rules",
    "engine": "internal",
    "candidateCount": 12
  }
}
```

## Related

- [`candidate-query.ts`](../src/lib/need-match/candidate-query.ts) — SQL + rule scoring
- [`brief-summary.ts`](../src/lib/need-match/brief-summary.ts) — short Persian summary for UI
