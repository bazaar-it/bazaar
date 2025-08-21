CREATE TABLE "bazaar-vid_component_showcase_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repository" text NOT NULL,
	"component_name" text NOT NULL,
	"component_path" text,
	"trigger_type" text NOT NULL,
	"pr_number" integer NOT NULL,
	"requester_username" text NOT NULL,
	"requester_avatar" text,
	"requester_url" text,
	"video_url" text,
	"thumbnail_url" text,
	"gif_url" text,
	"video_duration" integer,
	"video_format" text DEFAULT 'landscape',
	"generated_code" text,
	"component_structure" jsonb,
	"component_styles" jsonb,
	"component_framework" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"job_id" text,
	"error_message" text,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_webhook_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" varchar(255) NOT NULL,
	"event" varchar(100) NOT NULL,
	"repository" varchar(255),
	"received_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "bazaar-vid_webhook_delivery_delivery_id_unique" UNIQUE("delivery_id")
);
--> statement-breakpoint
CREATE INDEX "component_showcase_repository_idx" ON "bazaar-vid_component_showcase_entries" USING btree ("repository");--> statement-breakpoint
CREATE INDEX "component_showcase_component_idx" ON "bazaar-vid_component_showcase_entries" USING btree ("repository","component_name");--> statement-breakpoint
CREATE INDEX "component_showcase_status_idx" ON "bazaar-vid_component_showcase_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "component_showcase_trigger_type_idx" ON "bazaar-vid_component_showcase_entries" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "component_showcase_created_at_idx" ON "bazaar-vid_component_showcase_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "component_showcase_pr_idx" ON "bazaar-vid_component_showcase_entries" USING btree ("repository","pr_number");--> statement-breakpoint
CREATE INDEX "webhook_delivery_delivery_id_idx" ON "bazaar-vid_webhook_delivery" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_received_at_idx" ON "bazaar-vid_webhook_delivery" USING btree ("received_at");