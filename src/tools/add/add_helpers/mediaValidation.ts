/**
 * Media Validation for Code Generation
 * Ensures generated code only uses real uploaded media URLs
 */

import { mediaContextIntegration } from '~/brain/orchestrator_functions/mediaContextIntegration';

export class MediaValidation {
  /**
   * Post-process generated code to fix any hallucinated URLs
   */
  static async validateAndFixCode(
    code: string,
    projectId: string,
    providedUrls?: string[]
  ): Promise<{
    code: string;
    wasFixed: boolean;
    fixes: string[];
  }> {
    const fixes: string[] = [];
    let fixedCode = code;
    
    // First pass: Replace common placeholder patterns
    const placeholderPatterns = [
      /\/api\/placeholder\/\d+/g,
      /https?:\/\/example\.com\/[^"'\s]*/g,
      /https?:\/\/placeholder\.com\/[^"'\s]*/g,
      /https?:\/\/images\.unsplash\.com\/[^"'\s]*/g,
      /IMAGE_URL_\d+/g,
      /\{imageUrl\d*\}/g,
    ];
    
    // If we have provided URLs, use them to replace placeholders
    if (providedUrls && providedUrls.length > 0) {
      placeholderPatterns.forEach(pattern => {
        let matchIndex = 0;
        fixedCode = fixedCode.replace(pattern, (match) => {
          const replacement = providedUrls[matchIndex % providedUrls.length];
          if (match !== replacement) {
            fixes.push(`Replaced placeholder "${match}" with real URL`);
          }
          matchIndex++;
          return replacement;
        });
      });
    }
    
    // Second pass: Validate against project media context
    // Pass the provided URLs so validation knows these are valid
    const validation = await mediaContextIntegration.validateGeneratedCode(
      fixedCode, 
      projectId,
      providedUrls, // Pass image URLs
      undefined     // No video URLs in this context
    );
    
    if (!validation.valid && validation.fixedCode) {
      fixedCode = validation.fixedCode;
      if (validation.issues) {
        fixes.push(...validation.issues);
      }
    }
    
    // Third pass: Ensure Img/Video components use proper syntax
    fixedCode = this.fixRemotionComponentSyntax(fixedCode);
    
    // Log fixes if any were made
    if (fixes.length > 0) {
      console.warn('🔧 [MEDIA VALIDATION] Fixed URL issues:', fixes);
    }
    
    return {
      code: fixedCode,
      wasFixed: fixes.length > 0,
      fixes
    };
  }
  
  /**
   * Fix Remotion component syntax
   */
  private static fixRemotionComponentSyntax(code: string): string {
    // Fix Img component (ensure proper import and usage)
    if (code.includes('<Img') && !code.includes('const { Img }')) {
      // Add Img to Remotion imports if missing
      code = code.replace(
        /const\s*{\s*([^}]+)\s*}\s*=\s*window\.Remotion;/,
        (match, imports) => {
          const importList = imports.split(',').map((i: string) => i.trim());
          if (!importList.includes('Img')) {
            importList.push('Img');
          }
          return `const { ${importList.join(', ')} } = window.Remotion;`;
        }
      );
    }
    
    // Fix Video component
    if (code.includes('<Video') && !code.includes('const { Video }')) {
      code = code.replace(
        /const\s*{\s*([^}]+)\s*}\s*=\s*window\.Remotion;/,
        (match, imports) => {
          const importList = imports.split(',').map((i: string) => i.trim());
          if (!importList.includes('Video')) {
            importList.push('Video');
          }
          return `const { ${importList.join(', ')} } = window.Remotion;`;
        }
      );
    }
    
    // Fix Audio component
    if (code.includes('<Audio') && !code.includes('const { Audio }')) {
      code = code.replace(
        /const\s*{\s*([^}]+)\s*}\s*=\s*window\.Remotion;/,
        (match, imports) => {
          const importList = imports.split(',').map((i: string) => i.trim());
          if (!importList.includes('Audio')) {
            importList.push('Audio');
          }
          return `const { ${importList.join(', ')} } = window.Remotion;`;
        }
      );
    }
    
    return code;
  }
  
  /**
   * Extract all media URLs from generated code
   */
  static extractMediaUrls(code: string): string[] {
    const urls: string[] = [];
    
    // Match src attributes in JSX
    const srcPattern = /(?:src|source|href)=["']([^"']+)["']/g;
    let match;
    
    while ((match = srcPattern.exec(code)) !== null) {
      const url = match[1];
      // Only include HTTP(S) URLs, not data: or relative paths
      if (url.startsWith('http://') || url.startsWith('https://')) {
        urls.push(url);
      }
    }
    
    // Match URLs in style attributes or CSS
    const styleUrlPattern = /url\(["']?([^"')]+)["']?\)/g;
    while ((match = styleUrlPattern.exec(code)) !== null) {
      const url = match[1];
      if (url.startsWith('http://') || url.startsWith('https://')) {
        urls.push(url);
      }
    }
    
    return [...new Set(urls)]; // Remove duplicates
  }
  
  /**
   * Create a mapping of placeholder URLs to real URLs
   */
  static createUrlMapping(realUrls: string[]): Map<string, string> {
    const mapping = new Map<string, string>();
    
    realUrls.forEach((url, index) => {
      // Map common placeholder patterns to real URLs
      mapping.set(`/api/placeholder/${index}`, url);
      mapping.set(`IMAGE_URL_${index}`, url);
      mapping.set(`{imageUrl${index}}`, url);
      mapping.set(`https://example.com/image${index}.jpg`, url);
      mapping.set(`https://placeholder.com/${index}`, url);
    });
    
    return mapping;
  }
}

export default MediaValidation;