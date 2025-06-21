/**
 * Utility to convert template files from standard Remotion imports 
 * to window.Remotion format for database storage
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export function convertTemplateToWindowFormat(templateName: string): string {
  try {
    // Read the actual template file
    const templatePath = join(process.cwd(), 'src', 'templates', `${templateName}.tsx`);
    let content = readFileSync(templatePath, 'utf-8');
    
    // Convert standard Remotion imports to window.Remotion format
    content = content.replace(
      /import\s*\{([^}]+)\}\s*from\s*["']remotion["'];?/g,
      (match, imports) => {
        // Clean up the imports string
        const cleanImports = imports
          .split(',')
          .map((imp: string) => imp.trim())
          .join(', ');
        return `const { ${cleanImports} } = window.Remotion;`;
      }
    );
    
    // Add comment at the top
    content = `//src/templates/${templateName}.tsx (auto-converted)\n${content}`;
    
    return content;
  } catch (error) {
    console.error(`Failed to convert template ${templateName}:`, error);
    
    // Fallback to placeholder
    return `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function ${templateName}() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: "#1a1a2e", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      color: "#ffffff"
    }}>
      <h1>Template: ${templateName}</h1>
    </AbsoluteFill>
  );
}`;
  }
}

// Browser-safe version for client-side (returns placeholder)
export function getTemplateCodeBrowser(templateName: string): string {
  return `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function ${templateName}() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: "#1a1a2e", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      color: "#ffffff"
    }}>
      <h1>Template: ${templateName}</h1>
    </AbsoluteFill>
  );
}`;
} 