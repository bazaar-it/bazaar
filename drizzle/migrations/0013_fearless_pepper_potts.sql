CREATE TABLE "bazaar-vid_brand_profile_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_profile_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"brand_data" jsonb NOT NULL,
	"changed_by" varchar(255),
	"change_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_brand_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"website_url" text NOT NULL,
	"brand_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"colors" jsonb DEFAULT '{}'::jsonb,
	"typography" jsonb DEFAULT '{}'::jsonb,
	"logos" jsonb DEFAULT '{}'::jsonb,
	"copy_voice" jsonb DEFAULT '{}'::jsonb,
	"product_narrative" jsonb DEFAULT '{}'::jsonb,
	"social_proof" jsonb DEFAULT '{}'::jsonb,
	"screenshots" jsonb DEFAULT '[]'::jsonb,
	"media_assets" jsonb DEFAULT '[]'::jsonb,
	"extraction_version" text DEFAULT '1.0.0',
	"extraction_confidence" jsonb DEFAULT '{}'::jsonb,
	"last_analyzed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile_version" ADD CONSTRAINT "bazaar-vid_brand_profile_version_brand_profile_id_bazaar-vid_brand_profile_id_fk" FOREIGN KEY ("brand_profile_id") REFERENCES "public"."bazaar-vid_brand_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile_version" ADD CONSTRAINT "bazaar-vid_brand_profile_version_changed_by_bazaar-vid_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile" ADD CONSTRAINT "bazaar-vid_brand_profile_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_versions_profile_idx" ON "bazaar-vid_brand_profile_version" USING btree ("brand_profile_id");--> statement-breakpoint
CREATE INDEX "brand_versions_created_idx" ON "bazaar-vid_brand_profile_version" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_versions_unique_idx" ON "bazaar-vid_brand_profile_version" USING btree ("brand_profile_id","version_number");--> statement-breakpoint
CREATE INDEX "brand_profiles_project_idx" ON "bazaar-vid_brand_profile" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "brand_profiles_url_idx" ON "bazaar-vid_brand_profile" USING btree ("website_url");--> statement-breakpoint
CREATE INDEX "brand_profiles_created_idx" ON "bazaar-vid_brand_profile" USING btree ("created_at");