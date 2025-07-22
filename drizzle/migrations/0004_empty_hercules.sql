CREATE TABLE "bazaar-vid_usage_limit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"limit_key" varchar(100) NOT NULL,
	"free_tier_limit" integer DEFAULT 0 NOT NULL,
	"description" text,
	"reset_period" varchar(20) DEFAULT 'daily' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bazaar-vid_usage_limit_limit_key_unique" UNIQUE("limit_key")
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_user_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"usage_type" varchar(50) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"project_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_user_usage" ADD CONSTRAINT "bazaar-vid_user_usage_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_user_usage" ADD CONSTRAINT "bazaar-vid_user_usage_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_limits_active_idx" ON "bazaar-vid_usage_limit" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "usage_limits_reset_period_idx" ON "bazaar-vid_usage_limit" USING btree ("reset_period");--> statement-breakpoint
CREATE INDEX "user_usage_user_date_idx" ON "bazaar-vid_user_usage" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "user_usage_type_idx" ON "bazaar-vid_user_usage" USING btree ("usage_type");--> statement-breakpoint
CREATE INDEX "user_usage_project_idx" ON "bazaar-vid_user_usage" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_usage_unique_idx" ON "bazaar-vid_user_usage" USING btree ("user_id","date","usage_type");