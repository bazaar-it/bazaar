// src/server/db/schema.ts
import { relations, sql } from "drizzle-orm";
import { uniqueIndex } from "drizzle-orm/pg-core";

import { index, pgTableCreator, primaryKey } from "drizzle-orm/pg-core";
import { type AdapterAccount } from "@auth/core/adapters";
import { type InputProps } from "~/lib/types/video/input-props";
import { type JsonPatch } from "~/lib/types/shared/json-patch";
import { type BrandTheme } from "~/lib/theme/brandTheme";
import { type InferSelectModel } from "drizzle-orm";

// Import the InputProps type for the projects table


/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `bazaar-vid_${name}`);


export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey(),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d.timestamp({
    mode: "date",
    withTimezone: true,
  }),
  image: d.text(),
  isAdmin: d.boolean().default(false).notNull(),
  stripeCustomerId: d.text("stripe_customer_id").unique(),
  createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`),
}));

export const userAttribution = createTable(
  "user_attribution",
  (d) => ({
    userId: d
      .varchar("user_id", { length: 255 })
      .notNull()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    firstTouchSource: d.text("first_touch_source").notNull().default("unknown"),
    firstTouchMedium: d.text("first_touch_medium"),
    firstTouchCampaign: d.text("first_touch_campaign"),
    firstTouchTerm: d.text("first_touch_term"),
    firstTouchContent: d.text("first_touch_content"),
    firstTouchReferrer: d.text("first_touch_referrer"),
    firstTouchLandingPath: d.text("first_touch_landing_path"),
    firstTouchGclid: d.text("first_touch_gclid"),
    firstTouchFbclid: d.text("first_touch_fbclid"),
    firstTouchUserAgentHash: d.text("first_touch_user_agent_hash"),
    firstTouchAt: d.timestamp("first_touch_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    lastTouchSource: d.text("last_touch_source"),
    lastTouchMedium: d.text("last_touch_medium"),
    lastTouchCampaign: d.text("last_touch_campaign"),
    lastTouchTerm: d.text("last_touch_term"),
    lastTouchContent: d.text("last_touch_content"),
    lastTouchReferrer: d.text("last_touch_referrer"),
    lastTouchLandingPath: d.text("last_touch_landing_path"),
    lastTouchGclid: d.text("last_touch_gclid"),
    lastTouchFbclid: d.text("last_touch_fbclid"),
    lastTouchUserAgentHash: d.text("last_touch_user_agent_hash"),
    lastTouchAt: d.timestamp("last_touch_at", { withTimezone: true }),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp("updated_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("user_attr_first_source_idx").on(t.firstTouchSource),
    index("user_attr_first_campaign_idx").on(t.firstTouchCampaign),
  ],
);

export const userAttributionRelations = relations(userAttribution, ({ one }) => ({
  user: one(users, {
    fields: [userAttribution.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sharedVideos: many(sharedVideos),
  attribution: one(userAttribution, {
    fields: [users.id],
    references: [userAttribution.userId],
  }),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verificationToken", // Renamed to singular camel-case for Drizzle-adapter compatibility
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "string", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// --- Projects table ---
// Stores Remotion player state per user.
// The `props` column stores the full canonical state as JSON.
// Audio track type for database storage
export type AudioTrack = {
  url: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  volume: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  playbackRate?: number;
};

export const projects = createTable(
  "project",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    title: d.varchar({ length: 255 }).notNull(),
    props: d.jsonb().$type<InputProps>().notNull(),
    audio: d.jsonb().$type<AudioTrack>(),
    audioUpdatedAt: d.timestamp("audio_updated_at", { withTimezone: true }),
    revision: d.bigint("revision", { mode: 'number' }).default(0).notNull(),
    isWelcome: d.boolean().default(true).notNull(),
    isFavorite: d.boolean().default(false).notNull(),
    createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("project_user_idx").on(t.userId),
    index("project_title_idx").on(t.title),
    uniqueIndex("project_unique_name").on(t.userId, t.title), // Added unique index on projects.title per user
  ],
);

// --- Patches table ---
// Stores JSON patches for projects, referencing the project by ID.
export const patches = createTable(
  "patch",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d.uuid().notNull().references(() => projects.id, { onDelete: "cascade" }),
    patch: d.jsonb().$type<JsonPatch>().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [index("patch_project_idx").on(t.projectId)],
);

export const patchesRelations = relations(patches, ({ one }) => ({
  project: one(projects, { fields: [patches.projectId], references: [projects.id] }),
}));

// --- Messages table ---
// Stores chat messages for projects
export const messages = createTable(
  "message",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    content: d.text().notNull(),
    role: d.varchar({ length: 50 }).notNull(), // 'user' or 'assistant'
    kind: d.varchar({ length: 50 }).default("message").notNull(), // 'message' | 'status'
    status: d.varchar({ length: 50 }), // 'pending' | 'building' | 'success' | 'error'
    imageUrls: d.jsonb("image_urls").$type<string[]>(), // Support for uploaded images
    videoUrls: d.jsonb("video_urls").$type<string[]>(), // Support for uploaded videos
    audioUrls: d.jsonb("audio_urls").$type<string[]>(), // Support for uploaded audio files
    sceneUrls: d.jsonb("scene_urls").$type<string[]>(), // Support for scene attachments
    sequence: d.integer().notNull().default(0), // Message sequence number for ordering
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
    originalTsxCode: d.text(), // Store the original code before fixing
    lastFixAttempt: d.timestamp({ withTimezone: true }), // When the last fix attempt was made
    fixIssues: d.text(), // Issues identified and fixed by the preprocessor
  }),
  (t) => [
    index("message_project_idx").on(t.projectId),
    index("message_status_idx").on(t.status),
    index("message_project_sequence_idx").on(t.projectId, t.sequence), // Index for efficient sequence-based queries
  ],
);

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, { fields: [messages.projectId], references: [projects.id] }),
}));

// --- Scenes table ---
// Stores individual scene code and props for projects
export const scenes = createTable(
  "scene",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d.uuid().notNull().references(() => projects.id, { onDelete: "cascade" }),
    order: d.integer().notNull().default(0),
    name: d.varchar({ length: 255 }).default("Scene").notNull(),
    tsxCode: d.text().notNull(),
    props: d.jsonb(), // Scene-specific props for animation parameters
    duration: d.integer().default(150).notNull(), // Duration in frames (default 5 seconds at 30fps)
    revision: d.integer().default(1).notNull(),
    // Publishing columns for BAZAAR-303
    publishedUrl: d.text(), // Public URL to the published bundle
    publishedHash: d.text(), // SHA-256 hash of the published bundle
    publishedAt: d.timestamp({ withTimezone: true }), // When the scene was published
    createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
    layoutJson: d.text("layout_json"), // NEW: Store JSON specification for two-step pipeline
    // Metadata for better scene targeting
    slug: d.varchar({ length: 255 }), // Auto-generated slug for identification
    dominantColors: d.jsonb(), // Array of dominant colors ["#000000", "#3B82F6"]
    firstH1Text: d.text(), // First H1 text content for easy identification
    lastFocused: d.boolean().default(false), // Track which scene user is working on
    
    // Sprint 106: Hybrid TSX/JS Storage
    jsCode: d.text("js_code"), // Pre-compiled JavaScript for browser execution
    jsCompiledAt: d.timestamp("js_compiled_at", { withTimezone: true }), // When TSX was compiled to JS
    compilationError: d.text("compilation_error"), // Error message if compilation failed
    // Phase 2: Versioned artifact + compile metadata (additive, safe)
    compilationVersion: d.integer("compilation_version").default(1),
    compileMeta: d.jsonb("compile_meta"),
    // Soft delete support
    deletedAt: d.timestamp("deleted_at", { withTimezone: true }),
  }),
  (t) => [
    index("scene_project_idx").on(t.projectId),
    index("scene_order_idx").on(t.projectId, t.order),
    // Index for published scenes lookup
    index("scene_publish_idx").on(t.projectId, t.publishedHash),
    // Indexes for compilation status
    index("scene_compilation_status_idx").on(t.jsCompiledAt),
    index("scene_needs_compilation_idx").on(t.id).where(sql`js_code IS NULL AND compilation_error IS NULL`),
    index("scene_deleted_at_idx").on(t.deletedAt),
  ],
);

export const scenesRelations = relations(scenes, ({ one }) => ({
  project: one(projects, { fields: [scenes.projectId], references: [projects.id] }),
}));

// ✅ NEW: Scene Iterations Tracking Table - Track every LLM operation for continuous improvement
export const sceneIterations = createTable(
  "scene_iteration",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    sceneId: d.uuid("scene_id").notNull().references(() => scenes.id, { onDelete: "cascade" }),
    projectId: d.uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    
    // LLM Decision Data
    operationType: d.varchar("operation_type", { length: 50 }).notNull(), // 'create', 'edit', 'delete'
    editComplexity: d.varchar("edit_complexity", { length: 20 }), // 'surgical', 'creative', 'structural'
    userPrompt: d.text("user_prompt").notNull(),
    brainReasoning: d.text("brain_reasoning"), // Brain LLM's tool selection reasoning
    toolReasoning: d.text("tool_reasoning"), // Tool's execution reasoning
    
    // Code Changes
    codeBefore: d.text("code_before"), // Previous TSX code (for edits)
    codeAfter: d.text("code_after"), // New TSX code
    changesApplied: d.jsonb("changes_applied"), // Structured list of changes
    changesPreserved: d.jsonb("changes_preserved"), // What was kept the same
    
    // Performance Metrics
    generationTimeMs: d.integer("generation_time_ms"),
    modelUsed: d.varchar("model_used", { length: 50 }), // 'gpt-4.1', 'gpt-4.1-mini', etc.
    temperature: d.real("temperature"),
    tokensUsed: d.integer("tokens_used"),
    
    // User Satisfaction Indicators
    userEditedAgain: d.boolean("user_edited_again").default(false), // Did user edit this scene again within 5 minutes?
    userSatisfactionScore: d.integer("user_satisfaction_score"), // 1-5 rating (future feature)
    sessionId: d.varchar("session_id", { length: 255 }), // Track user sessions
    changeSource: d.varchar({ length: 50 }).default('llm').notNull(), // Source of the change (llm, user, etc.)
    
    // Link to message that triggered this iteration
    messageId: d.uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
    
    createdAt: d.timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("scene_iteration_scene_idx").on(t.sceneId),
    index("scene_iteration_project_idx").on(t.projectId),
    index("scene_iteration_operation_idx").on(t.operationType, t.editComplexity),
    index("scene_iteration_satisfaction_idx").on(t.userEditedAgain, t.createdAt),
    index("scene_iteration_message_idx").on(t.messageId),
  ],
);

export const sceneIterationsRelations = relations(sceneIterations, ({ one }) => ({
  scene: one(scenes, { fields: [sceneIterations.sceneId], references: [scenes.id] }),
  project: one(projects, { fields: [sceneIterations.projectId], references: [projects.id] }),
  message: one(messages, { fields: [sceneIterations.messageId], references: [messages.id] }),
}));

// Scene operations for idempotency and auditing (Phase 2)
export const sceneOperations = createTable(
  "scene_operation",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d.uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    idempotencyKey: d.varchar("idempotency_key", { length: 255 }).notNull(),
    operationType: d.varchar("operation_type", { length: 50 }).notNull(),
    payload: d.jsonb(),
    result: d.jsonb(),
    createdAt: d.timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("scene_operation_project_idx").on(t.projectId),
    uniqueIndex("scene_operation_unique_idx").on(t.projectId, t.idempotencyKey),
  ],
);

// --- Scene Specs table ---
// Stores SceneSpec JSON for MCP architecture
export const sceneSpecs = createTable(
  "scene_specs",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d.uuid().notNull().references(() => projects.id, { onDelete: "cascade" }),
    sceneId: d.varchar({ length: 255 }).notNull(), // Scene identifier from SceneSpec
    name: d.varchar({ length: 255 }), // Human-readable scene name
    spec: d.jsonb().notNull(), // Complete SceneSpec JSON
    version: d.varchar({ length: 10 }).default("1.0").notNull(), // Schema version
    createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
    createdBy: d.varchar({ length: 255 }).references(() => users.id),
  }),
  (t) => [
    index("scene_spec_project_idx").on(t.projectId),
    index("scene_spec_created_at_idx").on(t.createdAt),
    index("scene_spec_scene_id_idx").on(t.sceneId),
    // Ensure unique scene_id per project
    uniqueIndex("scene_spec_unique_scene_id").on(t.projectId, t.sceneId),
    // Added missing GIN index for JSONB spec column
    index("scene_spec_spec_gin_idx").using("gin", t.spec),
  ],
);

export const sceneSpecsRelations = relations(sceneSpecs, ({ one }) => ({
  project: one(projects, { fields: [sceneSpecs.projectId], references: [projects.id] }),
  createdByUser: one(users, { fields: [sceneSpecs.createdBy], references: [users.id] }),
}));

// --- Custom Component Jobs table ---
// Stores jobs for generating and compiling custom Remotion components
export const customComponentJobs = createTable(
  "custom_component_job",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    effect: d.text().notNull(), // Natural language description of the effect
    tsxCode: d.text(), // Generated TSX code for the component
    metadata: d.jsonb(), // NEW – intent or other metadata
    statusMessageId: d.uuid().references(() => messages.id), // Link to status message for streaming updates
    status: d.varchar({ length: 50 }).default("pending").notNull(), // "pending"|"building"|"success"|"error"
    outputUrl: d.text(), // URL to the compiled JS hosted on R2
    errorMessage: d.text(), // Error message if compilation failed
    retryCount: d.integer().default(0).notNull(), // Number of retry attempts
    lastSuccessfulStep: d.varchar('last_successful_step', { length: 50 }),
    nextRetryAt: d.timestamp('next_retry_at', { withTimezone: true }),
    errorContext: d.jsonb('error_context'),
    checkpointData: d.jsonb('checkpoint_data'),
    lastStep: d.varchar('last_step', { length: 50 }),
    // A2A protocol support fields
    taskId: d.text('task_id'), // A2A task ID
    internalStatus: d.varchar('internal_status', { length: 50 }), // For internal tracking
    requiresInput: d.boolean('requires_input').default(false), // Whether user input is needed
    inputType: d.text('input_type'), // What kind of input is needed
    taskState: d.jsonb('task_state'), // Current A2A task state details
    artifacts: d.jsonb('artifacts'), // A2A artifacts collection
    history: d.jsonb('history'), // Added history field for A2A task history
    sseEnabled: d.boolean('sse_enabled').default(false), // Whether SSE is enabled for this task
    // Timestamps
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
    
    // Original columns (using camelCase as in production)
    originalTsxCode: d.text(), // Original TSX code before fix attempts
    lastFixAttempt: d.timestamp({ withTimezone: true }), // Timestamp of last fix attempt
    fixIssues: d.text() // Issues encountered during fix attempts
  }),
  (t) => [
    index("custom_component_job_project_idx").on(t.projectId),
    index("custom_component_job_status_idx").on(t.status),
    index("custom_component_job_task_id_idx").on(t.taskId),
  ],
);

// Add relations for custom component jobs
export const customComponentJobsRelations = relations(customComponentJobs, ({ one }) => ({
  project: one(projects, { fields: [customComponentJobs.projectId], references: [projects.id] }),
}));

// --- Component Errors table ---
// Stores errors for custom component jobs
export const componentErrors = createTable(
  "component_error",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    jobId: d
      .uuid()
      .notNull()
      .references(() => customComponentJobs.id, { onDelete: "cascade" }),
    errorType: d.varchar({ length: 100 }).notNull(),
    details: d.text().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [index("component_error_job_idx").on(t.jobId)],
);

export const componentErrorsRelations = relations(componentErrors, ({ one }) => ({
  job: one(customComponentJobs, {
    fields: [componentErrors.jobId],
    references: [customComponentJobs.id],
  }),
}));

// --- Webhook Deliveries (GitHub) ---
// Used to deduplicate GitHub webhook deliveries (x-github-delivery)
export const webhookDeliveries = createTable(
  "webhook_delivery",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    deliveryId: d.varchar("delivery_id", { length: 255 }).notNull().unique(),
    event: d.varchar({ length: 100 }).notNull(),
    repository: d.varchar({ length: 255 }), // owner/repo, optional for initial insert
    receivedAt: d.timestamp("received_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("webhook_delivery_delivery_id_idx").on(t.deliveryId),
    index("webhook_delivery_received_at_idx").on(t.receivedAt),
  ],
);

// --- Metrics table ---
export const metrics = createTable(
  "metric",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    name: d.varchar({ length: 100 }).notNull(),
    value: d.real().notNull(),
    tags: d.jsonb(),
    timestamp: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  })
);

// --- Scene Plans table ---
// Stores LLM reasoning about scene planning
export const scenePlans = createTable(
  "scene_plan",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    messageId: d
      .uuid()
      .references(() => messages.id, { onDelete: "cascade" }),
    rawReasoning: d.text().notNull(), // Raw LLM reasoning about the plan
    planData: d.jsonb().notNull(), // The structured scene plan data
    userPrompt: d.text().notNull(), // Prompt that generated this plan
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("scene_plan_project_idx").on(t.projectId),
  ],
);

export const scenePlansRelations = relations(scenePlans, ({ one }) => ({
  project: one(projects, { fields: [scenePlans.projectId], references: [projects.id] }),
  message: one(messages, { fields: [scenePlans.messageId], references: [messages.id] }),
}));

// --- Animation Design Briefs table ---
// Stores detailed animation specifications that bridge scene plans and component generation
export const animationDesignBriefs = createTable(
  "animation_design_brief",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sceneId: d.uuid().notNull(), // References scene plan ID (or scene ID within project)
    componentJobId: d
      .uuid()
      .references(() => customComponentJobs.id), // Optional link to component job
    designBrief: d.jsonb().notNull(), // Design brief data
    llmModel: d.varchar({ length: 100 }).notNull(), // Model used to generate the brief
    status: d.varchar({ length: 50 })
      .default("pending")
      .notNull(), // "pending"|"complete"|"error"
    errorMessage: d.text(), // Error message if generation failed
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
    originalTsxCode: d.text(), // Store the original code before fixing
    lastFixAttempt: d.timestamp({ withTimezone: true }), // When the last fix attempt was made
    fixIssues: d.text(), // Issues identified and fixed by the preprocessor
  }),
  (t) => [
    index("animation_design_brief_project_idx").on(t.projectId),
    index("animation_design_brief_scene_idx").on(t.sceneId),
    index("animation_design_brief_component_idx").on(t.componentJobId),
  ],
);

export const animationDesignBriefsRelations = relations(animationDesignBriefs, ({ one }) => ({
  project: one(projects, {
    fields: [animationDesignBriefs.projectId],
    references: [projects.id],
  }),
  componentJob: one(customComponentJobs, {
    fields: [animationDesignBriefs.componentJobId],
    references: [customComponentJobs.id],
  }),
}));

// --- Feedback table ---
// Stores user feedback and feature prioritization
export const feedback = createTable(
  "feedback",
  (d) => ({
    id: d.text('id').primaryKey().$defaultFn(() => crypto.randomUUID()), // Using text for createId compatibility if needed, else use uuid()
    content: d.text('content'), // Free-text comments, can be nullable if only features are prioritized
    name: d.text('name'), // Optional name provided by user
    email: d.text('email'), // Optional for anonymous, pre-filled for logged-in
    userId: d.varchar('user_id', { length: 255 }).references(() => users.id, { onDelete: 'set null' }),
    prioritizedFeatures: d.jsonb('prioritized_features').$type<string[]>(), // Array of selected feature IDs/names
    createdAt: d.timestamp('created_at', { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    status: d.text('status').default('new').notNull(), // e.g., 'new', 'reviewed', 'planned', 'implemented', 'archived'
    adminNotes: d.text('admin_notes'), // For internal team notes
  }),
  (t) => [
    index("feedback_user_idx").on(t.userId),
    index("feedback_status_idx").on(t.status),
    index("feedback_created_at_idx").on(t.createdAt),
  ]
);

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, { fields: [feedback.userId], references: [users.id] }),
}));

// --- Email Subscribers table ---
// Stores email addresses for newsletter/updates signup
export const emailSubscribers = createTable(
  "email_subscriber",
  (d) => ({
    id: d.text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: d.text('email').notNull().unique(),
    subscribedAt: d.timestamp('subscribed_at', { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    status: d.text('status').default('active').notNull(), // 'active', 'unsubscribed'
    source: d.text('source').default('homepage').notNull(), // 'homepage', 'footer', etc.
    userId: d.varchar('user_id', { length: 255 }).references(() => users.id, { onDelete: 'set null' }), // Optional link to user if logged in
  }),
  (t) => [
    index("email_subscriber_email_idx").on(t.email),
    index("email_subscriber_status_idx").on(t.status),
    index("email_subscriber_subscribed_at_idx").on(t.subscribedAt),
  ]
);

export const emailSubscribersRelations = relations(emailSubscribers, ({ one }) => ({
  user: one(users, { fields: [emailSubscribers.userId], references: [users.id] }),
}));

// --- Assets table ---
// User-centric media asset storage with cross-project sharing
export const assets = createTable(
  "asset",
  (d) => ({
    id: d.text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    url: d.text("url").notNull(),
    userId: d.varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    
    // Names
    originalName: d.text("original_name").notNull(),
    customName: d.text("custom_name"), // User-defined name for easy reference
    
    // Asset info
    type: d.text("type").notNull(), // 'image', 'video', 'audio', 'logo'
    mimeType: d.text("mime_type"),
    fileSize: d.integer("file_size"), // in bytes
    
    // Metadata
    width: d.integer("width"),
    height: d.integer("height"),
    duration: d.integer("duration"), // for video/audio in seconds
    thumbnailUrl: d.text("thumbnail_url"),
    
    // Usage tracking
    usageCount: d.integer("usage_count").default(0).notNull(),
    lastUsedAt: d.timestamp("last_used_at", { withTimezone: true }),
    
    // Organization
    tags: d.text("tags").array(), // Array of tags for categorization
    
    // Soft delete
    deletedAt: d.timestamp("deleted_at", { withTimezone: true }),
    
    // Timestamps
    createdAt: d.timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: d.timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("asset_user_id_idx").on(t.userId),
    index("asset_type_idx").on(t.type),
    index("asset_custom_name_idx").on(t.customName),
    index("asset_url_idx").on(t.url),
    index("asset_deleted_at_idx").on(t.deletedAt),
    uniqueIndex("asset_url_user_idx").on(t.url, t.userId), // One asset per URL per user
  ]
);

// Junction table for project-asset relationships
export const projectAssets = createTable(
  "project_asset",
  (d) => ({
    id: d.text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: d.uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    assetId: d.text("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
    addedAt: d.timestamp("added_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    addedVia: d.text("added_via"), // 'upload', 'reference', 'import'
  }),
  (t) => [
    index("project_asset_project_id_idx").on(t.projectId),
    index("project_asset_asset_id_idx").on(t.assetId),
    uniqueIndex("project_asset_unique_idx").on(t.projectId, t.assetId),
  ]
);

export const assetsRelations = relations(assets, ({ one, many }) => ({
  user: one(users, { fields: [assets.userId], references: [users.id] }),
  projects: many(projectAssets),
}));

export const projectAssetsRelations = relations(projectAssets, ({ one }) => ({
  project: one(projects, { fields: [projectAssets.projectId], references: [projects.id] }),
  asset: one(assets, { fields: [projectAssets.assetId], references: [assets.id] }),
}));

// --- Agent Messages table ---
// Stores messages exchanged between agents for A2A protocol support
export const agentMessages = createTable(
  "agent_message",
  (d) => ({
    id: d.text().primaryKey(), // UUID for the message
    sender: d.text("sender").notNull(), // Name of the sending agent
    recipient: d.text("recipient").notNull(), // Name of the recipient agent
    type: d.text("type").notNull(), // Type of the message (e.g., TASK_START, DATA_REQUEST)
    payload: d.jsonb("payload").$type<Record<string, any>>().notNull(), // Content of the message, typed
    correlationId: d.text("correlation_id"), // Optional ID to correlate messages
    status: d.text("status").default('pending').notNull(), // e.g., pending, processed, failed
    createdAt: d
      .timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    processedAt: d.timestamp({ withTimezone: true, mode: 'string' })
  }),
  (t) => [
    index("agent_message_correlation_id_idx").on(t.correlationId),
    index("agent_message_type_idx").on(t.type),
    index("agent_message_sender_idx").on(t.sender),
    index("agent_message_recipient_idx").on(t.recipient),
  ],
);

// Add custom index for task ID in payload
export const agentMessagesIndexes = {
  byTaskId: sql`CREATE INDEX IF NOT EXISTS "idx_agent_messages_task_id" ON "bazaar-vid_agent_message" ((payload->>'taskId'))`,
};

// Add history field to customComponentJobs to support A2A protocol task history
export const customComponentJobsUpdate = sql`
  ALTER TABLE "bazaar-vid_custom_component_job"
  ADD COLUMN IF NOT EXISTS "history" JSONB
