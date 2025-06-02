import { pgTable, varchar, timestamp, text, boolean, uuid, real, jsonb, index, foreignKey, uniqueIndex, unique, integer, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const bazaarVidUser = pgTable("bazaar-vid_user", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	name: varchar({ length: 255 }),
	email: varchar({ length: 255 }).notNull(),
	emailVerified: timestamp({ withTimezone: true, mode: 'string' }),
	image: text(),
	isAdmin: boolean().default(false).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const bazaarVidMetric = pgTable("bazaar-vid_metric", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	value: real().notNull(),
	tags: jsonb(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const bazaarVidComponentError = pgTable("bazaar-vid_component_error", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	jobId: uuid().notNull(),
	errorType: varchar({ length: 100 }).notNull(),
	details: text().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("component_error_job_idx").using("btree", table.jobId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [bazaarVidCustomComponentJob.id],
			name: "bazaar-vid_component_error_jobId_bazaar-vid_custom_component_jo"
		}).onDelete("cascade"),
]);

export const bazaarVidFeedback = pgTable("bazaar-vid_feedback", {
	id: text().primaryKey().notNull(),
	content: text(),
	name: text(),
	email: text(),
	userId: varchar("user_id", { length: 255 }),
	prioritizedFeatures: jsonb("prioritized_features"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	status: text().default('new').notNull(),
	adminNotes: text("admin_notes"),
}, (table) => [
	index("feedback_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("feedback_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("feedback_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [bazaarVidUser.id],
			name: "bazaar-vid_feedback_user_id_bazaar-vid_user_id_fk"
		}).onDelete("set null"),
]);

export const bazaarVidScenePlan = pgTable("bazaar-vid_scene_plan", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid().notNull(),
	messageId: uuid(),
	rawReasoning: text().notNull(),
	planData: jsonb().notNull(),
	userPrompt: text().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("scene_plan_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_scene_plan_projectId_bazaar-vid_project_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [bazaarVidMessage.id],
			name: "bazaar-vid_scene_plan_messageId_bazaar-vid_message_id_fk"
		}).onDelete("cascade"),
]);

export const bazaarVidAnimationDesignBrief = pgTable("bazaar-vid_animation_design_brief", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid().notNull(),
	sceneId: uuid().notNull(),
	componentJobId: uuid(),
	designBrief: jsonb().notNull(),
	llmModel: varchar({ length: 100 }).notNull(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	errorMessage: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	originalTsxCode: text(),
	lastFixAttempt: timestamp({ withTimezone: true, mode: 'string' }),
	fixIssues: text(),
}, (table) => [
	index("animation_design_brief_component_idx").using("btree", table.componentJobId.asc().nullsLast().op("uuid_ops")),
	index("animation_design_brief_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("animation_design_brief_scene_idx").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_animation_design_brief_projectId_bazaar-vid_project_"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.componentJobId],
			foreignColumns: [bazaarVidCustomComponentJob.id],
			name: "bazaar-vid_animation_design_brief_componentJobId_bazaar-vid_cus"
		}),
]);

export const bazaarVidSceneSpecs = pgTable("bazaar-vid_scene_specs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid().notNull(),
	sceneId: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }),
	spec: jsonb().notNull(),
	version: varchar({ length: 10 }).default('1.0').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdBy: varchar({ length: 255 }),
}, (table) => [
	index("scene_spec_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("scene_spec_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("scene_spec_scene_id_idx").using("btree", table.sceneId.asc().nullsLast().op("text_ops")),
	index("scene_spec_spec_gin_idx").using("gin", table.spec.asc().nullsLast().op("jsonb_ops")),
	uniqueIndex("scene_spec_unique_scene_id").using("btree", table.projectId.asc().nullsLast().op("uuid_ops"), table.sceneId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_scene_specs_projectId_bazaar-vid_project_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [bazaarVidUser.id],
			name: "bazaar-vid_scene_specs_createdBy_bazaar-vid_user_id_fk"
		}),
]);

