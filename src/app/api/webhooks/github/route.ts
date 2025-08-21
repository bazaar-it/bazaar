// src/app/api/webhooks/github/route.ts
/**
 * GitHub Webhook Endpoint
 * Receives PR events and triggers changelog video generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import type { GitHubPREvent, WebhookHeaders } from '~/lib/types/github.types';
import { analyzeGitHubPR } from '~/server/services/github/pr-analyzer.service';
import { queueChangelogVideo } from '~/server/services/changelog/queue.service';
import { queueComponentVideo } from '~/server/services/github/component-video.service';
import { GitHubComponentSearchService } from '~/server/services/github/component-search.service';
import { ComponentIndexerService } from '~/server/services/github/component-indexer.service';
import { db } from '~/server/db';
import { changelogEntries, githubConnections } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';

// Environment validation
const envSchema = z.object({
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_PRIVATE_KEY: z.string().optional(),
});

/**
 * Verify GitHub webhook signature (HMAC SHA-256, timing-safe)
 */
function verifyGitHubSignature(
  payload: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  const hmac = createHmac('sha256', secret);
  const digestHex = hmac.update(payload).digest('hex');
  // Header format: "sha256=<hex>"
  const receivedHex = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;
  const a = Buffer.from(digestHex, 'utf8');
  const b = Buffer.from(receivedHex, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Handle component trigger commands (@bazaar showcase, demo, components, search)
 */
async function handleComponentTrigger({
  requestId,
  comment,
  owner,
  repo,
  commentBody,
}: {
  requestId: string;
  comment: any;
  owner: string;
  repo: string;
  commentBody: string;
}) {
  console.log(`[${requestId}] Processing component trigger...`);

  // Extract trigger type and parameters
  let triggerType: 'showcase' | 'demo' | 'components' | 'search';
  let componentName: string | undefined;
  let searchQuery: string | undefined;

  if (commentBody.includes('@bazaar showcase')) {
    triggerType = 'showcase';
    const showcaseMatch = commentBody.match(/@bazaar\s+showcase\s+([^\s]+)/i);
    componentName = showcaseMatch?.[1];
  } else if (commentBody.includes('@bazaar demo')) {
    triggerType = 'demo';
    const demoMatch = commentBody.match(/@bazaar\s+demo\s+([^\s]+)/i);
    componentName = demoMatch?.[1];
  } else if (commentBody.includes('@bazaar search')) {
    triggerType = 'search';
    const searchMatch = commentBody.match(/@bazaar\s+search\s+(.+?)$/im);
    searchQuery = searchMatch?.[1]?.trim();
  } else {
    triggerType = 'components';
  }

  console.log(`[${requestId}] Trigger type: ${triggerType}, component: ${componentName}, query: ${searchQuery}`);

  try {
    // For now, we'll use a mock GitHub connection since we don't have user context in webhooks
    // In a real implementation, you might want to associate repos with Bazaar users
    const mockAccessToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_APP_PRIVATE_KEY;
    
    if (!mockAccessToken) {
      throw new Error('No GitHub access token available for component discovery');
    }

    if (triggerType === 'components') {
      // List all components in the repository
      const indexer = new ComponentIndexerService(mockAccessToken);
      const catalog = await indexer.discoverComponents(owner, repo);
      
      const componentCounts = {
        core: catalog.core.length,
        auth: catalog.auth.length,
        commerce: catalog.commerce.length,
        interactive: catalog.interactive.length,
        content: catalog.content.length,
        custom: catalog.custom.length,
      };

      const totalComponents = Object.values(componentCounts).reduce((sum, count) => sum + count, 0);

      console.log(`[${requestId}] Found ${totalComponents} components in ${repo}`);

      // TODO: Comment back on PR with component list
      return NextResponse.json({
        status: 'success',
        message: `Found ${totalComponents} components in repository`,
        type: 'component_list',
        repository: `${owner}/${repo}`,
        components: componentCounts,
      });

    } else if (triggerType === 'search') {
      if (!searchQuery) {
        return NextResponse.json({
          status: 'error',
          message: 'Search query required. Usage: @bazaar search <query>',
        }, { status: 400 });
      }

      // Search for specific components
      const searchService = new GitHubComponentSearchService(mockAccessToken, 'webhook');
      const results = await searchService.searchComponent(searchQuery, {
        repositories: [`${owner}/${repo}`],
        maxResults: 10,
      });

      console.log(`[${requestId}] Search for "${searchQuery}" found ${results.length} results`);

      return NextResponse.json({
        status: 'success',
        message: `Found ${results.length} components matching "${searchQuery}"`,
        type: 'component_search',
        repository: `${owner}/${repo}`,
        query: searchQuery,
        results: results.map(r => ({
          name: r.name,
          path: r.path,
          score: r.score,
        })),
      });

    } else if (triggerType === 'showcase' || triggerType === 'demo') {
      if (!componentName) {
        return NextResponse.json({
          status: 'error',
          message: `Component name required. Usage: @bazaar ${triggerType} <component-name>`,
        }, { status: 400 });
      }

      // Queue component showcase video generation
      const jobId = await queueComponentVideo({
        repository: `${owner}/${repo}`,
        componentName,
        triggerType,
        accessToken: mockAccessToken,
        prNumber: comment.issue.number,
        requester: {
          username: comment.comment.user.login,
          avatar: comment.comment.user.avatar_url,
          url: comment.comment.user.html_url,
        },
      });

      console.log(`[${requestId}] Component ${triggerType} video queued with job ID: ${jobId}`);

      return NextResponse.json({
        status: 'success',
        message: `Generating ${triggerType} video for ${componentName}...`,
        type: `component_${triggerType}`,
        repository: `${owner}/${repo}`,
        componentName,
        jobId,
        prNumber: comment.issue.number,
      });
    }

  } catch (error) {
    console.error(`[${requestId}] Error processing component trigger:`, error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to process component request',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Handle GET requests (health check)
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    endpoint: 'github-webhook',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle GitHub webhook POST requests
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] GitHub webhook received`);
  
  try {
    // 1. Validate environment
    const env = envSchema.parse(process.env);
    
    // 2. Get request body as text for signature verification
    const body = await request.text();
    
    // 3. Extract headers
    const headers: WebhookHeaders = {
      'x-github-event': request.headers.get('x-github-event') || undefined,
      'x-github-signature-256': request.headers.get('x-github-signature-256') || undefined,
      'x-github-delivery': request.headers.get('x-github-delivery') || undefined,
    };
    
    console.log(`[${requestId}] Event type: ${headers['x-github-event']}`);
    console.log(`[${requestId}] Delivery ID: ${headers['x-github-delivery']}`);
    
    // 4. Verify webhook signature and basic UA
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent.startsWith('GitHub-Hookshot/')) {
      console.error(`[${requestId}] Invalid User-Agent for GitHub webhook: ${userAgent}`);
      return NextResponse.json({ error: 'Invalid User-Agent' }, { status: 400 });
    }
    const isValid = verifyGitHubSignature(
      body,
      headers['x-github-signature-256'],
      env.GITHUB_WEBHOOK_SECRET
    );
    
    if (!isValid) {
      console.error(`[${requestId}] Invalid webhook signature`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // 5. Dedupe deliveries by delivery ID (best effort)
    try {
      if (headers['x-github-delivery']) {
        const { webhookDeliveries } = await import('~/server/db/schema');
        const { eq } = await import('drizzle-orm');
        const existing = await db
          .select({ id: webhookDeliveries.id })
          .from(webhookDeliveries)
          .where(eq(webhookDeliveries.deliveryId, headers['x-github-delivery']))
          .limit(1);
        if (existing.length > 0) {
          console.log(`[${requestId}] Duplicate delivery ${headers['x-github-delivery']} ignored`);
          return NextResponse.json({ status: 'ignored', reason: 'duplicate' });
        }
        await db.insert(webhookDeliveries).values({
          deliveryId: headers['x-github-delivery'],
          event: headers['x-github-event'] || 'unknown',
        });
      }
    } catch (e) {
      console.warn(`[${requestId}] Failed to record webhook delivery (non-fatal):`, e);
    }
    
    // 6. Parse event payload
    const event = JSON.parse(body) as GitHubPREvent;
    
    // 7. Update repository on dedupe row (best effort)
    try {
      const repoFullName = (event as any)?.repository?.full_name as string | undefined;
      if (headers['x-github-delivery'] && repoFullName) {
        const { webhookDeliveries } = await import('~/server/db/schema');
        const { eq } = await import('drizzle-orm');
        await db
          .update(webhookDeliveries)
          .set({ repository: repoFullName })
          .where(eq(webhookDeliveries.deliveryId, headers['x-github-delivery']!));
      }
    } catch {}
    
    // 6. Handle different event types
    const eventType = headers['x-github-event'];
    
    // Handle issue comments for manual trigger
    if (eventType === 'issue_comment') {
      const comment = event as any;
      const commentBody = comment.comment?.body?.toLowerCase() || '';
      
      // Check for various trigger phrases (flexible matching)
      const changelogTriggers = [
        '@bazaar changelog',  // Official app name
        '@bazaar-changelog',  // With hyphen
        '@bazaarchangelog',   // No space
        'bazaar changelog generate',
        'generate changelog video'
      ];
      
      // New component showcase triggers
      const showcaseTriggers = [
        '@bazaar showcase',
        '@bazaar demo',
        '@bazaar components',
        '@bazaar search'
      ];
      
      const isChangelogTriggered = changelogTriggers.some(trigger => commentBody.includes(trigger.toLowerCase()));
      const isComponentTriggered = showcaseTriggers.some(trigger => commentBody.includes(trigger.toLowerCase()));
      
      if ((isChangelogTriggered || isComponentTriggered) && comment.issue?.pull_request) {
        console.log(`[${requestId}] Manual trigger via comment on PR #${comment.issue?.number}`);
        console.log(`[${requestId}] Comment: ${comment.comment?.body}`);
        
        try {
          // Extract repository info
          const [owner, repo] = comment.repository?.full_name?.split('/') || [];
          if (!owner || !repo) {
            throw new Error('Could not extract repository information');
          }
          
          if (isChangelogTriggered) {
            // Original changelog video generation
            console.log(`[${requestId}] Analyzing PR #${comment.issue.number}...`);
            const analysis = await analyzeGitHubPR({
              owner,
              repo,
              prNumber: comment.issue.number,
              installationId: (event as any)?.installation?.id,
            });
            
            // Queue video generation
            console.log(`[${requestId}] Queueing changelog video generation...`);
            const jobId = await queueChangelogVideo({
              prAnalysis: analysis,
              repository: comment.repository.full_name,
              style: 'automatic',
              format: 'landscape',
              branding: 'auto',
            });
            
            // Store in database
            await db.insert(changelogEntries).values({
              id: crypto.randomUUID(),
              prNumber: comment.issue.number,
              repositoryFullName: comment.repository.full_name,
              repositoryOwner: owner,
              repositoryName: repo,
              title: analysis.title,
              description: analysis.description || '',
              type: analysis.type,
              authorUsername: comment.comment.user.login,
              authorAvatar: comment.comment.user.avatar_url,
              authorUrl: comment.comment.user.html_url,
              mergedAt: new Date(), // Will update when actually merged
              jobId,
              status: 'queued',
              additions: analysis.stats.additions,
              deletions: analysis.stats.deletions,
              filesChanged: analysis.stats.filesChanged,
            });
            
            console.log(`[${requestId}] Changelog video generation queued with job ID: ${jobId}`);
            
            return NextResponse.json({ 
              status: 'success',
              message: 'Changelog video generation started',
              type: 'changelog',
              prNumber: comment.issue.number,
              jobId,
              repository: comment.repository.full_name,
            });
          } else if (isComponentTriggered) {
            // New component showcase video generation
            return await handleComponentTrigger({
              requestId,
              comment,
              owner,
              repo,
              commentBody
            });
          }
          
          
        } catch (error) {
          console.error(`[${requestId}] Error processing comment trigger:`, error);
          return NextResponse.json(
            { 
              status: 'error',
              message: 'Failed to generate changelog video',
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          );
        }
      }
      
      // Not a trigger comment or not on a PR, ignore
      return NextResponse.json({ 
        status: 'ignored',
        reason: (isChangelogTriggered || isComponentTriggered) ? 'Not a pull request' : 'Comment does not contain trigger phrase'
      });
    }
    
    if (eventType !== 'pull_request') {
      console.log(`[${requestId}] Ignoring non-PR event: ${eventType}`);
      return NextResponse.json({ 
        status: 'ignored',
        reason: 'Not a pull_request event'
      });
    }
    
    // 7. Check if PR was merged (for changelog generation)
    // DISABLED: Auto-generation on merge - only generate when explicitly requested via comment
    // Uncomment the block below to enable automatic generation for all merged PRs
    /*
    if (event.action === 'closed' && event.pull_request.merged) {
      console.log(`[${requestId}] PR #${event.pull_request.number} was merged, but auto-generation is disabled`);
      console.log(`[${requestId}] To generate a video, comment "@bazaar changelog" on the PR`);
      
      return NextResponse.json({
        status: 'acknowledged',
        message: 'PR merged - use @bazaar changelog comment to generate video',
        prNumber: event.pull_request.number,
        repository: event.repository.full_name,
      });
    }
    */
    
    // For now, only generate videos when explicitly requested via comment
    if (event.action === 'closed' && event.pull_request.merged) {
      console.log(`[${requestId}] PR #${event.pull_request.number} was merged (auto-generation disabled)`);
      return NextResponse.json({
        status: 'acknowledged',
        message: 'PR merged - video generation available via comment trigger',
        prNumber: event.pull_request.number,
      });
    }
    
    // 12. Handle other PR actions (opened, synchronize, etc.)
    // For now, we only care about merged PRs
    console.log(`[${requestId}] PR action '${event.action}' - no action taken`);
    
    return NextResponse.json({
      status: 'acknowledged',
      action: event.action,
      prNumber: event.pull_request.number,
      repository: event.repository.full_name,
    });
    
  } catch (error) {
    console.error(`[${requestId}] Webhook processing error:`, error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        requestId,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle other HTTP methods
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
    },
  });
}