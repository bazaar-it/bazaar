CREATE TABLE "bazaar-vid_email_subscriber" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'homepage' NOT NULL,
	"user_id" varchar(255),
	CONSTRAINT "bazaar-vid_email_subscriber_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_email_subscriber" ADD CONSTRAINT "bazaar-vid_email_subscriber_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_subscriber_email_idx" ON "bazaar-vid_email_subscriber" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_subscriber_status_idx" ON "bazaar-vid_email_subscriber" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_subscriber_subscribed_at_idx" ON "bazaar-vid_email_subscriber" USING btree ("subscribed_at");