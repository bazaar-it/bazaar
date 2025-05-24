ALTER TABLE "bazaar-vid_scene" ADD COLUMN "publishedUrl" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene" ADD COLUMN "publishedHash" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene" ADD COLUMN "publishedAt" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "scene_publish_idx" ON "bazaar-vid_scene" USING btree ("projectId","publishedHash");