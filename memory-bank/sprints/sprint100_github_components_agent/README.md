# Sprint 100 — GitHub Components + PR Video Agent

## Goal
Enable any user to connect GitHub, select repos, auto-index UI components, browse/search them in Bazaar, and instantly generate motion graphics from their own code. Additionally, provide a GitHub App agent that, when mentioned on a PR/issue, replies with a generated video summarizing the change.

## Outcomes
- Reliable, secure GitHub App integration (installation tokens, webhook verification, idempotent processing)
- Fast component discovery with background indexing, robust caching, and fuzzy search
- Smooth UX: browse → drag to chat → animate (or ask via search)
- PR Agent: comment trigger → analyze → render → post video back

## High-Level Architecture
- Auth: NextAuth (login) + GitHub App (repo access)
- Data: `github_connection`, `component_cache`, `component_graph` (new), `webhook_deliveries` (new)
- Services:
  - Octokit Factory (App + user tokens, throttling/retry)
  - Component Indexer (tree scan by sha, parsing/heuristics, cache by blob sha)
  - Search (SQL + trigram/fuzzy over cached components)
  - PR Analyzer (installation token, GraphQL/REST hybrid, idempotent)
  - Changelog Video Queue (existing) + PR Commenter
- Webhooks: Strict signature verify, dedupe via `x-github-delivery`, enqueue jobs only

See `architecture.md` for details and `TODO.md` for task tracking.
