/**
 * Asset Mention System
 * Handles @mentions for uploaded assets in chat
 */

import { api } from "~/trpc/react";

export interface AssetMention {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'logo';
  originalName: string;
}

/**
 * Parse @mentions from a message
 * @param message The chat message
 * @returns Array of mention tokens found
 */
export function parseAssetMentions(message: string): string[] {
  // Match @word patterns (alphanumeric, underscore, dash)
  const mentionPattern = /@([a-zA-Z0-9_-]+)/g;
  const matches = message.match(mentionPattern) || [];
  return matches.map(m => m.substring(1)); // Remove @ prefix
}

/**
 * Replace @mentions with actual asset URLs in the message
 * @param message The original message
 * @param assets Available assets with custom names and types
 * @returns Message with @mentions replaced by URLs, categorized by type
 */
export function resolveAssetMentions(
  message: string, 
  assets: Array<{ customName?: string | null; originalName: string; url: string; type?: string }>
): { 
  resolvedMessage: string; 
  attachedUrls: string[];  // Legacy - all URLs
  imageUrls: string[];     // Only image URLs
  audioUrls: string[];     // Only audio URLs
  videoUrls: string[];     // Only video URLs
} {
  let resolvedMessage = message;
  const attachedUrls: string[] = [];
  const imageUrls: string[] = [];
  const audioUrls: string[] = [];
  const videoUrls: string[] = [];
  
  // Find all @mentions
  const mentions = parseAssetMentions(message);
  
  mentions.forEach(mention => {
    // Find matching asset (case-insensitive)
    const asset = assets.find(a => 
      a.customName?.toLowerCase() === mention.toLowerCase() ||
      a.originalName.toLowerCase().includes(mention.toLowerCase())
    );
    
    if (asset) {
      // Replace @mention with a reference marker for the LLM
      resolvedMessage = resolvedMessage.replace(
        new RegExp(`@${mention}\\b`, 'gi'),
        `[Asset: ${asset.customName || asset.originalName}]`
      );
      
      // Add URL to appropriate category based on type
      if (!attachedUrls.includes(asset.url)) {
        attachedUrls.push(asset.url);
        
        // Categorize by type
        const fileExt = asset.url.split('.').pop()?.toLowerCase();
        const assetType = asset.type?.toLowerCase();
        
        if (assetType === 'audio' || ['mp3', 'wav', 'ogg', 'm4a'].includes(fileExt || '')) {
          audioUrls.push(asset.url);
        } else if (assetType === 'video' || ['mp4', 'webm', 'mov', 'avi'].includes(fileExt || '')) {
          videoUrls.push(asset.url);
        } else if (assetType === 'image' || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt || '')) {
          imageUrls.push(asset.url);
        } else {
          // Default to image for unknown types
          imageUrls.push(asset.url);
        }
      }
    }
  });
  
  return { resolvedMessage, attachedUrls, imageUrls, audioUrls, videoUrls };
}

/**
 * Get suggestions for @mention autocomplete
 * @param query Current text after @
 * @param assets Available assets
 * @returns Filtered and sorted suggestions
 */
export function getAssetSuggestions(
  query: string,
  assets: Array<{ 
    id: string;
    customName?: string | null; 
    originalName: string; 
    url: string;
    type: string;
  }>
): AssetMention[] {
  if (!query) {
    // Show all assets with custom names first
    return assets
      .filter(a => a.customName)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        name: a.customName || a.originalName,
        url: a.url,
        type: a.type as AssetMention['type'],
        originalName: a.originalName
      }));
  }
  
  const lowerQuery = query.toLowerCase();
  
  // Filter and score assets
  const scored = assets
    .map(asset => {
      const name = asset.customName || asset.originalName;
      const lowerName = name.toLowerCase();
      
      let score = 0;
      
      // Exact match
      if (lowerName === lowerQuery) score += 100;
      
      // Starts with query
      else if (lowerName.startsWith(lowerQuery)) score += 50;
      
      // Custom name contains query
      else if (asset.customName?.toLowerCase().includes(lowerQuery)) score += 30;
      
      // Original name contains query
      else if (asset.originalName.toLowerCase().includes(lowerQuery)) score += 10;
      
      return { asset, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  return scored.map(({ asset }) => ({
    id: asset.id,
    name: asset.customName || asset.originalName,
    url: asset.url,
    type: asset.type as AssetMention['type'],
    originalName: asset.originalName
  }));
}

/**
 * Check if cursor is in an @mention context
 * @param text The full text
 * @param cursorPosition Current cursor position
 * @returns The current mention query or null
 */
export function getMentionContext(
  text: string, 
  cursorPosition: number
): { query: string; startIndex: number } | null {
  // Look backwards from cursor to find @
  let startIndex = cursorPosition - 1;
  
  while (startIndex >= 0) {
    const char = text[startIndex];
    
    if (char === '@') {
      // Found @ - extract query
      const query = text.substring(startIndex + 1, cursorPosition);
      
      // Check if it's a valid mention context (not part of email, etc)
      const prevChar = startIndex > 0 ? text[startIndex - 1] : ' ';
      if (prevChar === ' ' || prevChar === '\n' || startIndex === 0) {
        return { query, startIndex };
      }
      return null;
    }
    
    // Stop if we hit whitespace or other breaking character
    if (char === ' ' || char === '\n') {
      break;
    }
    
    startIndex--;
  }
  
  return null;
}