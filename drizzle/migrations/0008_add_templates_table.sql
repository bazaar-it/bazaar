-- Create templates table for dynamic template system
CREATE TABLE IF NOT EXISTS "bazaar-vid_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"tsx_code" text NOT NULL,
	"duration" integer NOT NULL,
	"preview_frame" integer DEFAULT 15,
	"supported_formats" jsonb DEFAULT '["landscape","portrait","square"]',
	"thumbnail_url" text,
	"category" varchar(100),
	"tags" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"source_project_id" uuid,
	"source_scene_id" uuid,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "bazaar-vid_templates" ADD CONSTRAINT "templates_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "bazaar-vid_templates" ADD CONSTRAINT "templates_source_project_id_fkey" 
  FOREIGN KEY ("source_project_id") REFERENCES "bazaar-vid_project"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "bazaar-vid_templates" ADD CONSTRAINT "templates_source_scene_id_fkey" 
  FOREIGN KEY ("source_scene_id") REFERENCES "bazaar-vid_scene"("id") ON DELETE no action ON UPDATE no action;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "templates_active_idx" ON "bazaar-vid_templates" ("is_active");
CREATE INDEX IF NOT EXISTS "templates_official_idx" ON "bazaar-vid_templates" ("is_official");
CREATE INDEX IF NOT EXISTS "templates_category_idx" ON "bazaar-vid_templates" ("category");
CREATE INDEX IF NOT EXISTS "templates_created_by_idx" ON "bazaar-vid_templates" ("created_by");
CREATE INDEX IF NOT EXISTS "templates_created_at_idx" ON "bazaar-vid_templates" ("created_at");

-- Fix api_usage_metric column mappings (rename columns)
ALTER TABLE "bazaar-vid_api_usage_metric" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "bazaar-vid_api_usage_metric" RENAME COLUMN "projectId" TO "project_id";
ALTER TABLE "bazaar-vid_api_usage_metric" RENAME COLUMN "toolName" TO "tool_name";
ALTER TABLE "bazaar-vid_api_usage_metric" RENAME COLUMN "responseTime" TO "response_time";
ALTER TABLE "bazaar-vid_api_usage_metric" RENAME COLUMN "tokenCount" TO "token_count";
ALTER TABLE "bazaar-vid_api_usage_metric" RENAME COLUMN "errorType" TO "error_type";
ALTER TABLE "bazaar-vid_api_usage_metric" RENAME COLUMN "errorMessage" TO "error_message";

-- Add missing columns to api_usage_metric
ALTER TABLE "bazaar-vid_api_usage_metric" ADD COLUMN IF NOT EXISTS "input_tokens" integer;
ALTER TABLE "bazaar-vid_api_usage_metric" ADD COLUMN IF NOT EXISTS "output_tokens" integer;
ALTER TABLE "bazaar-vid_api_usage_metric" ADD COLUMN IF NOT EXISTS "metadata" jsonb;