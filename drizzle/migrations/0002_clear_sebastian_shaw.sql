CREATE TABLE "bazaar-vid_credit_package" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"credits" integer NOT NULL,
	"price" integer NOT NULL,
	"stripe_price_id" text,
	"bonus_percentage" integer DEFAULT 0 NOT NULL,
	"popular" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bazaar-vid_credit_package_stripe_price_id_unique" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_credit_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"balance" integer NOT NULL,
	"description" text NOT NULL,
	"metadata" jsonb,
	"stripe_payment_intent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_user_credits" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"daily_credits" integer DEFAULT 150 NOT NULL,
	"purchased_credits" integer DEFAULT 0 NOT NULL,
	"lifetime_credits" integer DEFAULT 0 NOT NULL,
	"daily_reset_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_credit_transaction" ADD CONSTRAINT "bazaar-vid_credit_transaction_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_user_credits" ADD CONSTRAINT "bazaar-vid_user_credits_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_packages_active_idx" ON "bazaar-vid_credit_package" USING btree ("active");--> statement-breakpoint
CREATE INDEX "credit_packages_sort_idx" ON "bazaar-vid_credit_package" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "credit_transactions_user_idx" ON "bazaar-vid_credit_transaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_type_idx" ON "bazaar-vid_credit_transaction" USING btree ("type");--> statement-breakpoint
CREATE INDEX "credit_transactions_created_idx" ON "bazaar-vid_credit_transaction" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_stripe_idx" ON "bazaar-vid_credit_transaction" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "user_credits_daily_reset_idx" ON "bazaar-vid_user_credits" USING btree ("daily_reset_at");