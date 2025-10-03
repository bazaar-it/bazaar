-- Shared brand repository tables to enable cross-project cache reuse

CREATE TABLE IF NOT EXISTS "bazaar-vid_brand_repository" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "normalized_url" text NOT NULL,
    "original_url" text NOT NULL,
    "first_extracted_by" varchar(255),
    "latest_extraction_id" uuid,
    "brand_data" jsonb NOT NULL,
    "colors" jsonb DEFAULT '{}'::jsonb,
    "typography" jsonb DEFAULT '{}'::jsonb,
    "logos" jsonb DEFAULT '{}'::jsonb,
    "copy_voice" jsonb DEFAULT '{}'::jsonb,
    "product_narrative" jsonb DEFAULT '{}'::jsonb,
    "social_proof" jsonb DEFAULT '{}'::jsonb,
    "screenshots" jsonb DEFAULT '[]'::jsonb,
    "media_assets" jsonb DEFAULT '[]'::jsonb,
    "confidence_score" real DEFAULT 0.95,
    "review_status" text DEFAULT 'automated',
    "extraction_version" text DEFAULT '1.0.0',
    "usage_count" integer DEFAULT 0,
    "last_used_at" timestamptz,
    "last_extracted_at" timestamptz,
    "ttl" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "bazaar-vid_brand_repository"
  ADD CONSTRAINT "brand_repository_first_extractor_fk"
  FOREIGN KEY ("first_extracted_by") REFERENCES "bazaar-vid_user"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS brand_repo_url_unique_idx
  ON "bazaar-vid_brand_repository" (normalized_url);
CREATE INDEX IF NOT EXISTS brand_repo_url_idx
  ON "bazaar-vid_brand_repository" (normalized_url);
CREATE INDEX IF NOT EXISTS brand_repo_usage_idx
  ON "bazaar-vid_brand_repository" (usage_count DESC);
CREATE INDEX IF NOT EXISTS brand_repo_quality_idx
  ON "bazaar-vid_brand_repository" (review_status, confidence_score DESC);
CREATE INDEX IF NOT EXISTS brand_repo_ttl_idx
  ON "bazaar-vid_brand_repository" (ttl);

CREATE TABLE IF NOT EXISTS "bazaar-vid_project_brand_usage" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" uuid NOT NULL,
    "brand_repository_id" uuid NOT NULL,
    "used_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "bazaar-vid_project_brand_usage"
  ADD CONSTRAINT "project_brand_usage_project_fk"
  FOREIGN KEY ("project_id") REFERENCES "bazaar-vid_project"("id") ON DELETE CASCADE;
ALTER TABLE "bazaar-vid_project_brand_usage"
  ADD CONSTRAINT "project_brand_usage_brand_fk"
  FOREIGN KEY ("brand_repository_id") REFERENCES "bazaar-vid_brand_repository"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS project_brand_unique_idx
  ON "bazaar-vid_project_brand_usage" (project_id, brand_repository_id);
CREATE INDEX IF NOT EXISTS project_brand_project_idx
  ON "bazaar-vid_project_brand_usage" (project_id);
CREATE INDEX IF NOT EXISTS project_brand_repo_idx
  ON "bazaar-vid_project_brand_usage" (brand_repository_id);

CREATE TABLE IF NOT EXISTS "bazaar-vid_brand_extraction_cache" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "normalized_url" text NOT NULL,
    "cache_key" text NOT NULL,
    "raw_html" text,
    "screenshot_urls" jsonb DEFAULT '[]'::jsonb,
    "color_swatches" jsonb DEFAULT '[]'::jsonb,
    "ttl" timestamptz NOT NULL,
    "extracted_at" timestamptz NOT NULL DEFAULT now(),
    "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brand_cache_url_unique_idx
  ON "bazaar-vid_brand_extraction_cache" (normalized_url);
CREATE UNIQUE INDEX IF NOT EXISTS brand_cache_key_unique_idx
  ON "bazaar-vid_brand_extraction_cache" (cache_key);
CREATE INDEX IF NOT EXISTS brand_cache_ttl_idx
  ON "bazaar-vid_brand_extraction_cache" (ttl);
