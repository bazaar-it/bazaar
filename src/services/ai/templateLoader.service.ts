/**
 * Template Loader Service
 * Loads actual template code for context engineering
 */

import { readFile } from 'fs/promises';
import path from 'path';

export interface LoadedTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  style: string;
}

export class TemplateLoaderService {
  private templateCache = new Map<string, string>();
  
  /**
   * Load template code from file system
   * In production, these could be pre-compiled or loaded from a CDN
   */
  async loadTemplateCode(templateId: string): Promise<string | null> {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }
    
    try {
      // Construct file path
      const templatePath = path.join(process.cwd(), 'src', 'templates', `${templateId}.tsx`);
      
      // Read file content
      const code = await readFile(templatePath, 'utf-8');
      
      // Cache for future use
      this.templateCache.set(templateId, code);
      
      return code;
    } catch (error) {
      console.error(`Failed to load template ${templateId}:`, error);
      
      // Fallback: Return a sample template structure
      return this.getFallbackTemplate(templateId);
    }
  }
  
  /**
   * Load multiple templates
   */
  async loadTemplates(templateIds: string[]): Promise<LoadedTemplate[]> {
    const loaded: LoadedTemplate[] = [];
    
    for (const id of templateIds) {
      const code = await this.loadTemplateCode(id);
      if (code) {
        // Extract metadata from the template metadata system
        const { templateMetadata } = await import('~/templates/metadata');
        const meta = templateMetadata[id];
        
        if (meta) {
          loaded.push({
            id,
            name: meta.name,
            code,
            description: meta.primaryUse,
            style: meta.styles[0] || 'modern'
          });
        }
      }
    }
    
    return loaded;
  }
  
  /**
   * Get a fallback template structure if file loading fails
   */
  private getFallbackTemplate(templateId: string): string {
    // Return a basic template structure that demonstrates good patterns
    return `import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export default function ${templateId}() {
  const frame = useCurrentFrame();
  
  // Animation logic
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          opacity,
          color: 'white',
          fontSize: '3rem',
          fontWeight: 'bold',
        }}
      >
        ${templateId} Template
      </div>
    </AbsoluteFill>
  );
}

export const durationInFrames_${templateId} = 180;`;
  }
  
  /**
   * Format template code for LLM context
   * Removes unnecessary comments and formats for clarity
   */
  formatTemplateForContext(code: string, metadata: any): string {
    // Add header with metadata
    const header = `// Template: ${metadata.name}
// Purpose: ${metadata.primaryUse}
// Style: ${metadata.styles.join(', ')}
// Animations: ${metadata.animations.join(', ')}
// Duration: ${metadata.duration} frames

`;
    
    // Clean up the code (remove excessive comments, normalize spacing)
    const cleanedCode = code
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize spacing
      .trim();
    
    return header + cleanedCode;
  }
}

// Export singleton instance
export const templateLoader = new TemplateLoaderService();