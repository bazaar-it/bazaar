#!/usr/bin/env tsx
/**
 * Backfill compiled JavaScript for templates.
 *
 * Usage: tsx scripts/backfill-template-js.ts
 *
 * - Finds every template missing js_code or js_compiled_at
 * - Compiles the stored tsx_code via SceneCompiler
 * - Updates the row with js_code, js_compiled_at, compilation_error, updated_at
 */

import 'dotenv/config';
import fetch from 'node-fetch';

import { asc, eq, isNull, or } from 'drizzle-orm';

import { db } from '../src/server/db';
import { templates } from '../src/server/db/schema';
import { sceneCompiler } from '../src/server/services/compilation/scene-compiler.service';

if (!(globalThis as any).fetch) {
  (globalThis as any).fetch = fetch as any;
}

async function main() {
  const compiler = sceneCompiler;

  const args = process.argv.slice(2);
  let templateId: string | null = null;

  for (const arg of args) {
    if (arg.startsWith('--id=')) {
      templateId = arg.slice('--id='.length);
    }
  }

  let targetTemplates;

  if (templateId) {
    const template = await db.query.templates.findFirst({
      where: eq(templates.id, templateId),
    });

    if (!template) {
      console.error(`❌ Template ${templateId} not found.`);
      process.exit(1);
    }

    targetTemplates = [template];
    console.log(`Processing specified template ${templateId}`);
  } else {
    targetTemplates = await db.query.templates.findMany({
      where: or(isNull(templates.jsCode), isNull(templates.jsCompiledAt)),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });
  }

  if (targetTemplates.length === 0) {
    console.log('✅ All templates already have compiled JS. Nothing to do.');
    return;
  }

  console.log(`Found ${targetTemplates.length} template(s) missing compiled JS. Backfilling...`);

  let success = 0;
  let failures = 0;

  for (const template of targetTemplates) {
    const tsx = template.tsxCode ?? '';
    const templateId = template.id;

    if (!tsx.trim()) {
      console.warn(`⚠️  Template ${templateId} has empty tsx_code, skipping.`);
      failures += 1;
      continue;
    }

    try {
      const compileResult = await compiler.compileScene(tsx, {
        projectId: template.sourceProjectId ?? `template-${templateId}`,
        sceneId: template.sourceSceneId ?? templateId,
        existingScenes: [],
        isBackfill: true,
      });

      await db
        .update(templates)
        .set({
          tsxCode: compileResult.tsxCode,
          jsCode: compileResult.jsCode,
          jsCompiledAt: compileResult.compiledAt,
          compilationError: compileResult.compilationError ?? null,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, templateId));

      console.log(`✅ Backfilled template ${templateId}`);
      success += 1;
    } catch (error) {
      console.error(`❌ Failed to backfill template ${templateId}:`, error);
      failures += 1;
    }
  }

  console.log('\nBackfill complete:', { success, failures });

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Unexpected error during template backfill:', error);
  process.exit(1);
});
