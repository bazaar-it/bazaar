-- Migration Script Generated: 2025-08-12T15:49:56.714Z
-- From: Dev Database
-- To: Production Database
-- WARNING: Review carefully before executing!

-- ============================================
-- NEW TABLES (14 tables)
-- ============================================

-- Table: bazaar-vid_scene_plan
CREATE TABLE "bazaar-vid_scene_plan" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL,
  "messageId" uuid,
  "rawReasoning" text NOT NULL,
  "planData" jsonb NOT NULL,
  "userPrompt" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: bazaar-vid_scene_specs
CREATE TABLE "bazaar-vid_scene_specs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL,
  "sceneId" character varying(255) NOT NULL,
  "name" character varying(255),
  "spec" jsonb NOT NULL,
  "version" character varying(10) NOT NULL DEFAULT '1.0'::character varying,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "createdBy" character varying(255)
);

-- Table: bazaar-vid_component_error
CREATE TABLE "bazaar-vid_component_error" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "jobId" uuid NOT NULL,
  "errorType" character varying(100) NOT NULL,
  "details" text NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: bazaar-vid_patch
CREATE TABLE "bazaar-vid_patch" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "projectId" uuid NOT NULL,
  "patch" jsonb NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: bazaar-vid_changelog_entries
CREATE TABLE "bazaar-vid_changelog_entries" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "pr_number" integer NOT NULL,
  "repository_full_name" text NOT NULL,
  "repository_owner" text NOT NULL,
  "repository_name" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "type" text NOT NULL,
  "author_username" text NOT NULL,
  "author_avatar" text,
  "author_url" text,
  "video_url" text,
  "thumbnail_url" text,
  "gif_url" text,
  "video_duration" integer,
  "video_format" text DEFAULT 'landscape'::text,
  "status" text NOT NULL DEFAULT 'queued'::text,
  "job_id" text,
  "error_message" text,
  "additions" integer DEFAULT 0,
  "deletions" integer DEFAULT 0,
  "files_changed" integer DEFAULT 0,
  "view_count" integer DEFAULT 0,
  "version" text,
  "merged_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" timestamp with time zone
);

-- Table: bazaar-vid_figma_connections
CREATE TABLE "bazaar-vid_figma_connections" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" character varying(255) NOT NULL,
  "figma_user_id" character varying(255) NOT NULL,
  "figma_user_email" character varying(255),
  "figma_user_handle" character varying(255),
  "access_token" text NOT NULL,
  "refresh_token" text,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: bazaar-vid_github_connection
CREATE TABLE "bazaar-vid_github_connection" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" character varying(255) NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "token_type" character varying(50) DEFAULT 'bearer'::character varying,
  "scope" text,
  "github_user_id" character varying(255) NOT NULL,
  "github_username" character varying(255) NOT NULL,
  "github_email" character varying(255),
  "connected_at" timestamp with time zone NOT NULL DEFAULT now(),
  "last_synced_at" timestamp with time zone,
  "is_active" boolean NOT NULL DEFAULT true,
  "selected_repos" jsonb DEFAULT '[]'::jsonb,
  "style_profile" jsonb
);

-- Table: bazaar-vid_component_cache
CREATE TABLE "bazaar-vid_component_cache" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cache_key" character varying(500) NOT NULL,
  "user_id" character varying(255) NOT NULL,
  "repository" character varying(255) NOT NULL,
  "file_path" text NOT NULL,
  "component_name" character varying(255) NOT NULL,
  "parsed_data" jsonb NOT NULL,
  "raw_content" text,
  "file_hash" character varying(64),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  "access_count" integer NOT NULL DEFAULT 0,
  "last_accessed_at" timestamp with time zone
);

-- Table: bazaar-vid_figma_file_cache
CREATE TABLE "bazaar-vid_figma_file_cache" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "file_key" character varying(255) NOT NULL,
  "file_name" character varying(255),
  "team_id" character varying(255),
  "team_name" character varying(255),
  "project_id" character varying(255),
  "project_name" character varying(255),
  "last_modified" timestamp with time zone,
  "indexed_at" timestamp with time zone,
  "component_catalog" jsonb,
  "thumbnail_cache" jsonb,
  "file_structure" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: bazaar-vid_figma_imports
