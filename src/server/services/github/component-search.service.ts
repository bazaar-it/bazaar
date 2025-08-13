/**
 * GitHub Component Search Service
 * Searches for React/Vue/Angular components in connected repositories
 */

import { Octokit } from '@octokit/rest';
import { db } from '~/server/db';
import { githubConnections, componentCache } from '~/server/db/schema/github-connections';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { GitHubError, GitHubErrorCode, ErrorRecovery } from '~/lib/types/github-errors';

export interface ComponentSearchResult {
  name: string;
  repository: string;
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: string;
  score: number;
}

export interface SearchOptions {
  repositories?: string[];
  maxResults?: number;
  useCache?: boolean;
}

export class GitHubComponentSearchService {
  private octokit: Octokit;
  private userId: string;
  
  constructor(accessToken: string, userId: string) {
    this.octokit = new Octokit({ auth: accessToken });
    this.userId = userId;
  }
  
  /**
   * Search for a component by name across selected repositories
   */
  async searchComponent(
    componentName: string,
    options: SearchOptions = {}
  ): Promise<ComponentSearchResult[]> {
    const { repositories = [], maxResults = 10, useCache = true } = options;
    
    // If no repositories provided, user hasn't selected any
    if (repositories.length === 0) {
      console.log(`[GitHub] Cannot search for "${componentName}" - no repositories selected`);
      return [];
    }
    
    console.log(`[GitHub] Searching for "${componentName}" in ${repositories.length} repositories`);
    
    // Check cache first
    if (useCache) {
      const cached = await this.getCachedComponent(componentName, repositories[0]);
      if (cached) {
        return [cached];
      }
    }
    
    const results: ComponentSearchResult[] = [];
    
    // Build search queries
    const searchQueries = this.buildSearchQueries(componentName, repositories);
    
    // Execute searches with rate limit handling
    for (const query of searchQueries) {
      try {
        const response = await this.octokit.search.code({
          q: query,
          per_page: Math.min(maxResults, 30),
          sort: 'indexed',
        });
        
        // Process each result
        for (const item of response.data.items) {
          const result = await this.processSearchResult(item, componentName);
          if (result) {
            results.push(result);
          }
        }
        
        // Handle rate limiting
        if (response.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = parseInt(response.headers['x-ratelimit-reset'] || '0') * 1000;
          const waitTime = resetTime - Date.now();
          if (waitTime > 0) {
            await this.sleep(waitTime);
          }
        }
        
      } catch (error) {
        console.error(`Search query failed: ${query}`, error);
        // Continue with next query
      }
      
      // Stop if we have enough results
      if (results.length >= maxResults) {
        break;
      }
    }
    
    // Rank results by relevance
    const rankedResults = this.rankResults(results, componentName);
    
    // Cache top result
    if (rankedResults.length > 0 && useCache) {
      await this.cacheComponent(rankedResults[0], componentName);
    }
    
    return rankedResults.slice(0, maxResults);
  }
  
  /**
   * Build search queries for different patterns
   */
  private buildSearchQueries(
    componentName: string,
    repositories: string[]
  ): string[] {
    const queries: string[] = [];
    const repoFilter = repositories.length > 0
      ? repositories.map(r => `repo:${r}`).join(' ')
      : '';
    
    // Direct filename matches
    queries.push(`${repoFilter} filename:${componentName}.tsx`);
    queries.push(`${repoFilter} filename:${componentName}.jsx`);
    queries.push(`${repoFilter} filename:${componentName}.vue`);
    
    // Component declarations
    const capitalizedName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    queries.push(`${repoFilter} "export function ${capitalizedName}"`);
    queries.push(`${repoFilter} "export const ${capitalizedName}"`);
    queries.push(`${repoFilter} "export default function ${capitalizedName}"`);
    queries.push(`${repoFilter} "class ${capitalizedName} extends"`);
    
    // Common paths
    queries.push(`${repoFilter} path:components/${componentName}`);
    queries.push(`${repoFilter} path:src/components/${componentName}`);
    
    return queries;
  }
  
  /**
   * Process a search result and fetch full content
   */
  private async processSearchResult(
    item: any,
    componentName: string
  ): Promise<ComponentSearchResult | null> {
    try {
      // Parse repository info
      const [owner, repo] = item.repository.full_name.split('/');
      
      // Fetch full file content
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path: item.path,
      });
      
