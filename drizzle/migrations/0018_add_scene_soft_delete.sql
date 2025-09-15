-- Soft delete column for scenes (idempotent)
ALTER TABLE "bazaar-vid_scene"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP WITH TIME ZONE;

-- Index for filtering non-deleted scenes
CREATE INDEX IF NOT EXISTS "scene_deleted_at_idx" ON "bazaar-vid_scene" ("deleted_at");

