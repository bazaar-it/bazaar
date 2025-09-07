-- Sprint 106: Phase 2 - Add compilation versioning
-- Adds compilation_version and compile_meta for tracking compilation transformations
-- Date: 2025-09-07

-- Add compilation version tracking
ALTER TABLE "bazaar-vid_scene"
  ADD COLUMN compilation_version INTEGER DEFAULT 1,
  ADD COLUMN compile_meta JSONB;

-- Comment on columns for documentation
COMMENT ON COLUMN "bazaar-vid_scene".compilation_version IS 'Version of the compilation strategy used';
COMMENT ON COLUMN "bazaar-vid_scene".compile_meta IS 'Metadata about the compilation process';