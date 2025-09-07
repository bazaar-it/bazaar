# Community Seeding Guide (Official Templates)

Purpose: Import hardcoded `TEMPLATES` from `src/templates/registry.ts` into the Community database so `/community` runs from DB‑backed entries.

## Preconditions
- Dev DB migrations applied:
  - `migrations/20250906_add_community_tables.sql`
  - `migrations/20250906b_admin_ratings_and_lineage.sql`
- `.env.local` has `DATABASE_URL` (dev) and app can connect

## Run
```bash
npm run seed:community:from-registry
```

What it does:
- Loads `TEMPLATES` (the hardcoded official templates)
- Inserts rows into `bazaar-vid_community_template` with:
  - `slug` (unique), `title`, `visibility='public'`, `status='active'`
  - `supported_formats`, `tags=['official']`, `category` (if present)
  - `owner_user_id` = first admin if exists, else `system-changelog` if present, else `NULL`
- Inserts one scene per template into `bazaar-vid_community_template_scene`:
  - `tsx_code` (snapshot) and `duration`, `preview_frame`, `code_hash`

## Idempotency & Safety
- SAFE/ADDITIVE: only inserts; does not modify existing data
- NOT STRICTLY IDEMPOTENT: running twice will create new templates with suffixed slugs (e.g., `name-1`)
- Recommendation: run once, verify, then disable the hardcoded merge path in UI

## Verify
- SQL quick checks:
```sql
SELECT COUNT(*) FROM "bazaar-vid_community_template";
SELECT COUNT(*) FROM "bazaar-vid_community_template_scene";
SELECT id, slug, title, tags FROM "bazaar-vid_community_template" ORDER BY created_at DESC LIMIT 5;
```
- App:
  - Visit `/community` → Explore tab shows DB templates
  - Favorite/remix → persists and redirects correctly

## Rollback
- Remove seeded templates (official only):
```sql
DELETE FROM "bazaar-vid_community_template_scene"
WHERE template_id IN (
  SELECT id FROM "bazaar-vid_community_template" WHERE tags::text ILIKE '%official%'
);
DELETE FROM "bazaar-vid_community_template" WHERE tags::text ILIKE '%official%';
```

## Next UI Step (after seeding)
- Stop mixing hardcoded `TEMPLATES` in `/community` once DB has entries:
  - If `community.listTemplates.items.length > 0`, render only DB templates
  - Keep hardcoded path as fallback for empty DB (dev only)

