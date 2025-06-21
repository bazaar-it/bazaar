-- Migration: Add Project Memory & Image Analysis Tables
-- Phase 2: Persistent Context Storage for Async Architecture

-- Project Memory Table: Stores accumulated context across user sessions
CREATE TABLE IF NOT EXISTS "project_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"memory_type" varchar(50) NOT NULL, -- 'user_preference', 'scene_relationship', 'conversation_context'
	"memory_key" varchar(255) NOT NULL, -- e.g., 'duration_preference', 'style_preference', 'scene_reference'
	"memory_value" text NOT NULL, -- JSON or text value
	"confidence" decimal(3,2) DEFAULT 0.8, -- 0.0-1.0 confidence score
	"source_prompt" text, -- Original user prompt that created this memory
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp, -- Optional expiration for temporary context
	CONSTRAINT "project_memory_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
);

-- Image Analysis Table: Stores persistent image facts from vision analysis
CREATE TABLE IF NOT EXISTS "image_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"trace_id" varchar(100) NOT NULL, -- From startAsyncImageAnalysis()
	"image_urls" text[] NOT NULL, -- Array of uploaded image URLs
	"palette" text[] NOT NULL, -- Extracted color palette
	"typography" text NOT NULL, -- Typography analysis
	"mood" text NOT NULL, -- Style mood analysis
	"layout_json" jsonb, -- Structured layout analysis
	"processing_time_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"used_in_scenes" uuid[], -- Track which scenes used this analysis
	CONSTRAINT "image_analysis_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_project_memory_project_id" ON "project_memory" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_memory_type_key" ON "project_memory" ("memory_type", "memory_key");
CREATE INDEX IF NOT EXISTS "idx_image_analysis_project_id" ON "image_analysis" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_image_analysis_trace_id" ON "image_analysis" ("trace_id");

-- Add updated_at trigger for project_memory
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_memory_updated_at 
    BEFORE UPDATE ON project_memory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 