-- COMPLETE Migration Script Generated: 2025-08-12
-- From: Dev Database  
-- To: Production Database
-- WARNING: Review VERY carefully before executing!
-- This includes ALL differences found between dev and prod

-- ============================================
-- CRITICAL: MISSING COLUMNS IN EXISTING TABLES
-- ============================================

-- Add 18 missing columns to bazaar-vid_custom_component_job
ALTER TABLE "bazaar-vid_custom_component_job" 
ADD COLUMN IF NOT EXISTS "last_successful_step" character varying(255),
ADD COLUMN IF NOT EXISTS "next_retry_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "error_context" jsonb,
ADD COLUMN IF NOT EXISTS "checkpoint_data" jsonb,
ADD COLUMN IF NOT EXISTS "last_step" character varying(255),
ADD COLUMN IF NOT EXISTS "task_id" uuid,
ADD COLUMN IF NOT EXISTS "internal_status" character varying(50),
ADD COLUMN IF NOT EXISTS "requires_input" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "input_type" character varying(50),
ADD COLUMN IF NOT EXISTS "task_state" jsonb,
ADD COLUMN IF NOT EXISTS "artifacts" jsonb,
ADD COLUMN IF NOT EXISTS "history" jsonb,
ADD COLUMN IF NOT EXISTS "sse_enabled" boolean DEFAULT true;

-- Add isFavorite to projects
ALTER TABLE "bazaar-vid_project" 
ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- COLUMN TYPE/DEFAULT CHANGES (REQUIRES CAREFUL HANDLING)
-- ============================================

-- WARNING: Changing ID type in export_analytics - THIS NEEDS CAREFUL MIGRATION
-- Current prod has text, dev has uuid
-- This is a BREAKING change that needs data migration
-- ALTER TABLE "bazaar-vid_export_analytics" 
-- ALTER COLUMN "id" TYPE uuid USING id::uuid,
-- ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Change default daily credits (business decision needed!)
-- ALTER TABLE "bazaar-vid_user_credits" 
-- ALTER COLUMN "daily_credits" SET DEFAULT 150;

-- Make response_time NOT NULL in api_usage_metric
-- First update any NULL values
-- UPDATE "bazaar-vid_api_usage_metric" SET response_time = 0 WHERE response_time IS NULL;
-- ALTER TABLE "bazaar-vid_api_usage_metric" 
-- ALTER COLUMN "response_time" SET NOT NULL;

-- ============================================
-- NEW TABLES (14 tables)
-- ============================================

-- Table: bazaar-vid_scene_plan
CREATE TABLE IF NOT EXISTS "bazaar-vid_scene_plan" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL,
  "messageId" uuid,
  "rawReasoning" text NOT NULL,
  "planData" jsonb NOT NULL,
  "userPrompt" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_scene_specs
CREATE TABLE IF NOT EXISTS "bazaar-vid_scene_specs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL,
  "sceneId" character varying(255) NOT NULL,
  "name" character varying(255),
  "spec" jsonb NOT NULL,
  "version" character varying(10) NOT NULL DEFAULT '1.0'::character varying,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "createdBy" character varying(255),
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_component_error
CREATE TABLE IF NOT EXISTS "bazaar-vid_component_error" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" uuid NOT NULL,
  "errorType" character varying(100) NOT NULL,
  "details" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_patch
CREATE TABLE IF NOT EXISTS "bazaar-vid_patch" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL,
  "patch" jsonb NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_changelog_entries
CREATE TABLE IF NOT EXISTS "bazaar-vid_changelog_entries" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "pr_number" integer NOT NULL,
  "repository" character varying(255) NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "labels" jsonb,
  "author" character varying(255) NOT NULL,
  "merged_at" timestamp with time zone,
  "status" character varying(50) NOT NULL DEFAULT 'draft'::character varying,
  "category" character varying(100),
  "breaking_changes" boolean NOT NULL DEFAULT false,
  "migration_required" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_figma_connections
CREATE TABLE IF NOT EXISTS "bazaar-vid_figma_connections" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" character varying(255) NOT NULL,
  "figma_user_id" character varying(255) NOT NULL,
  "figma_email" character varying(255),
  "access_token" text NOT NULL,
  "refresh_token" text,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_github_connection
CREATE TABLE IF NOT EXISTS "bazaar-vid_github_connection" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" character varying(255) NOT NULL,
  "github_user_id" integer NOT NULL,
  "github_username" character varying(255) NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "expires_at" timestamp with time zone,
  "scope" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_component_cache
CREATE TABLE IF NOT EXISTS "bazaar-vid_component_cache" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cache_key" character varying(255) NOT NULL,
  "user_id" character varying(255) NOT NULL,
  "repository" character varying(255) NOT NULL,
  "framework" character varying(50) NOT NULL,
  "components" jsonb NOT NULL,
  "metadata" jsonb,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_figma_file_cache
