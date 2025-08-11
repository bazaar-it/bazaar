/**
 * GitHub Component Indexer Service
 * Discovers and categorizes React components in GitHub repositories
 */

import { Octokit } from '@octokit/rest';

export type UICategoryKey = 'core' | 'auth' | 'commerce' | 'interactive' | 'content' | 'custom';

export interface UIComponentItem {
  name: string;
  path: string;
  repo: string;
  category: UICategoryKey;
  score: number;
  preview?: string;
  lineCount?: number;
  importCount?: number;
}

export type UICatalog = Record<UICategoryKey, UIComponentItem[]>;

// Component detection patterns
const COMPONENT_PATTERNS = {
  auth: [
    /login|sign[-_ ]?in/i,
    /sign[-_ ]?up|register/i,
    /forgot[-_ ]?password|reset[-_ ]?password/i,
    /auth|authenticate/i,
  ],
  core: [
    /header|nav(bar)?|top[-_ ]?bar/i,
    /sidebar|side[-_ ]?(nav|panel)|drawer/i,
    /footer|bottom[-_ ]?bar/i,
    /layout|wrapper|container/i,
  ],
  commerce: [
    /paywall|pricing|subscribe|subscription/i,
    /checkout|payment|billing/i,
    /cart|basket|shopping[-_ ]?bag/i,
    /product|item|sku/i,
  ],
  interactive: [
    /chat|message|conversation/i,
    /comment|discussion|reply/i,
    /search|filter|query/i,
    /form|input|field/i,
  ],
  content: [
    /hero|banner|jumbotron/i,
    /card|tile|item/i,
    /modal|dialog|popup|overlay/i,
    /dropdown|select|menu/i,
    /carousel|slider|gallery/i,
  ],
};

