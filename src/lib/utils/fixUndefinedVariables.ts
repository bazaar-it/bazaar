/**
 * Utility to fix undefined variables in generated code
 * Common patterns from production errors:
 * - card3X, cardY, etc. (missing position variables)
 * - generateStars, generateParticles (missing function definitions)
 * - Missing array indices or data structures
 */

interface UndefinedVariable {
  name: string;
  type: 'position' | 'function' | 'array' | 'object' | 'unknown';
  suggestedFix: string;
}

export function detectUndefinedVariables(code: string): UndefinedVariable[] {
  const undefined: UndefinedVariable[] = [];
  
  // Pattern 1: Look for position variables (cardX, card2Y, etc.)
  const positionVarPattern = /\b(card\d*[XY]|position[XY]|offset[XY]|spacing[XY])\b/g;
  const matches = code.matchAll(positionVarPattern);
  
  for (const match of matches) {
    const varName = match[1];
    // Check if it's defined
    const definitionPattern = new RegExp(`(const|let|var)\\s+${varName}\\s*=`, 'g');
    if (!definitionPattern.test(code)) {
      // It's used but not defined
      const isX = varName.includes('X') || varName.endsWith('X');
      const isY = varName.includes('Y') || varName.endsWith('Y');
      
      undefined.push({
        name: varName,
        type: 'position',
        suggestedFix: isX ? '0' : isY ? '0' : '0',
      });
      
      console.warn(`[UNDEFINED FIX] Found undefined position variable: ${varName}`);
    }
  }
  
  // Pattern 2: Function calls without definitions (generateStars, etc.)
  const functionCallPattern = /\b(generate\w+|create\w+|render\w+)\s*\(/g;
  const funcMatches = code.matchAll(functionCallPattern);
  
  for (const match of funcMatches) {
    const funcName = match[1];
    // Check if function is defined
    const funcDefPattern = new RegExp(`(function\\s+${funcName}|const\\s+${funcName}\\s*=.*=>)`, 'g');
    if (!funcDefPattern.test(code)) {
      undefined.push({
        name: funcName,
        type: 'function',
        suggestedFix: `const ${funcName} = () => []`, // Return empty array by default
      });
      
      console.warn(`[UNDEFINED FIX] Found undefined function: ${funcName}`);
    }
  }
  
  return undefined;
}

/**
 * Generate default values for common undefined variables
 */
export function generateDefaultValue(varName: string, context: string): string {
  // Position variables (X, Y coordinates)
  if (/[XY]$/.test(varName) || /^(x|y|left|top|right|bottom)/.test(varName)) {
    // Try to infer from context
    if (context.includes('width') && varName.includes('X')) {
      return 'width / 2'; // Center horizontally
    }
    if (context.includes('height') && varName.includes('Y')) {
      return 'height / 2'; // Center vertically
    }
    // Check for card positions - distribute evenly
    const cardMatch = varName.match(/card(\d+)([XY])/);
    if (cardMatch) {
      const index = parseInt(cardMatch[1]) || 1;
      const axis = cardMatch[2];
      if (axis === 'X') {
        return `width * ${index * 0.25}`; // Distribute horizontally
      } else {
        return `height * 0.5`; // Center vertically
      }
    }
    return '0';
  }
  
  // Arrays and lists
  if (/^(items|data|list|array|elements)/.test(varName)) {
    return '[]';
  }
  
  // Objects
  if (/^(config|options|settings|props|state)/.test(varName)) {
    return '{}';
  }
  
  // Numbers
  if (/^(count|index|size|width|height|duration|delay)/.test(varName)) {
    return '0';
  }
  
  // Strings
  if (/^(text|label|title|message|name)/.test(varName)) {
    return '""';
  }
  
  // Booleans
  if (/^(is|has|should|can|will)/.test(varName)) {
    return 'false';
  }
  
  // Functions
  if (context.includes(`${varName}(`)) {
    return `() => null`;
  }
  
  // Default fallback
  return 'undefined';
}

/**
 * Fix undefined variables by adding declarations with sensible defaults
 */
export function fixUndefinedVariables(code: string): string {
  console.log('[UNDEFINED FIX] Starting undefined variable analysis');
  
  // Common patterns from production errors
  const fixes: string[] = [];
  
  // Pattern 1: card3X, card2Y, etc. - position variables
  const cardPositions = code.matchAll(/\b(card\d+[XY])\b/g);
  const definedVars = new Set<string>();
  const undefinedVars = new Set<string>();
  
  // First pass: identify what's defined
  const definitionPattern = /(?:const|let|var)\s+(\w+)\s*=/g;
  let match;
  while ((match = definitionPattern.exec(code)) !== null) {
    definedVars.add(match[1]);
  }
  
  // Second pass: find undefined card positions
  for (const posMatch of cardPositions) {
    const varName = posMatch[1];
    if (!definedVars.has(varName) && !undefinedVars.has(varName)) {
      undefinedVars.add(varName);
      
      // Extract card number and axis
      const parts = varName.match(/card(\d+)([XY])/);
      if (parts) {
        const cardNum = parseInt(parts[1]);
        const axis = parts[2];
        
        if (axis === 'X') {
          // Distribute cards horizontally
          fixes.push(`const ${varName} = width * ${0.2 + cardNum * 0.25};`);
        } else {
          // Center vertically
          fixes.push(`const ${varName} = height * 0.5;`);
        }
        
        console.warn(`[UNDEFINED FIX] Adding default for ${varName}`);
      }
    }
  }
  
  // Pattern 2: generateStars, generateParticles functions
  const functionCalls = code.matchAll(/\b(generate\w+)\s*\(/g);
  const undefinedFuncs = new Set<string>();
  
  for (const funcMatch of functionCalls) {
    const funcName = funcMatch[1];
    if (!definedVars.has(funcName) && !undefinedFuncs.has(funcName)) {
      // Check if it's really undefined (not imported or defined)
      const funcDefPattern = new RegExp(`(function\\s+${funcName}|const\\s+${funcName}\\s*=)`, 'g');
      if (!funcDefPattern.test(code)) {
        undefinedFuncs.add(funcName);
        
        // Create a sensible default based on the name
        if (funcName.includes('Stars') || funcName.includes('Particles')) {
          fixes.push(`
const ${funcName} = () => {
  const items = [];
  for (let i = 0; i < 20; i++) {
    items.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.5,
    });
  }
  return items;
};`);
        } else {
          fixes.push(`const ${funcName} = () => [];`);
        }
        
        console.warn(`[UNDEFINED FIX] Adding default function for ${funcName}`);
      }
    }
  }
  
  // Pattern 3: DISABLED - These generic variable names cause more problems than they solve
  // They collide with existing code and break compilation
  // If we REALLY need to add them, they should have unique suffixes like padding_auto_1
  
  // COMMENTING OUT THE PROBLEMATIC AUTO-ADDING
  /*
  const commonMissing = [
    { name: 'spacing', pattern: /\b(?<!['"`])spacing(?!['"`:])\b/, default: 'const spacing = 20;' },
    { name: 'padding', pattern: /\b(?<!['"`])padding(?!['"`:])\b/, default: 'const padding = 16;' },
    { name: 'margin', pattern: /\b(?<!['"`])margin(?!['"`:])\b/, default: 'const margin = 8;' },
    { name: 'gap', pattern: /\b(?<!['"`])gap(?!['"`:])\b/, default: 'const gap = 12;' },
  ];
  
  for (const { name, pattern, default: defaultValue } of commonMissing) {
    // Check if used as a variable (not in style object)
    // Look for patterns like: padding={padding} or padding: padding (not padding: 16)
    const varUsagePattern = new RegExp(`(?:=\\{${name}\\}|:\\s*${name}(?:\\s|,|\\}))`, 'g');
    
    if (varUsagePattern.test(code) && !definedVars.has(name)) {
      fixes.push(defaultValue);
      console.warn(`[UNDEFINED FIX] Adding default for ${name}`);
    }
  }
  */
  
  // If we MUST add these variables, use unique names to avoid collisions
  // But for now, just skip them entirely since they're breaking everything
  console.log('[UNDEFINED FIX] Skipping padding/margin/gap auto-generation - causes too many conflicts');
  
  if (fixes.length === 0) {
    console.log('[UNDEFINED FIX] No undefined variables detected');
    return code;
  }
  
  console.log(`[UNDEFINED FIX] Adding ${fixes.length} variable definitions`);
  
  // Insert fixes after the Remotion destructuring but before the component
  const componentMatch = code.match(/(export\s+default\s+function\s+\w+)/);
  if (componentMatch) {
    const componentStart = code.indexOf(componentMatch[0]);
    const beforeComponent = code.substring(0, componentStart);
    const fromComponent = code.substring(componentStart);
    
    return beforeComponent + '\n// Auto-generated defaults for undefined variables\n' + 
           fixes.join('\n') + '\n\n' + fromComponent;
  }
  
  // Fallback: add at the beginning after imports
  const remotionMatch = code.match(/const\s*\{[^}]*\}\s*=\s*window\.Remotion;?/);
  if (remotionMatch) {
    const afterImports = code.indexOf(remotionMatch[0]) + remotionMatch[0].length;
    return code.substring(0, afterImports) + 
           '\n\n// Auto-generated defaults for undefined variables\n' + 
           fixes.join('\n') + '\n' + 
           code.substring(afterImports);
  }
  
  // Last resort: prepend to code
  return '// Auto-generated defaults for undefined variables\n' + 
         fixes.join('\n') + '\n\n' + code;
}

/**
 * Main export - fix all undefined variable issues
 */
export function fixAllUndefinedVariables(code: string): string {
  return fixUndefinedVariables(code);
}