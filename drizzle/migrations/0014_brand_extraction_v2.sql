-- Migration: Brand Extraction V2
-- Purpose: Store comprehensive brand extraction data from Sprint 99.5 URL-to-Video V2
-- This migration adds tables to store the complete BrandJSONV2 structure

-- 1. Create brand_extraction table for storing complete extraction data
CREATE TABLE IF NOT EXISTS "bazaar-vid_brand_extraction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"project_id" uuid,
	"user_id" varchar(255) NOT NULL,
	
	-- Extraction metadata
	"extraction_id" text NOT NULL UNIQUE,
	"extraction_version" text DEFAULT '2.0.0' NOT NULL,
	"extraction_status" text DEFAULT 'processing' NOT NULL, -- processing, completed, failed
	
	-- Core brand data (simplified for quick access)
	"brand_name" text,
	"brand_tagline" text,
	"primary_color" text,
	"secondary_color" text,
	
	-- Complete analysis data from GPT-4.1-mini
	"visual_analysis" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Everything from screenshot analysis
	"content_analysis" jsonb DEFAULT '{}'::jsonb, -- HTML content analysis
	"synthesis" jsonb DEFAULT '{}'::jsonb, -- Combined insights
	
	-- Extracted structured data
	"brand_data" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Brand identity section
	"design_data" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Colors, typography, spacing
	"product_data" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Features, benefits, value props
	"social_proof_data" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Testimonials, stats, logos
	"content_data" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Keywords, tone, messaging
	"sections_data" jsonb DEFAULT '[]'::jsonb NOT NULL, -- Website sections identified
	
	-- Screenshots and media
	"screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL, -- Array of screenshot URLs and metadata
	"html_content" text, -- Raw HTML (first 100KB)
	"styles_extracted" jsonb DEFAULT '{}'::jsonb, -- Computed styles from page
	
	-- Confidence and metrics
	"confidence" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Confidence scores by category
	"processing_time_ms" integer,
	"tokens_used" integer,
	
	-- Timestamps
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"analyzed_at" timestamp with time zone
);

-- 2. Create story_arcs table for storing hero's journey narratives
CREATE TABLE IF NOT EXISTS "bazaar-vid_story_arc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"extraction_id" uuid NOT NULL,
	"project_id" uuid,
	"user_id" varchar(255) NOT NULL,
	
	-- Story arc metadata
	"title" text NOT NULL,
	"narrative_structure" text NOT NULL, -- Problem-Solution Flow, Feature Showcase, etc.
	"total_duration_frames" integer NOT NULL,
	"total_duration_seconds" numeric(5,2) NOT NULL,
	"style" text DEFAULT 'professional' NOT NULL, -- dramatic, energetic, professional, playful
	
	-- Brand context for the story
	"brand_context" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Name, tagline, problem, solution, features
	
	-- Scenes data (array of scene objects)
	"scenes" jsonb DEFAULT '[]'::jsonb NOT NULL, -- Complete scene specifications
	
	-- Generation metadata
	"generation_model" text,
	"generation_prompt" text,
	"generation_time_ms" integer,
	
	-- Status tracking
	"status" text DEFAULT 'draft' NOT NULL, -- draft, approved, rendered, published
	"approved_by" varchar(255),
	"approved_at" timestamp with time zone,
	
	-- Timestamps
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Create story_arc_scenes table for individual scene tracking
CREATE TABLE IF NOT EXISTS "bazaar-vid_story_arc_scene" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_arc_id" uuid NOT NULL,
	"scene_number" integer NOT NULL,
	
	-- Scene details
	"title" text NOT NULL,
	"duration_frames" integer NOT NULL,
	"narrative" text NOT NULL,
	"emotional_beat" text NOT NULL, -- problem, tension, discovery, transformation, triumph, invitation
	
	-- Visual specifications
	"visuals" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Background, elements, animations, transitions
	"text_content" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Headlines, subheadlines, body, CTA
	"ui_elements" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Buttons, cards, icons, stats
	"styling" jsonb DEFAULT '{}'::jsonb NOT NULL, -- Colors, typography
	
	-- Template information
	"template_name" text NOT NULL,
	"template_variant" text,
	"template_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	
	-- Edit instructions
	"edit_prompt" text,
	"edit_status" text DEFAULT 'pending', -- pending, generated, approved, rendered
	
	-- Generated code (if applicable)
	"generated_code" text,
	"code_version" integer DEFAULT 1,
	
	-- Timestamps
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Create extraction_cache table for faster retrieval
CREATE TABLE IF NOT EXISTS "bazaar-vid_extraction_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"url_hash" text NOT NULL, -- MD5 hash of URL for faster lookups
	"extraction_id" uuid NOT NULL,
	"cache_key" text NOT NULL UNIQUE,
	"cache_data" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"hit_count" integer DEFAULT 0,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "bazaar-vid_brand_extraction" 
	ADD CONSTRAINT "brand_extraction_project_id_fk" 
	FOREIGN KEY ("project_id") 
	REFERENCES "bazaar-vid_project"("id") 
	ON DELETE set null ON UPDATE no action;

ALTER TABLE "bazaar-vid_brand_extraction" 
	ADD CONSTRAINT "brand_extraction_user_id_fk" 
	FOREIGN KEY ("user_id") 
	REFERENCES "bazaar-vid_user"("id") 
	ON DELETE cascade ON UPDATE no action;

ALTER TABLE "bazaar-vid_story_arc" 
	ADD CONSTRAINT "story_arc_extraction_id_fk" 
	FOREIGN KEY ("extraction_id") 
	REFERENCES "bazaar-vid_brand_extraction"("id") 
	ON DELETE cascade ON UPDATE no action;

