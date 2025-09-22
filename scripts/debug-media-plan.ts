import { exit } from 'process';
import { randomUUID } from 'crypto';
import { eq, asc } from 'drizzle-orm';
import { orchestrator } from '~/brain/orchestratorNEW';
import { db } from '~/server/db';
import { scenes, messages } from '~/server/db/schema';
import '~/env';

interface CLIOptions {
  projectId: string;
  userId: string;
  prompt: string;
  imageUrls: string[];
  videoUrls: string[];
  audioUrls: string[];
  sceneIds: string[];
  execute: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const collections: Record<string, string[]> = {};

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = args[i + 1];
    if (!collections[key]) collections[key] = [];

    if (!next || next.startsWith('--')) {
      collections[key].push('true');
    } else {
      collections[key].push(next);
      i += 1;
    }
  }

  const getSingle = (key: string, required = false): string => {
    const value = collections[key]?.[0];
    if (required && (!value || value === '')) {
      console.error(`Missing required --${key}`);
      exit(1);
    }
    return value || '';
  };

  return {
    projectId: getSingle('project', true),
    userId: getSingle('user', true),
    prompt: getSingle('prompt', true),
    imageUrls: collections['image'] || [],
    videoUrls: collections['video'] || [],
    audioUrls: collections['audio'] || [],
    sceneIds: collections['scene'] || [],
    execute: (collections['execute'] || []).some((v) => v === 'true'),
  };
}

async function main() {
  const options = parseArgs();
  const requestId = `CLI-${randomUUID()}`;

  console.log('\n🧪 Running orchestrator dry-run');
  console.log('   requestId:', requestId);
  console.log('   project:', options.projectId);
  console.log('   user:', options.userId);
  console.log('   prompt:', options.prompt);
  if (options.imageUrls.length) console.log('   images:', options.imageUrls);
  if (options.videoUrls.length) console.log('   videos:', options.videoUrls);
  if (options.audioUrls.length) console.log('   audio:', options.audioUrls);
  if (options.sceneIds.length) console.log('   attached scenes:', options.sceneIds);

  const projectScenes = await db
    .select({
      id: scenes.id,
      name: scenes.name,
      tsxCode: scenes.tsxCode,
      duration: scenes.duration,
      order: scenes.order,
    })
    .from(scenes)
    .where(eq(scenes.projectId, options.projectId))
    .orderBy(asc(scenes.order));

  const chatRows = await db
    .select({
      role: messages.role,
      content: messages.content,
      imageUrls: messages.imageUrls,
      videoUrls: messages.videoUrls,
      audioUrls: messages.audioUrls,
    })
    .from(messages)
    .where(eq(messages.projectId, options.projectId))
    .orderBy(asc(messages.createdAt));

  const userContext: any = {
    imageUrls: options.imageUrls.length ? options.imageUrls : undefined,
    videoUrls: options.videoUrls.length ? options.videoUrls : undefined,
    audioUrls: options.audioUrls.length ? options.audioUrls : undefined,
    sceneUrls: options.sceneIds.length ? options.sceneIds : undefined,
  };

  const response = await orchestrator.processUserInput(
    {
      prompt: options.prompt,
      projectId: options.projectId,
      userId: options.userId,
      storyboardSoFar: projectScenes,
      chatHistory: chatRows.map((row) => ({
        role: row.role,
        content: row.content,
        imageUrls: row.imageUrls ?? undefined,
        videoUrls: row.videoUrls ?? undefined,
        audioUrls: row.audioUrls ?? undefined,
      })),
      userContext,
    } as any,
    { requestId }
  );

  console.log('\n🎯 Decision summary');
  console.log(JSON.stringify({
    tool: response.result?.toolName ?? response.toolUsed,
    reasoning: response.reasoning,
    needsClarification: response.needsClarification ?? false,
    imageAction: response.result?.toolContext?.imageAction,
    media: {
      imageUrls: response.result?.toolContext?.imageUrls?.length || 0,
      videoUrls: response.result?.toolContext?.videoUrls?.length || 0,
    },
  }, null, 2));

  if (options.execute && response?.result?.toolName && response?.result?.toolContext) {
    const { executeToolFromDecision } = await import('~/server/api/routers/generation/helpers');
    console.log('\n🛠  Executing tool (dry run)...');
    const execResult = await executeToolFromDecision(
      { success: true, toolName: response.result.toolName, toolContext: response.result.toolContext },
      options.projectId,
      options.userId,
      projectScenes
    );
    console.log('   execution result:', JSON.stringify(execResult, null, 2));
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Failed to run orchestrator dry-run:', err);
  process.exit(1);
});
