-- Community MVP tables (DEV FIRST) — Additive, non-destructive
-- NOTE: In Drizzle code, we use createTable('community_*') which maps to these actual table names with the "bazaar-vid_" prefix.

-- 1) community_template
CREATE TABLE IF NOT EXISTS "bazaar-vid_community_template" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(255) UNIQUE NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "owner_user_id" varchar(255) REFERENCES "bazaar-vid_user"(id),
  "source_project_id" uuid REFERENCES "bazaar-vid_project"(id),
  "thumbnail_url" text,
  "supported_formats" jsonb DEFAULT '["landscape","portrait","square"]'::jsonb,
  "tags" jsonb DEFAULT '[]'::jsonb,
  "category" varchar(100),
  "visibility" varchar(50) NOT NULL DEFAULT 'public',
  "status" varchar(50) NOT NULL DEFAULT 'active',
  "views_count" bigint NOT NULL DEFAULT 0,
  "favorites_count" bigint NOT NULL DEFAULT 0,
  "uses_count" bigint NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "community_templates_owner_idx"
  ON "bazaar-vid_community_template" ("owner_user_id");
CREATE INDEX IF NOT EXISTS "community_templates_visibility_idx"
  ON "bazaar-vid_community_template" ("visibility", "status");
CREATE INDEX IF NOT EXISTS "community_templates_created_idx"
  ON "bazaar-vid_community_template" ("created_at" DESC);

-- 2) community_template_scene
CREATE TABLE IF NOT EXISTS "bazaar-vid_community_template_scene" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "bazaar-vid_community_template"(id) ON DELETE CASCADE,
  "scene_index" integer NOT NULL,
  "title" varchar(255),
  "tsx_code" text NOT NULL,
  "duration" integer NOT NULL,
  "preview_frame" integer DEFAULT 15,
  "code_hash" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "community_template_scenes_unique_idx" UNIQUE ("template_id", "scene_index")
);

CREATE INDEX IF NOT EXISTS "community_template_scenes_template_idx"
  ON "bazaar-vid_community_template_scene" ("template_id");

-- 3) community_favorite
CREATE TABLE IF NOT EXISTS "bazaar-vid_community_favorite" (
  "user_id" varchar(255) NOT NULL REFERENCES "bazaar-vid_user"(id) ON DELETE CASCADE,
  "template_id" uuid NOT NULL REFERENCES "bazaar-vid_community_template"(id) ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "community_favorite_pk" PRIMARY KEY ("user_id", "template_id")
);

CREATE INDEX IF NOT EXISTS "community_favorites_template_idx"
  ON "bazaar-vid_community_favorite" ("template_id");

-- 4) community_event
CREATE TABLE IF NOT EXISTS "bazaar-vid_community_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "bazaar-vid_community_template"(id) ON DELETE CASCADE,
  "user_id" varchar(255),
  "event_type" varchar(50) NOT NULL,
  "source" varchar(50),
  "project_id" uuid,
  "scene_count" integer,
  "referrer" text,
  "user_agent" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "community_events_template_idx"
  ON "bazaar-vid_community_event" ("template_id", "created_at");
CREATE INDEX IF NOT EXISTS "community_events_type_idx"
  ON "bazaar-vid_community_event" ("event_type", "created_at");

-- 5) community_metrics_daily
CREATE TABLE IF NOT EXISTS "bazaar-vid_community_metrics_daily" (
  "template_id" uuid NOT NULL REFERENCES "bazaar-vid_community_template"(id) ON DELETE CASCADE,
  "day" date NOT NULL,
  "event_type" varchar(50) NOT NULL,
  "count" bigint NOT NULL DEFAULT 0,
  CONSTRAINT "community_metrics_daily_pk" PRIMARY KEY ("template_id", "day", "event_type")
);

