ALTER TABLE "bazaar-vid_scene"
  ADD COLUMN "revision" integer NOT NULL DEFAULT 1;

-- Backfill existing rows to revision 1 explicitly
UPDATE "bazaar-vid_scene" SET "revision" = 1 WHERE "revision" IS NULL;
