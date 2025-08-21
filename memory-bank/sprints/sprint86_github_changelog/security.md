# Security & Auth — GitHub Changelog

## Webhook Verification
- Use `x-github-signature-256` HMAC SHA-256 over raw body with `GITHUB_WEBHOOK_SECRET`.
- Compare with `crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature.slice(7)))`.
- Enforce `User-Agent` prefix `GitHub-Hookshot/` and event header presence.

## GitHub App Authentication
- Prefer App installation tokens over PAT:
  - Parse webhook payload for `installation.id`.
  - Use `@octokit/app` or `@octokit/auth-app` with `GITHUB_APP_ID` + `GITHUB_PRIVATE_KEY` to create JWT and exchange for installation token.
  - Use installation token with Octokit for repo-scoped API calls.
- Permissions: pull_requests:read, contents:read, issues:write, metadata:read.

## Idempotency & Rate Limiting
- DB unique index on `(repository_full_name, pr_number)`.
- Skip if existing entry is `completed|processing|queued` unless `/bazaar rerun` comment is issued.
- Simple token bucket per org; exponential backoff on API failures.

## Privacy
- Do not persist diffs/patch bodies; store file paths + counts only.
- Redact secrets in PR body (basic patterns) before LLM prompts.
- Private repos: never expose video URLs unless explicitly public; default to unlisted.

## Secrets Management
- Env vars: `GITHUB_WEBHOOK_SECRET`, `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, optional `GITHUB_TOKEN` for dev.
- No secrets in logs; mask headers; structured error logs only.
