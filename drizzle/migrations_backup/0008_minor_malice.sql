ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "originalTsxCode" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "lastFixAttempt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "fixIssues" text;