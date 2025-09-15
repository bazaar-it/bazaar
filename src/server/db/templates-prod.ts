// src/server/db/templates-prod.ts
// Optional read-only connection to production DB for fetching templates in dev
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { env } from "~/env";

let prodTemplatesDb: ReturnType<typeof drizzleNeon<typeof schema>> | null = null;

export function getProdTemplatesDb() {
  try {
    if (env.TEMPLATES_READ_FROM !== 'prod') return null;
    if (!env.TEMPLATES_DB_URL_RO) return null;
    if (prodTemplatesDb) return prodTemplatesDb;
    const sql = neon(env.TEMPLATES_DB_URL_RO, {
      fetchOptions: { keepalive: true, timeout: 30000 },
    });
    prodTemplatesDb = drizzleNeon(sql, { schema });
    return prodTemplatesDb;
  } catch (err) {
    console.error('[TemplatesProdDB] Failed to connect read-only prod DB:', err);
    return null;
  }
}

