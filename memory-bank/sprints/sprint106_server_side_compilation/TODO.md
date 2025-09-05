# Sprint 106 - TODO

## Day 1: Minimal server-side pipeline
- [ ] Create compile service: TSX → JS (Sucrase/Babel), enforce default export, return code string
- [ ] Storage adapter: upload compiled JS to R2, return versioned `outputUrl`
- [ ] Update generation flow (create/edit): run compile + upload, persist `outputUrl` on `customComponentJobs`
- [ ] API route stays minimal (export default + cache) – verify with a live job
- [ ] Preview placeholder: show "Building scene…" until `outputUrl` is set

## Week 1: Adopt everywhere
- [ ] Remove client-side compilation paths in `PreviewPanelG` and `CodePanelG`
- [ ] Make preview import strictly use `useRemoteComponent(outputUrl)`
- [ ] Backfill: background job to compile legacy scenes missing `outputUrl`
- [ ] Add cache revalidation policy (ETag/If-None-Match) for component API
- [ ] Instrument logs: "Using default export", import duration, cache hit/miss

## Realtime + UX
- [ ] tRPC WS subscription: emit build progress (pending → building → complete/error)
- [ ] UI progress indicator tied to job status in Generate workspace

## Validation & Safety
- [ ] Zod validate scene TSX input before compile; hard block disallowed patterns
- [ ] Compile error handling: keep last good `outputUrl`, surface readable error

## Testing
- [ ] Unit: compile service (valid TSX → JS), error cases
- [ ] Integration: create/edit → build → import success path
- [ ] Integration: broken TSX → error surfaced, last good renders
- [ ] Perf: cache headers reduce repeat load time

## Documentation
- [ ] Update architecture diagrams and memory-bank docs to the new flow
- [ ] Add a runbook: handling failed compiles, cache invalidation, backfill script
