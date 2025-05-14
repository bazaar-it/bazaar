"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.animationDesignBriefsRelations = exports.animationDesignBriefs = exports.scenePlansRelations = exports.scenePlans = exports.metrics = exports.componentErrorsRelations = exports.componentErrors = exports.customComponentJobsRelations = exports.customComponentJobs = exports.messagesRelations = exports.messages = exports.patchesRelations = exports.patches = exports.projectsRelations = exports.projects = exports.verificationTokens = exports.accountsRelations = exports.accounts = exports.usersRelations = exports.users = exports.createTable = void 0;
// src/server/db/schema.ts
var drizzle_orm_1 = require("drizzle-orm");
var pg_core_1 = require("drizzle-orm/pg-core");
var pg_core_2 = require("drizzle-orm/pg-core");
// Import the InputProps type for the projects table
/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
exports.createTable = (0, pg_core_2.pgTableCreator)(function (name) { return "bazaar-vid_".concat(name); });
exports.users = (0, exports.createTable)("user", function (d) { return ({
    id: d
        .varchar({ length: 255 })
        .notNull()
        .primaryKey()
        .$defaultFn(function () { return crypto.randomUUID(); }),
    name: d.varchar({ length: 255 }),
    email: d.varchar({ length: 255 }).notNull(),
    emailVerified: d
        .timestamp({
        mode: "date",
        withTimezone: true,
    })
        .default((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))),
    image: d.varchar({ length: 255 }),
}); });
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, function (_a) {
    var many = _a.many;
    return ({
        accounts: many(exports.accounts),
    });
});
exports.accounts = (0, exports.createTable)("account", function (d) { return ({
    userId: d
        .varchar({ length: 255 })
        .notNull()
        .references(function () { return exports.users.id; }),
    type: d.varchar({ length: 255 }).$type().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
}); }, function (t) { return [
    (0, pg_core_2.primaryKey)({ columns: [t.provider, t.providerAccountId] }),
    (0, pg_core_2.index)("account_user_id_idx").on(t.userId),
]; });
exports.accountsRelations = (0, drizzle_orm_1.relations)(exports.accounts, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, { fields: [exports.accounts.userId], references: [exports.users.id] }),
    });
});
exports.verificationTokens = (0, exports.createTable)("verificationToken", // Renamed to singular camel-case for Drizzle-adapter compatibility
function (d) { return ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
}); }, function (t) { return [(0, pg_core_2.primaryKey)({ columns: [t.identifier, t.token] })]; });
// --- Projects table ---
// Stores Remotion player state per user.
// The `props` column stores the full canonical state as JSON.
exports.projects = (0, exports.createTable)("project", function (d) { return ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.varchar({ length: 255 }).notNull().references(function () { return exports.users.id; }),
    title: d.varchar({ length: 255 }).notNull(),
    props: d.jsonb().$type().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).default((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))).notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).default((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))).$onUpdate(function () { return new Date(); }),
}); }, function (t) { return [
    (0, pg_core_2.index)("project_user_idx").on(t.userId),
    (0, pg_core_2.index)("project_title_idx").on(t.title),
    (0, pg_core_1.uniqueIndex)("project_unique_name").on(t.userId, t.title), // Added unique index on projects.title per user
]; });
exports.projectsRelations = (0, drizzle_orm_1.relations)(exports.projects, function (_a) {
    var many = _a.many;
    return ({
        patches: many(exports.patches),
        messages: many(exports.messages), // Add relation to messages
    });
});
// --- Patches table ---
// Stores JSON patches for projects, referencing the project by ID.
exports.patches = (0, exports.createTable)("patch", function (d) { return ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d.uuid().notNull().references(function () { return exports.projects.id; }, { onDelete: "cascade" }),
    patch: d.jsonb().$type().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).default((0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"])))).notNull(),
}); }, function (t) { return [(0, pg_core_2.index)("patch_project_idx").on(t.projectId)]; });
exports.patchesRelations = (0, drizzle_orm_1.relations)(exports.patches, function (_a) {
    var one = _a.one;
    return ({
        project: one(exports.projects, { fields: [exports.patches.projectId], references: [exports.projects.id] }),
    });
});
// --- Messages table ---
// Stores chat messages for projects
exports.messages = (0, exports.createTable)("message", function (d) { return ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
        .uuid()
        .notNull()
        .references(function () { return exports.projects.id; }, { onDelete: "cascade" }),
    content: d.text().notNull(),
    role: d.varchar({ length: 50 }).notNull(), // 'user' or 'assistant'
    kind: d.varchar({ length: 50 }).default("message").notNull(), // 'message' | 'status'
    status: d.varchar({ length: 50 }), // 'pending' | 'building' | 'success' | 'error'
    createdAt: d
        .timestamp({ withTimezone: true })
        .default((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .notNull(),
    updatedAt: d
        .timestamp({ withTimezone: true })
        .default((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .$onUpdate(function () { return new Date(); }),
}); }, function (t) { return [
    (0, pg_core_2.index)("message_project_idx").on(t.projectId),
    (0, pg_core_2.index)("message_status_idx").on(t.status),
]; });
exports.messagesRelations = (0, drizzle_orm_1.relations)(exports.messages, function (_a) {
    var one = _a.one;
    return ({
        project: one(exports.projects, { fields: [exports.messages.projectId], references: [exports.projects.id] }),
    });
});
// --- Custom Component Jobs table ---
// Stores jobs for generating and compiling custom Remotion components
exports.customComponentJobs = (0, exports.createTable)("custom_component_job", function (d) { return ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
        .uuid()
        .notNull()
        .references(function () { return exports.projects.id; }, { onDelete: "cascade" }),
    effect: d.text().notNull(), // Natural language description of the effect
    tsxCode: d.text(), // Generated TSX code for the component
    metadata: d.jsonb(), // NEW – intent or other metadata
    statusMessageId: d.uuid().references(function () { return exports.messages.id; }), // Link to status message for streaming updates
    status: d.varchar({ length: 50 }).default("pending").notNull(), // "pending"|"building"|"success"|"error"
    outputUrl: d.text(), // URL to the compiled JS hosted on R2
    errorMessage: d.text(), // Error message if compilation failed
    retryCount: d.integer().default(0).notNull(), // Number of retry attempts
    createdAt: d
        .timestamp({ withTimezone: true })
        .default((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .notNull(),
    updatedAt: d
        .timestamp({ withTimezone: true })
        .default((0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .$onUpdate(function () { return new Date(); }),
}); }, function (t) { return [
    (0, pg_core_2.index)("custom_component_job_project_idx").on(t.projectId),
    (0, pg_core_2.index)("custom_component_job_status_idx").on(t.status),
]; });
// Add relations for custom component jobs
exports.customComponentJobsRelations = (0, drizzle_orm_1.relations)(exports.customComponentJobs, function (_a) {
    var one = _a.one;
    return ({
        project: one(exports.projects, { fields: [exports.customComponentJobs.projectId], references: [exports.projects.id] }),
    });
});
// --- Component Errors table ---
// Stores errors for custom component jobs
exports.componentErrors = (0, exports.createTable)("component_error", function (d) { return ({
    id: d.uuid().primaryKey().defaultRandom(),
    jobId: d
        .uuid()
        .notNull()
        .references(function () { return exports.customComponentJobs.id; }, { onDelete: "cascade" }),
    errorType: d.varchar({ length: 100 }).notNull(),
    details: d.text().notNull(),
    createdAt: d
        .timestamp({ withTimezone: true })
        .default((0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .notNull(),
}); }, function (t) { return [(0, pg_core_2.index)("component_error_job_idx").on(t.jobId)]; });
exports.componentErrorsRelations = (0, drizzle_orm_1.relations)(exports.componentErrors, function (_a) {
    var one = _a.one;
    return ({
        job: one(exports.customComponentJobs, {
            fields: [exports.componentErrors.jobId],
            references: [exports.customComponentJobs.id],
        }),
    });
});
// --- Metrics table ---
exports.metrics = (0, exports.createTable)("metric", function (d) { return ({
    id: d.uuid().primaryKey().defaultRandom(),
    name: d.varchar({ length: 100 }).notNull(),
    value: d.real().notNull(),
    tags: d.jsonb(),
    timestamp: d
        .timestamp({ withTimezone: true })
        .default((0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .notNull(),
}); });
// --- Scene Plans table ---
// Stores LLM reasoning about scene planning
exports.scenePlans = (0, exports.createTable)("scene_plan", function (d) { return ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
        .uuid()
        .notNull()
        .references(function () { return exports.projects.id; }, { onDelete: "cascade" }),
    messageId: d
        .uuid()
        .references(function () { return exports.messages.id; }, { onDelete: "cascade" }),
    rawReasoning: d.text().notNull(), // Raw LLM reasoning about the plan
    planData: d.jsonb().notNull(), // The structured scene plan data
    userPrompt: d.text().notNull(), // Prompt that generated this plan
    createdAt: d
        .timestamp({ withTimezone: true })
        .default((0, drizzle_orm_1.sql)(templateObject_11 || (templateObject_11 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .notNull(),
}); }, function (t) { return [
    (0, pg_core_2.index)("scene_plan_project_idx").on(t.projectId),
]; });
exports.scenePlansRelations = (0, drizzle_orm_1.relations)(exports.scenePlans, function (_a) {
    var one = _a.one;
    return ({
        project: one(exports.projects, { fields: [exports.scenePlans.projectId], references: [exports.projects.id] }),
        message: one(exports.messages, { fields: [exports.scenePlans.messageId], references: [exports.messages.id] }),
    });
});
// --- Animation Design Briefs table ---
// Stores detailed animation specifications that bridge scene plans and component generation
exports.animationDesignBriefs = (0, exports.createTable)("animation_design_brief", function (d) { return ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
        .uuid()
        .notNull()
        .references(function () { return exports.projects.id; }, { onDelete: "cascade" }),
    sceneId: d.uuid().notNull(), // References scene plan ID (or scene ID within project)
    componentJobId: d
        .uuid()
        .references(function () { return exports.customComponentJobs.id; }), // Optional link to component job
    designBrief: d.jsonb().$type().notNull(), // The structured design brief
    llmModel: d.varchar({ length: 100 }).notNull(), // Model used to generate the brief
    status: d
        .varchar({ length: 50 })
        .default("pending")
        .notNull(), // "pending"|"complete"|"error"
    errorMessage: d.text(), // Error message if generation failed
    createdAt: d
        .timestamp({ withTimezone: true })
        .default((0, drizzle_orm_1.sql)(templateObject_12 || (templateObject_12 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .notNull(),
    updatedAt: d
        .timestamp({ withTimezone: true })
        .default((0, drizzle_orm_1.sql)(templateObject_13 || (templateObject_13 = __makeTemplateObject(["CURRENT_TIMESTAMP"], ["CURRENT_TIMESTAMP"]))))
        .$onUpdate(function () { return new Date(); }),
}); }, function (t) { return [
    (0, pg_core_2.index)("animation_design_brief_project_idx").on(t.projectId),
    (0, pg_core_2.index)("animation_design_brief_scene_idx").on(t.sceneId),
    (0, pg_core_2.index)("animation_design_brief_component_idx").on(t.componentJobId),
]; });
exports.animationDesignBriefsRelations = (0, drizzle_orm_1.relations)(exports.animationDesignBriefs, function (_a) {
    var one = _a.one;
    return ({
        project: one(exports.projects, { fields: [exports.animationDesignBriefs.projectId], references: [exports.projects.id] }),
        componentJob: one(exports.customComponentJobs, {
            fields: [exports.animationDesignBriefs.componentJobId],
            references: [exports.customComponentJobs.id]
        }),
    });
});
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13;
