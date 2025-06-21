CREATE TABLE "bazaar-vid_image_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"trace_id" varchar(100) NOT NULL,
	"image_urls" jsonb NOT NULL,
	"palette" jsonb NOT NULL,
	"typography" text NOT NULL,
	"mood" text NOT NULL,
	"layout_json" jsonb,
	"processing_time_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"used_in_scenes" jsonb
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_project_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"memory_type" varchar(50) NOT NULL,
	"memory_key" varchar(255) NOT NULL,
	"memory_value" text NOT NULL,
	"confidence" real DEFAULT 0.8,
	"source_prompt" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_image_analysis" ADD CONSTRAINT "bazaar-vid_image_analysis_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_project_memory" ADD CONSTRAINT "bazaar-vid_project_memory_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "image_analysis_project_idx" ON "bazaar-vid_image_analysis" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "image_analysis_trace_idx" ON "bazaar-vid_image_analysis" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "image_analysis_created_idx" ON "bazaar-vid_image_analysis" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_memory_project_idx" ON "bazaar-vid_project_memory" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_memory_type_key_idx" ON "bazaar-vid_project_memory" USING btree ("memory_type","memory_key");