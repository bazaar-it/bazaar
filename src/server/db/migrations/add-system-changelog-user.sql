-- Migration to add system-changelog user for automated changelog video generation
-- This user is used when the system automatically generates videos from GitHub PRs

INSERT INTO "bazaar-vid_user" (id, name, email, "emailVerified", "isAdmin") 
VALUES ('system-changelog', 'System Changelog', 'changelog@bazaar.it', NOW(), false)
ON CONFLICT (id) DO NOTHING;

-- Verify the user was created
SELECT id, name, email FROM "bazaar-vid_user" WHERE id = 'system-changelog';