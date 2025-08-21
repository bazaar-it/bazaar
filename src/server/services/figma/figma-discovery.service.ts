/**
 * Figma Discovery Service
 * Discovers and categorizes designs in Figma files
 */

import type {
  FigmaFile,
  FigmaProject,
  FigmaTeam,
  FigmaFileResponse,
  FigmaNodesResponse,
  FigmaImagesResponse,
  FigmaNode,
  UICatalog,
  CatalogItem,
  UICategoryKey,
} from '~/lib/types/figma.types';

// Component detection patterns (reuse from GitHub)
const COMPONENT_PATTERNS: Record<UICategoryKey, RegExp[]> = {
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
  custom: [
    // Custom components don't have specific patterns
    // They will be categorized based on other heuristics
  ],
};

// Request queue for rate limiting
class FigmaRequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });

      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process() {
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      // Ensure 500ms between requests (2 req/sec max)
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < 500) {
        await this.sleep(500 - timeSinceLastRequest);
      }

      this.lastRequestTime = Date.now();
      await request();
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class FigmaDiscoveryService {
  private accessToken: string;
  private queue = new FigmaRequestQueue();

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * List user's teams
   */
  async listTeams(): Promise<FigmaTeam[]> {
    // Note: This only works with OAuth, not PAT
    const response = await this.queue.add(() =>
      fetch('https://api.figma.com/v1/me', {
        headers: this.getHeaders(),
      })
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.statusText}`);
    }

    const data = await response.json();
    // Teams are embedded in the user response
    return data.teams || [];
  }

  /**
   * List projects in a team
   */
  async listProjects(teamId: string): Promise<FigmaProject[]> {
    const response = await this.queue.add(() =>
      fetch(`https://api.figma.com/v1/teams/${teamId}/projects`, {
        headers: this.getHeaders(),
      })
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data.projects || [];
  }

  /**
   * List files in a project
   */
  async listFiles(projectId: string): Promise<FigmaFile[]> {
    const response = await this.queue.add(() =>
      fetch(`https://api.figma.com/v1/projects/${projectId}/files`, {
        headers: this.getHeaders(),
      })
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Index a Figma file and discover components
   */
  async indexFile(fileKey: string): Promise<UICatalog> {
    console.log(`[FigmaDiscovery] Indexing file ${fileKey}`);

    try {
      // Step 1: Get file structure (pages only - no depth param!)
      const file = await this.getFile(fileKey);
      
      // Step 2: Find candidate nodes (frames and components)
      const candidates = this.findCandidateNodes(file.document);
      console.log(`[FigmaDiscovery] Found ${candidates.length} candidate nodes`);

      // Step 3: Batch fetch details for candidates
      const nodeIds = candidates.map(c => c.id);
      const nodeDetails = nodeIds.length > 0 
        ? await this.getNodeDetails(fileKey, nodeIds)
        : {};

      // Step 4: Categorize and score
      const catalog: UICatalog = {
        core: [],
        auth: [],
        commerce: [],
        interactive: [],
        content: [],
        custom: [],
      };

      for (const node of candidates) {
        const item = this.analyzeNode(node, fileKey, file.name);
        if (item && item.score >= 20) {
          catalog[item.category].push(item);
        }
      }

      // Step 5: Sort by score and limit
      Object.keys(catalog).forEach(key => {
        catalog[key as UICategoryKey].sort((a, b) => b.score - a.score);
        catalog[key as UICategoryKey] = catalog[key as UICategoryKey].slice(0, 20);
      });

      // Step 6: Get thumbnails for top items
      const topNodeIds = Object.values(catalog)
        .flat()
        .slice(0, 30)
        .map(item => item.nodeId!)
        .filter(Boolean);

      if (topNodeIds.length > 0) {
        const thumbnails = await this.getThumbnails(fileKey, topNodeIds);
        
        // Update catalog with thumbnail URLs
        Object.keys(catalog).forEach(key => {
          catalog[key as UICategoryKey] = catalog[key as UICategoryKey].map(item => ({
            ...item,
            previewUrl: thumbnails[item.nodeId!] || undefined,
          }));
        });
      }

      console.log(`[FigmaDiscovery] Categorized components:`, {
        core: catalog.core.length,
        auth: catalog.auth.length,
        commerce: catalog.commerce.length,
        interactive: catalog.interactive.length,
        content: catalog.content.length,
        custom: catalog.custom.length,
      });

      return catalog;
    } catch (error) {
      console.error('[FigmaDiscovery] Error indexing file:', error);
      throw error;
    }
  }

  /**
   * Get file structure
   */
  private async getFile(fileKey: string): Promise<FigmaFileResponse> {
    const response = await this.queue.add(() =>
      fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: this.getHeaders(),
      })
    );

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Access denied. This file is not accessible with your Figma account. Please ensure you have view access to this file in Figma.');
      } else if (response.status === 404) {
        throw new Error('File not found. Please check the file key is correct.');
      } else if (response.status === 401) {
        throw new Error('Invalid PAT. Please check your Figma Personal Access Token in .env.local');
      }
      throw new Error(`Failed to fetch file: ${response.statusText} (${response.status})`);
    }

    return response.json();
  }

  /**
   * Get a single node by ID (public method for external use)
   */
  async getNode(fileKey: string, nodeId: string): Promise<FigmaNode | null> {
    try {
      const response = await this.getNodeDetails(fileKey, [nodeId]);
      const node = response.nodes?.[nodeId];
      return node?.document || null;
    } catch (error) {
      console.error('Failed to get node:', error);
      return null;
    }
  }
  
  /**
   * Get specific node details
   */
  private async getNodeDetails(fileKey: string, nodeIds: string[]): Promise<FigmaNodesResponse> {
    const response = await this.queue.add(() =>
      fetch(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeIds.join(',')}`, {
        headers: this.getHeaders(),
      })
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch node details: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get thumbnails for nodes
   */
  private async getThumbnails(fileKey: string, nodeIds: string[]): Promise<Record<string, string>> {
    const response = await this.queue.add(() =>
      fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds.join(',')}&format=png&scale=2`, {
        headers: this.getHeaders(),
      })
    );

    if (!response.ok) {
      console.warn(`Failed to fetch thumbnails: ${response.statusText}`);
      return {};
    }

    const data: FigmaImagesResponse = await response.json();
    return data.images || {};
  }

  /**
   * Find candidate nodes (frames and components)
   */
  private findCandidateNodes(node: FigmaNode, candidates: FigmaNode[] = []): FigmaNode[] {
    // Include frames and components
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      // Check if it's a meaningful component (not just a wrapper)
      if (this.isSignificantNode(node)) {
        candidates.push(node);
      }
    }

    // Recurse through children (but only go 2-3 levels deep from pages)
    if (node.children && candidates.length < 100) { // Limit to prevent huge lists
      for (const child of node.children) {
        this.findCandidateNodes(child, candidates);
      }
    }

    return candidates;
  }

  /**
   * Check if node is significant enough to include
   */
  private isSignificantNode(node: FigmaNode): boolean {
    // Skip tiny nodes
    if (node.absoluteBoundingBox) {
      const { width, height } = node.absoluteBoundingBox;
      if (width < 50 || height < 50) return false;
    }

    // Check name patterns
    const hasGoodName = Object.values(COMPONENT_PATTERNS)
      .flat()
      .some(pattern => pattern.test(node.name));

    // Include if has good name or is a component
    return hasGoodName || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
  }

  /**
   * Analyze and categorize a node
   */
  private analyzeNode(node: FigmaNode, fileKey: string, fileName: string): CatalogItem | null {
    const category = this.categorizeNode(node);
    const score = this.scoreNode(node, category);

    if (score < 10) return null;

    return {
      name: node.name,
      category,
      score,
      source: 'figma',
      fileKey,
      nodeId: node.id,
      instances: this.countInstances(node), // Would need component usage data
    };
  }

  /**
   * Categorize node based on name
   */
  private categorizeNode(node: FigmaNode): UICategoryKey {
    const name = node.name.toLowerCase();

    for (const [category, patterns] of Object.entries(COMPONENT_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(name))) {
        return category as UICategoryKey;
      }
    }

    return 'custom';
  }

  /**
   * Score node importance
   */
  private scoreNode(node: FigmaNode, category: UICategoryKey): number {
    let score = 0;

    // Name matching
    if (/login|signup|header|footer|checkout|hero/i.test(node.name)) {
      score += 40;
    } else if (COMPONENT_PATTERNS[category]?.some((p: RegExp) => p.test(node.name))) {
      score += 30;
    }

    // Component vs Frame
    if (node.type === 'COMPONENT') score += 20;
    if (node.type === 'COMPONENT_SET') score += 15;
    if (node.type === 'FRAME') score += 10;

    // Size bonus (larger = more important usually)
    if (node.absoluteBoundingBox) {
      const { width, height } = node.absoluteBoundingBox;
      if (width > 500 && height > 300) score += 10;
    }

    // Has children (more complex)
    if (node.children && node.children.length > 3) score += 5;

    return score;
  }

  /**
   * Count component instances (simplified - would need full file data)
   */
  private countInstances(node: FigmaNode): number {
    // In a real implementation, we'd traverse the file to count instances
    // For MVP, return a default value
    return node.type === 'COMPONENT' ? 1 : 0;
  }

  /**
   * Get request headers
   */
  private getHeaders(): HeadersInit {
    return {
      'X-Figma-Token': this.accessToken,
    };
  }
}