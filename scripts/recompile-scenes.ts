// scripts/recompile-scenes.ts
// Backfills jsCode for all scenes in a project using the unified compiler (Sprint 106).
// Usage: tsx scripts/recompile-scenes.ts <projectId>

import 'dotenv/config';
import { db } from '~/server/db';
import { scenes } from '~/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { sceneCompiler } from '~/server/services/compilation/scene-compiler.service';

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error('Usage: tsx scripts/recompile-scenes.ts <projectId>');
    process.exit(1);
  }

  const list = await db.query.scenes.findMany({
    where: eq(scenes.projectId, projectId),
    orderBy: [asc(scenes.order)],
  });

  console.log(`Found ${list.length} scenes. Recompiling with normalization...`);

  for (const s of list) {
    const result = await sceneCompiler.compileScene(s.tsxCode || '', {
      projectId,
      sceneId: s.id,
      existingScenes: list.filter(x => x.id !== s.id).map(x => ({ id: x.id, tsxCode: x.tsxCode || '', name: x.name || '' }))
    });

    await db.update(scenes)
      .set({
        tsxCode: result.tsxCode,
        jsCode: result.jsCode,
        jsCompiledAt: result.compiledAt,
        compilationError: result.compilationError || null,
      })
      .where(eq(scenes.id, s.id));

    console.log(`Updated ${s.id} | success=${result.success} | conflicts=${result.conflicts?.length || 0}`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

