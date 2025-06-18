ALTER TABLE "bazaar-vid_scene" ADD COLUMN "slug" varchar(255);--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene" ADD COLUMN "dominantColors" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene" ADD COLUMN "firstH1Text" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene" ADD COLUMN "lastFocused" boolean DEFAULT false;