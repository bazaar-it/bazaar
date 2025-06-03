ALTER TABLE "bazaar-vid_account" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "bazaar-vid_email_subscriber" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "bazaar-vid_feedback" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "bazaar-vid_project" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_specs" ALTER COLUMN "createdBy" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "image_urls" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_animation_design_brief" DROP COLUMN "designBrief";