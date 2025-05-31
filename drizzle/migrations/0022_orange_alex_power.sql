CREATE TABLE "bazaar-vid_scene_iteration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"edit_complexity" varchar(20),
	"user_prompt" text NOT NULL,
	"brain_reasoning" text,
	"tool_reasoning" text,
	"code_before" text,
	"code_after" text,
	"changes_applied" jsonb,
	"changes_preserved" jsonb,
	"generation_time_ms" integer,
	"model_used" varchar(50),
	"temperature" real,
	"tokens_used" integer,
	"user_edited_again" boolean DEFAULT false,
	"user_satisfaction_score" integer,
	"session_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" ALTER COLUMN "userId" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_iteration" ADD CONSTRAINT "bazaar-vid_scene_iteration_scene_id_bazaar-vid_scene_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."bazaar-vid_scene"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_iteration" ADD CONSTRAINT "bazaar-vid_scene_iteration_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_iteration_scene_idx" ON "bazaar-vid_scene_iteration" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_iteration_project_idx" ON "bazaar-vid_scene_iteration" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scene_iteration_operation_idx" ON "bazaar-vid_scene_iteration" USING btree ("operation_type","edit_complexity");--> statement-breakpoint
CREATE INDEX "scene_iteration_satisfaction_idx" ON "bazaar-vid_scene_iteration" USING btree ("user_edited_again","created_at");