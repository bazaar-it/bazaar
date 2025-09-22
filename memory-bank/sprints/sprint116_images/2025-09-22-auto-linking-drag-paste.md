# 2025-09-22 – Auto-Linking User Library Assets on Drag/Paste

## Context
- Media panel click already links assets, but dragging from the panel or pasting R2 URLs leaves assets unlinked, so guardrail still drops them.
- Chat panel has access to the user-wide library (`getUserUploads`), so we can resolve asset IDs client-side when URLs arrive via drop/paste.
- Need to ensure all entry points (legacy uploads panel, enhanced panel, media panel) stamp drag payloads with asset metadata before they hit chat.

## Tasks
1. Extend upload/media panels to write asset IDs into the drag payload and link on click before inserting into chat.
2. In ChatPanel, detect asset metadata on drop/paste and call `project.linkAssetToProject`; fall back to URL → ID lookup using cached `getUserUploads` data.
3. Debounce duplicate link attempts and handle query-string variants of R2 URLs.
4. Add textarea `onPaste` hook to link assets when users paste R2 links directly.
5. Update memory bank + progress logs after verifying behaviour (suite run blocked in sandbox, note follow-up).

## Risks / Notes
- Drag payload changes must stay backward-compatible for other drop targets; include both JSON and simple string forms.
- Linking mutations are idempotent (unique constraint) but still log on errors; guard with in-flight cache to prevent spam.
- Need to normalize URLs (strip query/hash) to match `getUserUploads` entries.
