-- Fix user ID columns back to varchar for NextAuth.js compatibility
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "id" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_account" ALTER COLUMN "userId" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_project" ALTER COLUMN "userId" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_feedback" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_email_subscriber" ALTER COLUMN "user_id" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_scene_specs" ALTER COLUMN "createdBy" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_shared_video" ALTER COLUMN "userId" SET DATA TYPE varchar(255);

-- Remove the UUID default
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "id" DROP DEFAULT;

-- Recreate session table if missing
CREATE TABLE IF NOT EXISTS "bazaar-vid_session" (
  "sessionToken" varchar(255) PRIMARY KEY NOT NULL,
  "userId" varchar(255) NOT NULL,
  "expires" timestamp NOT NULL,
  CONSTRAINT "bazaar-vid_session_userId_bazaar-vid_user_id_fk" 
    FOREIGN KEY ("userId") REFERENCES "bazaar-vid_user"("id") ON DELETE cascade
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS "bazaar-vid_session_userId_idx" ON "bazaar-vid_session" ("userId");

SELECT 'Schema fixed successfully' as status; 