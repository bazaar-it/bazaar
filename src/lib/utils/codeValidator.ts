/**
 * Code Validation and Auto-Fix Pipeline
 * 
 * This is the main entry point for validating and fixing generated code.
 * It orchestrates all the individual fix utilities to ensure generated code
 * is valid before being saved or executed.
 * 
 * Based on Sprint 98 analysis showing 0% auto-fix success rate,
 * this implements template-based fixes for the most common issues.
 */

import { fixAllDuplicates } from './fixDuplicateDeclarations';
import { fixAllRemotionImports } from './fixMissingRemotionImports';
import { fixAllUndefinedVariables } from './fixUndefinedVariables';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  fixedCode?: string;
  fixesApplied: string[];
}

export interface ValidationError {
  type: 'syntax' | 'reference' | 'import' | 'duplicate' | 'undefined';
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

/**
 * Quick syntax validation using Function constructor
 */
function validateSyntax(code: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  try {
    // Try to create a function to check for syntax errors
    new Function('return ' + code);
  } catch (e) {
    const error = e as Error;
    // Parse error message for line/column info
    const match = error.message.match(/at position (\d+)|line (\d+)|column (\d+)/);
    
    errors.push({
      type: 'syntax',
      message: error.message,
      line: match ? parseInt(match[2] || '0') : undefined,
      column: match ? parseInt(match[3] || match[1] || '0') : undefined,
      severity: 'error',
    });
  }
  
  return errors;
}

/**
 * Check for common reference errors without executing
 */
function checkReferences(code: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check for currentFrame instead of frame
  if (/const\s+currentFrame\s*=\s*useCurrentFrame\(\)/.test(code)) {
    errors.push({
      type: 'reference',
      message: 'Using "currentFrame" as variable name causes "Identifier already declared" error. Use "frame" instead.',
      severity: 'error',
    });
  }
  
  // Check for missing fps in spring calls
  if (/spring\s*\(\s*\{\s*frame\s*,\s*(?!fps)/.test(code)) {
    errors.push({
      type: 'reference',
      message: 'spring() calls missing fps parameter',
      severity: 'error',
    });
  }
  
  // Check for undefined position variables
  const positionVars = code.matchAll(/\b(card\d+[XY]|position[XY])\b/g);
  const defined = new Set<string>();
  const defPattern = /(?:const|let|var)\s+(\w+)\s*=/g;
  let match;
  while ((match = defPattern.exec(code)) !== null) {
    defined.add(match[1]);
  }
  
  for (const posMatch of positionVars) {
    const varName = posMatch[1];
    if (!defined.has(varName)) {
      errors.push({
        type: 'undefined',
        message: `Variable "${varName}" is used but not defined`,
        severity: 'error',
      });
    }
  }
  
  return errors;
}

/**
 * Check for missing imports
 */
function checkImports(code: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check if Remotion destructuring exists
  if (!/const\s*\{[^}]*\}\s*=\s*window\.Remotion/.test(code)) {
    errors.push({
      type: 'import',
      message: 'Missing Remotion imports destructuring',
      severity: 'error',
    });
  }
  
  // Check for missing duration export
  if (!/export\s+const\s+durationInFrames/.test(code)) {
    errors.push({
      type: 'reference',
      message: 'Missing durationInFrames export',
      severity: 'error',
    });
  }
  
  return errors;
}

/**
 * Apply template-based fixes in the correct order
 */
export function applyTemplateFixes(code: string): { code: string; fixes: string[] } {
  let fixedCode = code;
  const fixesApplied: string[] = [];
  
  console.log('[CODE VALIDATOR] Starting template-based fixes');
  
  // 1. First fix the "x" variable bug (critical - corrupts everything)
  const firstLine = fixedCode.split('\n')[0].trim();
  if (firstLine === 'x' || firstLine === 'x;' || firstLine === 'x ') {
    console.error('[CODE VALIDATOR] Detected "x" bug - removing first line');
    const lines = fixedCode.split('\n');
    lines.shift();
    fixedCode = lines.join('\n').trim();
    fixesApplied.push('Removed "x" prefix bug');
  }
  
  // 2. Fix duplicate declarations (causes immediate errors)
  const beforeDuplicates = fixedCode;
  fixedCode = fixAllDuplicates(fixedCode);
  if (fixedCode !== beforeDuplicates) {
    fixesApplied.push('Fixed duplicate declarations');
  }
  
  // 3. Fix missing Remotion imports (needed for code to run)
  const beforeImports = fixedCode;
  fixedCode = fixAllRemotionImports(fixedCode);
  if (fixedCode !== beforeImports) {
    fixesApplied.push('Fixed missing Remotion imports');
  }
  
  // 4. Fix undefined variables (add sensible defaults)
  const beforeUndefined = fixedCode;
  fixedCode = fixAllUndefinedVariables(fixedCode);
  if (fixedCode !== beforeUndefined) {
    fixesApplied.push('Added defaults for undefined variables');
  }
  
  // 5. Fix currentFrame naming issue
  if (/const\s+currentFrame\s*=\s*useCurrentFrame\(\)/.test(fixedCode)) {
    fixedCode = fixedCode.replace(
      /const\s+currentFrame\s*=\s*useCurrentFrame\(\)/g,
      'const frame = useCurrentFrame()'
    );
    fixedCode = fixedCode.replace(/\bcurrentFrame\b/g, 'frame');
    fixesApplied.push('Fixed currentFrame variable naming');
  }
  
  // 6. Ensure duration export exists
  if (!/export\s+const\s+durationInFrames/.test(fixedCode)) {
    // Try to find a duration value in the code
    const durationMatch = fixedCode.match(/durationInFrames[_\w]*\s*=\s*(\d+)/);
    const duration = durationMatch ? durationMatch[1] : '150';
    
    // Add export at the end
    fixedCode += `\n\n// Auto-generated duration export\nexport const durationInFrames = ${duration};`;
    fixesApplied.push('Added missing duration export');
  }
  
  console.log(`[CODE VALIDATOR] Applied ${fixesApplied.length} fixes`);
  
  return { code: fixedCode, fixes: fixesApplied };
}

/**
 * Main validation function - validates and fixes code
 */
export function validateAndFixCode(code: string): ValidationResult {
  console.log('[CODE VALIDATOR] Starting validation pipeline');
  
  // Check for empty or invalid code
  if (!code || code.trim().length === 0) {
    return {
      isValid: false,
      errors: [{
        type: 'syntax',
        message: 'Empty or invalid code',
        severity: 'error',
      }],
      fixesApplied: [],
    };
  }
  
  // Apply template fixes first
  const { code: fixedCode, fixes } = applyTemplateFixes(code);
  
  // Now validate the fixed code
  const syntaxErrors = validateSyntax(fixedCode);
  const referenceErrors = checkReferences(fixedCode);
  const importErrors = checkImports(fixedCode);
  
  const allErrors = [...syntaxErrors, ...referenceErrors, ...importErrors];
  
  // Filter out errors that were fixed
  const remainingErrors = allErrors.filter(error => {
    // Check if this error was addressed by our fixes
    if (error.message.includes('currentFrame') && fixes.includes('Fixed currentFrame variable naming')) {
      return false;
    }
    if (error.type === 'import' && fixes.includes('Fixed missing Remotion imports')) {
      return false;
    }
    if (error.type === 'undefined' && fixes.includes('Added defaults for undefined variables')) {
      return false;
    }
    if (error.type === 'duplicate' && fixes.includes('Fixed duplicate declarations')) {
      return false;
    }
    return true;
  });
  
  const isValid = remainingErrors.filter(e => e.severity === 'error').length === 0;
  
  console.log(`[CODE VALIDATOR] Validation complete. Valid: ${isValid}, Errors: ${remainingErrors.length}, Fixes: ${fixes.length}`);
  
  return {
    isValid,
    errors: remainingErrors,
    fixedCode: fixedCode,
    fixesApplied: fixes,
  };
}

/**
 * Validate code without applying fixes (for analysis only)
 */
export function validateOnly(code: string): ValidationResult {
  const syntaxErrors = validateSyntax(code);
  const referenceErrors = checkReferences(code);
  const importErrors = checkImports(code);
  
  const allErrors = [...syntaxErrors, ...referenceErrors, ...importErrors];
  const isValid = allErrors.filter(e => e.severity === 'error').length === 0;
  
  return {
    isValid,
    errors: allErrors,
    fixesApplied: [],
  };
}

/**
 * Check if code needs auto-fix based on common patterns
 */
export function needsAutoFix(code: string): boolean {
  // Check for common issues that need fixing
  const issues = [
    /^x\s*;?\s*$/m, // "x" bug
    /const\s+currentFrame\s*=\s*useCurrentFrame\(\)/, // currentFrame issue
    /spring\s*\(\s*\{\s*frame\s*,\s*(?!fps)/, // Missing fps
    /\b(card\d+[XY])\b/, // Likely undefined position vars
  ];
  
  return issues.some(pattern => pattern.test(code));
}