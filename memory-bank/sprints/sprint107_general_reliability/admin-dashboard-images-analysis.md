# Admin Dashboard Image Count Audit (2025-09-29)

## Problem Statement
Admin user detail view reports inflated image totals (e.g., 261 images) even when users only upload a handful of assets. The metric currently sums `jsonb_array_length(message.image_urls)` which counts every image reference in chat history, including duplicates and assistant/system messages, rather than persistent uploads.

## Key Findings
- `src/server/api/routers/admin.ts:getUserDetails` derives `totalImagesUploaded` by summing message attachment arrays.
- Message attachments include repeated references and assistant-generated assets, causing totals to grow far beyond the number of unique uploads.
- Actual source of truth for uploads is the `asset` table (`type = 'image'`, `deleted_at IS NULL`). Example: user `3f49d799-7cff-49dc-9cd7-901e98bbac64` shows only **7** live image assets versus **261** reported in the dashboard snapshot.
- Timeline endpoint (`getUserActivityTimeline`) counts prompts with image payloads; this is still useful for activity graphs but should be labeled clearly to avoid confusion.

## Proposed Fix
1. Switch the headline "Images" metric to count unique active assets per user via the `asset` table.
2. Expose both `totalImagesUploaded` (asset count) and `promptsWithImages` (chat activity) so UI can differentiate uploads vs. usage.
3. Ensure per-project metrics optionally surface asset counts if needed.
4. Validate against production database (read-only) before releasing.

## Verification Plan
- Query prod Neon (`bazaar-vid_asset`) to confirm counts align with new SQL.
- Load admin dashboard locally (or via storybook mock) and verify card now shows asset total (expect single digits for the affected user).
- Spot-check other metrics (projects, scenes, prompts) to confirm unchanged.

