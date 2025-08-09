# Installation & Triggers

## GitHub App
- Permissions: contents:read, pull_requests:read, issues:read|write, checks:read|write, metadata:read.
- Events: issue_comment, pull_request, installation, installation_repositories.
- Webhook URL: https://<host>/api/webhooks/github (HMAC SHA-256 verified).
- Flow: comment trigger → analyze → render → comment with links (+ optional check run).

## GitHub Action (alternative)
- Publish `bazaarit/changelog-video-action@v1`.
- Example trigger: `.github/workflows/bazaar-video.yml` listening to `issue_comment` where body contains `/bazaar` and `github.event.issue.pull_request` exists.
- Inputs: `BAZAAR_API_URL` and `BAZAAR_API_TOKEN` secrets.
- Include an authorization gate on `author_association` to restrict who can trigger.
