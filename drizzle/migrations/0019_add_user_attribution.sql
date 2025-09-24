CREATE TABLE IF NOT EXISTS "bazaar-vid_user_attribution" (
  "user_id" varchar(255) PRIMARY KEY NOT NULL,
  "first_touch_source" text DEFAULT 'unknown' NOT NULL,
  "first_touch_medium" text,
  "first_touch_campaign" text,
  "first_touch_term" text,
  "first_touch_content" text,
  "first_touch_referrer" text,
  "first_touch_landing_path" text,
  "first_touch_gclid" text,
  "first_touch_fbclid" text,
  "first_touch_user_agent_hash" text,
  "first_touch_at" timestamptz DEFAULT now() NOT NULL,
  "last_touch_source" text,
  "last_touch_medium" text,
  "last_touch_campaign" text,
  "last_touch_term" text,
  "last_touch_content" text,
  "last_touch_referrer" text,
  "last_touch_landing_path" text,
  "last_touch_gclid" text,
  "last_touch_fbclid" text,
  "last_touch_user_agent_hash" text,
  "last_touch_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "user_attribution_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "bazaar-vid_user"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "user_attr_first_source_idx" ON "bazaar-vid_user_attribution" ("first_touch_source");
CREATE INDEX IF NOT EXISTS "user_attr_first_campaign_idx" ON "bazaar-vid_user_attribution" ("first_touch_campaign");

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "user_attr_set_updated_at"
BEFORE UPDATE ON "bazaar-vid_user_attribution"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO "bazaar-vid_user_attribution" (
  "user_id",
  "first_touch_source",
  "first_touch_at",
  "created_at",
  "updated_at"
)
SELECT
  u."id",
  'unknown',
  COALESCE(u."createdAt", now()),
  now(),
  now()
FROM "bazaar-vid_user" u
ON CONFLICT ("user_id") DO NOTHING;
