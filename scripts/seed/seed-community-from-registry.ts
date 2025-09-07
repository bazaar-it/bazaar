// Seed community templates from hardcoded registry into community_* tables
// Usage: npm run seed:community:from-registry

import 'dotenv/config';
import { db } from '~/server/db';
import { communityTemplates, communityTemplateScenes, users } from '~/server/db/schema';
import { TEMPLATES } from '~/templates/registry';
import { eq, sql } from 'drizzle-orm';

async function main() {
  // Choose an owner: first admin if exists, else 'system-changelog' user if present, else current user in env
  let ownerId: string | null = null;
  const admin = await db.query.users.findFirst({ where: eq(users.isAdmin, true) });
  if (admin) ownerId = admin.id;
  if (!ownerId) {
    const system = await db.query.users.findFirst({ where: eq(users.id, 'system-changelog') });
    if (system) ownerId = system.id;
  }
  if (!ownerId) {
    console.warn('No admin or system user found; templates will have null ownerUserId');
  }

  for (const tpl of TEMPLATES) {
    const slugBase = tpl.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
    let slug = slugBase || `template-${Date.now()}`;
    let i = 1;
    // ensure unique slug
    // eslint-disable-next-line no-await-in-loop
    while (await db.query.communityTemplates.findFirst({ where: eq(communityTemplates.slug, slug) })) {
      slug = `${slugBase}-${i++}`;
    }

    const [row] = await db.insert(communityTemplates).values({
      slug,
      title: tpl.name,
      description: null,
      ownerUserId: ownerId ?? null,
      sourceProjectId: null,
      thumbnailUrl: null,
      supportedFormats: (tpl.supportedFormats ?? ['landscape','portrait','square']) as any,
      tags: ['official'] as any,
      category: (tpl as any).category ?? null,
      visibility: 'public',
      status: 'active',
    }).returning();

    // One scene per template
    await db.insert(communityTemplateScenes).values({
      templateId: row.id,
      sceneIndex: 0,
      title: tpl.name,
      tsxCode: tpl.getCode(),
      duration: tpl.duration,
      previewFrame: tpl.previewFrame ?? 15,
      codeHash: sql`md5(${tpl.getCode()})` as any,
      sourceSceneId: null,
    });

    console.log('Seeded template:', tpl.name, '→', slug);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

