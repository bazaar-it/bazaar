/**
 * Utility to fix duplicate declarations in generated code
 * This is one of the most common auto-fix failures
 * 
 * Common patterns:
 * - Duplicate function declarations (generateStars, etc.)
 * - Duplicate const/let/var declarations
 * - Multiple useState declarations with same name
 */

export function fixDuplicateDeclarations(code: string): string {
  console.log('[DUPLICATE FIX] Starting duplicate declaration check');
  
  // Track all declared identifiers and their line numbers
  const declarations = new Map<string, number[]>();
  const lines = code.split('\n');
  
  // Patterns to match different declaration types
  const patterns = [
    // Function declarations: function name() or const name = function()
    /^\s*(?:export\s+)?(?:default\s+)?function\s+(\w+)/,
    // Arrow functions and regular const/let/var
    /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/,
    // Destructuring (only capture the whole destructuring, not individual vars)
    /^\s*(?:export\s+)?(?:const|let|var)\s+\{([^}]+)\}\s*=/,
  ];
  
  // First pass: identify all declarations
  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        if (pattern.source.includes('{')) {
          // Handle destructuring - extract individual identifiers
          const destructured = match[1];
          const vars = destructured.split(',').map(v => v.trim().split(':')[0].trim());
          vars.forEach(varName => {
            if (!declarations.has(varName)) {
              declarations.set(varName, []);
            }
            declarations.get(varName)!.push(index);
          });
        } else {
          // Regular declaration
          const identifier = match[1];
          if (!declarations.has(identifier)) {
            declarations.set(identifier, []);
          }
          declarations.get(identifier)!.push(index);
        }
        break; // Only match one pattern per line
      }
    }
  });
  
  // Find duplicates - but EXCLUDE common iterator variables that are likely in different scopes
  const scopeSafeVariables = new Set(['x', 'y', 'i', 'j', 'k', 'index', 'item', 'el', 'element', 'val', 'value', 'key']);
  const duplicates = new Map<string, number[]>();
  
  declarations.forEach((lineNumbers, identifier) => {
    if (lineNumbers.length > 1) {
      // Skip common iterator variables - they're likely in different scopes
      if (scopeSafeVariables.has(identifier)) {
        console.log(`[DUPLICATE FIX] Skipping "${identifier}" - likely in different scopes (found on lines: ${lineNumbers.map(n => n + 1).join(', ')})`);
        return;
      }
      
      duplicates.set(identifier, lineNumbers);
      console.warn(`[DUPLICATE FIX] Found duplicate declaration of "${identifier}" on lines: ${lineNumbers.map(n => n + 1).join(', ')}`);
    }
  });
  
  // If no duplicates, return original code
  if (duplicates.size === 0) {
    console.log('[DUPLICATE FIX] No duplicate declarations found');
    return code;
  }
  
  // Second pass: remove duplicate declarations (keep first occurrence)
  const linesToRemove = new Set<number>();
  duplicates.forEach((lineNumbers, identifier) => {
    // Keep the first occurrence, remove the rest
    const [first, ...rest] = lineNumbers;
    rest.forEach(lineNum => {
      linesToRemove.add(lineNum);
      console.warn(`[DUPLICATE FIX] Removing duplicate "${identifier}" from line ${lineNum + 1}`);
    });
  });
  
  // Filter out the duplicate lines
  const fixedLines = lines.filter((_, index) => !linesToRemove.has(index));
  const fixedCode = fixedLines.join('\n');
  
  console.log(`[DUPLICATE FIX] Removed ${linesToRemove.size} duplicate declarations`);
  
  // Special case: if we have both 'frame' and 'currentFrame' from useCurrentFrame()
  // This is a common error where the AI creates both
  if (fixedCode.includes('const frame = useCurrentFrame()') && 
      fixedCode.includes('const currentFrame = useCurrentFrame()')) {
    console.warn('[DUPLICATE FIX] Found both frame and currentFrame from useCurrentFrame - removing currentFrame');
    return fixedCode.replace(/^\s*const currentFrame = useCurrentFrame\(\);?\s*$/gm, '');
  }
  
  return fixedCode;
}

/**
 * Fix specific known duplicate patterns that cause issues
 */
export function fixKnownDuplicatePatterns(code: string): string {
  let fixed = code;
  
  // Pattern 1: Duplicate generateStars function (very common)
  const generateStarsMatches = [...fixed.matchAll(/function generateStars\(\)/g)];
  if (generateStarsMatches.length > 1) {
    console.warn('[DUPLICATE FIX] Multiple generateStars functions detected, keeping only first');
    // Keep first, remove others
    let count = 0;
    fixed = fixed.replace(/function generateStars\(\)[\s\S]*?\n\}/g, (match) => {
      count++;
      return count === 1 ? match : ''; // Keep first, remove rest
    });
  }
  
  // Pattern 2: Duplicate useState declarations with same variable name
  const useStatePattern = /const\s+\[(\w+),\s*set\w+\]\s*=\s*window\.React\.useState/g;
  const useStateVars = new Map<string, number>();
  let match;
  
  while ((match = useStatePattern.exec(fixed)) !== null) {
    const varName = match[1];
    useStateVars.set(varName, (useStateVars.get(varName) || 0) + 1);
  }
  
  useStateVars.forEach((count, varName) => {
    if (count > 1) {
      console.warn(`[DUPLICATE FIX] Multiple useState for "${varName}" detected`);
      // This is complex to fix automatically, log for now
    }
  });
  
  return fixed;
}

/**
 * Main export - applies all duplicate fixes
 */
export function fixAllDuplicates(code: string): string {
  let fixed = code;
  
  // First fix known patterns
  fixed = fixKnownDuplicatePatterns(fixed);
  
  // Then fix general duplicates
  fixed = fixDuplicateDeclarations(fixed);
  
  return fixed;
}