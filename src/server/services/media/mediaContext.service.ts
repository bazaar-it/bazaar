/**
 * Media Context Service
 * Centralized system for tracking ALL media assets (images, videos, audio, logos, YouTube links)
 * Ensures LLM always uses real URLs and never hallucinates
 */

import { db } from "~/server/db";
import { projectMemory } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { assetContext } from "../context/assetContextService";
import type { Asset } from "~/lib/types/asset-context";

export interface MediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'logo' | 'youtube' | 'external';
  originalName?: string;
  thumbnailUrl?: string;
  duration?: number; // For video/audio in seconds
  dimensions?: { width: number; height: number };
  fileSize?: number;
  mimeType?: string;
  uploadedAt: Date;
  usageCount: number;
  tags: string[];
  metadata?: {
    youtubeTtle?: string;
    youtubeChannel?: string;
    youtubeDuration?: string;
    extractedColors?: string[];
    dominantColor?: string;
    hasTransparency?: boolean;
  };
  // Reference hints for LLM
  referenceNames: string[]; // e.g., ["logo", "company logo", "brand mark"]
  description?: string; // AI-generated description of the content
}

export interface MediaContext {
  projectId: string;
  allMedia: MediaAsset[];
  images: MediaAsset[];
  videos: MediaAsset[];
  audio: MediaAsset[];
  logos: MediaAsset[];
  youtube: MediaAsset[];
  recent: MediaAsset[];
  // Quick lookup maps
  byUrl: Map<string, MediaAsset>;
  byName: Map<string, MediaAsset>;
  byTag: Map<string, MediaAsset[]>;
}

export class MediaContextService {
  private static MEMORY_TYPE = 'media_asset';
  private static YOUTUBE_MEMORY_TYPE = 'youtube_link';
  
  /**
   * Get complete media context for a project
   */
  async getProjectMediaContext(projectId: string): Promise<MediaContext> {
    // Get uploaded assets from existing service
    const assetCtx = await assetContext.getProjectAssets(projectId);
    
    // Get YouTube links from project memory
    const youtubeMemories = await db.query.projectMemory.findMany({
      where: and(
        eq(projectMemory.projectId, projectId),
        eq(projectMemory.memoryType, MediaContextService.YOUTUBE_MEMORY_TYPE)
      ),
      orderBy: [desc(projectMemory.createdAt)]
    });
    
    // Convert assets to MediaAssets
    const mediaAssets: MediaAsset[] = assetCtx.assets.map(asset => this.assetToMediaAsset(asset));
    
    // Add YouTube links as media assets
    const youtubeAssets = youtubeMemories.map(m => {
      try {
        const data = JSON.parse(m.memoryValue);
        return this.youtubeToMediaAsset(data);
      } catch {
        return null;
      }
    }).filter((a): a is MediaAsset => a !== null);
    
    // Combine all media
    const allMedia = [...mediaAssets, ...youtubeAssets];
    
    // Create categorized lists
    const images = allMedia.filter(m => m.type === 'image');
    const videos = allMedia.filter(m => m.type === 'video');
    const audio = allMedia.filter(m => m.type === 'audio');
    const logos = allMedia.filter(m => m.type === 'logo');
    const youtube = allMedia.filter(m => m.type === 'youtube');
    const recent = allMedia.slice(0, 10);
    
    // Create lookup maps
    const byUrl = new Map(allMedia.map(m => [m.url, m]));
    const byName = new Map(allMedia.map(m => [m.originalName || '', m]).filter(([name]) => name));
    
    // Create tag map
    const byTag = new Map<string, MediaAsset[]>();
    allMedia.forEach(media => {
      media.tags.forEach(tag => {
        const existing = byTag.get(tag) || [];
        existing.push(media);
        byTag.set(tag, existing);
      });
    });
    
    return {
      projectId,
      allMedia,
      images,
      videos,
      audio,
      logos,
      youtube,
      recent,
      byUrl,
      byName,
      byTag
    };
  }
  