      if ('content' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString();
        
        return {
          name: item.name,
          repository: item.repository.full_name,
          path: item.path,
          content,
          language: this.detectLanguage(item.name),
          size: response.data.size,
          lastModified: item.repository.updated_at,
          score: 0, // Will be calculated in ranking
        };
      }
    } catch (error) {
      console.error(`Failed to fetch content for ${item.path}:`, error);
    }
    
    return null;
  }
  
  /**
   * Rank results by relevance
   */
  private rankResults(
    results: ComponentSearchResult[],
    componentName: string
  ): ComponentSearchResult[] {
    return results
      .map(result => ({
        ...result,
        score: this.calculateScore(result, componentName),
      }))
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Fetch a file directly from GitHub using the exact path with fallback strategies
   */
  async fetchFileDirectly(
    repository: string,
    filePath: string,
    retries = 3
  ): Promise<ComponentSearchResult> {
    console.log(`[GitHub] Fetching file directly: ${filePath} from ${repository}`);
    
    // Normalize the file path (remove leading slash if present)
    const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    
    // Try different path variations if the exact path fails
    const pathVariations = [
      normalizedPath,
      normalizedPath.replace(/\.tsx?$/, '.tsx'), // Try .tsx if no extension
      normalizedPath.replace(/\.tsx?$/, '.ts'),  // Try .ts
      normalizedPath.replace(/\.jsx?$/, '.jsx'), // Try .jsx
      normalizedPath.replace(/\.jsx?$/, '.js'),  // Try .js
    ];
    
    let lastError: any = null;
    
    for (const pathToTry of pathVariations) {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const [owner, repo] = repository.split('/');
          
          console.log(`[GitHub] Attempt ${attempt + 1}/${retries} for path: ${pathToTry}`);
          
          // Add delay between retries (exponential backoff)
          if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`[GitHub] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          // Get file content using GitHub API
          const { data } = await this.octokit.repos.getContent({
            owner,
            repo,
            path: pathToTry,
          });
          
          // Check if it's a file (not a directory)
          if ('content' in data && data.type === 'file') {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            
            console.log(`[GitHub] ✅ Successfully fetched ${pathToTry} (${data.size} bytes)`);
            
            return {
              name: pathToTry.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || '',
              path: pathToTry,
              repository,
              content,
              language: pathToTry.endsWith('.tsx') ? 'tsx' : 
                       pathToTry.endsWith('.jsx') ? 'jsx' : 
                       pathToTry.endsWith('.ts') ? 'ts' : 'js',
              size: data.size,
              url: data.html_url,
              sha: data.sha,
            };
          }
          
          throw new Error(`Path ${pathToTry} is not a file`);
        } catch (error: any) {
          // Convert to GitHubError for better handling
          const githubError = GitHubError.fromApiError(error);
          lastError = githubError;
          
          // Log with appropriate level
          if (githubError.code === GitHubErrorCode.FILE_NOT_FOUND) {
            console.log(`[GitHub] File not found: ${pathToTry}`);
            break; // Don't retry 404s, try next variation
          } else if (githubError.code === GitHubErrorCode.RATE_LIMITED) {
            console.error(`[GitHub] ⚠️ Rate limited - ${githubError.getUserMessage()}`);
            if (ErrorRecovery.shouldRetry(githubError, attempt)) {
              const delay = ErrorRecovery.getRetryDelay(githubError, attempt);
              console.log(`[GitHub] Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              break;
            }
          } else if (githubError.code === GitHubErrorCode.AUTH_FAILED) {
            console.error(`[GitHub] ❌ ${githubError.getUserMessage()}`);
            throw githubError; // Don't continue, auth is broken
          } else {
            console.error(`[GitHub] Error on attempt ${attempt + 1}:`, githubError.message);
            if (!ErrorRecovery.shouldRetry(githubError, attempt)) {
              break;
            }
          }
        }
      }
    }
    
    // If we get here, all attempts failed
    if (lastError instanceof GitHubError) {
      console.error(`[GitHub] ❌ All fetch attempts failed for ${filePath}`);
      console.error(`[GitHub] Error: ${lastError.getUserMessage()}`);
      console.error(`[GitHub] Suggestion: ${lastError.getSuggestedAction()}`);
      throw lastError;
    }
    
    // Fallback error if somehow we don't have a GitHubError
    const fallbackError = new GitHubError(
      GitHubErrorCode.UNKNOWN,
      `Failed to fetch component file: ${filePath}`,
      { originalPath: filePath, repository, attempts: retries }
    );
    
    console.error(`[GitHub] ❌ ${fallbackError.getUserMessage()}`);
    throw fallbackError;
  }
  
  /**
   * Calculate relevance score for a result
   */
  private calculateScore(
    result: ComponentSearchResult,
    componentName: string
  ): number {
    let score = 0;
    
    // Exact filename match
    const filename = result.path.split('/').pop() || '';
    if (filename === `${componentName}.tsx`) score += 100;
    if (filename === `${componentName}.jsx`) score += 90;
    if (filename === `${componentName}.vue`) score += 80;
    
    // Path indicates component
    if (result.path.includes('/components/')) score += 50;
    if (result.path.includes('/ui/')) score += 40;
    if (result.path.includes('/lib/components/')) score += 30;
    
    // Content analysis
    if (result.content.includes(`export default function ${componentName}`)) score += 50;
    if (result.content.includes(`export function ${componentName}`)) score += 40;
    if (result.content.includes(`export const ${componentName}`)) score += 30;
    
    // Language preference (React > Vue > Angular)
    if (result.language === 'tsx' || result.language === 'jsx') score += 20;
    if (result.language === 'vue') score += 10;
    
    // File size (prefer reasonable sizes)
    if (result.size > 100 && result.size < 5000) score += 10;
    
    return score;
  }
  
  /**
   * Get cached component if available
   */
  private async getCachedComponent(
    componentName: string,
    repository?: string
  ): Promise<ComponentSearchResult | null> {
    const cacheKey = this.buildCacheKey(componentName, repository);
    
    const cachedResults = await db
      .select()
      .from(componentCache)
      .where(and(
        eq(componentCache.cacheKey, cacheKey),
        gt(componentCache.expiresAt, new Date())
      ));
    
    const cached = cachedResults[0];
    
    if (cached) {
      // Update access count
      await db
        .update(componentCache)
        .set({
          accessCount: cached.accessCount + 1,
          lastAccessedAt: new Date(),
        })
        .where(eq(componentCache.id, cached.id));
      
      return {
        name: cached.componentName,
        repository: cached.repository,
        path: cached.filePath,
        content: cached.rawContent || '',
        language: cached.parsedData.framework || 'tsx',
        size: cached.rawContent?.length || 0,
        lastModified: cached.createdAt.toISOString(),
        score: 100, // Cached results get high score
      };
    }
    
    return null;
  }
  
  /**
   * Cache a component for future use
   */
  private async cacheComponent(
    result: ComponentSearchResult,
    componentName: string
  ): Promise<void> {
    const cacheKey = this.buildCacheKey(componentName, result.repository);
    const fileHash = crypto.createHash('sha256').update(result.content).digest('hex');
    
    await db
      .insert(componentCache)
      .values({
        cacheKey,
        userId: this.userId,
        repository: result.repository,
        filePath: result.path,
        componentName: componentName,
        parsedData: {
          structure: {},
          styles: {},
          content: {},
          props: {},
          framework: result.language,
        },
        rawContent: result.content,
        fileHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .onConflictDoUpdate({
        target: componentCache.cacheKey,
        set: {
          rawContent: result.content,
          fileHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
  }
  
  private buildCacheKey(componentName: string, repository?: string): string {
    return `${this.userId}:${repository || 'all'}:${componentName}`;
  }
  
  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext || 'unknown';
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get user's selected repositories for searching
   * Returns only explicitly selected repos, not all accessible repos
   */
  static async getUserRepositories(userId: string): Promise<string[]> {
    const connections = await db
      .select()
      .from(githubConnections)
      .where(and(
        eq(githubConnections.userId, userId),
        eq(githubConnections.isActive, true)
      ));
    
    const connection = connections[0];
    
    if (!connection) {
      throw new Error('No active GitHub connection found');
    }
    
    // Only return explicitly selected repos
    // If none selected, return empty array (user must select repos first)
    if (!connection.selectedRepos || connection.selectedRepos.length === 0) {
      console.log('[GitHub] No repositories selected for search');
      return [];
    }
    
    console.log(`[GitHub] Using ${connection.selectedRepos.length} selected repositories for search`);
    return connection.selectedRepos;
  }
}