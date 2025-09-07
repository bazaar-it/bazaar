-- Add source_scene_id for lineage on template scenes
ALTER TABLE "bazaar-vid_community_template_scene"
  ADD COLUMN IF NOT EXISTS "source_scene_id" uuid REFERENCES "bazaar-vid_scene"(id) ON DELETE SET NULL;

-- Admin ratings table for editorial weighting (0-10)
CREATE TABLE IF NOT EXISTS "bazaar-vid_community_admin_rating" (
  "template_id" uuid NOT NULL REFERENCES "bazaar-vid_community_template"(id) ON DELETE CASCADE,
  "admin_user_id" varchar(255) NOT NULL REFERENCES "bazaar-vid_user"(id) ON DELETE CASCADE,
  "score" smallint NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "community_admin_rating_pk" PRIMARY KEY ("template_id", "admin_user_id")
);

CREATE INDEX IF NOT EXISTS "community_admin_rating_tpl_idx"
  ON "bazaar-vid_community_admin_rating" ("template_id");

