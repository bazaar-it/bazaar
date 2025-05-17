//src/server/db/schema/evaluation.schema.ts
import { pgTable, uuid, timestamp, varchar, integer, boolean, jsonb, text } from "drizzle-orm/pg-core";

/**
 * Table to store test cases for component generation evaluation
 */
export const componentTestCases = pgTable("bazaar-vid_component_test_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  prompt: text("prompt").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  complexity: integer("complexity").notNull(),
  edgeCases: jsonb("edge_cases").default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Table to store metrics from component generation evaluation
 */
export const componentEvaluationMetrics = pgTable("bazaar-vid_component_evaluation_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  testCaseId: uuid("test_case_id").notNull().references(() => componentTestCases.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  
  // Test case metadata
  category: varchar("category", { length: 50 }).notNull(),
  complexity: integer("complexity").notNull(),
  edgeCases: jsonb("edge_cases").default([]),
  
  // Pipeline success metrics
  success: boolean("success").notNull(),
  errorStage: varchar("error_stage", { length: 50 }),
  errorType: varchar("error_type", { length: 100 }),
  errorMessage: text("error_message"),
  
  // Timing metrics (in milliseconds)
  promptSubmissionTime: timestamp("prompt_submission_time").notNull(),
  codeGenerationStartTime: timestamp("code_generation_start_time"),
  codeGenerationEndTime: timestamp("code_generation_end_time"),
  validationStartTime: timestamp("validation_start_time"),
  validationEndTime: timestamp("validation_end_time"),
  buildStartTime: timestamp("build_start_time"),
  buildEndTime: timestamp("build_end_time"),
  uploadStartTime: timestamp("upload_start_time"),
  uploadEndTime: timestamp("upload_end_time"),
  componentCompletionTime: timestamp("component_completion_time"),
  
  // Derived timing metrics (calculated on insertion)
  timeToFirstToken: integer("time_to_first_token"),
  codeGenerationTime: integer("code_generation_time"),
  validationTime: integer("validation_time"),
  buildTime: integer("build_time"),
  uploadTime: integer("upload_time"),
  totalTime: integer("total_time"),
  
  // Code quality metrics
  syntaxErrorCount: integer("syntax_error_count"),
  eslintErrorCount: integer("eslint_error_count"),
  eslintWarningCount: integer("eslint_warning_count"),
  codeLength: integer("code_length"),
  
  // Rendering metrics
  renderSuccess: boolean("render_success"),
  renderErrorMessage: text("render_error_message"),
  
  // References
  componentId: varchar("component_id", { length: 100 }),
  outputUrl: text("output_url"),
  taskId: uuid("task_id"),
  
  // A2A specific metrics
  stateTransitions: jsonb("state_transitions").default([]),
  artifacts: jsonb("artifacts").default([]),
  
  // Analysis fields
  analysisNotes: text("analysis_notes"),
  tags: jsonb("tags").default([]),
});