export const bazaarVidEmailSubscriber = pgTable("bazaar-vid_email_subscriber", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	subscribedAt: timestamp("subscribed_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	status: text().default('active').notNull(),
	source: text().default('homepage').notNull(),
	userId: varchar("user_id", { length: 255 }),
}, (table) => [
	index("email_subscriber_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("email_subscriber_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("email_subscriber_subscribed_at_idx").using("btree", table.subscribedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [bazaarVidUser.id],
			name: "bazaar-vid_email_subscriber_user_id_bazaar-vid_user_id_fk"
		}).onDelete("set null"),
	unique("bazaar-vid_email_subscriber_email_unique").on(table.email),
]);

export const bazaarVidSceneIteration = pgTable("bazaar-vid_scene_iteration", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sceneId: uuid("scene_id").notNull(),
	projectId: uuid("project_id").notNull(),
	operationType: varchar("operation_type", { length: 50 }).notNull(),
	editComplexity: varchar("edit_complexity", { length: 20 }),
	userPrompt: text("user_prompt").notNull(),
	brainReasoning: text("brain_reasoning"),
	toolReasoning: text("tool_reasoning"),
	codeBefore: text("code_before"),
	codeAfter: text("code_after"),
	changesApplied: jsonb("changes_applied"),
	changesPreserved: jsonb("changes_preserved"),
	generationTimeMs: integer("generation_time_ms"),
	modelUsed: varchar("model_used", { length: 50 }),
	temperature: real(),
	tokensUsed: integer("tokens_used"),
	userEditedAgain: boolean("user_edited_again").default(false),
	userSatisfactionScore: integer("user_satisfaction_score"),
	sessionId: varchar("session_id", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("scene_iteration_operation_idx").using("btree", table.operationType.asc().nullsLast().op("text_ops"), table.editComplexity.asc().nullsLast().op("text_ops")),
	index("scene_iteration_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("scene_iteration_satisfaction_idx").using("btree", table.userEditedAgain.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("scene_iteration_scene_idx").using("btree", table.sceneId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.sceneId],
			foreignColumns: [bazaarVidScene.id],
			name: "bazaar-vid_scene_iteration_scene_id_bazaar-vid_scene_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_scene_iteration_project_id_bazaar-vid_project_id_fk"
		}).onDelete("cascade"),
]);

export const bazaarVidComponentTestCase = pgTable("bazaar-vid_component_test_case", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	prompt: text().notNull(),
	category: varchar({ length: 50 }).notNull(),
	complexity: integer().notNull(),
	edgeCases: jsonb().default([]),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("component_test_cases_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
]);

export const bazaarVidComponentEvaluationMetric = pgTable("bazaar-vid_component_evaluation_metric", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	testCaseId: uuid().notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	category: varchar({ length: 50 }).notNull(),
	complexity: integer().notNull(),
	edgeCases: jsonb().default([]),
	success: boolean().notNull(),
	errorStage: varchar({ length: 50 }),
	errorType: varchar({ length: 100 }),
	errorMessage: text(),
	promptSubmissionTime: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	codeGenerationStartTime: timestamp({ withTimezone: true, mode: 'string' }),
	codeGenerationEndTime: timestamp({ withTimezone: true, mode: 'string' }),
	validationStartTime: timestamp({ withTimezone: true, mode: 'string' }),
	validationEndTime: timestamp({ withTimezone: true, mode: 'string' }),
	buildStartTime: timestamp({ withTimezone: true, mode: 'string' }),
	buildEndTime: timestamp({ withTimezone: true, mode: 'string' }),
	uploadStartTime: timestamp({ withTimezone: true, mode: 'string' }),
	uploadEndTime: timestamp({ withTimezone: true, mode: 'string' }),
	componentCompletionTime: timestamp({ withTimezone: true, mode: 'string' }),
	timeToFirstToken: integer(),
	codeGenerationTime: integer(),
	validationTime: integer(),
	buildTime: integer(),
	uploadTime: integer(),
	totalTime: integer(),
	syntaxErrorCount: integer(),
	eslintErrorCount: integer(),
	eslintWarningCount: integer(),
	codeLength: integer(),
	renderSuccess: boolean(),
	renderErrorMessage: text(),
	componentId: varchar({ length: 100 }),
	outputUrl: text(),
	taskId: uuid(),
	stateTransitions: jsonb().default([]),
	artifacts: jsonb().default([]),
	analysisNotes: text(),
	tags: jsonb().default([]),
}, (table) => [
	index("component_evaluation_metrics_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("component_evaluation_metrics_success_idx").using("btree", table.success.asc().nullsLast().op("bool_ops")),
	index("component_evaluation_metrics_test_case_id_idx").using("btree", table.testCaseId.asc().nullsLast().op("uuid_ops")),
	index("component_evaluation_metrics_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.testCaseId],
			foreignColumns: [bazaarVidComponentTestCase.id],
			name: "bazaar-vid_component_evaluation_metric_testCaseId_bazaar-vid_co"
		}),
]);

