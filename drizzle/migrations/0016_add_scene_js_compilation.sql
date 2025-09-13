-- Sprint 106: Hybrid TSX/JS Storage
-- Adds compiled JavaScript storage to scenes table
-- This allows us to compile TSX once on the server and serve JS directly to clients
-- Date: 2025-09-02

-- Add columns for storing compiled JavaScript alongside TypeScript/JSX
ALTER TABLE "bazaar-vid_scene"
  ADD COLUMN js_code TEXT,
  ADD COLUMN js_compiled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN compilation_error TEXT;

-- Add index for tracking compilation status
CREATE INDEX idx_scene_compilation_status 
  ON "bazaar-vid_scene" (js_compiled_at) 
  WHERE js_code IS NOT NULL;

-- Add index for finding scenes that need compilation
CREATE INDEX idx_scene_needs_compilation 
  ON "bazaar-vid_scene" (id) 
  WHERE js_code IS NULL AND compilation_error IS NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN "bazaar-vid_scene".js_code IS 'Pre-compiled JavaScript code for browser execution';
COMMENT ON COLUMN "bazaar-vid_scene".js_compiled_at IS 'Timestamp when TSX was compiled to JS';
COMMENT ON COLUMN "bazaar-vid_scene".compilation_error IS 'Error message if compilation failed';