CREATE TABLE "bazaar-vid_custom_component_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"effect" text NOT NULL,
	"tsxCode" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"outputUrl" text,
	"errorMessage" text,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD CONSTRAINT "bazaar-vid_custom_component_job_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_component_job_project_idx" ON "bazaar-vid_custom_component_job" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "custom_component_job_status_idx" ON "bazaar-vid_custom_component_job" USING btree ("status");