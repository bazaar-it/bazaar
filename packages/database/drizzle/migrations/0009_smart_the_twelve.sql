ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "last_successful_step" varchar(50);--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "next_retry_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "error_context" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "checkpoint_data" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "last_step" varchar(50);