export const bazaarVidAgentMessage = pgTable("bazaar-vid_agent_message", {
	id: text().primaryKey().notNull(),
	sender: text().notNull(),
	recipient: text().notNull(),
	type: text().notNull(),
	payload: jsonb().notNull(),
	correlationId: text("correlation_id"),
	status: text().default('pending').notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	processedAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	index("agent_message_correlation_id_idx").using("btree", table.correlationId.asc().nullsLast().op("text_ops")),
	index("agent_message_recipient_idx").using("btree", table.recipient.asc().nullsLast().op("text_ops")),
	index("agent_message_sender_idx").using("btree", table.sender.asc().nullsLast().op("text_ops")),
	index("agent_message_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
]);

export const bazaarVidCustomComponentJob = pgTable("bazaar-vid_custom_component_job", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid().notNull(),
	effect: text().notNull(),
	tsxCode: text(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	outputUrl: text(),
	errorMessage: text(),
	retryCount: integer().default(0).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	metadata: jsonb(),
	statusMessageId: uuid(),
	originalTsxCode: text("original_tsx_code"),
	lastFixAttempt: timestamp("last_fix_attempt", { withTimezone: true, mode: 'string' }),
	fixIssues: text("fix_issues"),
	originalTsxCode: text(),
	lastFixAttempt: timestamp({ withTimezone: true, mode: 'string' }),
	fixIssues: text(),
	taskId: text("task_id"),
	internalStatus: varchar("internal_status", { length: 50 }),
	requiresInput: boolean("requires_input").default(false),
	inputType: text("input_type"),
	taskState: jsonb("task_state"),
	artifacts: jsonb(),
	history: jsonb(),
	sseEnabled: boolean("sse_enabled").default(false),
	lastSuccessfulStep: varchar("last_successful_step", { length: 50 }),
	nextRetryAt: timestamp("next_retry_at", { withTimezone: true, mode: 'string' }),
	errorContext: jsonb("error_context"),
	checkpointData: jsonb("checkpoint_data"),
	lastStep: varchar("last_step", { length: 50 }),
}, (table) => [
	index("custom_component_job_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("custom_component_job_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("custom_component_job_task_id_idx").using("btree", table.taskId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_custom_component_job_projectId_bazaar-vid_project_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.statusMessageId],
			foreignColumns: [bazaarVidMessage.id],
			name: "bazaar-vid_custom_component_job_statusMessageId_bazaar-vid_mess"
		}),
]);

export const bazaarVidScene = pgTable("bazaar-vid_scene", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid().notNull(),
	order: integer().default(0).notNull(),
	name: varchar({ length: 255 }).default('Scene').notNull(),
	tsxCode: text().notNull(),
	props: jsonb(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	publishedUrl: text(),
	publishedHash: text(),
	publishedAt: timestamp({ withTimezone: true, mode: 'string' }),
	duration: integer().default(150).notNull(),
	layoutJson: text("layout_json"),
}, (table) => [
	index("scene_order_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops"), table.order.asc().nullsLast().op("uuid_ops")),
	index("scene_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("scene_publish_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops"), table.publishedHash.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_scene_projectId_bazaar-vid_project_id_fk"
		}).onDelete("cascade"),
]);

