// src/lib/utils/uniquifyTemplateCode.ts

/**
 * Comprehensive template code uniquification to prevent variable conflicts
 * when the same template is added multiple times to a project
 */
export function uniquifyTemplateCode(templateCode: string, uniqueSuffix: string): string {
  let uniqueCode = templateCode;
  
  // Track all identifiers we need to rename
  const identifiersToRename = new Set<string>();
  
  // 1. Find ALL variable declarations (const, let, var)
  const varPattern = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let match;
  while ((match = varPattern.exec(templateCode)) !== null) {
    const varName = match[1];
    // Skip React hooks, window, and Remotion
    if (!varName.startsWith('use') && 
        varName !== 'window' && 
        varName !== 'Remotion' &&
        varName !== 'React') {
      identifiersToRename.add(varName);
    }
  }
  
  // 2. Find function declarations
  const funcPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = funcPattern.exec(templateCode)) !== null) {
    const funcName = match[1];
    identifiersToRename.add(funcName);
  }
  
  // 3. Find export const declarations for duration
  const exportPattern = /export\s+const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  while ((match = exportPattern.exec(templateCode)) !== null) {
    const exportName = match[1];
    identifiersToRename.add(exportName);
  }
  
  // 4. Now do the replacements
  identifiersToRename.forEach(identifier => {
    // Create a regex that matches the identifier as a whole word
    const regex = new RegExp(`\\b${identifier}\\b`, 'g');
    
    // Replace all occurrences
    uniqueCode = uniqueCode.replace(regex, (match, offset, str) => {
      // Check if this is part of an object property access (e.g., object.property)
      // Don't rename if it's after a dot
      if (offset > 0 && str[offset - 1] === '.') {
        return match;
      }
      
      // Check if this is already suffixed
      const nextChars = str.substring(offset + match.length, offset + match.length + uniqueSuffix.length + 1);
      if (nextChars.startsWith(`_${uniqueSuffix}`)) {
        return match;
      }
      
      return `${identifier}_${uniqueSuffix}`;
    });
  });
  
  // 5. Handle JSX components specifically (uppercase identifiers)
  identifiersToRename.forEach(identifier => {
    if (identifier[0] === identifier[0].toUpperCase()) {
      // Already handled by the general replacement above
    }
  });
  
  // 6. Handle CSS animations and keyframes
  const keyframePattern = /@keyframes\s+([a-zA-Z-_]+)/g;
  uniqueCode = uniqueCode.replace(keyframePattern, (match, animName) => {
    return `@keyframes ${animName}_${uniqueSuffix}`;
  });
  
  // Update animation references in styles
  uniqueCode = uniqueCode.replace(
    /animation(?:-name)?:\s*["']?([a-zA-Z-_]+)["']?/g,
    (match, animName) => {
      return match.replace(animName, `${animName}_${uniqueSuffix}`);
    }
  );
  
  return uniqueCode;
}

/**
 * Generate a unique suffix for template instances
 * Uses a shorter format for readability
 */
export function generateTemplateSuffix(): string {
  // Use timestamp + random, but keep it short
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return suffix;
}