// Dev-only: read recent scenes from PROD and publish into DEV Community as 1-scene templates
// Usage:
//   PROD_DATABASE_URL=postgresql://... SEED_COMMUNITY_DAYS=21 SEED_COMMUNITY_LIMIT=500 npm run seed:community:from-prod

import 'dotenv/config';
// Polyfill fetch for Neon HTTP client
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import fetch from 'node-fetch';
(globalThis as any).fetch = fetch;

import crypto from 'crypto';
import { db } from '../../src/server/db';
import { communityTemplates, communityTemplateScenes, users as devUsers, projects as devProjects } from '../../src/server/db/schema';
import { createDefaultProjectProps } from '../../src/lib/types/video/remotion-constants';
import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';

const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL || process.env.PROD_DB_URL || '';
const days = Number(process.env.SEED_COMMUNITY_DAYS || '21');
const limit = Number(process.env.SEED_COMMUNITY_LIMIT || '500');

if (!PROD_DATABASE_URL) {
  console.error('[seed-community-from-prod] Missing PROD_DATABASE_URL env');
  process.exit(1);
}

type ProdRow = {
  id: string;
  project_id: string;
  project_title: string | null;
  name: string | null;
  tsx_code: string;
  duration: number;
  created_at: string;
  user_id: string;
};

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
  while (await db.query.communityTemplates.findFirst({ where: sql`${communityTemplates.slug} = ${slug}` })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

async function alreadyPublished(sourceSceneId: string) {
  const check = await db.execute(sql`SELECT 1 FROM ${communityTemplateScenes} WHERE ${communityTemplateScenes.sourceSceneId} = ${sourceSceneId} LIMIT 1`);
  return (check as any).rows?.length > 0;
}

async function main() {
  console.log(`[seed-community-from-prod] days=${days} limit=${limit}`);
  const prod = neon(PROD_DATABASE_URL);
  const query = `
    SELECT s.id,
           s."projectId" as project_id,
           p.title as project_title,
           s.name,
           s."tsxCode" as tsx_code,
           s.duration,
           s."createdAt" as created_at,
           p."userId" as user_id
    FROM "bazaar-vid_scene" s
    JOIN "bazaar-vid_project" p ON p.id = s."projectId"
    WHERE s."createdAt" >= NOW() - INTERVAL '${days} days'
    ORDER BY p.id, s."order" ASC, s."createdAt" ASC
    LIMIT ${limit}
  `;
  const rows: ProdRow[] = await prod(query) as any;
  console.log(`[seed-community-from-prod] Fetched ${rows.length} rows from prod`);

  // Group by project
  const byProject = new Map<string, ProdRow[]>();
  for (const r of rows) {
    if (!byProject.has(r.project_id)) byProject.set(r.project_id, []);
    byProject.get(r.project_id)!.push(r);
  }

  let created = 0;
  for (const [projectId, scenesForProject] of byProject) {
    // Skip project if any scene already published
    const anyPublished = await Promise.all(scenesForProject.map((r) => alreadyPublished(r.id)));
    if (anyPublished.some(Boolean)) continue;

    const title = scenesForProject[0]?.project_title || 'Published Project';
    const base = slugifyBase(title);
    const slug = await ensureUniqueSlug(base);
    const owner = scenesForProject[0]?.user_id ?? null;
    // Ensure shadow user exists in DEV (minimal fields)
    let ownerForDev: string | null = owner;
    if (owner) {
      const check = await db.execute(sql`SELECT 1 FROM "bazaar-vid_user" WHERE id = ${owner} LIMIT 1`);
      if (((check as any).rows ?? []).length === 0) {
        await db.insert(devUsers).values({
          id: owner as any,
          email: `shadow+${owner}@prod.local`,
          name: 'Shadow',
          isAdmin: false,
        } as any);
      }
    }

    // Ensure shadow project exists in DEV (minimal fields)
    let projectForDev: string | null = projectId;
    if (projectForDev) {
      const checkProj = await db.execute(sql`SELECT 1 FROM "bazaar-vid_project" WHERE id = ${projectForDev} LIMIT 1`);
      if (((checkProj as any).rows ?? []).length === 0) {
        const props = createDefaultProjectProps();
        await db.insert(devProjects).values({
          id: projectForDev as any,
          userId: (ownerForDev as any) ?? 'system',
          title: title as any,
          props: props as any,
          isWelcome: false,
          isFavorite: false,
        } as any);
      }
    }
    const [tpl] = await db.insert(communityTemplates).values({
      slug,
      title,
      description: null,
      ownerUserId: ownerForDev as any,
      sourceProjectId: projectForDev as any,
      thumbnailUrl: null,
      supportedFormats: ["landscape","portrait","square"] as any,
      tags: ["prod-auto"] as any,
      category: null,
      visibility: 'public',
      status: 'active',
    }).returning();

    let idx = 0;
    for (const r of scenesForProject) {
      const hash = crypto.createHash('md5').update(r.tsx_code).digest('hex');
      await db.insert(communityTemplateScenes).values({
        templateId: tpl.id,
        sceneIndex: idx++,
        title: r.name || undefined,
        tsxCode: r.tsx_code,
        duration: Number(r.duration ?? 150),
        previewFrame: 15,
        codeHash: hash,
        sourceSceneId: null as any, // prod scene not present in dev; avoid FK violation
      });
    }
    created++;
    console.log(`[seeded project from prod] project=${projectId} scenes=${scenesForProject.length} -> template=${tpl.id} slug=${slug}`);
  }
  console.log(`[seed-community-from-prod] Created ${created} new community templates (grouped by project)`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
