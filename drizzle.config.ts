// drizzle.config.ts ― project root
import type { Config } from "drizzle-kit";

export default {
  /*
   * Absolute or glob path(s) to every schema file.
   * Your canonical schema now lives in src/server/db/schema.ts
   */
  schema: "./src/server/db/schema.ts",

  /*
   * Adapter dialect – you are on Postgres (Neon), so keep it.
   */
  dialect: "postgresql",

  /*
   * Drizzle Kit needs a direct (non-pooled) URL for
   * generate / push / migrate commands.
   */
  dbCredentials: {
    url: process.env.DATABASE_URL_NON_POOLED ?? process.env.DATABASE_URL ?? "",
  },

  /*
   * Where compiled .sql files should land.
   * Keeping them **outside** `src/` avoids accidental bundling.
   */
  out: "./drizzle/migrations",
} satisfies Config;