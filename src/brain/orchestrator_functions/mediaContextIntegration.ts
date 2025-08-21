/**
 * Media Context Integration for Brain Orchestrator
 * Ensures all media references are resolved before passing to tools
 */

import { mediaResolver } from '~/server/services/media/mediaResolver';
import type { OrchestrationInput } from '~/lib/types/ai/brain.types';

export class MediaContextIntegration {
  /**
   * Enhance orchestration input with resolved media context
   */
  async enhanceWithMediaContext(input: OrchestrationInput): Promise<{
    enhancedPrompt: string;
    resolvedMediaUrls: string[];
    mediaValidationRules: string;
  }> {
    console.log('📸 [MEDIA CONTEXT] Resolving media references...');
    
    // Resolve all media references
    const resolution = await mediaResolver.resolveMediaReferences(
      input.projectId,
      input.prompt,
      input.userContext?.imageUrls as string[] | undefined,
      input.userContext?.videoUrls as string[] | undefined
    );
    
    // Log resolved media
    if (resolution.resolvedMedia.length > 0) {
      console.log('📸 [MEDIA CONTEXT] Resolved media references:');
      resolution.resolvedMedia.forEach((rm, i) => {
        console.log(`  ${i + 1}. "${rm.reference}" → ${rm.resolved.type}: ${rm.resolved.url.substring(0, 50)}...`);
        console.log(`     Confidence: ${(rm.confidence * 100).toFixed(0)}%, Reason: ${rm.reason}`);
      });
    }
    
    // Create validation rules for the LLM
    const validationRules = this.createValidationRules(resolution.mediaUrls);
    
    return {
      enhancedPrompt: resolution.enhancedPrompt,
      resolvedMediaUrls: resolution.mediaUrls,
      mediaValidationRules: validationRules
    };
  }
  
  /**
   * Create strict validation rules for LLM
   */
  private createValidationRules(mediaUrls: string[]): string {
    if (mediaUrls.length === 0) {
      return 'No media assets to validate.';
    }
    
    return `
MEDIA VALIDATION RULES:
=======================
1. You MUST use exactly ${mediaUrls.length} media asset(s) in your code
2. The URLs you use MUST be from this exact list:
${mediaUrls.map((url, i) => `   ${i + 1}. ${url}`).join('\n')}

3. DO NOT use any other URLs like:
   - /api/placeholder/...
   - https://example.com/...
   - https://images.unsplash.com/...
   - Any URL not in the list above

4. For Remotion components, use:
   - Images: <Img src="${mediaUrls[0] || 'URL_FROM_LIST'}" />
   - Videos: <Video src="${mediaUrls[0] || 'URL_FROM_LIST'}" />
   - Audio: <Audio src="${mediaUrls[0] || 'URL_FROM_LIST'}" />

5. AFTER generating code, verify:
   - Count all src attributes
   - Each must match a URL from the list above EXACTLY
   - No placeholder or generated URLs

VALIDATION CHECK: Your code must pass this test:
const validUrls = ${JSON.stringify(mediaUrls)};
// Every src in your code must be in validUrls array
`;
  }
  
  /**
   * Validate generated code against media context
   */
  async validateGeneratedCode(
    code: string, 
    projectId: string,
    imageUrls?: string[],
    videoUrls?: string[]
  ): Promise<{
    valid: boolean;
    fixedCode?: string;
    issues?: string[];
  }> {
    console.log('🔍 [MEDIA VALIDATION] Checking generated code for URL hallucinations...');
    
    // Get media context with the actual URLs that were used
    const context = await mediaResolver.resolveMediaReferences(projectId, '', imageUrls || [], videoUrls || []);
    
    // Validate the code
    const validation = mediaResolver.validateAndFixCode(code, context.mediaContext);
    
    if (!validation.valid) {
      console.warn('⚠️ [MEDIA VALIDATION] Found issues:', validation.changes);
      return {
        valid: false,
        fixedCode: validation.fixedCode,
        issues: validation.changes
      };
    }
    
    console.log('✅ [MEDIA VALIDATION] Code validation passed - all URLs are real');
    return { valid: true };
  }
}

// Export singleton
export const mediaContextIntegration = new MediaContextIntegration();