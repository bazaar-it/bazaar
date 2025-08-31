-- Add new media URL columns to messages table
ALTER TABLE "bazaar-vid_message" ADD COLUMN "video_urls" jsonb;
ALTER TABLE "bazaar-vid_message" ADD COLUMN "audio_urls" jsonb;
ALTER TABLE "bazaar-vid_message" ADD COLUMN "scene_urls" jsonb;
--> statement-breakpoint
