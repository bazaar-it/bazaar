CREATE TABLE "bazaar-vid_scene_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"messageId" uuid,
	"rawReasoning" text NOT NULL,
	"planData" jsonb NOT NULL,
	"userPrompt" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_plan" ADD CONSTRAINT "bazaar-vid_scene_plan_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_plan" ADD CONSTRAINT "bazaar-vid_scene_plan_messageId_bazaar-vid_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."bazaar-vid_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_plan_project_idx" ON "bazaar-vid_scene_plan" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "scene_plan_message_idx" ON "bazaar-vid_scene_plan" USING btree ("messageId");