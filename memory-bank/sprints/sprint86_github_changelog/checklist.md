# Implementation Checklist — MVP

- [ ] Webhook: signature verify (timingSafeEqual), headers validation, health GET
- [ ] Auth: GitHub App installation token in analyzer
- [ ] Idempotency: unique index + early exit if exists
- [ ] Queue: enqueue + processor to render/publish/update
- [ ] Composition: `ChangelogVideo` + storyboard mapper
- [ ] Storage: R2 upload (video + thumbnail); set public/unlisted
- [ ] DB: update `changelog_entries` status and asset URLs
- [ ] PR Comment: post links + embed; support `/bazaar rerun`
- [ ] Public page: `/changelog/[owner]/[repo]` basic list/player
- [ ] Metrics: lead time, failures, costs; basic logging
- [ ] Env/docs: app id, private key, webhook secret; install steps
