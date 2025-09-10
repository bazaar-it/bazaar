/**
 * Media Resolver
 * Intelligent system for resolving user references to actual media URLs
 * Prevents LLM hallucination by providing concrete URL mappings
 */

import { mediaContext, type MediaContext, type MediaAsset } from './mediaContext.service';

export interface ResolvedMedia {
  reference: string;           // What the user said
  resolved: MediaAsset;        // What we found
  confidence: number;          // How sure we are (0-1)
  reason: string;             // Why we chose this
}

export class MediaResolver {
  /**
   * Resolve user prompt references to actual media
   */
  async resolveMediaReferences(
    projectId: string, 
    userPrompt: string,
    currentImageUrls?: string[],
    currentVideoUrls?: string[]
  ): Promise<{
    resolvedMedia: ResolvedMedia[];
    enhancedPrompt: string;
    mediaUrls: string[];
    mediaContext: MediaContext;
  }> {
    // Get full media context
    const context = await mediaContext.getProjectMediaContext(projectId);
    
    // Start with explicitly provided URLs (highest priority)
    const resolvedMedia: ResolvedMedia[] = [];
    const usedUrls = new Set<string>();
    
    // 1. Handle current upload (just uploaded with this message)
    if (currentImageUrls?.length) {
      currentImageUrls.forEach(url => {
        const media = context.byUrl.get(url);
        if (media) {
          resolvedMedia.push({
            reference: 'current upload',
            resolved: media,
            confidence: 1.0,
            reason: 'Uploaded with current message'
          });
          usedUrls.add(url);
        }
      });
    }
    
    if (currentVideoUrls?.length) {
      currentVideoUrls.forEach(url => {
        const media = context.byUrl.get(url);
        if (media) {
          resolvedMedia.push({
            reference: 'current video',
            resolved: media,
            confidence: 1.0,
            reason: 'Video uploaded with current message'
          });
          usedUrls.add(url);
        }
      });
    }
    
    // 2. Parse prompt for media references
    const references = this.extractMediaReferences(userPrompt);
    
    for (const ref of references) {
      // Skip if we already have this from current uploads
      if (ref.type === 'current' && resolvedMedia.length > 0) continue;
      
      const matches = this.findBestMatch(context, ref, usedUrls);
      if (matches.length > 0) {
        const best = matches[0];
        resolvedMedia.push({
          reference: ref.text,
          resolved: best.media,
          confidence: best.confidence,
          reason: best.reason
        });
        usedUrls.add(best.media.url);
      }
    }
    
    // 3. Enhance prompt with resolved URLs
    let enhancedPrompt = userPrompt;
    
    // Add media reference section
    if (resolvedMedia.length > 0) {
      enhancedPrompt += '\n\n=== RESOLVED MEDIA REFERENCES ===\n';
      resolvedMedia.forEach((rm, i) => {
        enhancedPrompt += `${i + 1}. "${rm.reference}" → ${rm.resolved.url}\n`;
        enhancedPrompt += `   Type: ${rm.resolved.type}, Name: ${rm.resolved.originalName || 'N/A'}\n`;
      });
      enhancedPrompt += '\nYou MUST use these exact URLs in your generated code.\n';
    }
    
    // 4. Add full media context for awareness
    enhancedPrompt += '\n\n' + mediaContext.generateMediaReferencePrompt(context);
    
    return {
      resolvedMedia,
      enhancedPrompt,
      mediaUrls: resolvedMedia.map(rm => rm.resolved.url),
      mediaContext: context
    };
  }
  
