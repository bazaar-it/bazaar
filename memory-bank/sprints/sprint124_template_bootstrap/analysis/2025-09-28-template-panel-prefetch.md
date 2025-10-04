# 2025-09-28 – Template Panel Prefetch Plan

## Goal
Ensure the first batch of desktop templates feels instant every time the panel opens by caching the compiled modules ahead of user interaction, while keeping CPU/storage usage in check.

## Strategy Overview
1. **Session cache first**: continue using an in-memory map keyed by `templateId+format` so a template compiles at most once per session.
2. **Warm first page**: as soon as the workspace format is known, trigger the first page (10 templates) of the templates query and compile them in the background. Store the transformed module in both the session cache and `localStorage`.
3. **Lazy fetch on scroll**: keep the current infinite query/scroll system for subsequent pages. When a user triggers the next batch, compile it once and cache just like the first page.
4. **Bounded persistence**: limit the persistent cache to the most recent 30 templates per format. Each entry stores `{hash, compiledCode, meta}` so stale modules expire automatically when `tsxCode` changes.
5. **Idle scheduling**: use `requestIdleCallback` (with a fallback timeout) to compile/cache pages in the background so the CPU spike doesn’t block the initial workspace render.

## Implementation Steps
1. **Caching layer**
   - Create `templateCache.ts` with helpers: `getFromMemory`, `getFromStorage`, `setCache`, `evictLRU`, and `hashTsx(code)`.
   - Cache key format: `${templateId}_${format}`; stored object `{ hash, compiledCode, meta }`.
2. **Prefetch hook**
   - New hook `useTemplatePrefetch(format)` that:
     - Runs once per workspace mount.
     - Calls `templates.getAll` with `{ limit: 10 }`.
     - For each template, pulls from cache if hash matches; otherwise runs the compile pipeline and stores the result.
     - Uses `requestIdleCallback` to avoid blocking initial paint.
3. **TemplatesPanel integration**
   - Panel first checks `getFromMemory`/`getFromStorage` before invoking Sucrase. If a cached compiled module is found, reuse it.
   - Scroll-triggered loads continue to trigger `fetchNextPage`, but once a page finishes compiling the modules are stored for future visits.
4. **Validation & eviction**
   - When loading from cache, compare stored `hash` against `sha1(template.tsxCode)`. If mismatch, discard and recompile.
   - Keep a per-format LRU list capped at 30 entries; remove the oldest when inserting a new item beyond that bound.
5. **Telemetry & fallback**
   - Log cache hits/misses to ensure the prefetched modules actually prevent recompile churn.
   - If `localStorage` throws (quota or private mode), fall back to session-only cache.

## Risks / Mitigations
- **CPU spikes**: compiling 10 templates is manageable; use `requestIdleCallback` for smoothing. Monitor performance on low-end devices.
- **localStorage quota**: capped list + ~50 KB per entry keeps us safely under 5 MB.
- **Stale data**: hash comparison ensures we never reuse outdated code; for safety invalidate the entire cache on major version updates.

## Next Steps
- Implement `templateCache.ts` utilities.
- Add the prefetch hook in `GenerateWorkspaceRoot` (or another early point once format is known).
- Wire the panel to respect the cache before compiling.
- Manual QA: load the workspace, confirm first 10 templates show instantly; reload the workspace to confirm the warm cache path.

