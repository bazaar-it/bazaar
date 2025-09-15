#!/usr/bin/env ts-node
/*
 * Dev utility: Sanitize avatar and malformed R2 URLs in scene TSX code
 * - Fixes concatenated r2.devhttps//
 * - Rewrites /avatars/... and /Bazaar avatars/... to absolute R2 public URLs
 *
 * Usage:
 *   npx tsx scripts/sanitize-scenes-avatars.ts --project <projectId> --write
 *   npx tsx scripts/sanitize-scenes-avatars.ts --write  # all projects
 *   npx tsx scripts/sanitize-scenes-avatars.ts          # dry-run
 */

import { db } from '~/server/db';
import { scenes } from '~/server/db/schema';
import { ilike, or, and, eq } from 'drizzle-orm';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: { projectId?: string; write?: boolean } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--project' && args[i + 1]) {
      opts.projectId = args[++i];
      continue;
    }
    if (a === '--write') {
      opts.write = true;
      continue;
    }
  }
  return opts;
}

function sanitizeConcatenatedR2Url(urlStr: string): string {
  return urlStr.replace(/(\.r2\.dev)https\/+/, '$1/');
}

function buildAvatarUrl(file: string, baseDir: string, publicBase: string): string {
  const encodedDir = encodeURIComponent(baseDir);
  const encodedFile = file.split('/').map(encodeURIComponent).join('/');
  return `${publicBase.replace(/\/$/, '')}/${encodedDir}/${encodedFile}`;
}

async function main() {
  const { projectId, write } = parseArgs();
  const publicBase = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  const avatarsDir = process.env.AVATARS_BASE_DIR || 'Bazaar avatars';
  if (!publicBase) {
    console.error('CLOUDFLARE_R2_PUBLIC_URL env is required to run this script.');
    process.exit(1);
  }

  console.log('[Sanitize] Starting scan', { projectId, write });

  // Build where clause
  const where = or(
    ilike(scenes.tsxCode, '%/avatars/%'),
    ilike(scenes.tsxCode, `%${avatarsDir}%`),
    ilike(scenes.tsxCode, '%r2.devhttps//%')
  );

  const rows = await db.query.scenes.findMany({
    where: projectId ? and(eq(scenes.projectId, projectId), where) : where,
    columns: { id: true, projectId: true, name: true, tsxCode: true },
  });

  console.log(`[Sanitize] Found ${rows.length} candidate scene(s)`);
  let changed = 0;
  for (const row of rows) {
    let code = row.tsxCode || '';
    const before = code;

    // 1) Fix concatenated r2.devhttps//
    code = code.replace(/(\.r2\.dev)https\/+/, '$1/');

    // 2) Rewrite avatar references to absolute R2 URL (preserve spaces)
    const reAv1 = new RegExp(`(src|href)=["']\\/?avatars/([^"']+)["']`, 'gi');
    code = code.replace(reAv1, (_m, attr: string, file: string) => {
      const to = buildAvatarUrl(file, avatarsDir, publicBase);
      return `${attr}="${to}"`;
    });

    const escapedDir = avatarsDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reAv2 = new RegExp(`(src|href)=["'](?:\\/)?${escapedDir}\\/([^"']+)["']`, 'gi');
    code = code.replace(reAv2, (_m, attr: string, file: string) => {
      const to = buildAvatarUrl(file, avatarsDir, publicBase);
      return `${attr}="${to}"`;
    });

    if (code !== before) {
      changed++;
      console.log(`[Sanitize] Scene ${row.id} (${row.name}) updated`);
      if (write) {
        await db.update(scenes).set({ tsxCode: code, updatedAt: new Date() }).where(eq(scenes.id, row.id));
      }
    }
  }

  console.log(`[Sanitize] Done. Changed ${changed} of ${rows.length} scenes. ${write ? 'APPLIED' : 'DRY-RUN'}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

