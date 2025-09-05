CREATE TABLE "bazaar-vid_autofix_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"scene_id" uuid,
	"user_id" varchar(255) NOT NULL,
	"error_message" text NOT NULL,
	"error_type" varchar(100),
	"error_signature" varchar(255),
	"fix_attempt_number" integer DEFAULT 1 NOT NULL,
	"fix_strategy" varchar(50),
	"fix_success" boolean DEFAULT false NOT NULL,
	"fix_duration_ms" integer,
	"api_calls_count" integer DEFAULT 0,
	"estimated_cost" real,
	"session_id" varchar(100),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_autofix_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"project_id" uuid,
	"total_errors" integer DEFAULT 0 NOT NULL,
	"unique_errors" integer DEFAULT 0 NOT NULL,
	"successful_fixes" integer DEFAULT 0 NOT NULL,
	"failed_fixes" integer DEFAULT 0 NOT NULL,
	"total_api_calls" integer DEFAULT 0 NOT NULL,
	"total_cost" real,
	"circuit_breaker_tripped" boolean DEFAULT false,
	"kill_switch_activated" boolean DEFAULT false,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "bazaar-vid_autofix_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_autofix_metrics" ADD CONSTRAINT "bazaar-vid_autofix_metrics_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_autofix_metrics" ADD CONSTRAINT "bazaar-vid_autofix_metrics_scene_id_bazaar-vid_scene_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."bazaar-vid_scene"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_autofix_metrics" ADD CONSTRAINT "bazaar-vid_autofix_metrics_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_autofix_sessions" ADD CONSTRAINT "bazaar-vid_autofix_sessions_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_autofix_sessions" ADD CONSTRAINT "bazaar-vid_autofix_sessions_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "autofix_project_idx" ON "bazaar-vid_autofix_metrics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "autofix_user_idx" ON "bazaar-vid_autofix_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "autofix_scene_idx" ON "bazaar-vid_autofix_metrics" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "autofix_created_idx" ON "bazaar-vid_autofix_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "autofix_signature_idx" ON "bazaar-vid_autofix_metrics" USING btree ("error_signature");--> statement-breakpoint
CREATE INDEX "autofix_session_idx" ON "bazaar-vid_autofix_metrics" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "autofix_session_user_idx" ON "bazaar-vid_autofix_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "autofix_session_project_idx" ON "bazaar-vid_autofix_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "autofix_session_started_idx" ON "bazaar-vid_autofix_sessions" USING btree ("started_at");