CREATE TABLE IF NOT EXISTS "bazaar-vid_figma_file_cache" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "file_key" character varying(255) NOT NULL,
  "file_name" character varying(255) NOT NULL,
  "components" jsonb NOT NULL,
  "pages" jsonb NOT NULL,
  "styles" jsonb,
  "variables" jsonb,
  "indexed_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_modified" timestamp with time zone,
  "version" character varying(50),
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_figma_imports
CREATE TABLE IF NOT EXISTS "bazaar-vid_figma_imports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL,
  "scene_id" uuid,
  "file_key" character varying(255) NOT NULL,
  "node_id" character varying(255),
  "import_type" character varying(50) NOT NULL,
  "tsx_code" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" character varying(255),
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_figma_webhooks
CREATE TABLE IF NOT EXISTS "bazaar-vid_figma_webhooks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "webhook_id" character varying(255) NOT NULL,
  "team_id" character varying(255) NOT NULL,
  "event_type" character varying(100) NOT NULL,
  "endpoint" text NOT NULL,
  "status" character varying(50) NOT NULL DEFAULT 'active'::character varying,
  "description" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_evals
CREATE TABLE IF NOT EXISTS "bazaar-vid_evals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" character varying(255) NOT NULL,
  "model" character varying(100) NOT NULL,
  "input" jsonb NOT NULL,
  "expected" jsonb,
  "output" jsonb,
  "result" character varying(50) NOT NULL,
  "error" text,
  "duration_ms" integer,
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" character varying(255),
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_project_asset
CREATE TABLE IF NOT EXISTS "bazaar-vid_project_asset" (
  "id" text NOT NULL,
  "project_id" uuid NOT NULL,
  "asset_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Table: bazaar-vid_asset
CREATE TABLE IF NOT EXISTS "bazaar-vid_asset" (
  "id" text NOT NULL,
  "user_id" character varying(255) NOT NULL,
  "file_name" text NOT NULL,
  "file_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "storage_key" text NOT NULL,
  "storage_url" text NOT NULL,
  "thumbnail_url" text,
  "width" integer,
  "height" integer,
  "duration" real,
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  PRIMARY KEY (id)
);

-- ============================================
-- INDEXES (Add all missing indexes)
-- ============================================

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS "scene_plan_project_idx" ON "bazaar-vid_scene_plan" ("projectId");
CREATE INDEX IF NOT EXISTS "scene_spec_created_at_idx" ON "bazaar-vid_scene_specs" ("createdAt");
CREATE INDEX IF NOT EXISTS "scene_spec_project_idx" ON "bazaar-vid_scene_specs" ("projectId");
CREATE INDEX IF NOT EXISTS "scene_spec_scene_id_idx" ON "bazaar-vid_scene_specs" ("sceneId");
CREATE INDEX IF NOT EXISTS "scene_spec_spec_gin_idx" ON "bazaar-vid_scene_specs" USING gin ("spec");
CREATE UNIQUE INDEX IF NOT EXISTS "scene_spec_unique_scene_id" ON "bazaar-vid_scene_specs" ("projectId", "sceneId");
CREATE INDEX IF NOT EXISTS "component_error_job_idx" ON "bazaar-vid_component_error" ("jobId");
CREATE INDEX IF NOT EXISTS "patch_project_idx" ON "bazaar-vid_patch" ("projectId");
CREATE INDEX IF NOT EXISTS "changelog_created_at_idx" ON "bazaar-vid_changelog_entries" ("created_at");
CREATE INDEX IF NOT EXISTS "changelog_merged_at_idx" ON "bazaar-vid_changelog_entries" ("merged_at");
CREATE INDEX IF NOT EXISTS "changelog_pr_idx" ON "bazaar-vid_changelog_entries" ("pr_number", "repository");
CREATE INDEX IF NOT EXISTS "changelog_repository_idx" ON "bazaar-vid_changelog_entries" ("repository");
CREATE INDEX IF NOT EXISTS "changelog_status_idx" ON "bazaar-vid_changelog_entries" ("status");
CREATE INDEX IF NOT EXISTS "figma_connections_user_idx" ON "bazaar-vid_figma_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "figma_connections_user_unique" ON "bazaar-vid_figma_connections" ("user_id");
CREATE INDEX IF NOT EXISTS "github_connection_github_user_id_idx" ON "bazaar-vid_github_connection" ("github_user_id");
CREATE INDEX IF NOT EXISTS "github_connection_user_id_idx" ON "bazaar-vid_github_connection" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "bazaar-vid_component_cache_cache_key_key" ON "bazaar-vid_component_cache" ("cache_key");
CREATE INDEX IF NOT EXISTS "component_cache_expires_at_idx" ON "bazaar-vid_component_cache" ("expires_at");
CREATE INDEX IF NOT EXISTS "component_cache_key_idx" ON "bazaar-vid_component_cache" ("cache_key");
CREATE INDEX IF NOT EXISTS "component_cache_user_id_idx" ON "bazaar-vid_component_cache" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "bazaar-vid_figma_file_cache_file_key_key" ON "bazaar-vid_figma_file_cache" ("file_key");
CREATE INDEX IF NOT EXISTS "figma_file_cache_file_key_idx" ON "bazaar-vid_figma_file_cache" ("file_key");
CREATE INDEX IF NOT EXISTS "figma_file_cache_indexed_at_idx" ON "bazaar-vid_figma_file_cache" ("indexed_at");
CREATE INDEX IF NOT EXISTS "figma_imports_file_key_idx" ON "bazaar-vid_figma_imports" ("file_key");
CREATE INDEX IF NOT EXISTS "figma_imports_project_idx" ON "bazaar-vid_figma_imports" ("project_id");
CREATE INDEX IF NOT EXISTS "figma_imports_scene_idx" ON "bazaar-vid_figma_imports" ("scene_id");
CREATE UNIQUE INDEX IF NOT EXISTS "bazaar-vid_figma_webhooks_webhook_id_key" ON "bazaar-vid_figma_webhooks" ("webhook_id");
CREATE INDEX IF NOT EXISTS "figma_webhooks_active_idx" ON "bazaar-vid_figma_webhooks" ("status") WHERE status = 'active';
CREATE INDEX IF NOT EXISTS "figma_webhooks_team_idx" ON "bazaar-vid_figma_webhooks" ("team_id");
CREATE INDEX IF NOT EXISTS "evals_created_idx" ON "bazaar-vid_evals" ("created_at");
CREATE INDEX IF NOT EXISTS "evals_model_idx" ON "bazaar-vid_evals" ("model");
CREATE INDEX IF NOT EXISTS "evals_user_idx" ON "bazaar-vid_evals" ("user_id");
CREATE INDEX IF NOT EXISTS "bazaar-vid_project_asset_asset_id_idx" ON "bazaar-vid_project_asset" ("asset_id");
CREATE UNIQUE INDEX IF NOT EXISTS "bazaar-vid_project_asset_project_id_asset_id_idx" ON "bazaar-vid_project_asset" ("project_id", "asset_id");
CREATE INDEX IF NOT EXISTS "bazaar-vid_project_asset_project_id_idx" ON "bazaar-vid_project_asset" ("project_id");
CREATE INDEX IF NOT EXISTS "bazaar-vid_asset_deleted_at_idx" ON "bazaar-vid_asset" ("deleted_at");
CREATE INDEX IF NOT EXISTS "bazaar-vid_asset_user_id_idx" ON "bazaar-vid_asset" ("user_id");

-- Additional indexes that may be missing
CREATE UNIQUE INDEX IF NOT EXISTS "bazaar-vid_promo_codes_code_unique" ON "bazaar-vid_promo_codes" ("code");
CREATE INDEX IF NOT EXISTS "promo_code_usage_code_idx" ON "bazaar-vid_promo_code_usage" ("promo_code_id");
CREATE INDEX IF NOT EXISTS "promo_code_usage_user_idx" ON "bazaar-vid_promo_code_usage" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "bazaar-vid_paywall_analytics_date_unique" ON "bazaar-vid_paywall_analytics" ("date");
CREATE INDEX IF NOT EXISTS "api_metrics_composite_idx" ON "bazaar-vid_api_usage_metric" ("user_id", "timestamp", "success");
CREATE INDEX IF NOT EXISTS "api_metrics_provider_idx" ON "bazaar-vid_api_usage_metric" ("provider");
CREATE INDEX IF NOT EXISTS "api_metrics_success_idx" ON "bazaar-vid_api_usage_metric" ("success");
CREATE INDEX IF NOT EXISTS "api_metrics_timestamp_idx" ON "bazaar-vid_api_usage_metric" ("timestamp");
CREATE INDEX IF NOT EXISTS "api_metrics_user_idx" ON "bazaar-vid_api_usage_metric" ("user_id");

-- ============================================
-- WARNINGS AND MANUAL STEPS REQUIRED
-- ============================================

-- WARNING 1: The export_analytics ID type change (text -> uuid) is DANGEROUS
--            It requires careful data migration and may break existing references
--            DO NOT run the ALTER COLUMN TYPE without a proper migration plan

-- WARNING 2: The daily_credits default change (5 -> 150) is a business decision
--            This will affect all NEW users but not existing ones
--            Consider if you want to update existing users too

-- WARNING 3: The 18 new columns in custom_component_job may require application
--            code updates to handle them properly

-- WARNING 4: Column order differences exist but don't affect functionality
--            However, any code using ordinal positions will break

-- END OF MIGRATION SCRIPT