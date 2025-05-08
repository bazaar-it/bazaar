CREATE TABLE "bazaar-vid_component_error" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"errorType" varchar(100) NOT NULL,
	"details" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_metric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"value" real NOT NULL,
	"tags" jsonb,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ALTER COLUMN "tsxCode" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "statusMessageId" uuid;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "kind" varchar(50) DEFAULT 'message' NOT NULL;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "status" varchar(50);--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD COLUMN "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "bazaar-vid_component_error" ADD CONSTRAINT "bazaar-vid_component_error_jobId_bazaar-vid_custom_component_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."bazaar-vid_custom_component_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "component_error_job_idx" ON "bazaar-vid_component_error" USING btree ("jobId");--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD CONSTRAINT "bazaar-vid_custom_component_job_statusMessageId_bazaar-vid_message_id_fk" FOREIGN KEY ("statusMessageId") REFERENCES "public"."bazaar-vid_message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_status_idx" ON "bazaar-vid_message" USING btree ("status");