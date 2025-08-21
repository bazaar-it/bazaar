/**
 * In-memory YouTube context store
 * Stores YouTube URLs temporarily for AI context without persistent storage
 */

interface YouTubeContext {
  urls: string[];
  videoIds: string[];
  timestamp: Date;
  messageId: string;
}

class YouTubeContextStore {
  // Store contexts by projectId
  private contexts = new Map<string, YouTubeContext[]>();
  
  // Max contexts per project (to prevent memory issues)
  private readonly MAX_CONTEXTS_PER_PROJECT = 10;
  
  // Context expiry time (1 hour)
  private readonly CONTEXT_EXPIRY_MS = 60 * 60 * 1000;

  /**
   * Add YouTube context for a project
   */
  addContext(projectId: string, context: Omit<YouTubeContext, 'timestamp'>): void {
    const projectContexts = this.contexts.get(projectId) || [];
    
    // Add new context with timestamp
    projectContexts.push({
      ...context,
      timestamp: new Date()
    });
    
    // Keep only the most recent contexts
    if (projectContexts.length > this.MAX_CONTEXTS_PER_PROJECT) {
      projectContexts.shift(); // Remove oldest
    }
    
    this.contexts.set(projectId, projectContexts);
    
    console.log(`[YouTubeContextStore] Added context for project ${projectId}:`, context.urls);
  }

  /**
   * Get YouTube contexts for a project
   * Returns only non-expired contexts
   */
  getContexts(projectId: string): YouTubeContext[] {
    const projectContexts = this.contexts.get(projectId) || [];
    const now = Date.now();
    
    // Filter out expired contexts
    const validContexts = projectContexts.filter(ctx => {
      const age = now - ctx.timestamp.getTime();
      return age < this.CONTEXT_EXPIRY_MS;
    });
    
    // Update stored contexts if any were filtered out
    if (validContexts.length !== projectContexts.length) {
      this.contexts.set(projectId, validContexts);
    }
    
    return validContexts;
  }

  /**
   * Get all YouTube URLs for a project as a formatted string for AI context
   */
  getFormattedContext(projectId: string): string {
    const contexts = this.getContexts(projectId);
    
    if (contexts.length === 0) {
      return '';
    }
    
    // Get unique URLs
    const allUrls = new Set<string>();
    contexts.forEach(ctx => {
      ctx.urls.forEach(url => allUrls.add(url));
    });
    
    if (allUrls.size === 0) {
      return '';
    }
    
    return `\n[YouTube References Available: ${Array.from(allUrls).join(', ')}]\n`;
  }

  /**
   * Clear contexts for a project
   */
  clearProject(projectId: string): void {
    this.contexts.delete(projectId);
  }

  /**
   * Clear all contexts (for cleanup)
   */
  clearAll(): void {
    this.contexts.clear();
  }
}

// Export singleton instance
export const youTubeContextStore = new YouTubeContextStore();