`;

export const customComponentJobsRecoveryUpdate = sql`
  ALTER TABLE "bazaar-vid_custom_component_job"
  ADD COLUMN IF NOT EXISTS "last_successful_step" varchar(50),
  ADD COLUMN IF NOT EXISTS "next_retry_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "error_context" jsonb
`;

// --- Component Test Cases table ---
// Stores test cases for component generation evaluation
export const componentTestCases = createTable(
  "component_test_case",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    prompt: d.text().notNull(),
    category: d.varchar({ length: 50 }).notNull(),
    complexity: d.integer().notNull(),
    edgeCases: d.jsonb().default([]),
    createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("component_test_cases_category_idx").on(t.category),
  ],
);

// --- Component Evaluation Metrics table ---
// Stores metrics from component generation evaluation
export const componentEvaluationMetrics = createTable(
  "component_evaluation_metric",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    testCaseId: d.uuid().notNull().references(() => componentTestCases.id),
    timestamp: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    
    // Test case metadata
    category: d.varchar({ length: 50 }).notNull(),
    complexity: d.integer().notNull(),
    edgeCases: d.jsonb().default([]),
    
    // Pipeline success metrics
    success: d.boolean().notNull(),
    errorStage: d.varchar({ length: 50 }),
    errorType: d.varchar({ length: 100 }),
    errorMessage: d.text(),
    
    // Timing metrics
    promptSubmissionTime: d.timestamp({ withTimezone: true }).notNull(),
    codeGenerationStartTime: d.timestamp({ withTimezone: true }),
    codeGenerationEndTime: d.timestamp({ withTimezone: true }),
    validationStartTime: d.timestamp({ withTimezone: true }),
    validationEndTime: d.timestamp({ withTimezone: true }),
    buildStartTime: d.timestamp({ withTimezone: true }),
    buildEndTime: d.timestamp({ withTimezone: true }),
    uploadStartTime: d.timestamp({ withTimezone: true }),
    uploadEndTime: d.timestamp({ withTimezone: true }),
    componentCompletionTime: d.timestamp({ withTimezone: true }),
    
    // Derived timing metrics
    timeToFirstToken: d.integer(),
    codeGenerationTime: d.integer(),
    validationTime: d.integer(),
    buildTime: d.integer(),
    uploadTime: d.integer(),
    totalTime: d.integer(),
    
    // Code quality metrics
    syntaxErrorCount: d.integer(),
    eslintErrorCount: d.integer(),
    eslintWarningCount: d.integer(),
    codeLength: d.integer(),
    
    // Rendering metrics
    renderSuccess: d.boolean(),
    renderErrorMessage: d.text(),
    
    // References
    componentId: d.varchar({ length: 100 }),
    outputUrl: d.text(),
    taskId: d.uuid(),
    
    // A2A specific metrics
    stateTransitions: d.jsonb().default([]),
    artifacts: d.jsonb().default([]),
    
    // Analysis fields
    analysisNotes: d.text(),
    tags: d.jsonb().default([]),
  }),
  (t) => [
    index("component_evaluation_metrics_test_case_id_idx").on(t.testCaseId),
    index("component_evaluation_metrics_success_idx").on(t.success),
    index("component_evaluation_metrics_timestamp_idx").on(t.timestamp),
    index("component_evaluation_metrics_category_idx").on(t.category),
  ],
);

export const componentEvaluationMetricsRelations = relations(componentEvaluationMetrics, ({ one }) => ({
  testCase: one(componentTestCases, { fields: [componentEvaluationMetrics.testCaseId], references: [componentTestCases.id] }),
}));

// Export inferred type for customComponentJobs table
export type ComponentJob = InferSelectModel<typeof customComponentJobs>;

// Export inferred type for scenes table
export type Scene = InferSelectModel<typeof scenes>;

// Define and export TaskStatus type
export type TaskStatus = "pending" | "building" | "success" | "error";

// --- Shared Videos table ---
// Stores shared videos for public video sharing
export const sharedVideos = createTable(
  "shared_video",
  (d) => ({
    id: d.varchar({ length: 255 }).notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: d.uuid().notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    title: d.varchar({ length: 255 }),
    description: d.text(),
    videoUrl: d.varchar({ length: 500 }), // R2 public URL
    thumbnailUrl: d.varchar({ length: 500 }),
    isPublic: d.boolean().default(true),
    viewCount: d.integer().default(0),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    expiresAt: d.timestamp({ withTimezone: true }), // Optional expiration
  }),
);

export const sharedVideosRelations = relations(sharedVideos, ({ one }) => ({
  project: one(projects, {
    fields: [sharedVideos.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [sharedVideos.userId],
    references: [users.id],
  }),
}));

// --- Phase 2: Project Memory & Image Analysis Tables for Async Context Storage ---

/**
 * Project Memory Table: Stores accumulated context across user sessions
 * Enables 30+ prompt workflows with persistent user preferences and scene relationships
 */
export const projectMemory = createTable("project_memory", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  projectId: d.uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  memoryType: d.varchar("memory_type", { length: 50 }).notNull(), // 'user_preference', 'scene_relationship', 'conversation_context'
  memoryKey: d.varchar("memory_key", { length: 255 }).notNull(), // e.g., 'duration_preference', 'style_preference', 'scene_reference'
  memoryValue: d.text("memory_value").notNull(), // JSON or text value
  confidence: d.real("confidence").default(0.8), // 0.0-1.0 confidence score
  sourcePrompt: d.text("source_prompt"), // Original user prompt that created this memory
  createdAt: d.timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
  expiresAt: d.timestamp("expires_at", { withTimezone: true }), // Optional expiration for temporary context
}), (t) => [
  index("project_memory_project_idx").on(t.projectId),
  index("project_memory_type_key_idx").on(t.memoryType, t.memoryKey),
]);

/**
 * Image Analysis Table: Stores persistent image facts from vision analysis
 * Supports fire-and-forget async image processing with late-arriving facts integration
 */
export const imageAnalysis = createTable("image_analysis", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  projectId: d.uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  traceId: d.varchar("trace_id", { length: 100 }).notNull(), // From startAsyncImageAnalysis()
  imageUrls: d.jsonb("image_urls").notNull(), // Array of uploaded image URLs
  palette: d.jsonb("palette").notNull(), // Extracted color palette  
  typography: d.text("typography").notNull(), // Typography analysis
  mood: d.text("mood").notNull(), // Style mood analysis
  layoutJson: d.jsonb("layout_json"), // Structured layout analysis
  processingTimeMs: d.integer("processing_time_ms").notNull(),
  createdAt: d.timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  usedInScenes: d.jsonb("used_in_scenes"), // Track which scenes used this analysis
}), (t) => [
  index("image_analysis_project_idx").on(t.projectId),
  index("image_analysis_trace_idx").on(t.traceId),
  index("image_analysis_created_idx").on(t.createdAt),
]);

// Relations for project memory
export const projectMemoryRelations = relations(projectMemory, ({ one }) => ({
  project: one(projects, {
    fields: [projectMemory.projectId],
    references: [projects.id],
  }),
}));

// Relations for image analysis
export const imageAnalysisRelations = relations(imageAnalysis, ({ one }) => ({
  project: one(projects, {
    fields: [imageAnalysis.projectId],
    references: [projects.id],
  }),
}));

// Memory type enum for better type safety
export const MEMORY_TYPES = {
  USER_PREFERENCE: 'user_preference',
  SCENE_RELATIONSHIP: 'scene_relationship', 
  CONVERSATION_CONTEXT: 'conversation_context',
} as const;

export type MemoryType = typeof MEMORY_TYPES[keyof typeof MEMORY_TYPES];

// Type exports for TypeScript
export type ProjectMemory = typeof projectMemory.$inferSelect;
export type InsertProjectMemory = typeof projectMemory.$inferInsert;

export type ImageAnalysis = typeof imageAnalysis.$inferSelect;
export type InsertImageAnalysis = typeof imageAnalysis.$inferInsert;

// --- Exports table ---
// Stores video export records for tracking and analytics
export const exports = createTable("exports", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  userId: d.varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: d.uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  renderId: d.text("render_id").notNull().unique(),
  status: d.text("status", { 
    enum: ["pending", "rendering", "completed", "failed"] 
  }).notNull().default("pending"),
  progress: d.integer("progress").default(0),
  format: d.text("format", { 
    enum: ["mp4", "webm", "gif"] 
  }).notNull().default("mp4"),
  quality: d.text("quality", { 
    enum: ["low", "medium", "high"] 
  }).notNull().default("high"),
  outputUrl: d.text("output_url"),
  fileSize: d.integer("file_size"), // in bytes
  duration: d.integer("duration"), // in frames
  error: d.text("error"),
  metadata: d.jsonb("metadata"), // For storing additional info like resolution, fps, etc.
  downloadCount: d.integer("download_count").default(0),
  lastDownloadedAt: d.timestamp("last_downloaded_at"),
  createdAt: d.timestamp("created_at").defaultNow().notNull(),
  completedAt: d.timestamp("completed_at"),
}), (t) => [
  index("exports_user_idx").on(t.userId),
  index("exports_project_idx").on(t.projectId),
  index("exports_render_idx").on(t.renderId),
  index("exports_created_idx").on(t.createdAt),
]);

export const exportsRelations = relations(exports, ({ one }) => ({
  user: one(users, {
    fields: [exports.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [exports.projectId],
    references: [projects.id],
  }),
}));

// Export analytics table for tracking detailed metrics
export const exportAnalytics = createTable("export_analytics", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  exportId: d.uuid("export_id").notNull().references(() => exports.id, { onDelete: "cascade" }),
  event: d.text("event", {
    enum: ["started", "progress", "completed", "failed", "downloaded", "viewed"]
  }).notNull(),
  eventData: d.jsonb("event_data"), // Additional event-specific data
  userAgent: d.text("user_agent"),
  ipAddress: d.text("ip_address"),
  createdAt: d.timestamp("created_at").defaultNow().notNull(),
}), (t) => [
  index("export_analytics_export_idx").on(t.exportId),
  index("export_analytics_event_idx").on(t.event),
  index("export_analytics_created_idx").on(t.createdAt),
]);

export const exportAnalyticsRelations = relations(exportAnalytics, ({ one }) => ({
  export: one(exports, {
    fields: [exportAnalytics.exportId],
    references: [exports.id],
  }),
}));

// --- Credit System Tables ---

// User credit balances
export const userCredits = createTable("user_credits", (d) => ({
  userId: d.varchar("user_id", { length: 255 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  dailyCredits: d.integer("daily_credits").default(150).notNull(),
  purchasedCredits: d.integer("purchased_credits").default(0).notNull(),
  lifetimeCredits: d.integer("lifetime_credits").default(0).notNull(), // Total ever purchased
  dailyResetAt: d.timestamp("daily_reset_at", { withTimezone: true }).notNull(),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("user_credits_daily_reset_idx").on(t.dailyResetAt),
]);

export const userCreditsRelations = relations(userCredits, ({ one, many }) => ({
  user: one(users, {
    fields: [userCredits.userId],
    references: [users.id],
  }),
  transactions: many(creditTransactions),
}));

// Credit transaction history
export const creditTransactions = createTable("credit_transaction", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  userId: d.varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: d.text("type", {
    enum: ["daily_grant", "purchase", "usage", "refund", "bonus", "adjustment"]
  }).notNull(),
  amount: d.integer("amount").notNull(), // Positive for additions, negative for usage
  balance: d.integer("balance").notNull(), // Balance after transaction
  description: d.text("description").notNull(),
  metadata: d.jsonb("metadata"), // Additional data (e.g., what it was used for)
  stripePaymentIntentId: d.text("stripe_payment_intent_id"), // For purchases
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("credit_transactions_user_idx").on(t.userId),
  index("credit_transactions_type_idx").on(t.type),
  index("credit_transactions_created_idx").on(t.createdAt),
  index("credit_transactions_stripe_idx").on(t.stripePaymentIntentId),
]);

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
}));

// Credit packages for purchase
export const creditPackages = createTable("credit_package", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  name: d.varchar("name", { length: 100 }).notNull(),
  credits: d.integer("credits").notNull(),
  price: d.integer("price").notNull(), // In cents
  stripePriceId: d.text("stripe_price_id").unique(), // Once we create in Stripe
  bonusPercentage: d.integer("bonus_percentage").default(0).notNull(),
  popular: d.boolean("popular").default(false).notNull(),
  active: d.boolean("active").default(true).notNull(),
  sortOrder: d.integer("sort_order").default(0).notNull(),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("credit_packages_active_idx").on(t.active),
  index("credit_packages_sort_idx").on(t.sortOrder),
]);

// --- Simple Usage Limits & Tracking Tables ---

// Simple configurable limits (free tier only, pro tier uses credits)
export const usageLimits = createTable("usage_limit", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  limitKey: d.varchar("limit_key", { length: 100 }).notNull().unique(),
  freeTierLimit: d.integer("free_tier_limit").default(0).notNull(),
  description: d.text("description"),
  resetPeriod: d.varchar("reset_period", { length: 20 }).default("daily").notNull(), // 'daily', 'per_project', 'never'
  isActive: d.boolean("is_active").default(true).notNull(),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("usage_limits_active_idx").on(t.isActive),
  index("usage_limits_reset_period_idx").on(t.resetPeriod),
]);

// Daily usage tracking per user
export const userUsage = createTable("user_usage", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  userId: d.varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: d.date("date").notNull(),
  usageType: d.varchar("usage_type", { length: 50 }).notNull(), // 'prompts', 'projects', 'exports'
  count: d.integer("count").default(0).notNull(),
  projectId: d.uuid("project_id").references(() => projects.id, { onDelete: "set null" }), // For per-project limits
  metadata: d.jsonb("metadata"), // Additional usage details
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("user_usage_user_date_idx").on(t.userId, t.date),
  index("user_usage_type_idx").on(t.usageType),
  index("user_usage_project_idx").on(t.projectId),
  // Ensure unique usage per user per date per type
  uniqueIndex("user_usage_unique_idx").on(t.userId, t.date, t.usageType),
]);

// Relations for usage tables
export const usageLimitsRelations = relations(usageLimits, ({ many }) => ({
  // No direct relations needed for configuration table
}));

export const userUsageRelations = relations(userUsage, ({ one }) => ({
  user: one(users, {
    fields: [userUsage.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [userUsage.projectId],
    references: [projects.id],
  }),
}));

// --- API Usage Metrics table ---
// Tracks AI API usage for monitoring and alerting
export const apiUsageMetrics = createTable(
  "api_usage_metric",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    
    // API details
    provider: d.varchar({ length: 50 }).notNull(), // 'anthropic' | 'openai'
    model: d.varchar({ length: 100 }).notNull(),
    
    // Request metadata
    userId: d.varchar("user_id", { length: 255 }).references(() => users.id),
    projectId: d.uuid("project_id").references(() => projects.id),
    toolName: d.varchar("tool_name", { length: 100 }),
    
    // Metrics
    success: d.boolean().notNull(),
    responseTime: d.integer("response_time").notNull(), // milliseconds
    inputTokens: d.integer("input_tokens"),
    outputTokens: d.integer("output_tokens"),
    tokenCount: d.integer("token_count"),
    
    // Error tracking
    errorType: d.varchar("error_type", { length: 100 }),
    errorMessage: d.text("error_message"),
    
    // Additional data
    metadata: d.jsonb("metadata"),
    
    // Timestamp
    timestamp: d.timestamp({ withTimezone: true }).notNull().defaultNow(),
  }),
  (t) => [
    // Indexes for efficient queries
    index("api_metrics_timestamp_idx").on(t.timestamp),
    index("api_metrics_provider_idx").on(t.provider),
    index("api_metrics_user_idx").on(t.userId),
    index("api_metrics_success_idx").on(t.success),
    index("api_metrics_composite_idx").on(t.provider, t.timestamp, t.success),
  ]
);

export const apiUsageMetricsRelations = relations(apiUsageMetrics, ({ one }) => ({
  user: one(users, {
    fields: [apiUsageMetrics.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [apiUsageMetrics.projectId],
    references: [projects.id],
  }),
}));

// --- Promo Codes & Analytics Tables ---

// Promo codes table
export const promoCodes = createTable("promo_codes", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  code: d.varchar("code", { length: 50 }).unique().notNull(),
  description: d.text("description"),
  discountType: d.text("discount_type", {
    enum: ["percentage", "fixed_amount", "free_credits"]
  }).notNull(),
  discountValue: d.integer("discount_value").notNull(), // percentage (0-100), cents for fixed, or credit count
  maxUses: d.integer("max_uses"), // NULL for unlimited
  usesCount: d.integer("uses_count").default(0).notNull(),
  validFrom: d.timestamp("valid_from", { withTimezone: true }).defaultNow().notNull(),
  validUntil: d.timestamp("valid_until", { withTimezone: true }),
  minPurchaseAmount: d.integer("min_purchase_amount"), // Minimum purchase in cents
  applicablePackages: d.uuid("applicable_packages").array(), // Array of package IDs, NULL for all
  createdBy: d.varchar("created_by", { length: 255 }).references(() => users.id),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("promo_codes_code_idx").on(t.code),
  index("promo_codes_valid_idx").on(t.validFrom, t.validUntil),
]);

// Track promo code usage
export const promoCodeUsage = createTable("promo_code_usage", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  promoCodeId: d.uuid("promo_code_id").notNull().references(() => promoCodes.id),
  userId: d.varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  orderId: d.varchar("order_id", { length: 255 }), // Stripe payment intent ID
  discountAppliedCents: d.integer("discount_applied_cents").notNull(),
  usedAt: d.timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  uniqueIndex("promo_code_user_unique").on(t.promoCodeId, t.userId), // One use per user
  index("promo_code_usage_user_idx").on(t.userId),
  index("promo_code_usage_code_idx").on(t.promoCodeId),
]);

// Track all paywall interactions
export const paywallEvents = createTable("paywall_events", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  userId: d.varchar("user_id", { length: 255 }).notNull().references(() => users.id),
  eventType: d.varchar("event_type", { length: 50 }).notNull(), // 'viewed', 'clicked_package', 'initiated_checkout', 'completed_purchase'
  packageId: d.uuid("package_id"), // References credit_package, but not enforced for flexibility
  metadata: d.jsonb("metadata"), // Store additional context
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("paywall_events_user_idx").on(t.userId),
  index("paywall_events_type_idx").on(t.eventType),
  index("paywall_events_created_idx").on(t.createdAt),
]);

// Analytics aggregations for performance
export const paywallAnalytics = createTable("paywall_analytics", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  date: d.date("date").notNull().unique(),
  uniqueUsersHitPaywall: d.integer("unique_users_hit_paywall").default(0).notNull(),
  uniqueUsersClickedPackage: d.integer("unique_users_clicked_package").default(0).notNull(),
  uniqueUsersInitiatedCheckout: d.integer("unique_users_initiated_checkout").default(0).notNull(),
  uniqueUsersCompletedPurchase: d.integer("unique_users_completed_purchase").default(0).notNull(),
  totalRevenueCents: d.integer("total_revenue_cents").default(0).notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("paywall_analytics_date_idx").on(t.date),
]);

// Relations for promo codes
export const promoCodesRelations = relations(promoCodes, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [promoCodes.createdBy],
    references: [users.id],
  }),
  usage: many(promoCodeUsage),
}));

export const promoCodeUsageRelations = relations(promoCodeUsage, ({ one }) => ({
  promoCode: one(promoCodes, {
    fields: [promoCodeUsage.promoCodeId],
    references: [promoCodes.id],
  }),
  user: one(users, {
    fields: [promoCodeUsage.userId],
    references: [users.id],
  }),
}));

export const paywallEventsRelations = relations(paywallEvents, ({ one }) => ({
  user: one(users, {
    fields: [paywallEvents.userId],
    references: [users.id],
  }),
}));

// --- Dynamic Templates System ---

// Templates table for storing user-created and official templates
export const templates = createTable("templates", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  name: d.varchar("name", { length: 255 }).notNull(),
  description: d.text("description"),
  tsxCode: d.text("tsx_code").notNull(),
  jsCode: d.text("js_code"),
  jsCompiledAt: d.timestamp("js_compiled_at", { withTimezone: true }),
  compilationError: d.text("compilation_error"),
  duration: d.integer("duration").notNull(),
  previewFrame: d.integer("preview_frame").default(15),
  supportedFormats: d.jsonb("supported_formats").$type<('landscape' | 'portrait' | 'square')[]>().default(['landscape', 'portrait', 'square']),
  thumbnailUrl: d.text("thumbnail_url"),
  category: d.varchar("category", { length: 100 }),
  tags: d.jsonb("tags").$type<string[]>().default([]),
  isActive: d.boolean("is_active").default(true).notNull(),
  isOfficial: d.boolean("is_official").default(false).notNull(),
  adminOnly: d.boolean("admin_only").default(false).notNull(),
  sceneCount: d.integer("scene_count").default(1).notNull(),
  totalDuration: d.integer("total_duration"),
  createdBy: d.varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  sourceProjectId: d.uuid("source_project_id").references(() => projects.id),
  sourceSceneId: d.uuid("source_scene_id").references(() => scenes.id),
  usageCount: d.integer("usage_count").default(0).notNull(),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("templates_active_idx").on(t.isActive),
  index("templates_official_idx").on(t.isOfficial),
  index("templates_admin_only_idx").on(t.adminOnly),
  index("templates_category_idx").on(t.category),
  index("templates_created_by_idx").on(t.createdBy),
  index("templates_created_at_idx").on(t.createdAt),
]);

export const templateScenes = createTable("template_scene", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  templateId: d.uuid("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  name: d.varchar("name", { length: 255 }).notNull(),
  description: d.text("description"),
  order: d.integer("order").notNull(),
  duration: d.integer("duration").notNull(),
  tsxCode: d.text("tsx_code").notNull(),
  jsCode: d.text("js_code"),
  jsCompiledAt: d.timestamp("js_compiled_at", { withTimezone: true }),
  compilationError: d.text("compilation_error"),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("template_scene_template_idx").on(t.templateId),
  index("template_scene_order_idx").on(t.templateId, t.order),
]);

export const templateScenesRelations = relations(templateScenes, ({ one }) => ({
  template: one(templates, {
    fields: [templateScenes.templateId],
    references: [templates.id],
  }),
}));

// Template relations
export const templatesRelations = relations(templates, ({ one, many }) => ({
  creator: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
  }),
  sourceProject: one(projects, {
    fields: [templates.sourceProjectId],
    references: [projects.id],
  }),
  sourceScene: one(scenes, {
    fields: [templates.sourceSceneId],
    references: [scenes.id],
  }),
  scenes: many(templateScenes),
}));

// Track per-usage events for templates to enable timeframe analytics
export const templateUsages = createTable("template_usage", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  templateId: d.uuid("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
  userId: d.varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  projectId: d.uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  sceneId: d.uuid("scene_id").references(() => scenes.id, { onDelete: "set null" }),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("template_usage_template_idx").on(t.templateId),
  index("template_usage_created_idx").on(t.createdAt),
]);

// Changelog Entries table for GitHub integration
export const changelogEntries = createTable("changelog_entries", (d) => ({
  id: d.uuid().defaultRandom().primaryKey(),
  
  // GitHub PR information
  prNumber: d.integer("pr_number").notNull(),
  repositoryFullName: d.text("repository_full_name").notNull(), // e.g., "owner/repo"
  repositoryOwner: d.text("repository_owner").notNull(),
  repositoryName: d.text("repository_name").notNull(),
  
  // PR content
  title: d.text().notNull(),
  description: d.text().notNull(),
  type: d.text({ enum: ['feature', 'fix', 'refactor', 'docs', 'style', 'test', 'chore'] }).notNull(),
  
  // Author information
  authorUsername: d.text("author_username").notNull(),
  authorAvatar: d.text("author_avatar"),
  authorUrl: d.text("author_url"),
  
  // Video information
  videoUrl: d.text("video_url"),
  thumbnailUrl: d.text("thumbnail_url"),
  gifUrl: d.text("gif_url"),
  videoDuration: d.integer("video_duration"), // in seconds
  videoFormat: d.text("video_format").default('landscape'),
  
  // Processing status
  status: d.text({ enum: ['queued', 'processing', 'completed', 'failed'] }).default('queued').notNull(),
  jobId: d.text("job_id"), // Queue job ID
  errorMessage: d.text("error_message"),
  
  // Statistics
  additions: d.integer().default(0),
  deletions: d.integer().default(0),
  filesChanged: d.integer("files_changed").default(0),
  viewCount: d.integer("view_count").default(0),
  
  // Version information
  version: d.text(), // Optional version tag
  
  // Timestamps
  mergedAt: d.timestamp("merged_at", { withTimezone: true }).notNull(),
  createdAt: d.timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  processedAt: d.timestamp("processed_at", { withTimezone: true }), // When video was generated
}), (t) => [
  index("changelog_repository_idx").on(t.repositoryFullName),
  index("changelog_pr_idx").on(t.repositoryFullName, t.prNumber),
  index("changelog_status_idx").on(t.status),
  index("changelog_merged_at_idx").on(t.mergedAt),
  index("changelog_created_at_idx").on(t.createdAt),
]);

// Changelog relations
export const changelogEntriesRelations = relations(changelogEntries, ({ }) => ({
  // Could add relations to projects if we link changelogs to Bazaar projects
}))

// Component Showcase Entries table for GitHub component video generation
export const componentShowcaseEntries = createTable("component_showcase_entries", (d) => ({
  id: d.uuid().defaultRandom().primaryKey(),
  
  // GitHub repository and component information
  repository: d.text("repository").notNull(), // e.g., "owner/repo"
  componentName: d.text("component_name").notNull(),
  componentPath: d.text("component_path"), // Discovered file path
  triggerType: d.text("trigger_type", { enum: ['showcase', 'demo'] }).notNull(),
  
  // PR and requester information
  prNumber: d.integer("pr_number").notNull(),
  requesterUsername: d.text("requester_username").notNull(),
  requesterAvatar: d.text("requester_avatar"),
  requesterUrl: d.text("requester_url"),
  
  // Generated video information
  videoUrl: d.text("video_url"),
  thumbnailUrl: d.text("thumbnail_url"),
  gifUrl: d.text("gif_url"),
  videoDuration: d.integer("video_duration"), // in seconds
  videoFormat: d.text("video_format").default('landscape'),
  generatedCode: d.text("generated_code"), // Generated Remotion code
  
  // Component analysis data (cached from GitHub)
  componentStructure: d.jsonb("component_structure"), // Parsed component structure
  componentStyles: d.jsonb("component_styles"), // Extracted styles
  componentFramework: d.text("component_framework"), // React, Vue, etc.
  
  // Processing status
  status: d.text({ enum: ['queued', 'processing', 'completed', 'failed'] }).default('queued').notNull(),
  jobId: d.text("job_id"), // Queue job ID
  errorMessage: d.text("error_message"),
  
  // Statistics
  viewCount: d.integer("view_count").default(0),
  
  // Timestamps
  createdAt: d.timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  processedAt: d.timestamp("processed_at", { withTimezone: true }), // When video was generated
}), (t) => [
  index("component_showcase_repository_idx").on(t.repository),
  index("component_showcase_component_idx").on(t.repository, t.componentName),
  index("component_showcase_status_idx").on(t.status),
  index("component_showcase_trigger_type_idx").on(t.triggerType),
  index("component_showcase_created_at_idx").on(t.createdAt),
  index("component_showcase_pr_idx").on(t.repository, t.prNumber),
]);

// Component showcase relations
export const componentShowcaseEntriesRelations = relations(componentShowcaseEntries, ({ }) => ({
  // Could add relations to GitHub connections if we link showcases to Bazaar users
}))

// --- Figma Integration Tables ---

// Figma connections table - stores OAuth tokens
export const figmaConnections = createTable("figma_connections", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  userId: d.varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  figmaUserId: d.varchar("figma_user_id", { length: 255 }).notNull(),
  figmaUserEmail: d.varchar("figma_user_email", { length: 255 }),
  figmaUserHandle: d.varchar("figma_user_handle", { length: 255 }),
  accessToken: d.text("access_token").notNull(), // Encrypted
  refreshToken: d.text("refresh_token"), // Encrypted
  expiresAt: d.timestamp("expires_at", { withTimezone: true }),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("figma_connections_user_idx").on(t.userId),
  uniqueIndex("figma_connections_user_unique").on(t.userId), // One connection per user
]);

// Figma file cache - stores indexed component catalogs
export const figmaFileCache = createTable("figma_file_cache", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  fileKey: d.varchar("file_key", { length: 255 }).notNull().unique(),
  fileName: d.varchar("file_name", { length: 255 }),
  teamId: d.varchar("team_id", { length: 255 }),
  teamName: d.varchar("team_name", { length: 255 }),
  projectId: d.varchar("project_id", { length: 255 }),
  projectName: d.varchar("project_name", { length: 255 }),
  lastModified: d.timestamp("last_modified", { withTimezone: true }),
  indexedAt: d.timestamp("indexed_at", { withTimezone: true }),
  componentCatalog: d.jsonb("component_catalog"), // Categorized components
  thumbnailCache: d.jsonb("thumbnail_cache"), // Map of nodeId to CDN URLs
  fileStructure: d.jsonb("file_structure"), // Cached file structure for quick access
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("figma_file_cache_file_key_idx").on(t.fileKey),
  index("figma_file_cache_indexed_at_idx").on(t.indexedAt),
]);

// Figma imports - tracks designs imported into projects
export const figmaImports = createTable("figma_imports", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  projectId: d.uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sceneId: d.uuid("scene_id").references(() => scenes.id, { onDelete: "set null" }),
  fileKey: d.varchar("file_key", { length: 255 }).notNull(),
  fileName: d.varchar("file_name", { length: 255 }),
  nodeId: d.varchar("node_id", { length: 255 }).notNull(),
  nodeName: d.varchar("node_name", { length: 255 }),
  nodeType: d.varchar("node_type", { length: 50 }), // FRAME, COMPONENT, INSTANCE, etc.
  exportFormat: d.varchar("export_format", { length: 10 }), // png, svg
  remotionCode: d.text("remotion_code"), // Generated Remotion code
  assets: d.jsonb("assets"), // URLs to exported images/SVGs stored in R2
  designTokens: d.jsonb("design_tokens"), // Extracted colors, fonts, etc.
  motionHints: d.jsonb("motion_hints"), // Animation preferences
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("figma_imports_project_idx").on(t.projectId),
  index("figma_imports_scene_idx").on(t.sceneId),
  index("figma_imports_file_key_idx").on(t.fileKey),
]);

// Figma webhook subscriptions
export const figmaWebhooks = createTable("figma_webhooks", (d) => ({
  id: d.uuid("id").primaryKey().defaultRandom(),
  webhookId: d.varchar("webhook_id", { length: 255 }).notNull().unique(),
  teamId: d.varchar("team_id", { length: 255 }).notNull(),
  eventType: d.varchar("event_type", { length: 50 }).notNull(), // FILE_UPDATE, LIBRARY_PUBLISH
  endpoint: d.text("endpoint").notNull(),
  passcode: d.varchar("passcode", { length: 255 }).notNull(),
  active: d.boolean("active").default(true).notNull(),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("figma_webhooks_team_idx").on(t.teamId),
  index("figma_webhooks_active_idx").on(t.active),
]);

// Relations for Figma tables
export const figmaConnectionsRelations = relations(figmaConnections, ({ one }) => ({
  user: one(users, {
    fields: [figmaConnections.userId],
    references: [users.id],
  }),
}));

export const figmaImportsRelations = relations(figmaImports, ({ one }) => ({
  project: one(projects, {
    fields: [figmaImports.projectId],
    references: [projects.id],
  }),
  scene: one(scenes, {
    fields: [figmaImports.sceneId],
    references: [scenes.id],
  }),
}))

// Evaluation table for YouTube to code testing
export const evalsTable = createTable("evals", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
  youtubeUrl: d.text().notNull(),
  model: d.varchar({ length: 100 }).notNull(),
  strategy: d.varchar({ length: 50 }).notNull(),
  prompt: d.text(),
  generatedCode: d.text().notNull(),
  timeMs: d.integer().notNull(),
  tokensUsed: d.integer(),
  cost: d.real(),
  error: d.text(),
  metadata: d.jsonb().$type<Record<string, any>>(),
  createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}), (t) => [
  index("evals_user_idx").on(t.userId),
  index("evals_created_idx").on(t.createdAt),
  index("evals_model_idx").on(t.model),
])

// Icon usage tracking table
export const iconUsage = createTable("icon_usage", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  userId: d.varchar({ length: 255 }).references(() => users.id),
  projectId: d.uuid().references(() => projects.id, { onDelete: "cascade" }),
  sceneId: d.uuid().references(() => scenes.id, { onDelete: "cascade" }),
  iconName: d.varchar({ length: 255 }).notNull(), // e.g., "mdi:home"
  iconCollection: d.varchar({ length: 100 }), // e.g., "mdi", "fa6-solid"
  action: d.varchar({ length: 50 }).notNull(), // "selected", "copied", "inserted", "generated"
  source: d.varchar({ length: 50 }).notNull(), // "picker", "chat", "ai_generated"
  metadata: d.jsonb().$type<{
    searchQuery?: string;
    fromRecent?: boolean;
    dragDrop?: boolean;
    fontSize?: string;
  }>(),
  createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}), (t) => [
  index("icon_usage_user_idx").on(t.userId),
  index("icon_usage_project_idx").on(t.projectId),
  index("icon_usage_icon_idx").on(t.iconName),
  index("icon_usage_collection_idx").on(t.iconCollection),
  index("icon_usage_created_idx").on(t.createdAt),
  index("icon_usage_action_idx").on(t.action),
])

// Brand profiles table for storing extracted website brand data
export const brandProfiles = createTable("brand_profile", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  projectId: d.uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  websiteUrl: d.text("website_url").notNull(),
  
  // Complete brand extraction data as JSONB
  brandData: d.jsonb("brand_data").$type<{
    colors: {
      primary: string;
      secondary: string;
      accents: string[];
      neutrals: string[];
      gradients: Array<{
        stops: string[];
        angle: number;
        type: 'linear' | 'radial';
      }>;
    };
    typography: {
      fonts: Array<{
        family: string;
        weights: number[];
        fallback?: string;
      }>;
      scale: Record<string, any>;
    };
    buttons: Record<string, any>;
    shadows: Record<string, string>;
    borderRadius: Record<string, string>;
    iconography: {
      style: 'line' | 'filled' | 'duotone' | 'mixed';
      detectedIcons: string[];
    };
    imageryStyle: string[];
    backgroundEffects: string[];
    logo: {
      light?: string;
      dark?: string;
      monochrome?: string;
      favicon?: string;
      ogImage?: string;
    };
  }>().notNull().$default(() => ({
    colors: {
      primary: '',
      secondary: '',
      accents: [],
      neutrals: [],
      gradients: []
    },
    typography: {
      fonts: [],
      scale: {}
    },
    buttons: {},
    shadows: {},
    borderRadius: {},
    iconography: {
      style: 'line' as const,
      detectedIcons: []
    },
    imageryStyle: [],
    backgroundEffects: [],
    logo: {}
  })),
  
  // Individual extraction elements for quick access
  colors: d.jsonb("colors").$default(() => ({})),
  typography: d.jsonb("typography").$default(() => ({})),
  logos: d.jsonb("logos").$default(() => ({})),
  
  // Copy and voice data
  copyVoice: d.jsonb("copy_voice").$type<{
    voice: {
      adjectives: string[];
      tone: string;
    };
    valueProposition: {
      headline: string;
      subheadline: string;
    };
    taglines: string[];
    ctas: Record<string, string>;
  }>().$default(() => ({
    voice: {
      adjectives: [],
      tone: ''
    },
    valueProposition: {
      headline: '',
      subheadline: ''
    },
    taglines: [],
    ctas: {}
  })),
  
  // Product narrative
  productNarrative: d.jsonb("product_narrative").$type<{
    audience: Record<string, any>;
    problem: string;
    solution: string;
    useCases: Array<any>;
    benefits: Array<any>;
    features: Array<any>;
  }>().$default(() => ({
    audience: {},
    problem: '',
    solution: '',
    useCases: [],
    benefits: [],
    features: []
  })),
  
  // Social proof
  socialProof: d.jsonb("social_proof").$type<{
    testimonials: Array<any>;
    caseStudies: Array<any>;
    trustBadges: Record<string, any>;
    logos: string[];
    stats: Record<string, string>;
  }>().$default(() => ({
    testimonials: [],
    caseStudies: [],
    trustBadges: {},
    logos: [],
    stats: {}
  })),
  
  // Screenshots and media assets
  screenshots: d.jsonb("screenshots").$type<Array<{
    url: string;
    viewport: string;
    width: number;
    height: number;
    s3Url?: string;
  }>>().default([]),
  
  mediaAssets: d.jsonb("media_assets").$type<Array<{
    url: string;
    type: string;
    s3Url?: string;
  }>>().default([]),
  
  // Metadata
  extractionVersion: d.text("extraction_version").default("1.0.0"),
  extractionConfidence: d.jsonb("extraction_confidence").$default(() => ({})),
  lastAnalyzedAt: d.timestamp("last_analyzed_at", { withTimezone: true }),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("brand_profiles_project_idx").on(t.projectId),
  index("brand_profiles_url_idx").on(t.websiteUrl),
  index("brand_profiles_created_idx").on(t.createdAt),
]);

// Brand profile versions for tracking changes over time
export const brandProfileVersions = createTable("brand_profile_version", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  brandProfileId: d.uuid("brand_profile_id")
    .notNull()
    .references(() => brandProfiles.id, { onDelete: "cascade" }),
  versionNumber: d.integer("version_number").notNull(),
  brandData: d.jsonb("brand_data").notNull(),
  changedBy: d.varchar("changed_by", { length: 255 })
    .references(() => users.id, { onDelete: "set null" }),
  changeReason: d.text("change_reason"),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("brand_versions_profile_idx").on(t.brandProfileId),
  index("brand_versions_created_idx").on(t.createdAt),
  uniqueIndex("brand_versions_unique_idx").on(t.brandProfileId, t.versionNumber),
]);

// Relations for brand profiles
export const brandProfilesRelations = relations(brandProfiles, ({ one, many }) => ({
  project: one(projects, {
    fields: [brandProfiles.projectId],
    references: [projects.id],
  }),
  versions: many(brandProfileVersions),
}));

export const brandProfileVersionsRelations = relations(brandProfileVersions, ({ one }) => ({
  brandProfile: one(brandProfiles, {
    fields: [brandProfileVersions.brandProfileId],
    references: [brandProfiles.id],
  }),
  changedByUser: one(users, {
    fields: [brandProfileVersions.changedBy],
    references: [users.id],
  }),
}));

// Shared brand repository storing normalized URLs reusable across projects
export const brandRepository = createTable("brand_repository", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  normalizedUrl: d.text("normalized_url").notNull(),
  originalUrl: d.text("original_url").notNull(),
  firstExtractedBy: d
    .varchar("first_extracted_by", { length: 255 })
    .references(() => users.id, { onDelete: "set null" }),
  latestExtractionId: d.uuid("latest_extraction_id"),
  brandData: d.jsonb("brand_data").notNull(),
  colors: d.jsonb("colors").$default(() => ({})),
  typography: d.jsonb("typography").$default(() => ({})),
  logos: d.jsonb("logos").$default(() => ({})),
  copyVoice: d.jsonb("copy_voice").$default(() => ({})),
  productNarrative: d.jsonb("product_narrative").$default(() => ({})),
  socialProof: d.jsonb("social_proof").$default(() => ({})),
  screenshots: d.jsonb("screenshots").$default(() => []),
  mediaAssets: d.jsonb("media_assets").$default(() => []),
  personality: d.jsonb("personality"),
  confidenceScore: d.real("confidence_score").default(0.95),
  reviewStatus: d.text("review_status").default("automated"),
  extractionVersion: d.text("extraction_version").default("1.0.0"),
  usageCount: d.integer("usage_count").default(0),
  lastUsedAt: d.timestamp("last_used_at", { withTimezone: true }),
  lastExtractedAt: d.timestamp("last_extracted_at", { withTimezone: true }),
  ttl: d.timestamp("ttl", { withTimezone: true }),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  uniqueIndex("brand_repo_url_unique_idx").on(t.normalizedUrl),
  index("brand_repo_url_idx").on(t.normalizedUrl),
  index("brand_repo_usage_idx").on(t.usageCount),
  index("brand_repo_quality_idx").on(t.reviewStatus, t.confidenceScore),
  index("brand_repo_ttl_idx").on(t.ttl),
]);

export const brandRepositoryRelations = relations(brandRepository, ({ one, many }) => ({
  firstExtractor: one(users, {
    fields: [brandRepository.firstExtractedBy],
    references: [users.id],
  }),
  usages: many(() => projectBrandUsage),
}));

export const projectBrandUsage = createTable("project_brand_usage", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  projectId: d
    .uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  brandRepositoryId: d
    .uuid("brand_repository_id")
    .notNull()
    .references(() => brandRepository.id, { onDelete: "cascade" }),
  usedAt: d.timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  uniqueIndex("project_brand_unique_idx").on(t.projectId, t.brandRepositoryId),
  index("project_brand_project_idx").on(t.projectId),
  index("project_brand_repo_idx").on(t.brandRepositoryId),
]);

export const projectBrandUsageRelations = relations(projectBrandUsage, ({ one }) => ({
  project: one(projects, {
    fields: [projectBrandUsage.projectId],
    references: [projects.id],
  }),
  brand: one(brandRepository, {
    fields: [projectBrandUsage.brandRepositoryId],
    references: [brandRepository.id],
  }),
}));

export const brandExtractionCache = createTable("brand_extraction_cache", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  normalizedUrl: d.text("normalized_url").notNull(),
  cacheKey: d.text("cache_key").notNull(),
  rawHtml: d.text("raw_html"),
  screenshotUrls: d.jsonb("screenshot_urls").$default(() => []),
  colorSwatches: d.jsonb("color_swatches").$default(() => []),
  ttl: d.timestamp("ttl", { withTimezone: true }).notNull(),
  extractedAt: d.timestamp("extracted_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  uniqueIndex("brand_cache_url_unique_idx").on(t.normalizedUrl),
  uniqueIndex("brand_cache_key_unique_idx").on(t.cacheKey),
  index("brand_cache_ttl_idx").on(t.ttl),
]);

// Personalization targets table (per-company brand themes for bulk personalization)
export const personalizationTargets = createTable("personalization_target", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  projectId: d
    .uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  companyName: d.text("company_name"),
  websiteUrl: d.text("website_url").notNull(),
  contactEmail: d.text("contact_email"),
  sector: d.text("sector"),
  status: d
    .text("status", { enum: ["pending", "extracting", "ready", "failed"] })
    .default("pending")
    .notNull(),
  notes: d.text("notes"),
  brandProfile: d.jsonb("brand_profile").$type<Record<string, unknown> | null>().default(null),
  brandTheme: d.jsonb("brand_theme").$type<BrandTheme | null>().default(null),
  errorMessage: d.text("error_message"),
  extractedAt: d.timestamp("extracted_at", { withTimezone: true }),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: d.timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("personalization_target_project_idx").on(t.projectId),
  uniqueIndex("personalization_target_project_url_idx").on(t.projectId, t.websiteUrl),
]);

export const personalizationTargetsRelations = relations(personalizationTargets, ({ one }) => ({
  project: one(projects, {
    fields: [personalizationTargets.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  patches: many(patches),
  messages: many(messages),
  scenes: many(scenes),
  sharedVideos: many(sharedVideos),
  personalizationTargets: many(personalizationTargets),
  brandUsages: many(projectBrandUsage),
}));

// Auto-fix metrics table for tracking error corrections
export const autofixMetrics = createTable("autofix_metrics", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  projectId: d.uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sceneId: d.uuid("scene_id")
    .references(() => scenes.id, { onDelete: "cascade" }),
  userId: d.varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Error information
  errorMessage: d.text("error_message").notNull(),
  errorType: d.varchar("error_type", { length: 100 }), // 'compilation', 'runtime', 'timeout', etc.
  errorSignature: d.varchar("error_signature", { length: 255 }), // Hash for deduplication
  
  // Fix attempt details
  fixAttemptNumber: d.integer("fix_attempt_number").notNull().default(1),
  fixStrategy: d.varchar("fix_strategy", { length: 50 }), // 'minimal', 'comprehensive', 'rewrite'
  fixSuccess: d.boolean("fix_success").notNull().default(false),
  fixDurationMs: d.integer("fix_duration_ms"),
  
  // Cost tracking
  apiCallsCount: d.integer("api_calls_count").default(0),
  estimatedCost: d.real("estimated_cost"),
  
  // Metadata
  sessionId: d.varchar("session_id", { length: 100 }),
  userAgent: d.text("user_agent"),
  createdAt: d.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}), (t) => [
  index("autofix_project_idx").on(t.projectId),
  index("autofix_user_idx").on(t.userId),
  index("autofix_scene_idx").on(t.sceneId),
  index("autofix_created_idx").on(t.createdAt),
  index("autofix_signature_idx").on(t.errorSignature),
  index("autofix_session_idx").on(t.sessionId),
])

// Auto-fix session summaries for aggregated metrics
export const autofixSessions = createTable("autofix_sessions", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  sessionId: d.varchar("session_id", { length: 100 }).notNull().unique(),
  userId: d.varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: d.uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" }),
  
  // Session metrics
  totalErrors: d.integer("total_errors").notNull().default(0),
  uniqueErrors: d.integer("unique_errors").notNull().default(0),
  successfulFixes: d.integer("successful_fixes").notNull().default(0),
  failedFixes: d.integer("failed_fixes").notNull().default(0),
  totalApiCalls: d.integer("total_api_calls").notNull().default(0),
  totalCost: d.real("total_cost"),
  
  // Circuit breaker state
  circuitBreakerTripped: d.boolean("circuit_breaker_tripped").default(false),
  killSwitchActivated: d.boolean("kill_switch_activated").default(false),
  
  // Timestamps
  startedAt: d.timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: d.timestamp("ended_at", { withTimezone: true }),
}), (t) => [
  index("autofix_session_user_idx").on(t.userId),
  index("autofix_session_project_idx").on(t.projectId),
  index("autofix_session_started_idx").on(t.startedAt),
])

// Relations for auto-fix metrics
export const autofixMetricsRelations = relations(autofixMetrics, ({ one }) => ({
  project: one(projects, {
    fields: [autofixMetrics.projectId],
    references: [projects.id],
  }),
  scene: one(scenes, {
    fields: [autofixMetrics.sceneId],
    references: [scenes.id],
  }),
  user: one(users, {
    fields: [autofixMetrics.userId],
    references: [users.id],
  }),
}))

export const autofixSessionsRelations = relations(autofixSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [autofixSessions.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [autofixSessions.projectId],
    references: [projects.id],
  }),
  metrics: many(autofixMetrics),
}))
