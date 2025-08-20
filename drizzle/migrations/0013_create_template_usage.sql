CREATE TABLE IF NOT EXISTS "bazaar-vid_template_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"user_id" varchar(255),
	"project_id" uuid,
	"scene_id" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_template_usage" ADD CONSTRAINT "bazaar-vid_template_usage_template_id_bazaar-vid_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bazaar-vid_templates"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bazaar-vid_template_usage" ADD CONSTRAINT "bazaar-vid_template_usage_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bazaar-vid_template_usage" ADD CONSTRAINT "bazaar-vid_template_usage_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bazaar-vid_template_usage" ADD CONSTRAINT "bazaar-vid_template_usage_scene_id_bazaar-vid_scene_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."bazaar-vid_scene"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "template_usage_template_idx" ON "bazaar-vid_template_usage" USING btree ("template_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "template_usage_created_idx" ON "bazaar-vid_template_usage" USING btree ("created_at");