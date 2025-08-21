# TODO — Sprint 100

## Phase A — Hardening (Security + Correctness)
- [ ] Enforce webhook signature (remove bypass), add UA check
- [ ] Create `webhook_deliveries` table and dedupe
- [ ] Add `@octokit/app`, client factory with throttling/retry
- [ ] Switch PR analyzer to installation tokens
- [ ] Extend `src/env.js` with GitHub App vars validation
- [ ] Stop logging secrets; sanitize logs

## Phase B — Indexing & Search
- [ ] Add `component_graph` table (imports/relations)
- [ ] Update indexer to use commit sha + `git.getBlob`
- [ ] Handle `tree.truncated` by walking directories
- [ ] Cache by `blob_sha`; reconcile on new head
- [ ] Add fuzzy search (trigram) and filters
- [ ] Background jobs for index/update

## Phase C — UX & Generation
- [ ] GitHub Components panel: fast search, categories, DnD payload `{repo, path, sha, name}`
- [ ] Flow to fetch source by sha and animate
- [ ] Error surfaces (rate limits, private repos) with actionable UI

## Phase D — PR Agent
- [ ] Webhook path handles comment trigger end-to-end
- [ ] Analysis → queue → render → comment back with video URL
- [ ] Idempotency keys (repo, pr, comment id)

## Phase E — Compliance
- [ ] Encrypt tokens at rest
- [ ] Add monitoring/alerts for rate limit/abuse
