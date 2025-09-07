// Dev-only: auto-publish recent user scenes into Community as 1-scene templates
// Usage:
//   SEED_COMMUNITY_DAYS=7 SEED_COMMUNITY_LIMIT=200 npm run seed:community:from-scenes

import 'dotenv/config';
// Polyfill fetch for Neon HTTP client
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import fetch from 'node-fetch';
(globalThis as any).fetch = fetch;

import crypto from 'crypto';
import { db } from '../../src/server/db';
import {
  communityTemplates,
  communityTemplateScenes,
  scenes,
  projects,
} from '../../src/server/db/schema';
import { sql } from 'drizzle-orm';

const days = Number(process.env.SEED_COMMUNITY_DAYS || '7');
const limit = Number(process.env.SEED_COMMUNITY_LIMIT || '200');

async function hasAlreadyPublished(sourceSceneId: string) {
  const row = await db
    .select({ id: communityTemplateScenes.id })
    .from(communityTemplateScenes)
    .where(eq(communityTemplateScenes.sourceSceneId, sourceSceneId))
    .limit(1);
  return row.length > 0;
}

function slugifyBase(s: string): string {
  return (s || 'scene')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base || `template-${Date.now()}`;
  let suffix = 1;
  // naive uniqueness loop; ok for seed scale
  while (await db.query.communityTemplates.findFirst({ where: eq(communityTemplates.slug, slug) })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

async function main() {
  console.log(`[seed-community-from-scenes] days=${days} limit=${limit}`);
  // load recent scenes with project owner id
  const rows = await db.execute<{ id: string; project_id: string; project_title: string; name: string | null; tsx_code: string; duration: number; created_at: string; user_id: string }>(sql`
    SELECT s.id,
           s."projectId" as project_id,
           p.title as project_title,
           s.name,
           s."tsxCode" as tsx_code,
           s.duration,
           s."createdAt" as created_at,
           p."userId" as user_id
    FROM ${scenes} s
    JOIN ${projects} p ON p.id = s."projectId"
    WHERE s."createdAt" >= NOW() - INTERVAL '${sql.raw(String(days))} days'
    ORDER BY p.id, s."order" ASC, s."createdAt" ASC
    LIMIT ${sql.raw(String(limit))}
  `);

  const list = (rows as any).rows as any[];
  console.log(`[seed-community-from-scenes] Found ${list?.length ?? 0} recent scenes`);

  // Group by project
  const byProject = new Map<string, any[]>();
  for (const r of list ?? []) {
    if (!byProject.has(r.project_id)) byProject.set(r.project_id, []);
    byProject.get(r.project_id)!.push(r);
  }

  let created = 0;
  for (const [projectId, scenesForProject] of byProject) {
    // Skip project if any scene already published (to avoid partial duplicates)
    const anyPublished = await Promise.all(scenesForProject.map((r) => hasAlreadyPublished(r.id as string)));
    if (anyPublished.some(Boolean)) continue;

    const ownerUserId = scenesForProject[0]?.user_id as string | null;
    const title = (scenesForProject[0]?.project_title as string | null) || 'Published Project';
    const base = slugifyBase(title);
    const slug = await ensureUniqueSlug(base);

    const [tpl] = await db.insert(communityTemplates).values({
      slug,
      title,
      description: null,
      ownerUserId: ownerUserId ?? null,
      sourceProjectId: projectId as string,
      thumbnailUrl: null,
      supportedFormats: ["landscape", "portrait", "square"] as any,
      tags: ["dev-auto"] as any,
      category: null,
      visibility: 'public',
      status: 'active',
    }).returning();

    let idx = 0;
    for (const r of scenesForProject) {
      const code: string = r.tsx_code as string;
      const hash = crypto.createHash('md5').update(code).digest('hex');
      await db.insert(communityTemplateScenes).values({
        templateId: tpl.id,
        sceneIndex: idx++,
        title: r.name || undefined,
        tsxCode: code,
        duration: Number(r.duration ?? 150),
        previewFrame: 15,
        codeHash: hash,
        sourceSceneId: r.id as string,
      });
    }
    created++;
    console.log(`[seeded project] project=${projectId} scenes=${scenesForProject.length} -> template=${tpl.id} slug=${slug}`);
  }

  console.log(`[seed-community-from-scenes] Created ${created} new community templates (grouped by project)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
