ALTER TABLE "bazaar-vid_account" ALTER COLUMN "userId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "bazaar-vid_email_subscriber" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "bazaar-vid_feedback" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "bazaar-vid_project" ALTER COLUMN "userId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_specs" ALTER COLUMN "createdBy" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" ALTER COLUMN "userId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "emailVerified" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "image" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_user" ADD COLUMN "isAdmin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bazaar-vid_user" ADD COLUMN "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "bazaar-vid_user" ADD COLUMN "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;