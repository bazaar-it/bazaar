# Verification SQL — Server‑Side Compilation

Use these read‑only queries to confirm compilation health. Run in dev first; prod is read‑only.

## Basics
-- Scenes with compiled JS
SELECT id, project_id, name, js_compiled_at
FROM scenes
WHERE js_compiled_at IS NOT NULL
ORDER BY js_compiled_at DESC
LIMIT 50;

-- Scenes missing compiled JS (should be rare after Phase 1)
SELECT id, project_id, name, created_at
FROM scenes
WHERE (js_compiled_at IS NULL OR js_code IS NULL)
ORDER BY created_at DESC
LIMIT 50;

-- Recent compiles in the last 24h
SELECT COUNT(*) AS compiled_24h
FROM scenes
WHERE js_compiled_at >= NOW() - INTERVAL '24 hours';

## Consistency Checks
-- TSX present but JS missing
SELECT COUNT(*) AS tsx_only
FROM scenes
WHERE tsx_code IS NOT NULL AND (js_code IS NULL OR js_compiled_at IS NULL);

-- JS present but no timestamp (should not happen)
SELECT COUNT(*) AS js_missing_timestamp
FROM scenes
WHERE js_code IS NOT NULL AND js_compiled_at IS NULL;

-- Size distribution (rough)
SELECT
  PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY LENGTH(js_code)) AS p50_js_size,
  PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY LENGTH(js_code)) AS p95_js_size
FROM scenes
WHERE js_code IS NOT NULL;

## Spot‑Check a Project
-- Replace :project_id
SELECT id, name, frames, js_compiled_at
FROM scenes
WHERE project_id = :project_id
ORDER BY created_at DESC;

-- Compare TSX vs JS for a specific scene
-- Replace :scene_id
SELECT id, name, LEFT(tsx_code, 300) AS tsx_head, RIGHT(js_code, 300) AS js_tail
FROM scenes
WHERE id = :scene_id;

## Error Monitoring (if an errors/events table exists)
-- Example structure; adapt to your schema
-- SELECT COUNT(*) FROM scene_render_errors WHERE created_at >= NOW() - INTERVAL '24 hours';