  /**
   * Convert Asset to MediaAsset
   */
  private assetToMediaAsset(asset: Asset): MediaAsset {
    const referenceNames: string[] = [];
    
    // PRIORITY 1: Custom name (user-defined)
    if (asset.customName) {
      referenceNames.push(asset.customName);
      referenceNames.push(asset.customName.toLowerCase());
      referenceNames.push(asset.customName.replace(/[-_]/g, ' '));
    }
    
    // PRIORITY 2: Existing reference names
    if (asset.referenceNames) {
      referenceNames.push(...asset.referenceNames);
    }
    
    // PRIORITY 3: Original filename variations
    if (asset.originalName) {
      const baseName = asset.originalName.replace(/\.[^/.]+$/, ''); // Remove extension
      referenceNames.push(baseName);
      referenceNames.push(baseName.toLowerCase());
      referenceNames.push(baseName.replace(/[-_]/g, ' '));
    }
    
    // Add type-specific references
    if (asset.type === 'logo') {
      referenceNames.push('logo', 'brand', 'company logo', 'our logo');
    }
    if (asset.type === 'image') {
      referenceNames.push('image', 'picture', 'photo', 'uploaded image');
    }
    if (asset.type === 'video') {
      referenceNames.push('video', 'clip', 'footage', 'uploaded video');
    }
    
    return {
      id: asset.id,
      url: asset.url,
      type: asset.type as MediaAsset['type'],
      originalName: asset.originalName,
      fileSize: asset.fileSize,
      uploadedAt: asset.uploadedAt || new Date(),
      usageCount: asset.usageCount || 0,
      tags: asset.tags || [],
      referenceNames: [...new Set(referenceNames)], // Remove duplicates
      dimensions: asset.dimensions,
      metadata: {
        // Preserve custom name in metadata
        customName: asset.customName,
      }
    };
  }
  
  /**
   * Convert YouTube data to MediaAsset
   */
  private youtubeToMediaAsset(data: any): MediaAsset {
    return {
      id: data.id || `youtube_${Date.now()}`,
      url: data.url,
      type: 'youtube',
      originalName: data.title,
      thumbnailUrl: data.thumbnail,
      duration: data.duration,
      uploadedAt: data.uploadedAt || new Date(),
      usageCount: data.usageCount || 0,
      tags: ['youtube', 'video', ...(data.tags || [])],
      referenceNames: [
        'youtube video',
        'youtube',
        data.title?.toLowerCase(),
        `video from ${data.channel}`,
      ].filter(Boolean),
      metadata: {
        youtubeTitle: data.title,
        youtubeChannel: data.channel,
        youtubeDuration: data.durationString,
      }
    };
  }
  
