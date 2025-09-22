# UI Options – Bulk Personalization Entry Point

## Context
We need a UX surface where users who have finished a master demo can feed 50–500 prospect brands and trigger variant generation. Candidates:
1. New dedicated page / route ("Personalize" workspace).
2. Panel inside the existing `/projects/[id]/generate` workspace.
3. Modal/wizard launched from the workspace but hosted elsewhere.

## Option A – Dedicated Page (`/projects/[id]/personalize`)
**Pros**
- Clean separation from creative chat UI; reduces risk of accidental edits during bulk setup.
- Room for data-heavy components (CSV uploader, table of prospects, status timeline) without crowding existing layout.
- Easier to gate behind feature flag / pricing tier.
- Allows eventual automation features (email outreach, analytics) without coupling to generation workspace lifecycle.

**Cons**
- Requires new navigation entry + permissions; need to maintain route-level auth.
- Context switching: user leaves the editor; we must provide summary of master video (preview thumbnail, duration) in the new view.
- Slightly more routing complexity for share/links (e.g., `batchId`).

**Best fit when**: treating personalization as a distinct workflow targeting ops/sales personas.

## Option B – Additional Panel in `/generate` Workspace
**Pros**
- Leveraging existing layout (tab or right-hand drawer) keeps users in one place.
- Can share Zustand stores for project data.
- Lower routing overhead.

**Cons**
- Workspace already dense (chat, preview, templates). Adding a bulk panel risks clutter.
- Large data table + upload UI tough to squeeze into existing panels.
- Harder to tailor UX for B2B ops (batch history, analytics). Might require conditional UI toggles.
- Requires careful state isolation to avoid interfering with live preview.

**Best fit when**: personalization is a minor add-on for power users who stay in the editor.

## Option C – Wizard Modal / Slide-in
**Pros**
- No route changes; launch from CTA ("Personalize for clients").
- Focused three-step flow (upload list → validate → confirm run).

**Cons**
- Modals ill-suited for long-running processes; limited real estate for batch logs.
- Hard to revisit progress once modal closes.

**Best fit when**: quick-start experience for small batches (<20 targets) with minimal monitoring.

## Recommendation
Start with **Option A – dedicated page**:
- Gives us freedom to design data-first controls (table, filters, status chips, download buttons).
- Avoids tangling with existing chat/preview state.
- Plays nicely with future features (batch history per team, billing counters, outreach automation).
- We can still add a CTA inside the workspace that routes users to `/projects/[id]/personalize` with the current project preselected.

### Additional Considerations
- Provide summary card on the new page showing the current master project title, last updated time, preview GIF, and guard that the master project scenes are tokenized.
- Store batches in `bulk_personalization_batches` table keyed by `projectId`; UI fetches via new API route.
- Offer multi-step wizard inside the dedicated page (tabs or in-page steps).

## Next Steps
1. Wireframe dedicated page layout (hero summary, list, upload area, progress feed).
2. Add route skeleton in Next.js (behind feature flag).
3. Implement navigation entry (button in workspace header -> `router.push`).
4. After MVP, evaluate whether a compact modal entrypoint is useful for quick tests.
