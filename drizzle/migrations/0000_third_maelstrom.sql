CREATE TABLE "bazaar-vid_account" (
	"userId" varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "bazaar-vid_account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
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
CREATE TABLE "bazaar-vid_animation_design_brief" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"sceneId" uuid NOT NULL,
	"componentJobId" uuid,
	"designBrief" jsonb NOT NULL,
	"llmModel" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"originalTsxCode" text,
	"lastFixAttempt" timestamp with time zone,
	"fixIssues" text
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_component_error" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jobId" uuid NOT NULL,
	"errorType" varchar(100) NOT NULL,
	"details" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
CREATE TABLE "bazaar-vid_custom_component_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"effect" text NOT NULL,
	"tsxCode" text,
	"metadata" jsonb,
	"statusMessageId" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"outputUrl" text,
	"errorMessage" text,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"last_successful_step" varchar(50),
	"next_retry_at" timestamp with time zone,
	"error_context" jsonb,
	"checkpoint_data" jsonb,
	"last_step" varchar(50),
	"task_id" text,
	"internal_status" varchar(50),
	"requires_input" boolean DEFAULT false,
	"input_type" text,
	"task_state" jsonb,
	"artifacts" jsonb,
	"history" jsonb,
	"sse_enabled" boolean DEFAULT false,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"originalTsxCode" text,
	"lastFixAttempt" timestamp with time zone,
	"fixIssues" text
);
--> statement-breakpoint
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
CREATE TABLE "bazaar-vid_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text,
	"name" text,
	"email" text,
	"user_id" varchar(255),
	"prioritized_features" jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_notes" text
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_image_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"trace_id" varchar(100) NOT NULL,
	"image_urls" jsonb NOT NULL,
	"palette" jsonb NOT NULL,
	"typography" text NOT NULL,
	"mood" text NOT NULL,
	"layout_json" jsonb,
	"processing_time_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"used_in_scenes" jsonb
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"content" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"kind" varchar(50) DEFAULT 'message' NOT NULL,
	"status" varchar(50),
	"image_urls" jsonb,
	"sequence" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"originalTsxCode" text,
	"lastFixAttempt" timestamp with time zone,
	"fixIssues" text
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
CREATE TABLE "bazaar-vid_patch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"patch" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_project_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"memory_type" varchar(50) NOT NULL,
	"memory_key" varchar(255) NOT NULL,
	"memory_value" text NOT NULL,
	"confidence" real DEFAULT 0.8,
	"source_prompt" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"props" jsonb NOT NULL,
	"isWelcome" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_scene_iteration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"edit_complexity" varchar(20),
	"user_prompt" text NOT NULL,
	"brain_reasoning" text,
	"tool_reasoning" text,
	"code_before" text,
	"code_after" text,
	"changes_applied" jsonb,
	"changes_preserved" jsonb,
	"generation_time_ms" integer,
	"model_used" varchar(50),
	"temperature" real,
	"tokens_used" integer,
	"user_edited_again" boolean DEFAULT false,
	"user_satisfaction_score" integer,
	"session_id" varchar(255),
	"changeSource" varchar(50) DEFAULT 'llm' NOT NULL,
	"message_id" uuid,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_scene_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"messageId" uuid,
	"rawReasoning" text NOT NULL,
	"planData" jsonb NOT NULL,
	"userPrompt" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_scene_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"sceneId" varchar(255) NOT NULL,
	"name" varchar(255),
	"spec" jsonb NOT NULL,
	"version" varchar(10) DEFAULT '1.0' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"createdBy" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_scene" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"name" varchar(255) DEFAULT 'Scene' NOT NULL,
	"tsxCode" text NOT NULL,
	"props" jsonb,
	"duration" integer DEFAULT 150 NOT NULL,
	"publishedUrl" text,
	"publishedHash" text,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"layout_json" text,
	"slug" varchar(255),
	"dominantColors" jsonb,
	"firstH1Text" text,
	"lastFocused" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_shared_video" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"projectId" uuid NOT NULL,
	"userId" varchar(255) NOT NULL,
	"title" varchar(255),
	"description" text,
	"videoUrl" varchar(500),
	"thumbnailUrl" varchar(500),
	"isPublic" boolean DEFAULT true,
	"viewCount" integer DEFAULT 0,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"emailVerified" timestamp with time zone,
	"image" text,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "bazaar-vid_verificationToken" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "bazaar-vid_verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "bazaar-vid_account" ADD CONSTRAINT "bazaar-vid_account_userId_bazaar-vid_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_animation_design_brief" ADD CONSTRAINT "bazaar-vid_animation_design_brief_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_animation_design_brief" ADD CONSTRAINT "bazaar-vid_animation_design_brief_componentJobId_bazaar-vid_custom_component_job_id_fk" FOREIGN KEY ("componentJobId") REFERENCES "public"."bazaar-vid_custom_component_job"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_component_error" ADD CONSTRAINT "bazaar-vid_component_error_jobId_bazaar-vid_custom_component_job_id_fk" FOREIGN KEY ("jobId") REFERENCES "public"."bazaar-vid_custom_component_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_component_evaluation_metric" ADD CONSTRAINT "bazaar-vid_component_evaluation_metric_testCaseId_bazaar-vid_component_test_case_id_fk" FOREIGN KEY ("testCaseId") REFERENCES "public"."bazaar-vid_component_test_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD CONSTRAINT "bazaar-vid_custom_component_job_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_custom_component_job" ADD CONSTRAINT "bazaar-vid_custom_component_job_statusMessageId_bazaar-vid_message_id_fk" FOREIGN KEY ("statusMessageId") REFERENCES "public"."bazaar-vid_message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_email_subscriber" ADD CONSTRAINT "bazaar-vid_email_subscriber_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_feedback" ADD CONSTRAINT "bazaar-vid_feedback_user_id_bazaar-vid_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_image_analysis" ADD CONSTRAINT "bazaar-vid_image_analysis_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_message" ADD CONSTRAINT "bazaar-vid_message_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_patch" ADD CONSTRAINT "bazaar-vid_patch_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_project_memory" ADD CONSTRAINT "bazaar-vid_project_memory_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_project" ADD CONSTRAINT "bazaar-vid_project_userId_bazaar-vid_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_iteration" ADD CONSTRAINT "bazaar-vid_scene_iteration_scene_id_bazaar-vid_scene_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."bazaar-vid_scene"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_iteration" ADD CONSTRAINT "bazaar-vid_scene_iteration_project_id_bazaar-vid_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_iteration" ADD CONSTRAINT "bazaar-vid_scene_iteration_message_id_bazaar-vid_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."bazaar-vid_message"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_plan" ADD CONSTRAINT "bazaar-vid_scene_plan_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_plan" ADD CONSTRAINT "bazaar-vid_scene_plan_messageId_bazaar-vid_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."bazaar-vid_message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_specs" ADD CONSTRAINT "bazaar-vid_scene_specs_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene_specs" ADD CONSTRAINT "bazaar-vid_scene_specs_createdBy_bazaar-vid_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_scene" ADD CONSTRAINT "bazaar-vid_scene_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" ADD CONSTRAINT "bazaar-vid_shared_video_projectId_bazaar-vid_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."bazaar-vid_project"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bazaar-vid_shared_video" ADD CONSTRAINT "bazaar-vid_shared_video_userId_bazaar-vid_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."bazaar-vid_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "bazaar-vid_account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "agent_message_correlation_id_idx" ON "bazaar-vid_agent_message" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "agent_message_type_idx" ON "bazaar-vid_agent_message" USING btree ("type");--> statement-breakpoint
