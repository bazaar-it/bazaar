# Community MVP — Developer Guide (Third-Party)

This guide explains the database schema, how to run dev migrations, how to fetch projects, how to publish scenes to community templates, and how to implement the `/community` MVP so it can later run at `community.bazaar.it` with minimal changes.

## 1) What’s Implemented (Schema)

New additive tables (Drizzle + raw SQL migration):
- `community_template`: public template metadata with cached counters
- `community_template_scene`: normalized scene snapshots (TSX per scene)
- `community_favorite`: user ↔ template favorites (composite PK)
- `community_event`: raw analytics events (source of truth)
- `community_metrics_daily`: aggregated daily metrics

Files:
- Drizzle schema: `src/server/db/schema.ts` (search for “Community MVP” block)
- SQL migration (dev): `migrations/20250906_add_community_tables.sql`

Why this design:
- Normalized scenes enable multi‑scene templates + clean imports
- Event-based analytics scales to new event types without schema changes
- Cached counters on `community_template` for fast reads (reconciled from events)
- All additive and reversible per migration guidelines

## 2) Running Dev Migrations

For local/dev DB (safe):
- Option A: Apply raw SQL in your SQL editor using `migrations/20250906_add_community_tables.sql`.
- Option B (preferred flow when you have CLI access):
  - Update `.env.local` with dev DB URL
  - `npm run db:generate`
  - Review generated SQL (should match the raw migration; no destructive ops)
  - `npm run db:push`

Do NOT apply to prod until staging is validated and backups exist.

## 3) Finding Projects (to publish scenes)

Use existing tRPC project router:
- Path: `src/server/api/routers/project.ts`
- Endpoints:
  - `project.list` (protected): lists all projects for current user
  - `project.getFullProject` (protected): fetches project with scenes/messages

Fetch scenes for selection using `getFullProject` (include `scenes`). Each scene has `tsxCode` and `duration` fields you need for snapshotting into community.

## 4) Publish to Community (MVP Flow)

Server steps to create a community template from selected scenes:
1) Validate user owns the project and scenes
2) Create row in `community_template` with:
   - `slug`, `title`, `description`, `owner_user_id`, `source_project_id`, optional `thumbnail_url`, `supported_formats`, `tags`, `category`
3) For each selected scene (keep ordering):
   - Insert into `community_template_scene` with `template_id`, `scene_index`, `tsx_code`, `duration`, optional `preview_frame`, `title`, `code_hash`
4) Emit `community_event` with `event_type='view'|'favorite'|'use'` etc as applicable; update cached counters on write paths

Notes:
- Slug uniqueness: generate slug from title; ensure unique across community
- Component uniquification only happens on import (see Import section)

## 5) Browse + Favorite + Use at `/community`

Start in main app under `/community` (simple Next.js pages). Later we’ll host at `community.bazaar.it`.

Core screens:
- Explore (grid): query `community_template` (visibility='public', status='active'), show title/thumbnail/counters
- Detail page: show scenes list by querying `community_template_scene` where `template_id = ?`
- Favorites: upsert into `community_favorite` on click; list by joining `community_favorite` with `community_template`
- Use: deep-link to main app project with `?importTemplate=:id` or inline flow

Data access:
- tRPC (recommended): create a `communityRouter` with methods:
  - `createTemplateFromScenes`, `listTemplates`, `getTemplate`, `favorite`, `unfavorite`, `useTemplate`, `getUserFavorites`, `trackEvent`
- Temporary direct queries are okay for MVP scaffolding as long as auth checks are enforced

## 6) Import (“Use Template”) Flow

When user clicks Use on a template:
- Fetch `community_template_scene` rows by `template_id`, ordered by `scene_index`
- For each TSX snapshot, uniquify component names to avoid collisions
- Insert scenes back into the user’s project using existing scene creation path
- Emit `community_event` with `event_type='use'` and bump cached `uses_count`

## 7) Designing `/community` for Future Subdomain

Build now, move later with minimal code changes:
- Auth/session: today it’s the same app. For subdomain, set cookie domain to `.bazaar.it` and share `AUTH_SECRET` + DB (see `auth-subdomain.md`)
- Deep links: use `https://bazaar.it/projects/:id?importTemplate=:templateId` — this works from either host
- API calls: keep calls internal now; later, if subdomain is a separate deployment, enable CORS + credentials or route via host-based middleware within the same project
- SEO: use slugs now; later add 301 redirects from `/community/*` → `https://community.bazaar.it/*`
- Assets: store thumbnails in R2 with absolute URLs (domain-agnostic)
- CSP: keep strict; update `connect-src`/`img-src` if hosting changes

## 8) Minimal SQL Examples

List public templates (simplified):
```sql
SELECT id, slug, title, thumbnail_url, views_count, favorites_count, uses_count
FROM "bazaar-vid_community_template"
WHERE visibility = 'public' AND status = 'active'
ORDER BY created_at DESC
LIMIT 30;
```

Get template scenes:
```sql
SELECT scene_index, title, duration, preview_frame
FROM "bazaar-vid_community_template_scene"
WHERE template_id = $1
ORDER BY scene_index ASC;
```

Favorite a template:
```sql
INSERT INTO "bazaar-vid_community_favorite" (user_id, template_id)
VALUES ($userId, $templateId)
ON CONFLICT (user_id, template_id) DO NOTHING;
```

Track an event:
```sql
INSERT INTO "bazaar-vid_community_event" (template_id, user_id, event_type, source, project_id)
VALUES ($templateId, $userId, 'view', 'in_app_panel', $projectId);
```

## 9) Quality & Safety

- Enforce auth checks server-side: user must own projects/scenes they publish
- Sanitize title/description, validate TSX before storing
- Rate-limit publish and event writes
- Add feature flags for rollout (show/hide “Publish to Community”)

## 10) Next Steps (You Can Start Now)

- Apply dev migration SQL
- Scaffold `/community` pages
- Implement minimal tRPC `communityRouter` for list/get/favorite/use
- Wire up publish flow on project page (scene picker → createTemplateFromScenes)
- Emit `community_event` on favorite/use; update cached counters

Reference docs:
- `README.md`, `data-model.md`, `DATABASE_SCHEMA.md`, `API_SPEC.md`, `auth-subdomain.md`, `pipeline-and-ux.md`, `metrics-analytics.md`, `migration-plan.md`
