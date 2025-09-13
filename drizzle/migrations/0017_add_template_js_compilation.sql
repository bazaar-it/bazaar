-- Add JS compilation columns to templates table
ALTER TABLE "bazaar-vid_templates" 
ADD COLUMN "js_code" TEXT,
ADD COLUMN "js_compiled_at" TIMESTAMP WITH TIME ZONE,
ADD COLUMN "compilation_error" TEXT;

-- Create index for compiled templates
CREATE INDEX IF NOT EXISTS "templates_compiled_idx" 
ON "bazaar-vid_templates" ("js_compiled_at") 
WHERE "js_code" IS NOT NULL;