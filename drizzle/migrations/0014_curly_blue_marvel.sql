CREATE TABLE "bazaar-vid_community_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"user_id" varchar(255),
	"event_type" varchar(50) NOT NULL,
	"source" varchar(50),
	"project_id" uuid,
	"scene_count" integer,
	"referrer" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_community_favorite" (
	"user_id" varchar(255) NOT NULL,
	"template_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_favorite_pk" PRIMARY KEY("user_id","template_id")
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_community_metrics_daily" (
	"template_id" uuid NOT NULL,
	"day" date NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"count" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "community_metrics_daily_pk" PRIMARY KEY("template_id","day","event_type")
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_community_template_scene" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"scene_index" integer NOT NULL,
	"title" varchar(255),
	"tsx_code" text NOT NULL,
	"duration" integer NOT NULL,
	"preview_frame" integer DEFAULT 15,
	"code_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_community_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"owner_user_id" varchar(255),
	"source_project_id" uuid,
	"thumbnail_url" text,
	"supported_formats" jsonb DEFAULT '["landscape","portrait","square"]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"category" varchar(100),
	"visibility" varchar(50) DEFAULT 'public' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"views_count" bigint DEFAULT 0 NOT NULL,
	"favorites_count" bigint DEFAULT 0 NOT NULL,
	"uses_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bazaar-vid_community_template_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile" ALTER COLUMN "brand_data" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile" ALTER COLUMN "colors" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile" ALTER COLUMN "typography" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile" ALTER COLUMN "logos" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile" ALTER COLUMN "copy_voice" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile" ALTER COLUMN "product_narrative" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile" ALTER COLUMN "social_proof" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_brand_profile" ALTER COLUMN "extraction_confidence" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "video_urls" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "audio_urls" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "scene_urls" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_project" ADD COLUMN "audio_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bazaar-vid_community_event" ADD CONSTRAINT "bazaar-vid_community_event_template_id_bazaar-vid_community_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bazaar-vid_community_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_community_favorite" ADD CONSTRAINT "bazaar-vid_community_favorite_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_community_favorite" ADD CONSTRAINT "bazaar-vid_community_favorite_template_id_bazaar-vid_community_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bazaar-vid_community_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_community_metrics_daily" ADD CONSTRAINT "bazaar-vid_community_metrics_daily_template_id_bazaar-vid_community_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bazaar-vid_community_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_community_template_scene" ADD CONSTRAINT "bazaar-vid_community_template_scene_template_id_bazaar-vid_community_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."bazaar-vid_community_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_community_template" ADD CONSTRAINT "bazaar-vid_community_template_owner_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_community_template" ADD CONSTRAINT "bazaar-vid_community_template_source_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("source_project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_events_template_idx" ON "bazaar-vid_community_event" USING btree ("template_id","created_at");--> statement-breakpoint
CREATE INDEX "community_events_type_idx" ON "bazaar-vid_community_event" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "community_favorites_template_idx" ON "bazaar-vid_community_favorite" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "community_template_scenes_template_idx" ON "bazaar-vid_community_template_scene" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_template_scenes_unique_idx" ON "bazaar-vid_community_template_scene" USING btree ("template_id","scene_index");--> statement-breakpoint
CREATE INDEX "community_templates_owner_idx" ON "bazaar-vid_community_template" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "community_templates_visibility_idx" ON "bazaar-vid_community_template" USING btree ("visibility","status");--> statement-breakpoint
CREATE INDEX "community_templates_created_idx" ON "bazaar-vid_community_template" USING btree ("created_at");