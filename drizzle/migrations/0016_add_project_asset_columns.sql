-- Align project_asset table with application schema
-- Adds added_at and added_via columns if missing, with safe defaults

BEGIN;

ALTER TABLE "bazaar-vid_project_asset"
  ADD COLUMN IF NOT EXISTS "added_at" timestamptz DEFAULT now() NOT NULL;

ALTER TABLE "bazaar-vid_project_asset"
  ADD COLUMN IF NOT EXISTS "added_via" text;

COMMIT;

