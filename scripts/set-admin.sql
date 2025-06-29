-- Set admin privileges for specific users
-- Run this script against your database to grant admin access

UPDATE "bazaar-vid_user" 
SET "isAdmin" = true 
WHERE email IN ('jack@josventures.ie', 'markushogne@gmail.com');

-- Verify the update
SELECT id, email, name, "isAdmin" 
FROM "bazaar-vid_user" 
WHERE email IN ('jack@josventures.ie', 'markushogne@gmail.com'); 