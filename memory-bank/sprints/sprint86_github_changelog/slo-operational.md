# SLO & Operational Targets

## End-to-end SLO
- Goal: 3–4 minutes from trigger to PR comment with video link.

## Budget per stage
- Analysis: < 30s (diff fetch + LLM)
- Render: 90–120s (pre-warmed Lambda; cached assets)
- Upload & post: < 30s

## Performance tactics
- Pre-warm Lambda; cache fonts/assets; reuse compiled Remotion bundles.
- Concurrency caps; per-org rate limits; exponential backoff.
- Idempotency keys: repo+PR+trigger.
