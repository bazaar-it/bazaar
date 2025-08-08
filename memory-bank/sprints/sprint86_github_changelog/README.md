# GitHub Changelog Videos — Sprint 86

Purpose: turn merged PRs into short, on‑brand motion-graphic videos and publish them to a changelog page, with a smooth GitHub App flow. This doc captures the most useful, generic insights so far.

## MVP Scope (2 weeks)
- Trigger: GitHub App webhook on PR merged (optionally label `changelog`)
- Analyze: PR summary, files, commits, type (feature/fix/etc.), impact, highlights
- Storyboard: 20–40s, 3–6 bullets, category, CTA; auto brand detection
- Render: Remotion `ChangelogVideo` composition → R2; square + landscape
- Publish: Save `changelog_entries`; PR comment with links + embed; simple `/changelog/[owner]/[repo]` page

## Architecture (high level)
- Ingest: `POST /api/webhooks/github` (verify signature; idempotent)
- Analyze: Octokit (installation token) → PR details/files/commits → heuristics
- Brand: repo-based detection + optional `.github/bazaar.json`
- Plan: `Storyboard` JSON (contract below)
- Generate: template mapping → Remotion render (Lambda preferred) → R2
- Persist: `changelog_entries` row; status lifecycle (queued → processing → completed/failed)
- Distribute: PR comment, public changelog page, optional badge/embed

## Data Model (Drizzle)
- `changelog_entries`: prNumber, repo info, title, desc, type, author, videoUrl, thumbnailUrl, gifUrl, duration, format, status, jobId, error, stats, version, mergedAt, processedAt, viewCount
- Add unique index: `(repository_full_name, pr_number)` to enforce idempotency

## Security & Reliability (must-have)
- Webhook: HMAC SHA-256 verify using timing-safe comparison
- Auth: GitHub App installation tokens (not PAT) for private repos
- Idempotency: dedupe on repo+PR; safe retries; job status checks
- Limits: per-org rate limits; skip giant PRs or truncate analysis; backoff + caps
- Secrets: encrypted env vars; never log secrets; minimal scopes

## Metrics & Ops
- Lead time: merge → video published (< 2 min goal)
- Success rate; failure reasons; average video duration; queue depth
- Cost per video (LLM + render); throttling when above threshold

## Pricing & Quotas (draft)
- 1 video = N credits; bundle with plan tiers
- Free tier: 3 videos/month, watermark + link; paid removes watermark

## Public UI
- `/changelog/[owner]/[repo]`: list/filter, play hosted R2 video, copy embed; SEO-friendly
- Badge: `https://bazaar.video/badge/{owner}/{repo}` → recent video/CTA

## Risks & Mitigations
- Extremely large PRs: sample top N files; trim patches; cap token usage
- Brand detection wrong: allow `.github/bazaar.json` override + web UI brand kit
- Render latency/cost: precompile compositions, cache assets, Lambda concurrency caps

## Storyboard Contract (short)
```json
{
  "title": "Faster exports with smarter caching",
  "category": "performance",
  "bullets": [
    "60% faster first render",
    "1-hour composition cache",
    "Auto-download when complete"
  ],
  "highlights": [
    {"label": "Render service", "path": "src/server/services/render/render.service.ts"}
  ],
  "cta": "Try export in the header",
  "durationSec": 30,
  "theme": {"format": "square", "style": "branded"}
}
```

## Implementation Notes (delta vs current code)
- Use installation tokens in analyzer (derive installation ID from webhook headers → exchange using app id/private key)
- Replace string equality with `timingSafeEqual` in signature verify
- Implement queue processor to render + update DB + PR comment
- Create minimal Remotion `ChangelogVideo` and a storyboard→props mapper
- Add `/changelog` route; no tRPC needed for public listing (server component + Drizzle)

## Success Criteria
- PR merge → video link comment in ≤2 min
- Changelog page lists entry with video + metadata
- 0 duplicates per PR; safe retries; clear error states
