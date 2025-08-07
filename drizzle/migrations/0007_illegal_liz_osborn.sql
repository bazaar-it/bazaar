CREATE TABLE "bazaar-vid_api_usage_metric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"userId" varchar(255),
	"projectId" uuid,
	"toolName" varchar(100),
	"success" boolean NOT NULL,
	"responseTime" integer NOT NULL,
	"tokenCount" integer,
	"errorType" varchar(100),
	"errorMessage" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_paywall_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"unique_users_hit_paywall" integer DEFAULT 0 NOT NULL,
	"unique_users_clicked_package" integer DEFAULT 0 NOT NULL,
	"unique_users_initiated_checkout" integer DEFAULT 0 NOT NULL,
	"unique_users_completed_purchase" integer DEFAULT 0 NOT NULL,
	"total_revenue_cents" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bazaar-vid_paywall_analytics_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_paywall_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"package_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_promo_code_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_code_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"order_id" varchar(255),
	"discount_applied_cents" integer NOT NULL,
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"discount_type" text NOT NULL,
	"discount_value" integer NOT NULL,
	"max_uses" integer,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"min_purchase_amount" integer,
	"applicable_packages" uuid[],
	"created_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bazaar-vid_promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_api_usage_metric" ADD CONSTRAINT "bazaar-vid_api_usage_metric_userId_bazaar-vid_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_api_usage_metric" ADD CONSTRAINT "bazaar-vid_api_usage_metric_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_paywall_events" ADD CONSTRAINT "bazaar-vid_paywall_events_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_promo_code_usage" ADD CONSTRAINT "bazaar-vid_promo_code_usage_promo_code_id_bazaar-vid_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."bazaar-vid_promo_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_promo_code_usage" ADD CONSTRAINT "bazaar-vid_promo_code_usage_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_promo_codes" ADD CONSTRAINT "bazaar-vid_promo_codes_created_by_bazaar-vid_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_metrics_timestamp_idx" ON "bazaar-vid_api_usage_metric" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "api_metrics_provider_idx" ON "bazaar-vid_api_usage_metric" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "api_metrics_user_idx" ON "bazaar-vid_api_usage_metric" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "api_metrics_success_idx" ON "bazaar-vid_api_usage_metric" USING btree ("success");--> statement-breakpoint
CREATE INDEX "api_metrics_composite_idx" ON "bazaar-vid_api_usage_metric" USING btree ("provider","timestamp","success");--> statement-breakpoint
CREATE INDEX "paywall_analytics_date_idx" ON "bazaar-vid_paywall_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "paywall_events_user_idx" ON "bazaar-vid_paywall_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "paywall_events_type_idx" ON "bazaar-vid_paywall_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "paywall_events_created_idx" ON "bazaar-vid_paywall_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "promo_code_user_unique" ON "bazaar-vid_promo_code_usage" USING btree ("promo_code_id","user_id");--> statement-breakpoint
CREATE INDEX "promo_code_usage_user_idx" ON "bazaar-vid_promo_code_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "promo_code_usage_code_idx" ON "bazaar-vid_promo_code_usage" USING btree ("promo_code_id");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "bazaar-vid_promo_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "promo_codes_valid_idx" ON "bazaar-vid_promo_codes" USING btree ("valid_from","valid_until");