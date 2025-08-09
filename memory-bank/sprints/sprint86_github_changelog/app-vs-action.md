# GitHub App vs GitHub Action

## GitHub App (recommended)
- Pros: install-once UX; proper permissions; access to private repos via installation tokens; comment back easily; supports checks/status.
- Cons: requires app registration and secret management.
- Use when: targeting companies/teams, private repos, best UX.

## GitHub Action (zero-install path)
- Pros: easy for OSS; works via workflow; users control secrets; no App install needed.
- Cons: users must add a workflow; limited to repo’s CI permissions; slightly more friction.
- Use when: open-source adoption, quick trials, or orgs that prefer Actions.

## Strategy
- Ship the App first; also publish a tiny Action calling our API to broaden reach. Same backend queue/processor.
