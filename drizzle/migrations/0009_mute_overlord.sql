-- Add isFavorite column to projects table
ALTER TABLE "bazaar-vid_project" 
ADD COLUMN IF NOT EXISTS "isFavorite" BOOLEAN NOT NULL DEFAULT false;