CREATE TABLE "bazaar-vid_figma_imports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL,
  "scene_id" uuid,
  "file_key" character varying(255) NOT NULL,
  "file_name" character varying(255),
  "node_id" character varying(255) NOT NULL,
  "node_name" character varying(255),
  "node_type" character varying(50),
  "export_format" character varying(10),
  "remotion_code" text,
  "assets" jsonb,
  "design_tokens" jsonb,
  "motion_hints" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: bazaar-vid_figma_webhooks
CREATE TABLE "bazaar-vid_figma_webhooks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "webhook_id" character varying(255) NOT NULL,
  "team_id" character varying(255) NOT NULL,
  "event_type" character varying(50) NOT NULL,
  "endpoint" text NOT NULL,
  "passcode" character varying(255) NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: bazaar-vid_evals
CREATE TABLE "bazaar-vid_evals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" character varying(255) NOT NULL,
  "youtubeUrl" text NOT NULL,
  "model" character varying(100) NOT NULL,
  "strategy" character varying(50) NOT NULL,
  "prompt" text,
  "generatedCode" text NOT NULL,
  "timeMs" integer NOT NULL,
  "tokensUsed" integer,
  "cost" real,
  "error" text,
  "metadata" jsonb,
  "createdAt" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: bazaar-vid_project_asset
