CREATE TABLE "bazaar-vid_animation_design_brief" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"sceneId" uuid NOT NULL,
	"componentJobId" uuid,
	"designBrief" jsonb NOT NULL,
	"llmModel" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"originalTsxCode" text,
	"lastFixAttempt" timestamp with time zone,
	"fixIssues" text
);
--> statement-breakpoint
DROP INDEX "scene_plan_message_idx";--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "originalTsxCode" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "lastFixAttempt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "fixIssues" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "originalTsxCode" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "lastFixAttempt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "fixIssues" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_animation_design_brief" ADD CONSTRAINT "bazaar-vid_animation_design_brief_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_animation_design_brief" ADD CONSTRAINT "bazaar-vid_animation_design_brief_componentJobId_bazaar-vid_custom_component_job_id_fk" FOREIGN KEY ("componentJobId") REFERENCES "public"."bazaar-vid_custom_component_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "animation_design_brief_project_idx" ON "bazaar-vid_animation_design_brief" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "animation_design_brief_scene_idx" ON "bazaar-vid_animation_design_brief" USING btree ("sceneId");--> statement-breakpoint
CREATE INDEX "animation_design_brief_component_idx" ON "bazaar-vid_animation_design_brief" USING btree ("componentJobId");