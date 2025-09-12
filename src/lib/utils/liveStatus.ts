// src/lib/utils/liveStatus.ts
import { db, metrics } from "~/server/db";
import { desc, eq } from "drizzle-orm";

export interface LiveStatusTags {
  url?: string;
  platform?: string;
  source?: string;
}

export interface LiveStatusResult {
  live: boolean;
  url?: string;
  updatedAt: string;
  source: 'force' | 'db' | 'default' | 'fallback';
  platform?: string;
}

export function coerceLiveFromEvent(eventType?: string): boolean | undefined {
  if (!eventType) return undefined;
  const t = eventType.toLowerCase();
  if (t.includes('started') || t.includes('start')) return true;
  if (t.includes('stopped') || t.includes('stop') || t.includes('end')) return false;
  return undefined;
}

export function coerceLiveFromStatus(status?: string | number): boolean | undefined {
  if (status === undefined || status === null) return undefined;
  if (typeof status === 'number') return status === 1 ? true : status === 0 ? false : undefined;
  const s = String(status).toLowerCase();
  if (['live', 'online', 'started', 'start', 'on'].includes(s)) return true;
  if (['offline', 'stopped', 'stop', 'end', 'off'].includes(s)) return false;
  if (s === '1') return true;
  if (s === '0') return false;
  return undefined;
}

/**
 * Resolve current live status with priority: env force -> latest DB metric -> default.
 */
export async function getCurrentLiveStatus(): Promise<LiveStatusResult> {
  try {
    const rows = await db
      .select()
      .from(metrics)
      .where(eq(metrics.name, 'live_status'))
      .orderBy(desc(metrics.timestamp))
      .limit(1);

    const latest = rows[0] as (typeof rows)[number] | undefined;
    const forced = process.env.LIVE_FORCE?.toLowerCase();
    const forceLive = forced === 'true' || forced === '1' ? true : forced === 'false' || forced === '0' ? false : undefined;

    const tags = (latest?.tags || {}) as LiveStatusTags;
    const platform = tags.platform || 'x';
    const url = tags.url || process.env.LIVE_URL_DEFAULT;
    const live = forceLive ?? (latest ? latest.value === 1 : false);

    return {
      live,
      url,
      updatedAt: latest?.timestamp instanceof Date ? latest.timestamp.toISOString() : new Date().toISOString(),
      source: forceLive !== undefined ? 'force' : latest ? 'db' : 'default',
      platform,
    };
  } catch (error) {
    // Fallback to env on error
    const forced = process.env.LIVE_FORCE?.toLowerCase();
    const forceLive = forced === 'true' || forced === '1' ? true : forced === 'false' || forced === '0' ? false : undefined;
    return {
      live: forceLive ?? false,
      url: process.env.LIVE_URL_DEFAULT,
      updatedAt: new Date().toISOString(),
      source: 'fallback',
      platform: 'x',
    };
  }
}