export const bazaarVidProjectMemory = pgTable("bazaar-vid_project_memory", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	memoryType: varchar("memory_type", { length: 50 }).notNull(),
	memoryKey: varchar("memory_key", { length: 255 }).notNull(),
	memoryValue: text("memory_value").notNull(),
	confidence: real().default(0.8),
	sourcePrompt: text("source_prompt"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("project_memory_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("project_memory_type_key_idx").using("btree", table.memoryType.asc().nullsLast().op("text_ops"), table.memoryKey.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_project_memory_project_id_bazaar-vid_project_id_fk"
		}).onDelete("cascade"),
]);

export const bazaarVidProject = pgTable("bazaar-vid_project", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: varchar({ length: 255 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	props: jsonb().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	isWelcome: boolean().default(true).notNull(),
}, (table) => [
	index("project_title_idx").using("btree", table.title.asc().nullsLast().op("text_ops")),
	uniqueIndex("project_unique_name").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.title.asc().nullsLast().op("text_ops")),
	index("project_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [bazaarVidUser.id],
			name: "bazaar-vid_project_userId_bazaar-vid_user_id_fk"
		}),
]);

export const bazaarVidSharedVideo = pgTable("bazaar-vid_shared_video", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	projectId: uuid().notNull(),
	userId: varchar({ length: 255 }).notNull(),
	title: varchar({ length: 255 }),
	description: text(),
	videoUrl: varchar({ length: 500 }),
	thumbnailUrl: varchar({ length: 500 }),
	isPublic: boolean().default(true),
	viewCount: integer().default(0),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_shared_video_projectId_bazaar-vid_project_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [bazaarVidUser.id],
			name: "bazaar-vid_shared_video_userId_bazaar-vid_user_id_fk"
		}),
]);

export const bazaarVidPatch = pgTable("bazaar-vid_patch", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid().notNull(),
	patch: jsonb().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("patch_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_patch_projectId_bazaar-vid_project_id_fk"
		}).onDelete("cascade"),
]);

export const bazaarVidMessage = pgTable("bazaar-vid_message", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid().notNull(),
	content: text().notNull(),
	role: varchar({ length: 50 }).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	kind: varchar({ length: 50 }).default('message').notNull(),
	status: varchar({ length: 50 }),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	originalTsxCode: text(),
	lastFixAttempt: timestamp({ withTimezone: true, mode: 'string' }),
	fixIssues: text(),
}, (table) => [
	index("message_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("message_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_message_projectId_bazaar-vid_project_id_fk"
		}).onDelete("cascade"),
]);

export const bazaarVidImageAnalysis = pgTable("bazaar-vid_image_analysis", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	traceId: varchar("trace_id", { length: 100 }).notNull(),
	imageUrls: jsonb("image_urls").notNull(),
	palette: jsonb().notNull(),
	typography: text().notNull(),
	mood: text().notNull(),
	layoutJson: jsonb("layout_json"),
	processingTimeMs: integer("processing_time_ms").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	usedInScenes: jsonb("used_in_scenes"),
}, (table) => [
	index("image_analysis_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("image_analysis_project_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("image_analysis_trace_idx").using("btree", table.traceId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [bazaarVidProject.id],
			name: "bazaar-vid_image_analysis_project_id_bazaar-vid_project_id_fk"
		}).onDelete("cascade"),
]);

export const bazaarVidVerificationToken = pgTable("bazaar-vid_verificationToken", {
	identifier: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	expires: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.identifier, table.token], name: "bazaar-vid_verificationToken_identifier_token_pk"}),
]);

export const bazaarVidAccount = pgTable("bazaar-vid_account", {
	userId: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 255 }).notNull(),
	provider: varchar({ length: 255 }).notNull(),
	providerAccountId: varchar({ length: 255 }).notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: varchar("token_type", { length: 255 }),
	scope: varchar({ length: 255 }),
	idToken: text("id_token"),
	sessionState: varchar("session_state", { length: 255 }),
}, (table) => [
	index("account_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [bazaarVidUser.id],
			name: "bazaar-vid_account_userId_bazaar-vid_user_id_fk"
		}),
	primaryKey({ columns: [table.provider, table.providerAccountId], name: "bazaar-vid_account_provider_providerAccountId_pk"}),
]);
