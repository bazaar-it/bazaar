# API & Contracts — GitHub Changelog

## Webhook
- Route: `POST /api/webhooks/github`
- Headers: `x-github-event`, `x-github-signature-256`, `x-github-delivery`, `user-agent`
- Events: `pull_request` (action: `closed` + `merged: true`)
- Response: `{status, message?, jobId?}`

## Queue Job Payload
```ts
interface ChangelogJob {
  prAnalysis: PRAnalysis;
  repository: string; // owner/repo
  style: 'automatic' | 'feature' | 'fix' | 'announcement';
  format: 'landscape' | 'square' | 'portrait';
  branding: 'auto' | 'custom' | 'none';
}
```

## PR Comment (bot)
- Title: "🎬 Changelog Video Generated"
- Body: thumbnail preview + link, link to `/changelog/{owner}/{repo}`, embed snippet (markdown)
- Rerun: accept `/bazaar rerun` comment

## Changelog Public API (minimal)
- `GET /api/changelog/{owner}/{repo}` → paginated JSON of entries
- `GET /api/changelog/entry/{id}` → single entry with assets

## Storyboard → Composition Mapper
- Input: Storyboard JSON (see README)
- Output: props for `ChangelogVideo` (title scene, N bullet scenes, highlights, CTA)
- Duration: clamp 20–40s; auto-fit bullets
