# Architecture — GitHub Components + PR Agent

## 1) GitHub Integration (Secure, Scalable)
- Use GitHub App for repo access:
  - Installation token per repo/org via `@octokit/app`
  - Octokit with `@octokit/plugin-throttling` + `@octokit/plugin-retry`
- Webhook `/api/webhooks/github`:
  - HMAC SHA-256 verification (no bypass)
  - Enforce `User-Agent: GitHub-Hookshot/*`
  - Store `x-github-delivery` in `webhook_deliveries` for 48h to dedupe
  - Extract `installation.id` → exchange installation token per job

## 2) Component Indexing Pipeline
- Triggered by user "Select repositories" or webhook `push` events
- Steps:
  1. Resolve default branch → commit `sha`
  2. Walk tree via `git.getTree(recursive=1)`, handle `truncated` by paging directories
  3. Filter files: `**/*.{tsx,jsx,ts,js,vue,svelte}` (configurable)
  4. For each blob:
     - Fetch via `git.getBlob(sha)` (fast, single call per blob)
     - Derive `language` from ext; parse lightweight (regex + heuristics)
     - Compute `blob_sha` and `file_hash`, store raw content optionally
     - Extract features: component name(s), export style, props, imports count, lines, categories
  5. Persist to `component_cache` (by `repo, path, blob_sha`) + `component_graph` (imports/relations)
  6. Upsert `style_profile` (colors, fonts, spacing) if detectable
- Reconciliation:
  - On new head `sha`, only process new/changed blob shas
  - TTL-based cleanup; keep latest N revisions

## 3) Search & Browse
- Backed by Postgres (Drizzle). Add trigram/fuzzy index on `component_name`, `path`
- API: query by name/category/path; filters (framework, size, dir)
- UI: panel groups (core/auth/commerce/interactive/content/custom) with fast typeahead
- Drag-and-drop data payload contains `{repo, path, sha, name}`

## 4) Generate Motion Graphics from User Components
- On drop or search intent:
  - Fetch source by `blob_sha` (immutable)
  - Provide to Code Generator with context (framework, props, related files)
  - Produce Remotion scene snippet bound to real component data
  - Auto-fix loop if compile fails (existing system)

## 5) PR/Issue Video Agent
- Trigger: comment mentioning app ("@bazaar changelog" or similar)
- Flow:
  1. Webhook receives `issue_comment` or `pull_request`
  2. Verify + dedupe; resolve installation token
  3. Analyze PR: files, commits, stats; detect tech stack; classify change
  4. Generate video via existing queue; store job => URL
  5. Comment back on PR with video link + summary
- Idempotency: (repo, pr_number, comment_id) unique

## 6) Reliability & Limits
- Throttling: Octokit plugins with sensible backoff, jitter, and logging
- Pagination: use `octokit.paginate` universally
- Caching: ETags, `If-None-Match` when fetching contents; prefer `git.getBlob`
- Observability: structured logs with requestId; optional Slack webhook

## 7) Security
- Encrypt OAuth tokens at rest (libsodium/KMS)
- Minimize scopes; prefer installation tokens
- Redact secrets from logs; strict Zod env validation
