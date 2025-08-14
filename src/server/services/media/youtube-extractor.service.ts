/**
 * YouTube URL Extraction Service
 * Asynchronously detects and processes YouTube URLs from chat messages
 */

export class YouTubeExtractorService {
  // Regex patterns for various YouTube URL formats
  private static readonly YOUTUBE_PATTERNS = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/gi,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/gi,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/gi,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/gi,
  ];

  /**
   * Extract YouTube URLs from a message
   * Returns array of YouTube URLs found in the text
   */
  static extractYouTubeUrls(text: string): string[] {
    const urls = new Set<string>();
    
    for (const pattern of this.YOUTUBE_PATTERNS) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        // Reconstruct full URL from match
        const fullMatch = match[0];
        urls.add(fullMatch);
      }
    }
    
    return Array.from(urls);
  }

  /**
   * Extract YouTube video IDs from a message
   * Returns array of video IDs
   */
  static extractVideoIds(text: string): string[] {
    const ids = new Set<string>();
    
    for (const pattern of this.YOUTUBE_PATTERNS) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          ids.add(match[1]);
        }
      }
    }
    
    return Array.from(ids);
  }

  /**
   * Process message for YouTube URLs asynchronously
   * This runs in parallel without blocking the main flow
   */
  static async processMessageForYouTube(
    message: string,
    projectId: string,
    messageId: string
  ): Promise<{ urls: string[], videoIds: string[] } | null> {
    try {
      // Extract URLs and IDs
      const urls = this.extractYouTubeUrls(message);
      const videoIds = this.extractVideoIds(message);
      
      if (urls.length === 0) {
        return null;
      }

      console.log(`[YouTubeExtractor] Found ${urls.length} YouTube URLs in message ${messageId}`);
      
      // Return the extracted data
      // The actual storage/processing can happen elsewhere
      return {
        urls,
        videoIds
      };
    } catch (error) {
      console.error('[YouTubeExtractor] Error processing message:', error);
      return null;
    }
  }

  /**
   * Build YouTube context for AI
   * Formats YouTube URLs as context without auto-prompting
   */
  static buildYouTubeContext(urls: string[]): string {
    if (urls.length === 0) return '';
    
    return `[YouTube References: ${urls.join(', ')}]`;
  }

  /**
   * Get YouTube thumbnail URL
   */
  static getThumbnailUrl(videoId: string, quality: 'max' | 'hq' | 'mq' | 'sd' = 'hq'): string {
    const qualityMap = {
      max: 'maxresdefault',
      hq: 'hqdefault',
      mq: 'mqdefault',
      sd: 'sddefault'
    };
    
    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
  }
}