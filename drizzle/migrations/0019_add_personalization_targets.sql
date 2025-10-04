-- Personalization targets per project for brand personalization

BEGIN;

CREATE TABLE IF NOT EXISTS "bazaar-vid_personalization_target" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL,
  "company_name" text,
  "website_url" text NOT NULL,
  "contact_email" text,
  "sector" text,
  "status" text NOT NULL DEFAULT 'pending',
  "notes" text,
  "brand_profile" jsonb,
  "brand_theme" jsonb,
  "error_message" text,
  "extracted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "bazaar-vid_personalization_target"
  ADD CONSTRAINT "personalization_target_project_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "personalization_target_project_idx"
  ON "bazaar-vid_personalization_target" USING btree ("project_id");

CREATE UNIQUE INDEX IF NOT EXISTS "personalization_target_project_url_idx"
  ON "bazaar-vid_personalization_target" USING btree ("project_id", "website_url");

COMMIT;
