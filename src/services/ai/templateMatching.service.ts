/**
 * Template Matching Service
 * Intelligently matches user prompts to template examples for context engineering
 */

import type { TemplateMetadata } from '~/templates/metadata';
import { brainTemplateMetadata } from '~/templates/metadata/canonical';

export interface TemplateMatch {
  templateId: string;
  metadata: TemplateMetadata;
  score: number;
  reasoning: string;
  matchDetails: {
    phraseMatches: string[];
    keywordMatches: string[];
    categoryMatches: string[];
    styleMatches: string[];
    useCaseMatches: string[];
  };
}

export class TemplateMatchingService {
  private metadata = brainTemplateMetadata;
  
  /**
   * Find the best matching templates for a user prompt
   */
  findBestTemplates(prompt: string, limit = 2): TemplateMatch[] {
    const promptLower = prompt.toLowerCase();
    const matches: TemplateMatch[] = [];
    
    // Score each template
    for (const [templateId, meta] of Object.entries(this.metadata)) {
      const match = this.scoreTemplate(promptLower, templateId, meta);
      if (match.score > 0) {
        matches.push(match);
      }
    }
    
    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * Score a single template against the prompt
   */
  private scoreTemplate(promptLower: string, templateId: string, meta: TemplateMetadata): TemplateMatch {
    let score = 0;
    const matchDetails = {
      phraseMatches: [] as string[],
      keywordMatches: [] as string[],
      categoryMatches: [] as string[],
      styleMatches: [] as string[],
      useCaseMatches: [] as string[]
    };
    
    // 1. Check user phrases (highest weight - 10 points each)
    for (const phrase of meta.userPhrases) {
      if (promptLower.includes(phrase.toLowerCase())) {
        score += 10;
        matchDetails.phraseMatches.push(phrase);
      } else {
        // Partial phrase matching (2 points per word)
        const words = phrase.toLowerCase().split(' ');
        const matchedWords = words.filter(w => w.length > 2 && promptLower.includes(w));
        if (matchedWords.length > 0) {
          score += matchedWords.length * 2;
        }
      }
    }
    
    // 2. Check keywords (medium weight - 5 points each)
    for (const keyword of meta.keywords) {
      if (promptLower.includes(keyword.toLowerCase())) {
        score += 5;
        matchDetails.keywordMatches.push(keyword);
      }
    }
    
    // 3. Check descriptions with fuzzy matching (8 points max)
    for (const desc of meta.descriptions) {
      const similarity = this.calculateSimilarity(promptLower, desc.toLowerCase());
      if (similarity > 0.3) {
        score += Math.round(similarity * 8);
      }
    }
    
    // 4. Check categories (4 points each)
    for (const category of meta.categories) {
      const categoryWords = category.replace(/-/g, ' ').toLowerCase();
      if (promptLower.includes(categoryWords)) {
        score += 4;
        matchDetails.categoryMatches.push(category);
      }
    }
    
    // 5. Check use cases (3 points each)
    for (const useCase of meta.useCases) {
      const useCaseWords = useCase.replace(/-/g, ' ').toLowerCase();
      if (promptLower.includes(useCaseWords)) {
        score += 3;
        matchDetails.useCaseMatches.push(useCase);
      }
    }
    
    // 6. Style matching (3 points each)
    for (const style of meta.styles) {
      if (promptLower.includes(style.toLowerCase())) {
        score += 3;
        matchDetails.styleMatches.push(style);
      }
    }
    
    // 7. Animation type matching (2 points each)
    for (const animation of meta.animations) {
      if (promptLower.includes(animation.toLowerCase())) {
        score += 2;
      }
    }
    
    // 8. Element matching (2 points each)
    for (const element of meta.elements) {
      if (promptLower.includes(element.toLowerCase())) {
        score += 2;
      }
    }
    
    // 9. Boost score for exact primary use match
    if (promptLower.includes(meta.primaryUse.toLowerCase())) {
      score += 15;
    }
    
    // Generate reasoning
    const reasoning = this.generateReasoning(matchDetails, meta);
    
    return {
      templateId,
      metadata: meta,
      score,
      reasoning,
      matchDetails
    };
  }
  
  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Generate human-readable reasoning for the match
   */
  private generateReasoning(matchDetails: TemplateMatch['matchDetails'], meta: TemplateMetadata): string {
    const reasons = [];
    
    if (matchDetails.phraseMatches.length > 0) {
      reasons.push(`matches "${matchDetails.phraseMatches[0]}"`);
    }
    
    if (matchDetails.keywordMatches.length > 0) {
      const keywords = matchDetails.keywordMatches.slice(0, 3).join(', ');
      reasons.push(`keywords: ${keywords}`);
    }
    
    if (matchDetails.categoryMatches.length > 0) {
      reasons.push(`category: ${matchDetails.categoryMatches[0]}`);
    }
    
    if (matchDetails.styleMatches.length > 0) {
      reasons.push(`style: ${matchDetails.styleMatches[0]}`);
    }
    
    if (matchDetails.useCaseMatches.length > 0) {
      reasons.push(`use case: ${matchDetails.useCaseMatches[0]}`);
    }
    
    if (reasons.length === 0) {
      reasons.push(`similar to ${meta.primaryUse.toLowerCase()}`);
    }
    
    return reasons.join('; ');
  }
  
  /**
   * Get templates by detected intent categories
   */
  getTemplatesByIntent(prompt: string): TemplateMatch[] {
    const categories = this.detectCategories(prompt);
    const templates: TemplateMatch[] = [];
    
    for (const category of categories) {
      const categoryTemplates = Object.entries(this.metadata)
        .filter(([_, meta]) => meta.categories.includes(category))
        .map(([id, meta]) => ({
          templateId: id,
          metadata: meta,
          score: 50, // Base score for category match
          reasoning: `Matches ${category} category`,
          matchDetails: {
            phraseMatches: [],
            keywordMatches: [],
            categoryMatches: [category],
            styleMatches: [],
            useCaseMatches: []
          }
        }));
      
      templates.push(...categoryTemplates);
    }
    
    // Deduplicate and sort
    const uniqueTemplates = new Map<string, TemplateMatch>();
    for (const template of templates) {
      const existing = uniqueTemplates.get(template.templateId);
      if (!existing || existing.score < template.score) {
        uniqueTemplates.set(template.templateId, template);
      }
    }
    
    return Array.from(uniqueTemplates.values())
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Detect categories from user prompt
   */
  private detectCategories(prompt: string): string[] {
    const categories = new Set<string>();
    const promptLower = prompt.toLowerCase();
    
    // Text animations
    if (/text|word|type|title|heading|caption|label/.test(promptLower)) {
      categories.add('text-animation');
      categories.add('typography');
    }
    
    // Data visualization
    if (/chart|graph|data|metric|statistic|analytics|visualization/.test(promptLower)) {
      categories.add('data-viz');
      categories.add('charts');
    }
    
    // Backgrounds
    if (/background|bg|backdrop|ambient/.test(promptLower)) {
      categories.add('background');
    }
    
    // Effects
    if (/particle|effect|animation|motion/.test(promptLower)) {
      categories.add('effects');
      categories.add('motion-graphics');
    }
    
    // UI/Interface
    if (/ui|interface|app|screen|mockup|demo|dashboard/.test(promptLower)) {
      categories.add('ui-demo');
      categories.add('interface');
    }
    
    // Mobile
    if (/mobile|phone|iphone|android|ios|smartphone/.test(promptLower)) {
      categories.add('mobile');
      categories.add('mockup');
    }
    
    // AI/Tech
    if (/ai|artificial intelligence|machine learning|smart|assistant/.test(promptLower)) {
      categories.add('ai-ui');
      categories.add('tech');
    }
    
    // Finance
    if (/finance|fintech|banking|money|trading|crypto|stock/.test(promptLower)) {
      categories.add('finance');
      categories.add('fintech');
    }
    
    // Transitions
    if (/transition|fade|slide|scale|wipe|reveal|appear/.test(promptLower)) {
      categories.add('transitions');
    }
    
    // Code/Developer
    if (/code|programming|developer|syntax|ide|editor/.test(promptLower)) {
      categories.add('code');
      categories.add('developer');
    }
    
    return Array.from(categories);
  }
  
  /**
   * Get template code for matched templates
   */
  async getTemplateCode(templateId: string): Promise<string | null> {
    try {
      // Dynamic import of the template
      const templateModule = await import(`~/templates/${templateId}.tsx`);
      
      // Read the actual file content for code generation context
      // In production, you might want to pre-compile these
      const response = await fetch(`/api/templates/${templateId}/code`);
      if (response.ok) {
        return await response.text();
      }
      
      // Fallback: return a placeholder
      return `// Template: ${templateId}\n// Template code would be loaded here`;
    } catch (error) {
      console.error(`Failed to load template ${templateId}:`, error);
      return null;
    }
  }
  
  /**
   * Get recommended templates based on project context
   */
  getContextualRecommendations(
    prompt: string,
    existingScenes: string[],
    projectStyle?: string
  ): TemplateMatch[] {
    // Start with basic matching
    let matches = this.findBestTemplates(prompt, 5);
    
    // Boost templates that match project style
    if (projectStyle) {
      matches = matches.map(match => {
        if (match.metadata.styles.includes(projectStyle)) {
          match.score += 20;
          match.reasoning += `; matches project style (${projectStyle})`;
        }
        return match;
      });
    }
    
    // Avoid recommending templates already used
    matches = matches.filter(match => 
      !existingScenes.includes(match.templateId)
    );
    
    // Re-sort after adjustments
    return matches.sort((a, b) => b.score - a.score).slice(0, 2);
  }
  
  /**
   * Explain why templates were selected (for debugging)
   */
  explainSelection(matches: TemplateMatch[]): string {
    if (matches.length === 0) {
      return 'No templates matched the request';
    }
    
    const explanations = matches.map((match, i) => {
      const details = [];
      
      if (match.matchDetails.phraseMatches.length > 0) {
        details.push(`User phrases: "${match.matchDetails.phraseMatches.join('", "')}"`);
      }
      
      if (match.matchDetails.keywordMatches.length > 0) {
        details.push(`Keywords: ${match.matchDetails.keywordMatches.join(', ')}`);
      }
      
      if (match.matchDetails.categoryMatches.length > 0) {
        details.push(`Categories: ${match.matchDetails.categoryMatches.join(', ')}`);
      }
      
      return `${i + 1}. ${match.metadata.name} (score: ${match.score})
   ${match.metadata.primaryUse}
   Matched: ${details.join('; ')}`;
    });
    
    return `Selected templates:\n${explanations.join('\n\n')}`;
  }
}

// Export singleton instance
export const templateMatcher = new TemplateMatchingService();