ALTER TABLE "bazaar-vid_story_arc" 
	ADD CONSTRAINT "story_arc_project_id_fk" 
	FOREIGN KEY ("project_id") 
	REFERENCES "bazaar-vid_project"("id") 
	ON DELETE set null ON UPDATE no action;

ALTER TABLE "bazaar-vid_story_arc" 
	ADD CONSTRAINT "story_arc_user_id_fk" 
	FOREIGN KEY ("user_id") 
	REFERENCES "bazaar-vid_user"("id") 
	ON DELETE cascade ON UPDATE no action;

ALTER TABLE "bazaar-vid_story_arc" 
	ADD CONSTRAINT "story_arc_approved_by_fk" 
	FOREIGN KEY ("approved_by") 
	REFERENCES "bazaar-vid_user"("id") 
	ON DELETE set null ON UPDATE no action;

ALTER TABLE "bazaar-vid_story_arc_scene" 
	ADD CONSTRAINT "story_arc_scene_story_arc_id_fk" 
	FOREIGN KEY ("story_arc_id") 
	REFERENCES "bazaar-vid_story_arc"("id") 
	ON DELETE cascade ON UPDATE no action;

ALTER TABLE "bazaar-vid_extraction_cache" 
	ADD CONSTRAINT "extraction_cache_extraction_id_fk" 
	FOREIGN KEY ("extraction_id") 
	REFERENCES "bazaar-vid_brand_extraction"("id") 
	ON DELETE cascade ON UPDATE no action;

-- Create indexes for performance
CREATE INDEX "brand_extraction_url_idx" ON "bazaar-vid_brand_extraction" USING btree ("url");
CREATE INDEX "brand_extraction_project_idx" ON "bazaar-vid_brand_extraction" USING btree ("project_id");
CREATE INDEX "brand_extraction_user_idx" ON "bazaar-vid_brand_extraction" USING btree ("user_id");
CREATE INDEX "brand_extraction_status_idx" ON "bazaar-vid_brand_extraction" USING btree ("extraction_status");
CREATE INDEX "brand_extraction_created_idx" ON "bazaar-vid_brand_extraction" USING btree ("created_at" DESC);
CREATE INDEX "brand_extraction_brand_name_idx" ON "bazaar-vid_brand_extraction" USING btree ("brand_name");

CREATE INDEX "story_arc_extraction_idx" ON "bazaar-vid_story_arc" USING btree ("extraction_id");
CREATE INDEX "story_arc_project_idx" ON "bazaar-vid_story_arc" USING btree ("project_id");
CREATE INDEX "story_arc_user_idx" ON "bazaar-vid_story_arc" USING btree ("user_id");
CREATE INDEX "story_arc_status_idx" ON "bazaar-vid_story_arc" USING btree ("status");
CREATE INDEX "story_arc_created_idx" ON "bazaar-vid_story_arc" USING btree ("created_at" DESC);

CREATE INDEX "story_arc_scene_arc_idx" ON "bazaar-vid_story_arc_scene" USING btree ("story_arc_id");
CREATE INDEX "story_arc_scene_number_idx" ON "bazaar-vid_story_arc_scene" USING btree ("story_arc_id", "scene_number");
CREATE INDEX "story_arc_scene_template_idx" ON "bazaar-vid_story_arc_scene" USING btree ("template_name");

CREATE INDEX "extraction_cache_url_hash_idx" ON "bazaar-vid_extraction_cache" USING btree ("url_hash");
CREATE INDEX "extraction_cache_extraction_idx" ON "bazaar-vid_extraction_cache" USING btree ("extraction_id");
CREATE INDEX "extraction_cache_expires_idx" ON "bazaar-vid_extraction_cache" USING btree ("expires_at");
CREATE UNIQUE INDEX "extraction_cache_key_idx" ON "bazaar-vid_extraction_cache" USING btree ("cache_key");

-- Add GIN indexes for JSONB columns for faster queries
CREATE INDEX "brand_extraction_visual_gin" ON "bazaar-vid_brand_extraction" USING gin ("visual_analysis");
CREATE INDEX "brand_extraction_brand_gin" ON "bazaar-vid_brand_extraction" USING gin ("brand_data");
CREATE INDEX "story_arc_scenes_gin" ON "bazaar-vid_story_arc" USING gin ("scenes");

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_brand_extraction_updated_at BEFORE UPDATE ON "bazaar-vid_brand_extraction"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_arc_updated_at BEFORE UPDATE ON "bazaar-vid_story_arc"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_arc_scene_updated_at BEFORE UPDATE ON "bazaar-vid_story_arc_scene"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE "bazaar-vid_brand_extraction" IS 'Stores comprehensive brand extraction data from website analysis using GPT-4.1-mini';
COMMENT ON TABLE "bazaar-vid_story_arc" IS 'Stores hero journey story arcs generated from brand extractions';
COMMENT ON TABLE "bazaar-vid_story_arc_scene" IS 'Individual scenes within a story arc with full specifications';
COMMENT ON TABLE "bazaar-vid_extraction_cache" IS 'Cache for brand extractions to avoid re-processing the same URLs';

COMMENT ON COLUMN "bazaar-vid_brand_extraction"."visual_analysis" IS 'Complete output from GPT-4.1-mini screenshot analysis';
COMMENT ON COLUMN "bazaar-vid_brand_extraction"."content_analysis" IS 'HTML and text content analysis';
COMMENT ON COLUMN "bazaar-vid_brand_extraction"."synthesis" IS 'Combined insights from visual and content analysis';

COMMENT ON COLUMN "bazaar-vid_story_arc"."scenes" IS 'Array of scene objects with complete specifications for video generation';
COMMENT ON COLUMN "bazaar-vid_story_arc_scene"."emotional_beat" IS 'The emotional progression: problem, tension, discovery, transformation, triumph, or invitation';