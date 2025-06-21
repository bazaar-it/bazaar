CREATE TABLE "bazaar-vid_scene_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"sceneId" varchar(255) NOT NULL,
	"name" varchar(255),
	"spec" jsonb NOT NULL,
	"version" varchar(10) DEFAULT '1.0' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"createdBy" uuid
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_specs" ADD CONSTRAINT "bazaar-vid_scene_specs_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_specs" ADD CONSTRAINT "bazaar-vid_scene_specs_createdBy_bazaar-vid_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_spec_project_idx" ON "bazaar-vid_scene_specs" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "scene_spec_created_at_idx" ON "bazaar-vid_scene_specs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "scene_spec_scene_id_idx" ON "bazaar-vid_scene_specs" USING btree ("sceneId");--> statement-breakpoint
CREATE UNIQUE INDEX "scene_spec_unique_scene_id" ON "bazaar-vid_scene_specs" USING btree ("projectId","sceneId");--> statement-breakpoint
CREATE INDEX "scene_spec_spec_gin_idx" ON "bazaar-vid_scene_specs" USING gin ("spec");