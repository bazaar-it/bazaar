# API Contracts — GitHub Components + PR Agent

## tRPC Routers

### githubRouter
- getConnection(): { isConnected, username?, repoCount?, repositories[], selectedRepos[], connectedAt? }
- updateSelectedRepos({ repositories: string[] }): { success: boolean, count: number }
- listRepos({ cursor?: string, perPage?: number }): { repos: { fullName, private, updatedAt }[], nextCursor?: string }
- startIndexing({ repository: string }): { jobId: string }
- getIndexStatus({ repository: string }): { status: 'queued'|'running'|'complete'|'error', updatedAt: string }

### githubComponentsRouter (new)
- search({ q: string, repo?: string, category?: string, limit?: number }): Array<{
  id, name, repo, path, sha, language, score, category, lineCount, importCount
}>
- getById({ id: string }): {
  id, repo, path, sha, name, language, content?, props?, relations?: Array<{ toId, kind }>
}
- listByRepo({ repo: string, category?: string, cursor?: string }): {
  items: Array<{ id, name, path, sha, category, score }>, nextCursor?: string
}

## Webhooks
- POST /api/webhooks/github
  - Verify HMAC SHA-256 with `GITHUB_WEBHOOK_SECRET` (no bypass)
  - Check `User-Agent` prefix `GitHub-Hookshot/`
  - Dedupe via `x-github-delivery`
  - Events:
    - issue_comment: if mentions app + on PR → enqueue PR video job
    - pull_request: (optional) on closed+merged → enqueue (if enabled)

## Background Jobs
- component-index: inputs { installationId, repo, headSha }
  - Outputs to `component_cache`, `component_graph`; updates `github_connection.style_profile`
- pr-video: inputs { installationId, owner, repo, prNumber }
  - Produces R2 URL; writes PR comment with link

## DB (Drizzle)
- webhook_deliveries(id, deliveryId unique, receivedAt, event, repo)
- component_graph(id, repo, fromId, toId, kind enum('import','re-export','style','asset'))
- Add GIN/trigram index on component_cache.component_name and .file_path
