// src/server/db/templates-prod.ts
// Optional read-only connection to production DB for fetching templates in dev
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { env } from "~/env";

let prodTemplatesDb: ReturnType<typeof drizzleNeon<typeof schema>> | null = null;

export function getProdTemplatesDb() {
  try {
    console.log('[TemplatesProdDB] env.TEMPLATES_READ_FROM:', env.TEMPLATES_READ_FROM);
    console.log('[TemplatesProdDB] env.TEMPLATES_DB_URL_RO exists:', !!env.TEMPLATES_DB_URL_RO);

    if (env.TEMPLATES_READ_FROM !== 'prod') {
      console.log('[TemplatesProdDB] Not using prod DB (TEMPLATES_READ_FROM is not "prod")');
      return null;
    }
    if (!env.TEMPLATES_DB_URL_RO) {
      console.log('[TemplatesProdDB] Not using prod DB (TEMPLATES_DB_URL_RO not set)');
      return null;
    }
    if (prodTemplatesDb) {
      console.log('[TemplatesProdDB] Reusing existing prod DB connection');
      return prodTemplatesDb;
    }

    console.log('[TemplatesProdDB] ✅ Connecting to production templates database...');
    const sql = neon(env.TEMPLATES_DB_URL_RO, {
      fetchOptions: { keepalive: true, timeout: 30000 },
    });
    prodTemplatesDb = drizzleNeon(sql, { schema });
    console.log('[TemplatesProdDB] ✅ Connected to production templates database');
    return prodTemplatesDb;
  } catch (err) {
    console.error('[TemplatesProdDB] Failed to connect read-only prod DB:', err);
    return null;
  }
}

