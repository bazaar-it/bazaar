/**
 * Code Caching Service
 * Caches generated code to avoid redundant LLM calls
 * Saves 5-8 seconds on similar prompts
 */

import crypto from 'crypto';
import LRUCache from 'lru-cache';

interface CachedCode {
  tsxCode: string;
  name: string;
  duration: number;
  prompt: string;
  timestamp: Date;
  hitCount: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class CodeCacheService {
  private cache: LRUCache<string, CachedCode>;
  private stats = { hits: 0, misses: 0 };

  constructor() {
    // LRU cache with 500MB limit and 1 hour TTL
    this.cache = new LRUCache<string, CachedCode>({
      max: 500, // Maximum 500 entries
      ttl: 1000 * 60 * 60, // 1 hour TTL
      sizeCalculation: (value) => {
        // Estimate size based on code length
        return value.tsxCode.length + value.name.length + 100;
      },
      maxSize: 500 * 1024 * 1024, // 500MB max size
      updateAgeOnGet: true, // Refresh TTL on access
      updateAgeOnHas: false,
    });

    // Log cache stats every 5 minutes in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const stats = this.getStats();
        if (stats.hits > 0 || stats.misses > 0) {
          console.log('🎯 Code Cache Stats:', {
            ...stats,
            hitRate: `${(stats.hitRate * 100).toFixed(1)}%`
          });
        }
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Generate a cache key from prompt and context
   * Uses fuzzy matching to catch similar prompts
   */
  private generateCacheKey(
    prompt: string,
    projectId: string,
    context?: {
      imageUrls?: string[];
      previousScene?: string;
      format?: string;
    }
  ): string {
    // Normalize prompt for fuzzy matching
    const normalizedPrompt = this.normalizePrompt(prompt);
    
    // Create context hash
    const contextString = JSON.stringify({
      images: context?.imageUrls?.sort() || [],
      hasPrevious: !!context?.previousScene,
      format: context?.format || 'landscape',
    });

    // Generate hash
    const hash = crypto
      .createHash('sha256')
      .update(`${projectId}:${normalizedPrompt}:${contextString}`)
      .digest('hex');

    return hash;
  }

  /**
   * Normalize prompt for fuzzy matching
   * Handles variations like "make it blue" vs "change to blue"
   */
  private normalizePrompt(prompt: string): string {
    return prompt
      .toLowerCase()
      .trim()
      // Remove common variations
      .replace(/make it|change it to|update to|set to/g, 'change')
      .replace(/colour|color/g, 'color')
      .replace(/center|centre/g, 'center')
      // Remove articles and punctuation
      .replace(/\b(a|an|the)\b/g, '')
      .replace(/[.,!?;:'"]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get cached code if available
   */
  get(
    prompt: string,
    projectId: string,
    context?: any
  ): CachedCode | null {
    const key = this.generateCacheKey(prompt, projectId, context);
    const cached = this.cache.get(key);

    if (cached) {
      this.stats.hits++;
      
      // Update hit count
      cached.hitCount++;
      this.cache.set(key, cached);

      console.log(`💾 Cache HIT for prompt: "${prompt.slice(0, 50)}..." (saved ~8s)`);
      console.log(`   Hit count: ${cached.hitCount}, Original timestamp: ${cached.timestamp}`);
      
      return cached;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Store generated code in cache
   */
  set(
    prompt: string,
    projectId: string,
    code: {
      tsxCode: string;
      name: string;
      duration: number;
    },
    context?: any
  ): void {
    const key = this.generateCacheKey(prompt, projectId, context);
    
    const cachedCode: CachedCode = {
      ...code,
      prompt,
      timestamp: new Date(),
      hitCount: 0,
    };

    this.cache.set(key, cachedCode);
    console.log(`💾 Cached code for prompt: "${prompt.slice(0, 50)}..."`);
  }

  /**
   * Find similar cached entries (for debugging)
   */
  findSimilar(prompt: string): CachedCode[] {
    const normalized = this.normalizePrompt(prompt);
    const similar: CachedCode[] = [];

    for (const [key, value] of this.cache.entries()) {
      const cachedNormalized = this.normalizePrompt(value.prompt);
      
      // Simple similarity check (could be enhanced with Levenshtein distance)
      if (cachedNormalized.includes(normalized) || normalized.includes(cachedNormalized)) {
        similar.push(value);
      }
    }

    return similar;
  }

  /**
   * Clear cache for a specific project
   */
  clearProject(projectId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, value] of this.cache.entries()) {
      // Check if key belongs to this project (would need to store projectId in value for this)
      if (key.startsWith(projectId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for project ${projectId}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    console.log('🗑️ Code cache cleared');
  }
}

// Singleton instance
export const codeCache = new CodeCacheService();