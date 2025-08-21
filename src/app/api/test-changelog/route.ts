// Test endpoint for changelog generation with current user
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { analyzeGitHubPR } from '~/server/services/github/pr-analyzer.service';
import { generateChangelogVideo } from '~/server/services/changelog/video-generator.service';

export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Analyze PR #108 from your repo
    console.log('Analyzing PR #108 for test...');
    const analysis = await analyzeGitHubPR({
      owner: 'Lysaker1',
      repo: 'bazaar-vid',
      prNumber: 108,
    });

    // Generate video with current user's ID (add timestamp to make unique)
    console.log(`Generating video for user ${session.user.id}...`);
    const result = await generateChangelogVideo({
      prAnalysis: analysis,
      repository: 'Lysaker1/bazaar-vid',
      style: 'automatic',
      format: 'landscape',
      branding: 'auto',
    }, session.user.id); // Pass the current user's ID

    // Return the project URL for easy access
    const projectId = result.id; // This is actually the scene ID
    // We need to get the project ID from the database
    const { db } = await import('~/server/db');
    const { scenes } = await import('~/server/db/schema');
    const { eq } = await import('drizzle-orm');
    
    const scene = await db.query.scenes.findFirst({
      where: eq(scenes.id, result.id),
    });

    return NextResponse.json({
      success: true,
      message: 'Changelog video generated!',
      projectUrl: `http://localhost:3000/projects/${scene?.projectId}/generate`,
      projectId: scene?.projectId,
      sceneId: result.id,
      videoUrl: result.videoUrl,
    });

  } catch (error) {
    console.error('Test changelog error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate test changelog',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}