export class ComponentIndexerService {
  private octokit: Octokit;
  
  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken });
  }
  
  /**
   * Discover components in a repository
   */
  async discoverComponents(
    owner: string,
    repo: string,
    ref = 'HEAD'
  ): Promise<UICatalog> {
    console.log(`[ComponentIndexer] Discovering components in ${owner}/${repo}@${ref}`);
    
    try {
      // Get the commit SHA for the ref - try different branch names
      let refData;
      const branchesToTry = ref === 'HEAD' 
        ? ['heads/main', 'heads/master', 'heads/dev', 'heads/develop']
        : [`heads/${ref}`];
      
      for (const branch of branchesToTry) {
        try {
          const result = await this.octokit.git.getRef({ owner, repo, ref: branch });
          refData = result.data;
          console.log(`[ComponentIndexer] Using branch: ${branch}`);
          break;
        } catch (e) {
          // Try next branch
        }
      }
      
      if (!refData) {
        throw new Error(`No valid branch found for ${owner}/${repo}`);
      }
      
      const sha = refData.object.sha;
      
      // Get the tree (all files) - this is FAST!
      const { data: tree } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: sha,
        recursive: '1', // Get all files recursively
      });
      
      // Filter to component files from various frameworks
      const componentFiles = tree.tree.filter(item => 
        item.type === 'blob' && 
        item.path && 
        /\.(tsx|jsx|ts|js|vue|svelte)$/.test(item.path)
      );
      
      console.log(`[ComponentIndexer] Found ${componentFiles.length} potential component files`);
      
      // Categorize components
      const catalog: UICatalog = {
        core: [],
        auth: [],
        commerce: [],
        interactive: [],
        content: [],
        custom: [],
      };
      
      // Process each file
      for (const file of componentFiles) {
        if (!file.path) continue;
        
        const component = this.analyzeFile(file.path, owner, repo);
        if (component && component.score >= 0) { // Lower threshold to include more components
          catalog[component.category].push(component);
        }
      }
      
      // Sort each category by score
      Object.keys(catalog).forEach(key => {
        catalog[key as UICategoryKey].sort((a, b) => b.score - a.score);
        // Keep top 20 per category
        catalog[key as UICategoryKey] = catalog[key as UICategoryKey].slice(0, 20);
      });
      
      console.log(`[ComponentIndexer] Categorized components:`, {
        core: catalog.core.length,
        auth: catalog.auth.length,
        commerce: catalog.commerce.length,
        interactive: catalog.interactive.length,
        content: catalog.content.length,
        custom: catalog.custom.length,
      });
      
      return catalog;
    } catch (error) {
      console.error('[ComponentIndexer] Error discovering components:', error);
      throw error;
    }
  }
  
  /**
   * Analyze a single file and determine if it's a component
   */
  private analyzeFile(
    path: string,
    owner: string,
    repo: string
  ): UIComponentItem | null {
    // Extract component name from path
    const fileName = path.split('/').pop() || '';
    const componentName = fileName.replace(/\.(tsx?|jsx?)$/, '');
    
    // Special case for Next.js page.tsx and layout.tsx files
    if (fileName === 'page.tsx' || fileName === 'layout.tsx') {
      // Use the parent directory name as component name
      const parts = path.split('/');
      const parentDir = parts[parts.length - 2] || 'Page';
      const niceName = parentDir.charAt(0).toUpperCase() + parentDir.slice(1) + 'Page';
      
      return {
        name: niceName,
        path,
        repo: `${owner}/${repo}`,
        category: 'core',
        score: 30, // Pages are important
      };
    }
    
    // Skip non-component files
    if (!this.isPotentialComponent(componentName, path)) {
      return null;
    }
    
    // Categorize and score
    const category = this.categorizeComponent(componentName, path);
    const score = this.scoreComponent(componentName, path, category);
    
    return {
      name: componentName,
      path,
      repo: `${owner}/${repo}`,
      category,
      score,
    };
  }
  
  /**
   * Check if file is likely a React component
   */
  private isPotentialComponent(name: string, path: string): boolean {
    // Check if name is PascalCase (React convention)
    const isPascalCase = /^[A-Z][A-Za-z0-9]*/.test(name);
    
    // Check if it matches any pattern
    const matchesPattern = Object.values(COMPONENT_PATTERNS)
      .flat()
      .some(pattern => pattern.test(name) || pattern.test(path));
    
    // Check if it's in a components-like directory
    const inComponentDir = /\/(components?|ui|features?|modules?|views?|pages?|screens?|app|src)\//i.test(path);
    
    // Exclude obvious non-components
    const isExcluded = /\.(test|spec|stories|config|utils?|helpers?|constants?|types?|styles?)/.test(name);
    
    const isPotential = (isPascalCase || matchesPattern || inComponentDir) && !isExcluded;
    
    // Log for debugging
    if (isPotential && path.includes('app/') || path.includes('components/')) {
      console.log(`[ComponentIndexer] Potential component: ${path}`);
    }
    
    return isPotential;
  }
  
  /**
   * Categorize component based on name and path
   */
  private categorizeComponent(name: string, path: string): UICategoryKey {
    const combined = `${name} ${path}`.toLowerCase();
    
    // Check each category's patterns
    for (const [category, patterns] of Object.entries(COMPONENT_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(combined))) {
        return category as UICategoryKey;
      }
    }
    
    // Default categorization based on path
    if (/\/(auth|login|signup)/.test(path.toLowerCase())) return 'auth';
    if (/\/(layout|components?\/(layout|header|footer|nav))/.test(path.toLowerCase())) return 'core';
    if (/\/(shop|store|commerce|checkout|cart)/.test(path.toLowerCase())) return 'commerce';
    if (/\/(chat|message|comment|search)/.test(path.toLowerCase())) return 'interactive';
    
    return 'custom';
  }
  
  /**
   * Score component importance
   */
  private scoreComponent(
    name: string,
    path: string,
    category: UICategoryKey
  ): number {
    let score = 0;
    
    // Name-based scoring
    if (/^(Login|SignUp|Header|Footer|Nav|Sidebar|Hero|Checkout|Cart)$/i.test(name)) {
      score += 50; // Exact common component names
    } else if (COMPONENT_PATTERNS[category] && COMPONENT_PATTERNS[category].some(p => p.test(name))) {
      score += 30; // Matches category pattern
    }
    
    // Path-based scoring
    if (/\/(pages?|app|screens?|views?)\//i.test(path)) {
      score += 30; // Page-level component
    } else if (/\/components?\//i.test(path)) {
      score += 20; // In components directory
    } else if (/\/(ui|common|shared)\//i.test(path)) {
      score += 15; // Shared component
    }
    
    // Depth penalty (deeper = less important usually)
    const depth = path.split('/').length;
    score -= Math.min(depth * 2, 20);
    
    // Special boost for critical components
    if (/login|signup|auth|header|footer|nav|sidebar/i.test(name)) {
      score += 20;
    }
    
    return Math.max(score, 0);
  }
  
  /**
   * Get preview of component (first N lines)
   */
  async getComponentPreview(
    owner: string,
    repo: string,
    path: string,
    lines = 50
  ): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });
      
      if ('content' in data && data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const preview = content.split('\n').slice(0, lines).join('\n');
        return preview;
      }
    } catch (error) {
      console.error(`[ComponentIndexer] Error fetching preview for ${path}:`, error);
    }
    
    return '';
  }
}