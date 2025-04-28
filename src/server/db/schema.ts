import { relations, sql } from "drizzle-orm";
import { uniqueIndex } from "drizzle-orm/pg-core";

import { index, pgTableCreator, primaryKey } from "drizzle-orm/pg-core";
import { type AdapterAccount } from "@auth/core/adapters";
import { type InputProps } from "~/types/input-props";
import { type JsonPatch } from "~/types/json-patch";

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
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d
    .timestamp({
      mode: "date",
      withTimezone: true,
    })
    .default(sql`CURRENT_TIMESTAMP`),
  image: d.varchar({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
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
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// --- Projects table ---
// Stores Remotion player state per user.
// The `props` column stores the full canonical state as JSON.
export const projects = createTable(
  "project",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    title: d.varchar({ length: 255 }).notNull(),
    props: d.jsonb().$type<InputProps>().notNull(),
    createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("project_user_idx").on(t.userId),
    index("project_title_idx").on(t.title),
    uniqueIndex("project_unique_name").on(t.userId, t.title), // Added unique index on projects.title per user
  ],
);

export const projectsRelations = relations(projects, ({ many }) => ({ // Added projectsRelations
  patches: many(patches),
}));

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

export const patchesRelations = relations(patches, ({ one }) => ({ // Added patchesRelations
  project: one(projects, { fields: [patches.projectId], references: [projects.id] }),
}))
;
