-- Create GitHub connection tables for the component animation feature
-- VERIFIED: user_id is VARCHAR(255) matching the bazaar-vid_user.id column type
-- Run this in Neon SQL editor

-- GitHub connections table
CREATE TABLE IF NOT EXISTS "bazaar-vid_github_connection" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES "bazaar-vid_user"(id) ON DELETE CASCADE,  -- ✅ Correct: VARCHAR(255) matches user table
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) DEFAULT 'bearer',
  scope TEXT,
  github_user_id VARCHAR(255) NOT NULL,
  github_username VARCHAR(255) NOT NULL,
  github_email VARCHAR(255),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  selected_repos JSONB DEFAULT '[]'::jsonb,
  style_profile JSONB
);

-- Component cache table
CREATE TABLE IF NOT EXISTS "bazaar-vid_component_cache" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(500) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL REFERENCES "bazaar-vid_user"(id) ON DELETE CASCADE,  -- ✅ Correct: VARCHAR(255) matches user table
  repository VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  component_name VARCHAR(255) NOT NULL,
  parsed_data JSONB NOT NULL,
  raw_content TEXT,
  file_hash VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  access_count INTEGER DEFAULT 0 NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS github_connection_user_id_idx ON "bazaar-vid_github_connection"(user_id);
CREATE INDEX IF NOT EXISTS github_connection_github_user_id_idx ON "bazaar-vid_github_connection"(github_user_id);
CREATE INDEX IF NOT EXISTS component_cache_key_idx ON "bazaar-vid_component_cache"(cache_key);
CREATE INDEX IF NOT EXISTS component_cache_user_id_idx ON "bazaar-vid_component_cache"(user_id);
CREATE INDEX IF NOT EXISTS component_cache_expires_at_idx ON "bazaar-vid_component_cache"(expires_at);

-- Verify tables were created
SELECT 'GitHub tables created successfully!' as status;