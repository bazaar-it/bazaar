// src/server/services/changelog/video-generator.service.ts
/**
 * Changelog Video Generator Service
 * Generates motion graphic videos from PR analysis
 */

import type { ChangelogVideoRequest, ChangelogVideoResponse, PRAnalysis } from '~/lib/types/github.types';
import type { InputProps } from '~/lib/types/video/input-props';
import { db } from '~/server/db';
import { projects, scenes, users } from '~/server/db/schema';
import { env } from "~/env";
import { sceneCompiler } from "~/server/services/compilation/scene-compiler.service";
import { eq } from 'drizzle-orm';
import { prepareRenderConfig } from '~/server/services/render/render.service';
import { renderVideoOnLambda, getLambdaRenderProgress } from '~/server/services/render/lambda-render.service';

/**
 * Generate a changelog video from PR analysis
 */
export async function generateChangelogVideo(
  request: ChangelogVideoRequest,
  userId?: string // Optional user ID to use instead of system user
): Promise<ChangelogVideoResponse> {
  const requestId = crypto.randomUUID();
  const { prAnalysis, style, format, duration, branding } = request;
  
  console.log(`[${requestId}] Generating changelog video for PR #${prAnalysis.prNumber}`);
  
  try {
    // 1. Use provided userId or system-changelog user
    const projectUserId = userId || 'system-changelog';
    
    // Ensure system user exists if we're using it
    if (!userId) {
      try {
        await db.insert(users).values({
          id: projectUserId,
          name: 'System Changelog',
          email: 'changelog@bazaar.it',
          emailVerified: new Date(),
          isAdmin: false,
        }).onConflictDoNothing();
      } catch (error) {
        // User might already exist, that's fine
        console.log(`[${requestId}] System user check:`, error);
      }
    }
    
    // 2. Create a temporary project for video generation
    const projectId = crypto.randomUUID();
    const timestamp = new Date().toISOString().substring(11, 19).replace(/:/g, '-');
    const projectName = `Changelog: ${prAnalysis.repository.name} PR #${prAnalysis.prNumber} - ${timestamp}`;
    const projectTitle = `${prAnalysis.title} - Changelog Video ${timestamp}`;
    
    // Determine dimensions based on requested format
    const videoFormat = format || 'landscape';
    const fps = 30;
    const durationInFrames = (duration || 15) * fps;
    const width = videoFormat === 'portrait' ? 1080 : 1920;
    const height = videoFormat === 'portrait' ? 1920 : (videoFormat === 'square' ? 1080 : 1080);

    // Default props for video projects (must match InputProps schema)
    const defaultProps: InputProps = {
      meta: {
        duration: durationInFrames,
        title: projectTitle,
        backgroundColor: '#000000',
        format: videoFormat as InputProps['meta']['format'],
        width,
        height,
      },
      scenes: [],
    };
    
    await db.insert(projects).values({
      id: projectId,
      title: projectTitle, // Required field
      props: defaultProps, // Required JSONB field
      userId: projectUserId, // User who owns the project
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // 3. Generate content based on PR type
    const videoContent = await generateVideoContent(prAnalysis, style || 'automatic');
    
    // 4. Create scene with generated content
    const sceneId = crypto.randomUUID();
    const sceneDuration = durationInFrames; // Single-scene video
    
    // 5. Generate the Remotion component code
    const componentCode = await generateChangelogComponent(
      videoContent,
      prAnalysis,
      videoFormat,
      branding || 'auto'
    );
    
    let compiled = { jsCode: null as string | null, jsCompiledAt: null as Date | null };
    if (env.USE_SERVER_COMPILATION) {
      const res = await sceneCompiler.compileScene(componentCode, { projectId, sceneId });
      compiled = { jsCode: res.jsCode, jsCompiledAt: res.compiledAt };
      console.log('[CompileMetrics] changelog compiled=%s scene=%s', String(!!res.jsCode), sceneId);
    }
    await db.insert(scenes).values({
      id: sceneId,
      projectId,
      name: videoContent.title,
      order: 0,
      duration: sceneDuration,
      tsxCode: componentCode,
      jsCode: compiled.jsCode,
      jsCompiledAt: compiled.jsCompiledAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // 6. Prepare Lambda render configuration (output format is file type, not orientation)
    const renderConfig = await prepareRenderConfig({
      projectId,
      scenes: [
        {
          id: sceneId,
          projectId,
          name: videoContent.title,
          order: 0,
          duration: sceneDuration,
          tsxCode: componentCode,
          startFrame: 0,
        },
      ],
      format: 'mp4',
      quality: 'high',
      projectProps: defaultProps,
      // No audio for now
    });

    // 7. Trigger Lambda render
    const { renderId, bucketName } = await renderVideoOnLambda({
      ...renderConfig,
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/render`,
      renderWidth: renderConfig.renderWidth,
      renderHeight: renderConfig.renderHeight,
    });

    console.log(`[${requestId}] Lambda render started. renderId=${renderId} bucket=${bucketName}`);

    // 8. Poll for completion (MVP) to return a URL synchronously
    const startedAt = Date.now();
    const maxWaitMs = 8 * 60 * 1000; // 8 minutes
    let videoUrl: string | undefined;
    while (Date.now() - startedAt < maxWaitMs) {
      const progress = await getLambdaRenderProgress(renderId, bucketName);
      if (progress.done) {
        videoUrl = progress.outputFile || undefined;
        break;
      }
      // Backoff: 2s up to 10s
      const elapsed = Date.now() - startedAt;
      const delay = Math.min(10000, 2000 + Math.floor(elapsed / 30000) * 2000);
      await sleep(delay);
    }

    if (!videoUrl) {
      throw new Error('Render timed out before completion. The webhook may still complete later.');
    }

    // 9. Generate thumbnail/GIF placeholders
    const thumbnailUrl = await generateThumbnail(videoUrl);
    const gifUrl = videoFormat === 'square' ? await generateGif(videoUrl) : undefined;

    // 10. Return the result
    const response: ChangelogVideoResponse = {
      id: sceneId,
      projectId,
      videoUrl,
      thumbnailUrl,
      gifUrl,
      duration: duration || 15,
      format: videoFormat,
      createdAt: new Date().toISOString(),
      prNumber: prAnalysis.prNumber,
      repository: prAnalysis.repository.fullName,
    };

    console.log(`[${requestId}] Changelog video generated successfully`);
    return response;
    
  } catch (error) {
    console.error(`[${requestId}] Error generating changelog video:`, error);
    throw error;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate video content from PR analysis
 */
async function generateVideoContent(
  prAnalysis: PRAnalysis,
  style: string
): Promise<{
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  emoji: string;
  color: string;
}> {
  // Determine content based on PR type
  const typeConfig = {
    feature: {
      emoji: '✨',
      color: '#10B981', // Green
      prefix: 'New Feature',
    },
    fix: {
      emoji: '🐛',
      color: '#EF4444', // Red
      prefix: 'Bug Fix',
    },
    refactor: {
      emoji: '♻️',
      color: '#3B82F6', // Blue
      prefix: 'Code Improvement',
    },
    docs: {
      emoji: '📚',
      color: '#8B5CF6', // Purple
      prefix: 'Documentation',
    },
    style: {
      emoji: '🎨',
      color: '#EC4899', // Pink
      prefix: 'Style Update',
    },
    test: {
      emoji: '🧪',
      color: '#F59E0B', // Amber
      prefix: 'Test Update',
    },
    chore: {
      emoji: '🔧',
      color: '#6B7280', // Gray
      prefix: 'Maintenance',
    },
  };
  
  const config = typeConfig[prAnalysis.type] || typeConfig.feature;
  
  // Extract key highlights from the PR
  const highlights = extractHighlights(prAnalysis);
  
  // Generate concise description
  const description = prAnalysis.description
    ? prAnalysis.description.split('\n')[0].slice(0, 100)
    : `${prAnalysis.stats.additions} additions, ${prAnalysis.stats.deletions} deletions across ${prAnalysis.stats.filesChanged} files`;
  
  return {
    title: prAnalysis.title,
    subtitle: `${config.prefix} • PR #${prAnalysis.prNumber}`,
    description,
    highlights,
    emoji: config.emoji,
    color: config.color,
  };
}

/**
 * Extract key highlights from PR analysis
 */
function extractHighlights(prAnalysis: PRAnalysis): string[] {
  const highlights: string[] = [];
  
  // Add impact level
  if (prAnalysis.impact === 'major') {
    highlights.push('🎯 Major Update');
  }
  
  // Add file count
  if (prAnalysis.stats.filesChanged > 10) {
    highlights.push(`📁 ${prAnalysis.stats.filesChanged} files changed`);
  }
  
  // Add tech stack if detected
  if (prAnalysis.techStack && prAnalysis.techStack.length > 0) {
    highlights.push(`💻 ${prAnalysis.techStack.slice(0, 3).join(', ')}`);
  }
  
  // Add code stats
  if (prAnalysis.stats.additions > 100) {
    highlights.push(`➕ ${prAnalysis.stats.additions} lines added`);
  }
  
  return highlights.slice(0, 4); // Max 4 highlights
}

/**
 * Generate Remotion component code for changelog
 */
async function generateChangelogComponent(
  content: any,
  prAnalysis: PRAnalysis,
  format: string,
  branding: string
): Promise<string> {
  // For MVP, use a template-based approach
  // Later, this will use AI to generate custom components
  
  const dimensions = {
    landscape: { width: 1920, height: 1080 },
    portrait: { width: 1080, height: 1920 },
    square: { width: 1080, height: 1080 },
  };
  
  const dim = dimensions[format as keyof typeof dimensions] || dimensions.landscape;
  
  // Detect brand colors if available
  const brandColor = prAnalysis.brandAssets?.primaryColor || content.color;
  const bgColor = prAnalysis.brandAssets?.secondaryColor || '#000000';
  
  return `
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, spring, Sequence } from 'remotion';

export default function ChangelogVideo() {
  const frame = useCurrentFrame();
  
  // Animation springs
  const titleScale = spring({
    frame,
    fps: 30,
    from: 0,
    to: 1,
    durationInFrames: 20,
  });
  
  const contentOpacity = interpolate(
    frame,
    [20, 40],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const highlightStagger = (index: number) => spring({
    frame: frame - 40 - (index * 5),
    fps: 30,
    from: 0,
    to: 1,
    durationInFrames: 15,
  });
  
  return (
    <AbsoluteFill style={{ backgroundColor: '${bgColor}' }}>
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: \`radial-gradient(circle at 50% 50%, \${hexToRgba('${brandColor}', 0.1)} 0%, transparent 70%)\`,
        }}
      />
      
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: ${dim.height * 0.15},
          left: 0,
          right: 0,
          textAlign: 'center',
          transform: \`scale(\${titleScale})\`,
        }}
      >
        {/* Emoji */}
        <div style={{ fontSize: ${dim.width * 0.08}, marginBottom: 20 }}>
          ${content.emoji}
        </div>
        
        {/* Subtitle */}
        <div
          style={{
            fontSize: ${dim.width * 0.025},
            color: '${brandColor}',
            fontWeight: 600,
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          ${content.subtitle}
        </div>
        
        {/* Title */}
        <div
          style={{
            fontSize: ${dim.width * 0.045},
            color: '#ffffff',
            fontWeight: 700,
            maxWidth: '80%',
            margin: '0 auto',
            lineHeight: 1.2,
          }}
        >
          ${content.title}
        </div>
      </div>
      
      {/* Description */}
      <div
        style={{
          position: 'absolute',
          top: ${dim.height * 0.45},
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: contentOpacity,
        }}
      >
        <div
          style={{
            fontSize: ${dim.width * 0.025},
            color: '#9CA3AF',
            maxWidth: '70%',
            margin: '0 auto',
            lineHeight: 1.5,
          }}
        >
          ${content.description}
        </div>
      </div>
      
      {/* Highlights */}
      <div
        style={{
          position: 'absolute',
          top: ${dim.height * 0.6},
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: ${dim.width * 0.02},
          flexWrap: 'wrap',
          padding: '0 10%',
        }}
      >
        ${content.highlights.map((highlight: string, index: number) => `
        <div
          key={${index}}
          style={{
            backgroundColor: hexToRgba('${brandColor}', 0.2),
            border: \`2px solid \${hexToRgba('${brandColor}', 0.5)}\`,
            borderRadius: ${dim.width * 0.01},
            padding: '${dim.height * 0.015}px ${dim.width * 0.02}px',
            fontSize: ${dim.width * 0.02},
            color: '#ffffff',
            transform: \`scale(\${highlightStagger(${index})})\`,
          }}
        >
          ${highlight}
        </div>
        `).join('')}
      </div>
      
      {/* Author */}
      <div
        style={{
          position: 'absolute',
          bottom: ${dim.height * 0.1},
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: ${dim.width * 0.015},
          opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        ${prAnalysis.author.avatarUrl ? `
        <img
          src="${prAnalysis.author.avatarUrl}"
          style={{
            width: ${dim.width * 0.04},
            height: ${dim.width * 0.04},
            borderRadius: '50%',
            border: '2px solid ${brandColor}',
          }}
        />
        ` : ''}
        <div
          style={{
            fontSize: ${dim.width * 0.02},
            color: '#9CA3AF',
          }}
        >
          by @${prAnalysis.author.username}
        </div>
      </div>
      
      {/* Branding */}
      ${branding !== 'none' && prAnalysis.brandAssets?.logo ? `
      <div
        style={{
          position: 'absolute',
          top: ${dim.height * 0.05},
          right: ${dim.width * 0.05},
          opacity: 0.8,
        }}
      >
        <img
          src="${prAnalysis.brandAssets.logo}"
          style={{
            height: ${dim.height * 0.06},
            objectFit: 'contain',
          }}
        />
      </div>
      ` : ''}
    </AbsoluteFill>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return \`rgba(\${r}, \${g}, \${b}, \${alpha})\`;
}
  `.trim();
}

/**
 * Generate thumbnail from video
 */
async function generateThumbnail(videoUrl: string): Promise<string> {
  // For MVP, return a placeholder
  // In production, use ffmpeg to extract frame
  return videoUrl.replace('.mp4', '-thumbnail.jpg');
}

/**
 * Generate GIF from video
 */
async function generateGif(videoUrl: string): Promise<string> {
  // For MVP, return undefined
  // In production, use ffmpeg to convert
  return videoUrl.replace('.mp4', '.gif');
}
