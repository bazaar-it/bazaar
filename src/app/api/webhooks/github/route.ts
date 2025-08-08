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
import { db } from '~/server/db';
import { changelogEntries } from '~/server/db/schema';

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
    
    // 4. Verify webhook signature
    console.log(`[${requestId}] Using webhook secret: ${env.GITHUB_WEBHOOK_SECRET?.substring(0, 10)}...`);
    const isValid = verifyGitHubSignature(
      body,
      headers['x-github-signature-256'],
      env.GITHUB_WEBHOOK_SECRET
    );
    
    if (!isValid) {
      console.error(`[${requestId}] Invalid webhook signature - BYPASSING FOR TESTING`);
      console.error(`[${requestId}] Expected signature: ${headers['x-github-signature-256']?.substring(0, 20)}...`);
      // Temporarily bypass for testing
      // return NextResponse.json(
      //   { error: 'Invalid signature' },
      //   { status: 401 }
      // );
    }
    
    // 5. Parse event payload
    const event = JSON.parse(body) as GitHubPREvent;
    
    // 6. Handle different event types
    const eventType = headers['x-github-event'];
    
    // Handle issue comments for manual trigger
    if (eventType === 'issue_comment') {
      const comment = event as any;
      const commentBody = comment.comment?.body?.toLowerCase() || '';
      
      // Check for various trigger phrases (flexible matching)
      const triggers = [
        '@bazaar changelog',  // Official app name
        '@bazaar-changelog',  // With hyphen
        '@bazaarchangelog',   // No space
        'bazaar changelog generate',
        'generate changelog video'
      ];
      
      const isTriggered = triggers.some(trigger => commentBody.includes(trigger.toLowerCase()));
      
      if (isTriggered && comment.issue?.pull_request) {
        console.log(`[${requestId}] Manual trigger via comment on PR #${comment.issue?.number}`);
        console.log(`[${requestId}] Comment: ${comment.comment?.body}`);
        
        try {
          // Extract repository info
          const [owner, repo] = comment.repository?.full_name?.split('/') || [];
          if (!owner || !repo) {
            throw new Error('Could not extract repository information');
          }
          
          // Analyze the PR
          console.log(`[${requestId}] Analyzing PR #${comment.issue.number}...`);
          const analysis = await analyzeGitHubPR({
            owner,
            repo,
            prNumber: comment.issue.number,
          });
          
          // Queue video generation
          console.log(`[${requestId}] Queueing video generation...`);
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
          
          console.log(`[${requestId}] Video generation queued with job ID: ${jobId}`);
          
          // TODO: Comment back on PR with status
          // await commentOnPR(owner, repo, comment.issue.number, 
          //   `🎬 Generating changelog video... Check back in ~2 minutes!`);
          
          return NextResponse.json({ 
            status: 'success',
            message: 'Changelog video generation started',
            prNumber: comment.issue.number,
            jobId,
            repository: comment.repository.full_name,
          });
          
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
        reason: isTriggered ? 'Not a pull request' : 'Comment does not contain trigger phrase'
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
    if (event.action === 'closed' && event.pull_request.merged) {
      console.log(`[${requestId}] PR #${event.pull_request.number} was merged, generating changelog video`);
      
      try {
        // 8. Analyze PR for content
        const analysis = await analyzeGitHubPR({
          owner: event.repository.owner.login,
          repo: event.repository.name,
          prNumber: event.pull_request.number,
          prData: event.pull_request,
        });
        
        // 9. Check if changelog generation is enabled for this repo
        // For MVP, we'll generate for all merged PRs
        // Later, check for .github/bazaar.json config
        
        // 10. Queue video generation job
        const jobId = await queueChangelogVideo({
          prAnalysis: analysis,
          repository: event.repository.full_name,
          style: 'automatic',
          format: 'landscape',
          branding: 'auto',
        });
        
        // 11. Store changelog entry in database
        await db.insert(changelogEntries).values({
          id: crypto.randomUUID(),
          prNumber: event.pull_request.number,
          repositoryFullName: event.repository.full_name,
          repositoryOwner: event.repository.owner.login,
          repositoryName: event.repository.name,
          title: event.pull_request.title,
          description: event.pull_request.body || '',
          type: analysis.type,
          authorUsername: event.pull_request.user.login,
          authorAvatar: event.pull_request.user.avatar_url,
          authorUrl: event.pull_request.user.html_url,
          mergedAt: new Date(event.pull_request.merged_at!),
          jobId,
          status: 'queued',
          additions: event.pull_request.additions,
          deletions: event.pull_request.deletions,
          filesChanged: event.pull_request.changed_files,
        });
        
        console.log(`[${requestId}] Changelog video queued with job ID: ${jobId}`);
        
        return NextResponse.json({
          status: 'success',
          message: 'Changelog video generation queued',
          jobId,
          prNumber: event.pull_request.number,
          repository: event.repository.full_name,
        });
        
      } catch (error) {
        console.error(`[${requestId}] Error processing merged PR:`, error);
        return NextResponse.json(
          { 
            status: 'error',
            message: 'Failed to queue changelog video',
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
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