CREATE INDEX "agent_message_sender_idx" ON "bazaar-vid_agent_message" USING btree ("sender");--> statement-breakpoint
CREATE INDEX "agent_message_recipient_idx" ON "bazaar-vid_agent_message" USING btree ("recipient");--> statement-breakpoint
CREATE INDEX "animation_design_brief_project_idx" ON "bazaar-vid_animation_design_brief" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "animation_design_brief_scene_idx" ON "bazaar-vid_animation_design_brief" USING btree ("sceneId");--> statement-breakpoint
CREATE INDEX "animation_design_brief_component_idx" ON "bazaar-vid_animation_design_brief" USING btree ("componentJobId");--> statement-breakpoint
CREATE INDEX "component_error_job_idx" ON "bazaar-vid_component_error" USING btree ("jobId");--> statement-breakpoint
CREATE INDEX "component_evaluation_metrics_test_case_id_idx" ON "bazaar-vid_component_evaluation_metric" USING btree ("testCaseId");--> statement-breakpoint
CREATE INDEX "component_evaluation_metrics_success_idx" ON "bazaar-vid_component_evaluation_metric" USING btree ("success");--> statement-breakpoint
CREATE INDEX "component_evaluation_metrics_timestamp_idx" ON "bazaar-vid_component_evaluation_metric" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "component_evaluation_metrics_category_idx" ON "bazaar-vid_component_evaluation_metric" USING btree ("category");--> statement-breakpoint
CREATE INDEX "component_test_cases_category_idx" ON "bazaar-vid_component_test_case" USING btree ("category");--> statement-breakpoint
CREATE INDEX "custom_component_job_project_idx" ON "bazaar-vid_custom_component_job" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "custom_component_job_status_idx" ON "bazaar-vid_custom_component_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "custom_component_job_task_id_idx" ON "bazaar-vid_custom_component_job" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "email_subscriber_email_idx" ON "bazaar-vid_email_subscriber" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_subscriber_status_idx" ON "bazaar-vid_email_subscriber" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_subscriber_subscribed_at_idx" ON "bazaar-vid_email_subscriber" USING btree ("subscribed_at");--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "bazaar-vid_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "bazaar-vid_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "bazaar-vid_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "image_analysis_project_idx" ON "bazaar-vid_image_analysis" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "image_analysis_trace_idx" ON "bazaar-vid_image_analysis" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "image_analysis_created_idx" ON "bazaar-vid_image_analysis" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "message_project_idx" ON "bazaar-vid_message" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "message_status_idx" ON "bazaar-vid_message" USING btree ("status");--> statement-breakpoint
CREATE INDEX "message_project_sequence_idx" ON "bazaar-vid_message" USING btree ("projectId","sequence");--> statement-breakpoint
CREATE INDEX "patch_project_idx" ON "bazaar-vid_patch" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "project_memory_project_idx" ON "bazaar-vid_project_memory" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_memory_type_key_idx" ON "bazaar-vid_project_memory" USING btree ("memory_type","memory_key");--> statement-breakpoint
CREATE INDEX "project_user_idx" ON "bazaar-vid_project" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "project_title_idx" ON "bazaar-vid_project" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "project_unique_name" ON "bazaar-vid_project" USING btree ("userId","title");--> statement-breakpoint
CREATE INDEX "scene_iteration_scene_idx" ON "bazaar-vid_scene_iteration" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "scene_iteration_project_idx" ON "bazaar-vid_scene_iteration" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scene_iteration_operation_idx" ON "bazaar-vid_scene_iteration" USING btree ("operation_type","edit_complexity");--> statement-breakpoint
CREATE INDEX "scene_iteration_satisfaction_idx" ON "bazaar-vid_scene_iteration" USING btree ("user_edited_again","created_at");--> statement-breakpoint
CREATE INDEX "scene_iteration_message_idx" ON "bazaar-vid_scene_iteration" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "scene_plan_project_idx" ON "bazaar-vid_scene_plan" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "scene_spec_project_idx" ON "bazaar-vid_scene_specs" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "scene_spec_created_at_idx" ON "bazaar-vid_scene_specs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "scene_spec_scene_id_idx" ON "bazaar-vid_scene_specs" USING btree ("sceneId");--> statement-breakpoint
CREATE UNIQUE INDEX "scene_spec_unique_scene_id" ON "bazaar-vid_scene_specs" USING btree ("projectId","sceneId");--> statement-breakpoint
CREATE INDEX "scene_spec_spec_gin_idx" ON "bazaar-vid_scene_specs" USING gin ("spec");--> statement-breakpoint
CREATE INDEX "scene_project_idx" ON "bazaar-vid_scene" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "scene_order_idx" ON "bazaar-vid_scene" USING btree ("projectId","order");--> statement-breakpoint
CREATE INDEX "scene_publish_idx" ON "bazaar-vid_scene" USING btree ("projectId","publishedHash");