CREATE TABLE "bazaar-vid_project_asset" (
  "id" text NOT NULL,
  "project_id" uuid NOT NULL,
  "asset_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: bazaar-vid_asset
CREATE TABLE "bazaar-vid_asset" (
  "id" text NOT NULL,
  "user_id" character varying(255) NOT NULL,
  "url" text NOT NULL,
  "original_name" text NOT NULL,
  "custom_name" text,
  "file_size" bigint,
  "mime_type" text,
  "type" text NOT NULL DEFAULT 'image'::text,
  "hash" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" timestamp with time zone,
  "width" integer,
  "height" integer,
  "duration" integer,
  "thumbnail_url" text,
  "usage_count" integer DEFAULT 0,
  "last_used_at" timestamp with time zone,
  "tags" ARRAY
);

-- ============================================
-- COLUMN MODIFICATIONS
-- ============================================

-- Add column to bazaar-vid_project
ALTER TABLE "bazaar-vid_project" ADD COLUMN "isFavorite" boolean DEFAULT false NOT NULL;

-- ============================================
-- INDEXES
-- ============================================

-- Index for bazaar-vid_scene_plan
CREATE INDEX scene_plan_project_idx ON public."bazaar-vid_scene_plan" USING btree ("projectId");
-- Index for bazaar-vid_scene_specs
CREATE INDEX scene_spec_created_at_idx ON public."bazaar-vid_scene_specs" USING btree ("createdAt");
-- Index for bazaar-vid_scene_specs
CREATE INDEX scene_spec_project_idx ON public."bazaar-vid_scene_specs" USING btree ("projectId");
-- Index for bazaar-vid_scene_specs
CREATE INDEX scene_spec_scene_id_idx ON public."bazaar-vid_scene_specs" USING btree ("sceneId");
-- Index for bazaar-vid_scene_specs
CREATE INDEX scene_spec_spec_gin_idx ON public."bazaar-vid_scene_specs" USING gin (spec);
-- Index for bazaar-vid_scene_specs
CREATE UNIQUE INDEX scene_spec_unique_scene_id ON public."bazaar-vid_scene_specs" USING btree ("projectId", "sceneId");
-- Index for bazaar-vid_component_error
CREATE INDEX component_error_job_idx ON public."bazaar-vid_component_error" USING btree ("jobId");
-- Index for bazaar-vid_patch
CREATE INDEX patch_project_idx ON public."bazaar-vid_patch" USING btree ("projectId");
-- Index for bazaar-vid_changelog_entries
CREATE INDEX changelog_created_at_idx ON public."bazaar-vid_changelog_entries" USING btree (created_at);
-- Index for bazaar-vid_changelog_entries
CREATE INDEX changelog_merged_at_idx ON public."bazaar-vid_changelog_entries" USING btree (merged_at);
-- Index for bazaar-vid_changelog_entries
CREATE INDEX changelog_pr_idx ON public."bazaar-vid_changelog_entries" USING btree (repository_full_name, pr_number);
-- Index for bazaar-vid_changelog_entries
CREATE INDEX changelog_repository_idx ON public."bazaar-vid_changelog_entries" USING btree (repository_full_name);
-- Index for bazaar-vid_changelog_entries
CREATE INDEX changelog_status_idx ON public."bazaar-vid_changelog_entries" USING btree (status);
-- Index for bazaar-vid_figma_connections
CREATE INDEX figma_connections_user_idx ON public."bazaar-vid_figma_connections" USING btree (user_id);
-- Index for bazaar-vid_figma_connections
CREATE UNIQUE INDEX figma_connections_user_unique ON public."bazaar-vid_figma_connections" USING btree (user_id);
-- Index for bazaar-vid_github_connection
CREATE INDEX github_connection_github_user_id_idx ON public."bazaar-vid_github_connection" USING btree (github_user_id);
-- Index for bazaar-vid_github_connection
CREATE INDEX github_connection_user_id_idx ON public."bazaar-vid_github_connection" USING btree (user_id);
-- Index for bazaar-vid_component_cache
CREATE UNIQUE INDEX "bazaar-vid_component_cache_cache_key_key" ON public."bazaar-vid_component_cache" USING btree (cache_key);
-- Index for bazaar-vid_component_cache
CREATE INDEX component_cache_expires_at_idx ON public."bazaar-vid_component_cache" USING btree (expires_at);
-- Index for bazaar-vid_component_cache
CREATE INDEX component_cache_key_idx ON public."bazaar-vid_component_cache" USING btree (cache_key);
-- Index for bazaar-vid_component_cache
CREATE INDEX component_cache_user_id_idx ON public."bazaar-vid_component_cache" USING btree (user_id);
-- Index for bazaar-vid_figma_file_cache
CREATE UNIQUE INDEX "bazaar-vid_figma_file_cache_file_key_key" ON public."bazaar-vid_figma_file_cache" USING btree (file_key);
-- Index for bazaar-vid_figma_file_cache
CREATE INDEX figma_file_cache_file_key_idx ON public."bazaar-vid_figma_file_cache" USING btree (file_key);
-- Index for bazaar-vid_figma_file_cache
CREATE INDEX figma_file_cache_indexed_at_idx ON public."bazaar-vid_figma_file_cache" USING btree (indexed_at);
-- Index for bazaar-vid_figma_imports
CREATE INDEX figma_imports_file_key_idx ON public."bazaar-vid_figma_imports" USING btree (file_key);
-- Index for bazaar-vid_figma_imports
CREATE INDEX figma_imports_project_idx ON public."bazaar-vid_figma_imports" USING btree (project_id);
-- Index for bazaar-vid_figma_imports
CREATE INDEX figma_imports_scene_idx ON public."bazaar-vid_figma_imports" USING btree (scene_id);
-- Index for bazaar-vid_figma_webhooks
CREATE UNIQUE INDEX "bazaar-vid_figma_webhooks_webhook_id_key" ON public."bazaar-vid_figma_webhooks" USING btree (webhook_id);
-- Index for bazaar-vid_figma_webhooks
CREATE INDEX figma_webhooks_active_idx ON public."bazaar-vid_figma_webhooks" USING btree (active);
-- Index for bazaar-vid_figma_webhooks
CREATE INDEX figma_webhooks_team_idx ON public."bazaar-vid_figma_webhooks" USING btree (team_id);
-- Index for bazaar-vid_evals
CREATE INDEX evals_created_idx ON public."bazaar-vid_evals" USING btree ("createdAt");
-- Index for bazaar-vid_evals
CREATE INDEX evals_model_idx ON public."bazaar-vid_evals" USING btree (model);
-- Index for bazaar-vid_evals
CREATE INDEX evals_user_idx ON public."bazaar-vid_evals" USING btree ("userId");
-- Index for bazaar-vid_project_asset
CREATE INDEX "bazaar-vid_project_asset_asset_id_idx" ON public."bazaar-vid_project_asset" USING btree (asset_id);
-- Index for bazaar-vid_project_asset
CREATE UNIQUE INDEX "bazaar-vid_project_asset_project_id_asset_id_idx" ON public."bazaar-vid_project_asset" USING btree (project_id, asset_id);
-- Index for bazaar-vid_project_asset
CREATE INDEX "bazaar-vid_project_asset_project_id_idx" ON public."bazaar-vid_project_asset" USING btree (project_id);
-- Index for bazaar-vid_asset
CREATE INDEX "bazaar-vid_asset_deleted_at_idx" ON public."bazaar-vid_asset" USING btree (deleted_at);
-- Index for bazaar-vid_asset
CREATE INDEX "bazaar-vid_asset_user_id_idx" ON public."bazaar-vid_asset" USING btree (user_id);

-- New index for bazaar-vid_promo_codes
CREATE UNIQUE INDEX "bazaar-vid_promo_codes_code_unique" ON public."bazaar-vid_promo_codes" USING btree (code);

-- New index for bazaar-vid_promo_code_usage
CREATE INDEX promo_code_usage_code_idx ON public."bazaar-vid_promo_code_usage" USING btree (promo_code_id);

-- New index for bazaar-vid_promo_code_usage
CREATE INDEX promo_code_usage_user_idx ON public."bazaar-vid_promo_code_usage" USING btree (user_id);

-- New index for bazaar-vid_paywall_analytics
CREATE UNIQUE INDEX "bazaar-vid_paywall_analytics_date_unique" ON public."bazaar-vid_paywall_analytics" USING btree (date);

-- New index for bazaar-vid_api_usage_metric
CREATE INDEX api_metrics_composite_idx ON public."bazaar-vid_api_usage_metric" USING btree (provider, "timestamp", success);

-- New index for bazaar-vid_api_usage_metric
CREATE INDEX api_metrics_provider_idx ON public."bazaar-vid_api_usage_metric" USING btree (provider);

-- New index for bazaar-vid_api_usage_metric
CREATE INDEX api_metrics_success_idx ON public."bazaar-vid_api_usage_metric" USING btree (success);

-- New index for bazaar-vid_api_usage_metric
CREATE INDEX api_metrics_timestamp_idx ON public."bazaar-vid_api_usage_metric" USING btree ("timestamp");

-- New index for bazaar-vid_api_usage_metric
CREATE INDEX api_metrics_user_idx ON public."bazaar-vid_api_usage_metric" USING btree (user_id);

-- New index for bazaar-vid_credit_package
CREATE INDEX credit_packages_active_idx ON public."bazaar-vid_credit_package" USING btree (active);

-- New index for bazaar-vid_credit_package
CREATE INDEX credit_packages_sort_idx ON public."bazaar-vid_credit_package" USING btree (sort_order);

-- New index for bazaar-vid_credit_transaction
CREATE INDEX credit_transactions_created_idx ON public."bazaar-vid_credit_transaction" USING btree (created_at);

-- New index for bazaar-vid_credit_transaction
CREATE INDEX credit_transactions_stripe_idx ON public."bazaar-vid_credit_transaction" USING btree (stripe_payment_intent_id);

-- New index for bazaar-vid_credit_transaction
CREATE INDEX credit_transactions_type_idx ON public."bazaar-vid_credit_transaction" USING btree (type);

-- New index for bazaar-vid_credit_transaction
CREATE INDEX credit_transactions_user_idx ON public."bazaar-vid_credit_transaction" USING btree (user_id);

-- New index for bazaar-vid_user_credits
CREATE INDEX user_credits_daily_reset_idx ON public."bazaar-vid_user_credits" USING btree (daily_reset_at);

-- New index for bazaar-vid_exports
CREATE UNIQUE INDEX "bazaar-vid_exports_pkey" ON public."bazaar-vid_exports" USING btree (id);

-- New index for bazaar-vid_exports
CREATE UNIQUE INDEX "bazaar-vid_exports_render_id_unique" ON public."bazaar-vid_exports" USING btree (render_id);

-- New index for bazaar-vid_exports
CREATE INDEX exports_created_idx ON public."bazaar-vid_exports" USING btree (created_at);

-- New index for bazaar-vid_exports
CREATE INDEX exports_project_idx ON public."bazaar-vid_exports" USING btree (project_id);

-- New index for bazaar-vid_exports
CREATE INDEX exports_render_idx ON public."bazaar-vid_exports" USING btree (render_id);

-- New index for bazaar-vid_exports
CREATE INDEX exports_user_idx ON public."bazaar-vid_exports" USING btree (user_id);

-- New index for bazaar-vid_export_analytics
CREATE INDEX export_analytics_created_idx ON public."bazaar-vid_export_analytics" USING btree (created_at);

-- New index for bazaar-vid_export_analytics
CREATE INDEX export_analytics_event_idx ON public."bazaar-vid_export_analytics" USING btree (event);

-- New index for bazaar-vid_export_analytics
CREATE INDEX export_analytics_export_idx ON public."bazaar-vid_export_analytics" USING btree (export_id);
