// GitHub connection schema for component animation system
import { createTable, users } from "../schema";
import { varchar, text, timestamp, boolean, jsonb, index, uuid, integer } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

/**
 * Stores GitHub OAuth connections for users
 * Allows users to connect their GitHub account to animate their components
 */
export const githubConnections = createTable(
  "github_connection",
  (t) => ({
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // OAuth tokens (encrypted in production)
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenType: varchar("token_type", { length: 50 }).default("bearer"),
    scope: text("scope"), // Space-separated scopes
    
    // GitHub user info
    githubUserId: varchar("github_user_id", { length: 255 }).notNull(),
    githubUsername: varchar("github_username", { length: 255 }).notNull(),
    githubEmail: varchar("github_email", { length: 255 }),
    
    // Connection metadata
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
    lastSyncedAt: timestamp("last_synced_at"),
    isActive: boolean("is_active").default(true).notNull(),
    
    // Selected repositories for component search
    selectedRepos: jsonb("selected_repos").$type<string[]>().default(sql`'[]'::jsonb`),
    
    // Cached style profile from repos
    styleProfile: jsonb("style_profile").$type<{
      colors?: Record<string, string>;
      typography?: Record<string, any>;
      spacing?: Record<string, any>;
      components?: string[];
      lastExtracted?: string;
    }>(),
  }),
  (table) => ({
    userIdIdx: index("github_connection_user_id_idx").on(table.userId),
    githubUserIdIdx: index("github_connection_github_user_id_idx").on(table.githubUserId),
  })
);

/**
 * Component cache for parsed GitHub components
 * Stores parsed components to avoid re-fetching and re-parsing
 */
export const componentCache = createTable(
  "component_cache",
  (t) => ({
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Cache key: userId:repo:componentName:hash
    cacheKey: varchar("cache_key", { length: 500 }).notNull().unique(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    
    // Component metadata
    repository: varchar("repository", { length: 255 }).notNull(), // owner/repo
    filePath: text("file_path").notNull(),
    componentName: varchar("component_name", { length: 255 }).notNull(),
    
    // Parsed component data
    parsedData: jsonb("parsed_data").notNull().$type<{
      structure: any;
      styles: any;
      content: any;
      props: any;
      framework: string;
    }>(),
    
    // Raw file content (for reference)
    rawContent: text("raw_content"),
    fileHash: varchar("file_hash", { length: 64 }), // SHA-256 of content
    
    // Cache metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    accessCount: integer("access_count").default(0).notNull(),
    lastAccessedAt: timestamp("last_accessed_at"),
  }),
  (table) => ({
    cacheKeyIdx: index("component_cache_key_idx").on(table.cacheKey),
    userIdIdx: index("component_cache_user_id_idx").on(table.userId),
    expiresAtIdx: index("component_cache_expires_at_idx").on(table.expiresAt),
  })
);

// Relations
export const githubConnectionsRelations = relations(githubConnections, ({ one }) => ({
  user: one(users, {
    fields: [githubConnections.userId],
    references: [users.id],
  }),
}));

export const componentCacheRelations = relations(componentCache, ({ one }) => ({
  user: one(users, {
    fields: [componentCache.userId],
    references: [users.id],
  }),
}));