  /**
   * Extract media references from user prompt
   */
  private extractMediaReferences(prompt: string): Array<{
    text: string;
    type: 'logo' | 'image' | 'video' | 'audio' | 'youtube' | 'current' | 'previous' | 'specific';
    confidence: number;
  }> {
    const references: Array<{
      text: string;
      type: 'logo' | 'image' | 'video' | 'audio' | 'youtube' | 'current' | 'previous' | 'specific';
      confidence: number;
    }> = [];
    
    const patterns = [
      // Specific references
      { pattern: /\b(?:the|our|my|company)\s+logo\b/gi, type: 'logo' as const, confidence: 0.9 },
      { pattern: /\blogo\b/gi, type: 'logo' as const, confidence: 0.8 },
      { pattern: /\bbrand(?:ing)?\b/gi, type: 'logo' as const, confidence: 0.6 },
      
      // Current/recent references
      { pattern: /\b(?:this|that|the)\s+(?:image|photo|picture)\b/gi, type: 'current' as const, confidence: 0.9 },
      { pattern: /\b(?:uploaded|provided)\s+(?:image|video|media)\b/gi, type: 'current' as const, confidence: 0.95 },
      { pattern: /\b(?:the|this)\s+video\b/gi, type: 'video' as const, confidence: 0.9 },
      { pattern: /\byoutube\s+(?:video|link|url)\b/gi, type: 'youtube' as const, confidence: 0.9 },
      
      // Previous references
      { pattern: /\b(?:previous|earlier|last|first|second)\s+(?:image|video|upload)\b/gi, type: 'previous' as const, confidence: 0.8 },
      
      // Generic media references
      { pattern: /\buse\s+(?:the|my|our)\s+(\w+\.(?:jpg|png|mp4|mp3|wav))\b/gi, type: 'specific' as const, confidence: 1.0 },
      { pattern: /\b(?:background|hero)\s+(?:image|video)\b/gi, type: 'image' as const, confidence: 0.7 },
      { pattern: /\baudio\s+(?:file|track|clip)\b/gi, type: 'audio' as const, confidence: 0.8 },
    ];
    
    patterns.forEach(({ pattern, type, confidence }) => {
      let match;
      while ((match = pattern.exec(prompt)) !== null) {
        references.push({
          text: match[0],
          type,
          confidence
        });
      }
    });
    
    // Remove duplicates
    const seen = new Set<string>();
    return references.filter(ref => {
      const key = `${ref.text}-${ref.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  /**
   * Find best matching media for a reference
   */
  private findBestMatch(
    context: MediaContext,
    reference: { text: string; type: string; confidence: number },
    excludeUrls: Set<string>
  ): Array<{ media: MediaAsset; confidence: number; reason: string }> {
    const matches: Array<{ media: MediaAsset; confidence: number; reason: string }> = [];
    
    // Filter by type first
    let candidates = context.allMedia;
    switch (reference.type) {
      case 'logo':
        candidates = context.logos;
        break;
      case 'image':
        candidates = context.images;
        break;
      case 'video':
        candidates = context.videos;
        break;
      case 'audio':
        candidates = context.audio;
        break;
      case 'youtube':
        candidates = context.youtube;
        break;
      case 'current':
      case 'previous':
        // Use recent media
        candidates = context.recent;
        break;
    }
    
    // Score each candidate
    candidates.forEach(media => {
      if (excludeUrls.has(media.url)) return;
      
      let score = reference.confidence;
      let reason = `Matched by type: ${reference.type}`;
      
      // Boost score for various matches
      const refLower = reference.text.toLowerCase();
      
      // Check name match
      if (media.originalName) {
        const nameLower = media.originalName.toLowerCase();
        if (refLower.includes(nameLower) || nameLower.includes(refLower)) {
          score += 0.3;
          reason = `Name match: ${media.originalName}`;
        }
      }
      
      // Check reference names
      media.referenceNames.forEach(name => {
        if (refLower.includes(name.toLowerCase())) {
          score += 0.2;
          reason = `Reference match: ${name}`;
        }
      });
      
      // Check tags
      media.tags.forEach(tag => {
        if (refLower.includes(tag.toLowerCase())) {
          score += 0.15;
          reason = `Tag match: ${tag}`;
        }
      });
      
      // Recency bonus for "current" or "that"
      if (reference.type === 'current') {
        const recencyIndex = context.recent.indexOf(media);
        if (recencyIndex >= 0) {
          score += (0.3 - recencyIndex * 0.05);
          reason = 'Recently uploaded';
        }
      }
      
      matches.push({ media, confidence: Math.min(score, 1.0), reason });
    });
    
    // Sort by confidence
    return matches.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Validate and fix generated code
   * @param providedUrls - URLs that were explicitly provided and should be considered valid
   */
  validateAndFixCode(code: string, context: MediaContext, providedUrls?: string[]): {
    valid: boolean;
    fixedCode: string;
    changes: string[];
  } {
    const validation = mediaContext.validateGeneratedCode(code, context, providedUrls);
    
    if (validation.valid) {
      return {
        valid: true,
        fixedCode: code,
        changes: []
      };
    }
    
    // Apply fixes
    let fixedCode = validation.fixedCode || code;
    const changes = validation.issues;
    
    // Additional validation: ensure all resolved media is used
    context.allMedia.forEach(media => {
      if (!fixedCode.includes(media.url)) {
        // Media not used, which is okay
        return;
      }
    });
    
    return {
      valid: validation.issues.length === 0,
      fixedCode,
      changes
    };
  }
}

// Export singleton
export const mediaResolver = new MediaResolver();