// src/env.js
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_GITHUB_ID: z.string(),
    AUTH_GITHUB_SECRET: z.string(),
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    DATABASE_URL_NON_POOLED: z.string().url(),
    // Default model for Animation Design Brief generation
    DEFAULT_ADB_MODEL: z.string().optional().default("o4-mini"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    OPENAI_API_KEY: z.string().min(1),
    // R2 Storage Configuration
    R2_ENDPOINT: z.string().url(),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    R2_PUBLIC_URL: z.string().url(),
    // Cron Job Configuration
    CRON_SECRET: z.string().min(1),
    
    // Stripe Configuration
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),

    // GitHub App (repo access) - Optional in preview/dev environments
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),

    // Worker Configuration (Server-side)
    WORKER_POLLING_INTERVAL: z.preprocess(
      (val) => (val ? parseInt(String(val), 10) : undefined),
      z.number().positive().optional()
    ),
    TASK_PROCESSOR_POLLING_INTERVAL: z.preprocess(
      (val) => (val ? parseInt(String(val), 10) : undefined),
      z.number().positive().optional()
    ),
    // Toggle to enable the new message bus routing (`true` by default)
    USE_MESSAGE_BUS: z.preprocess(
      (val) => {
        if (val === undefined) return true; // default
        return String(val).toLowerCase() === 'true';
      },
      z.boolean().optional()
    ),
    DISABLE_BACKGROUND_WORKERS: z.preprocess(
      // Coerce 'true' to true, 'false' to false, otherwise undefined
      (val) => (String(val).toLowerCase() === 'true' ? true : String(val).toLowerCase() === 'false' ? false : undefined),
      z.boolean().optional()
    ),
    // Log Agent URL for developer tools
    LOG_AGENT_URL: z.string().url().optional().default("http://localhost:3002"),
    // Model pack selection for AI services
    MODEL_PACK: z.string().optional().default("optimal-pack"),
    // Google Gemini API
    GOOGLE_GEMINI_API_KEY: z.string().optional(),
    // Live stream status webhook + defaults
    LIVE_STATUS_SECRET: z.string().optional(),
    LIVE_URL_DEFAULT: z.string().url().optional(),
    LIVE_FORCE: z
      .string()
      .transform(v => (v ?? '').toLowerCase())
      .optional(),
    LIVE_MODE: z.enum(["manual", "webhook"]).optional().default("manual"),
    // Admin notifications
    ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),
    // Server-side compilation toggle (Sprint 106 Phase 1)
    USE_SERVER_COMPILATION: z.preprocess(
      (val) => {
        if (val === undefined) return true; // default on
        return String(val).toLowerCase() === 'true';
      },
      z.boolean().optional()
    ),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    NEXT_PUBLIC_LOG_AGENT_URL: z.string().url().optional().default('http://localhost:3002'),
    NEXT_PUBLIC_LOG_RUN_ID: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL_NON_POOLED: process.env.DATABASE_URL_NON_POOLED,
    DEFAULT_ADB_MODEL: process.env.DEFAULT_ADB_MODEL,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    // R2 Storage Environment Variables
    R2_ENDPOINT: process.env.R2_ENDPOINT,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    // Cron Job Environment Variables
    CRON_SECRET: process.env.CRON_SECRET,
    // Stripe Environment Variables
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    // GitHub App
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    // Worker Configuration Runtime Environment Variables
    WORKER_POLLING_INTERVAL: process.env.WORKER_POLLING_INTERVAL,
    TASK_PROCESSOR_POLLING_INTERVAL: process.env.TASK_PROCESSOR_POLLING_INTERVAL,
    USE_MESSAGE_BUS: process.env.USE_MESSAGE_BUS,
    DISABLE_BACKGROUND_WORKERS: process.env.DISABLE_BACKGROUND_WORKERS,
    LOG_AGENT_URL: process.env.LOG_AGENT_URL,
    MODEL_PACK: process.env.MODEL_PACK,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    LIVE_STATUS_SECRET: process.env.LIVE_STATUS_SECRET,
    LIVE_URL_DEFAULT: process.env.LIVE_URL_DEFAULT,
    LIVE_FORCE: process.env.LIVE_FORCE,
    LIVE_MODE: process.env.LIVE_MODE,
    ADMIN_NOTIFICATION_EMAIL: process.env.ADMIN_NOTIFICATION_EMAIL,
    USE_SERVER_COMPILATION: process.env.USE_SERVER_COMPILATION,
    NEXT_PUBLIC_LOG_AGENT_URL: process.env.NEXT_PUBLIC_LOG_AGENT_URL,
    NEXT_PUBLIC_LOG_RUN_ID: process.env.NEXT_PUBLIC_LOG_RUN_ID,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});

// Conditional prod-time validation: If running in production webhook mode, require LIVE_STATUS_SECRET
if (process.env.NODE_ENV === 'production') {
  const mode = process.env.LIVE_MODE || 'manual';
  if (mode === 'webhook' && !process.env.LIVE_STATUS_SECRET) {
    throw new Error('[env] LIVE_STATUS_SECRET is required in production when LIVE_MODE=webhook');
  }
}
