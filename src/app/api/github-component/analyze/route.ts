/**
 * GitHub Component Analysis API
 * Provides component context when user says "animate my sidebar"
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { githubConnections } from '~/server/db/schema/github-connections';
import { eq, and } from 'drizzle-orm';
import { GitHubComponentAnalyzerTool } from '~/brain/tools/github-component-analyzer';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const { prompt } = await request.json();
  
  try {
    // Get user's GitHub connection
    const connection = await db.query.githubConnections.findFirst({
      where: and(
        eq(githubConnections.userId, session.user.id),
        eq(githubConnections.isActive, true)
      ),
    });
    
    if (!connection) {
      return NextResponse.json({
        hasGitHub: false,
        message: 'No GitHub connection found',
      });
    }
    
    // Analyze the prompt for component references
    const analyzer = new GitHubComponentAnalyzerTool();
    const componentName = analyzer.extractComponentReference(prompt);
    
    if (!componentName) {
      return NextResponse.json({
        hasGitHub: true,
        hasComponent: false,
        message: 'No component reference found in prompt',
      });
    }
    
    // Get component context
    const context = await analyzer.analyze(
      session.user.id,
      componentName,
      connection.accessToken
    );
    
    if (!context) {
      return NextResponse.json({
        hasGitHub: true,
        hasComponent: false,
        componentName,
        message: `Component '${componentName}' not found in your repositories`,
      });
    }
    
    // Create enhanced prompt
    const enhancedPrompt = analyzer.createEnhancedPrompt(prompt, context);
    
    return NextResponse.json({
      hasGitHub: true,
      hasComponent: true,
      componentName,
      context,
      enhancedPrompt,
      message: `Found ${componentName} in ${context.repository}`,
    });
    
  } catch (error) {
    console.error('GitHub component analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze component',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}