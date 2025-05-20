CREATE TABLE "bazaar-vid_agent_message" (
	"id" text PRIMARY KEY NOT NULL,
	"sender" text NOT NULL,
	"recipient" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"correlation_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"processedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_component_evaluation_metric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"testCaseId" uuid NOT NULL,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"category" varchar(50) NOT NULL,
	"complexity" integer NOT NULL,
	"edgeCases" jsonb DEFAULT '[]'::jsonb,
	"success" boolean NOT NULL,
	"errorStage" varchar(50),
	"errorType" varchar(100),
	"errorMessage" text,
	"promptSubmissionTime" timestamp with time zone NOT NULL,
	"codeGenerationStartTime" timestamp with time zone,
	"codeGenerationEndTime" timestamp with time zone,
	"validationStartTime" timestamp with time zone,
	"validationEndTime" timestamp with time zone,
	"buildStartTime" timestamp with time zone,
	"buildEndTime" timestamp with time zone,
	"uploadStartTime" timestamp with time zone,
	"uploadEndTime" timestamp with time zone,
	"componentCompletionTime" timestamp with time zone,
	"timeToFirstToken" integer,
	"codeGenerationTime" integer,
	"validationTime" integer,
	"buildTime" integer,
	"uploadTime" integer,
	"totalTime" integer,
	"syntaxErrorCount" integer,
	"eslintErrorCount" integer,
	"eslintWarningCount" integer,
	"codeLength" integer,
	"renderSuccess" boolean,
	"renderErrorMessage" text,
	"componentId" varchar(100),
	"outputUrl" text,
	"taskId" uuid,
	"stateTransitions" jsonb DEFAULT '[]'::jsonb,
	"artifacts" jsonb DEFAULT '[]'::jsonb,
	"analysisNotes" text,
	"tags" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_component_test_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"complexity" integer NOT NULL,
	"edgeCases" jsonb DEFAULT '[]'::jsonb,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "task_id" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "internal_status" varchar(50);--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "requires_input" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "input_type" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "task_state" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "artifacts" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "history" jsonb;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "sse_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "original_tsx_code" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "last_fix_attempt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD COLUMN "fix_issues" text;--> statement-breakpoint
ALTER TABLE "bazaar-vid_component_evaluation_metric" ADD CONSTRAINT "bazaar-vid_component_evaluation_metric_testCaseId_bazaar-vid_component_test_case_id_fk" FOREIGN KEY ("testCaseId") REFERENCES "public"."bazaar-vid_component_test_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_message_correlation_id_idx" ON "bazaar-vid_agent_message" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "agent_message_type_idx" ON "bazaar-vid_agent_message" USING btree ("type");--> statement-breakpoint
CREATE INDEX "agent_message_sender_idx" ON "bazaar-vid_agent_message" USING btree ("sender");--> statement-breakpoint
CREATE INDEX "agent_message_recipient_idx" ON "bazaar-vid_agent_message" USING btree ("recipient");--> statement-breakpoint
CREATE INDEX "component_evaluation_metrics_test_case_id_idx" ON "bazaar-vid_component_evaluation_metric" USING btree ("testCaseId");--> statement-breakpoint
CREATE INDEX "component_evaluation_metrics_success_idx" ON "bazaar-vid_component_evaluation_metric" USING btree ("success");--> statement-breakpoint
CREATE INDEX "component_evaluation_metrics_timestamp_idx" ON "bazaar-vid_component_evaluation_metric" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "component_evaluation_metrics_category_idx" ON "bazaar-vid_component_evaluation_metric" USING btree ("category");--> statement-breakpoint
CREATE INDEX "component_test_cases_category_idx" ON "bazaar-vid_component_test_case" USING btree ("category");--> statement-breakpoint
CREATE INDEX "custom_component_job_task_id_idx" ON "bazaar-vid_custom_component_job" USING btree ("task_id");--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" DROP COLUMN "originalTsxCode";--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" DROP COLUMN "lastFixAttempt";--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" DROP COLUMN "fixIssues";