  /**
   * Save a YouTube link as media
   */
  async saveYouTubeLink(projectId: string, youtubeData: {
    url: string;
    title?: string;
    channel?: string;
    thumbnail?: string;
    duration?: number;
  }): Promise<void> {
    await db.insert(projectMemory).values({
      projectId,
      memoryType: MediaContextService.YOUTUBE_MEMORY_TYPE,
      memoryKey: `youtube_${Date.now()}`,
      memoryValue: JSON.stringify(youtubeData),
      confidence: 1.0,
      sourcePrompt: `User shared YouTube: ${youtubeData.title || youtubeData.url}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  /**
   * Find media by user reference (fuzzy matching)
   */
  findMediaByReference(context: MediaContext, reference: string): MediaAsset[] {
    const lowRef = reference.toLowerCase();
    const matches: MediaAsset[] = [];
    
    // Check each media asset
    context.allMedia.forEach(media => {
      let score = 0;
      
      // Check URL contains
      if (media.url.toLowerCase().includes(lowRef)) score += 10;
      
      // Check original name
      if (media.originalName?.toLowerCase().includes(lowRef)) score += 8;
      
      // Check reference names
      media.referenceNames.forEach(name => {
        if (name.toLowerCase().includes(lowRef)) score += 5;
        if (lowRef.includes(name.toLowerCase())) score += 3;
      });
      
      // Check tags
      media.tags.forEach(tag => {
        if (tag.toLowerCase() === lowRef) score += 7;
        if (tag.toLowerCase().includes(lowRef)) score += 4;
      });
      
      // Check description
      if (media.description?.toLowerCase().includes(lowRef)) score += 2;
      
      if (score > 0) {
        matches.push({ ...media, score } as any);
      }
    });
    
    // Sort by score and return
    return matches.sort((a: any, b: any) => b.score - a.score);
  }
  
  /**
   * Generate LLM-safe media reference list
   * This formats media in a way that prevents hallucination
   */
  generateMediaReferencePrompt(context: MediaContext): string {
    if (context.allMedia.length === 0) {
      return 'No media assets uploaded for this project.';
    }
    
    let prompt = `AVAILABLE MEDIA ASSETS (${context.allMedia.length} total):
=====================================

You MUST use these exact URLs when referencing media. Do NOT generate fake URLs.

`;
    
    // Group by type for clarity
    if (context.logos.length > 0) {
      prompt += `LOGOS (${context.logos.length}):\n`;
      context.logos.forEach((logo, i) => {
        const customName = logo.metadata?.customName as string | undefined;
        prompt += `  ${i + 1}. URL: ${logo.url}\n`;
        if (customName) {
          prompt += `     Reference as: "${customName}"\n`;
        }
        prompt += `     Names: ${logo.referenceNames.slice(0, 3).join(', ')}\n`;
        if (logo.originalName) prompt += `     File: ${logo.originalName}\n`;
        prompt += '\n';
      });
    }
    
    if (context.images.length > 0) {
      prompt += `IMAGES (${context.images.length}):\n`;
      context.images.forEach((img, i) => {
        const customName = img.metadata?.customName as string | undefined;
        prompt += `  ${i + 1}. URL: ${img.url}\n`;
        if (customName) {
          prompt += `     Reference as: "${customName}"\n`;
        }
        prompt += `     Names: ${img.referenceNames.slice(0, 3).join(', ')}\n`;
        if (img.originalName) prompt += `     File: ${img.originalName}\n`;
        if (img.dimensions) prompt += `     Size: ${img.dimensions.width}x${img.dimensions.height}\n`;
        prompt += '\n';
      });
    }
    
    if (context.videos.length > 0) {
      prompt += `VIDEOS (${context.videos.length}):\n`;
      context.videos.forEach((vid, i) => {
        prompt += `  ${i + 1}. URL: ${vid.url}\n`;
        prompt += `     Names: ${vid.referenceNames.slice(0, 3).join(', ')}\n`;
        if (vid.originalName) prompt += `     File: ${vid.originalName}\n`;
        if (vid.duration) prompt += `     Duration: ${vid.duration}s\n`;
        prompt += '\n';
      });
    }
    
    if (context.youtube.length > 0) {
      prompt += `YOUTUBE VIDEOS (${context.youtube.length}):\n`;
      context.youtube.forEach((yt, i) => {
        prompt += `  ${i + 1}. URL: ${yt.url}\n`;
        if (yt.metadata?.youtubeTitle) prompt += `     Title: ${yt.metadata.youtubeTitle}\n`;
        if (yt.metadata?.youtubeChannel) prompt += `     Channel: ${yt.metadata.youtubeChannel}\n`;
        if (yt.thumbnailUrl) prompt += `     Thumbnail: ${yt.thumbnailUrl}\n`;
        prompt += '\n';
      });
    }
    
    if (context.audio.length > 0) {
      prompt += `AUDIO FILES (${context.audio.length}):\n`;
      context.audio.forEach((aud, i) => {
        prompt += `  ${i + 1}. URL: ${aud.url}\n`;
        prompt += `     Names: ${aud.referenceNames.slice(0, 3).join(', ')}\n`;
        if (aud.originalName) prompt += `     File: ${aud.originalName}\n`;
        if (aud.duration) prompt += `     Duration: ${aud.duration}s\n`;
        prompt += '\n';
      });
    }
    
    prompt += `
CRITICAL RULES:
1. When user mentions any media (image, video, logo, etc.), find it in the list above
2. Use the EXACT URL provided - copy it character by character
3. NEVER generate placeholder URLs like "/api/placeholder/..." or "https://example.com/..."
4. If user says "the logo" → use the logo URL from above
5. If user says "that image" → use the most recent image URL
6. For Remotion: Use <Img src="${context.allMedia[0]?.url || 'EXACT_URL_HERE'}" /> format

VALIDATION: After generating code, verify ALL media URLs match the list above exactly.`;
    
    return prompt;
  }
  
  /**
   * Validate generated code contains only real URLs
   */
  validateGeneratedCode(code: string, context: MediaContext): {
    valid: boolean;
    issues: string[];
    fixedCode?: string;
  } {
    const issues: string[] = [];
    let fixedCode = code;
    
    // Find all URLs in the code
    const urlPattern = /(?:src|href|url)=["']([^"']+)["']/g;
    const foundUrls: string[] = [];
    let match;
    
    while ((match = urlPattern.exec(code)) !== null) {
      foundUrls.push(match[1]);
    }
    
    // Check each found URL
    foundUrls.forEach(url => {
      // Skip data URLs and relative paths that aren't media
      if (url.startsWith('data:') || url.startsWith('#')) return;
      
      // Check if it's a real URL from our context
      if (!context.byUrl.has(url)) {
        // Try to find what the user might have meant
        const possibleMatches = this.findMediaByReference(context, url);
        
        if (possibleMatches.length > 0) {
          // Replace with the best match
          const replacement = possibleMatches[0].url;
          fixedCode = fixedCode.replace(url, replacement);
          issues.push(`Replaced hallucinated URL "${url}" with real URL "${replacement}"`);
        } else {
          issues.push(`Found unknown/hallucinated URL: ${url}`);
        }
      }
    });
    
    return {
      valid: issues.length === 0,
      issues,
      fixedCode: issues.length > 0 ? fixedCode : undefined
    };
  }
}

// Export singleton
export const mediaContext = new MediaContextService();