-- Migration: 0025_revert_uuid_changes.sql
-- Purpose: Revert destructive UUID changes from 0024_yummy_chamber.sql
-- Restore varchar(255) user IDs for NextAuth.js compatibility

-- Revert user table ID column
ALTER TABLE "bazaar-vid_user" ALTER COLUMN "id" SET DATA TYPE varchar(255);

-- Revert all foreign key user ID references
ALTER TABLE "bazaar-vid_account" ALTER COLUMN "userId" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_project" ALTER COLUMN "userId" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_scene" ALTER COLUMN "userId" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_feedback" ALTER COLUMN "userId" SET DATA TYPE varchar(255);
ALTER TABLE "bazaar-vid_shared_video" ALTER COLUMN "userId" SET DATA TYPE varchar(255);

-- Revert session table structure (if it exists)
-- Note: Session table was missing entirely, so we recreate it properly
DROP TABLE IF EXISTS "bazaar-vid_session";

CREATE TABLE "bazaar-vid_session" (
  "sessionToken" varchar(255) PRIMARY KEY NOT NULL,
  "userId" varchar(255) NOT NULL,
  "expires" timestamp NOT NULL,
  CONSTRAINT "bazaar-vid_session_userId_bazaar-vid_user_id_fk" 
    FOREIGN KEY ("userId") REFERENCES "bazaar-vid_user"("id") ON DELETE cascade
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "bazaar-vid_session_userId_idx" ON "bazaar-vid_session" ("userId");

-- Ensure all varchar lengths are consistent (255 chars for NextAuth.js compatibility)
-- This is critical for NextAuth.js which expects string-based user IDs 