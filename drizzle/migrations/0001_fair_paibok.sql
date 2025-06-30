CREATE TABLE "bazaar-vid_export_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"export_id" uuid NOT NULL,
	"event" text NOT NULL,
	"event_data" jsonb,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"project_id" uuid NOT NULL,
	"render_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"format" text DEFAULT 'mp4' NOT NULL,
	"quality" text DEFAULT 'high' NOT NULL,
	"output_url" text,
	"file_size" integer,
	"duration" integer,
	"error" text,
	"metadata" jsonb,
	"download_count" integer DEFAULT 0,
	"last_downloaded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	CONSTRAINT "bazaar-vid_exports_render_id_unique" UNIQUE("render_id")
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_export_analytics" ADD CONSTRAINT "bazaar-vid_export_analytics_export_id_bazaar-vid_exports_id_fk" FOREIGN KEY ("export_id") REFERENCES "public"."bazaar-vid_exports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_exports" ADD CONSTRAINT "bazaar-vid_exports_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_exports" ADD CONSTRAINT "bazaar-vid_exports_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "export_analytics_export_idx" ON "bazaar-vid_export_analytics" USING btree ("export_id");--> statement-breakpoint
CREATE INDEX "export_analytics_event_idx" ON "bazaar-vid_export_analytics" USING btree ("event");--> statement-breakpoint
CREATE INDEX "export_analytics_created_idx" ON "bazaar-vid_export_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "exports_user_idx" ON "bazaar-vid_exports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "exports_project_idx" ON "bazaar-vid_exports" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "exports_render_idx" ON "bazaar-vid_exports" USING btree ("render_id");--> statement-breakpoint
CREATE INDEX "exports_created_idx" ON "bazaar-vid_exports" USING btree ("created_at");