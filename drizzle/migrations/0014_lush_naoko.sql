CREATE TABLE "bazaar-vid_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text,
	"name" text,
	"email" text,
	"user_id" varchar(255),
	"prioritized_features" jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_notes" text
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_project" ADD COLUMN "isWelcome" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "bazaar-vid_feedback" ADD CONSTRAINT "bazaar-vid_feedback_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "bazaar-vid_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "bazaar-vid_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "bazaar-vid_feedback" USING btree ("created_at");