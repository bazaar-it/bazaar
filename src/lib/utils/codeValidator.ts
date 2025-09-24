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
 * Check for CRITICAL errors only - things that will actually break
 */
function checkReferences(code: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check for currentFrame instead of frame (breaks Remotion conventions)
  if (/const\s+currentFrame\s*=\s*useCurrentFrame\(\)/.test(code)) {
    errors.push({
      type: 'reference',
      message: 'Using "currentFrame" breaks Remotion conventions. Use "frame" instead.',
      severity: 'error',
    });
  }
  
  // Check for duplicate fps in spring (causes syntax error)
  if (/spring\s*\(\s*\{[^}]*fps\s*,\s*fps\s*,/.test(code)) {
    errors.push({
      type: 'reference',
      message: 'Duplicate fps parameter in spring() call',
      severity: 'error',
    });
  }
  
  // DISABLED: Don't check for undefined variables - too many false positives
  // The generation should handle this, not post-processing
  
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
 * Apply ONLY critical fixes that actually break Remotion
 * Everything else should be handled during generation, not after
 */
export function applyTemplateFixes(code: string): { code: string; fixes: string[] } {
  let fixedCode = code;
  const fixesApplied: string[] = [];
  
  console.log('[CODE VALIDATOR] Applying critical fixes only');
  
  // 0. Strip markdown fences and narrative preambles
  const fenceRegex = /```(?:jsx|tsx|javascript)?\s*([\s\S]*?)```/i;
  const fenceMatch = fixedCode.match(fenceRegex);
  if (fenceMatch) {
    fixedCode = fenceMatch[1].trim();
    fixesApplied.push('Removed markdown code fences');
  } else if (fixedCode.includes('```')) {
    fixedCode = fixedCode.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trimStart();
    fixesApplied.push('Removed stray markdown fences');
  }

  const preambleRegex = /(const\s+\{|export\s+default|function\s+[A-Z])/;
  const preambleMatch = fixedCode.match(preambleRegex);
  if (preambleMatch && preambleMatch.index && preambleMatch.index > 0) {
    fixedCode = fixedCode.slice(preambleMatch.index).trimStart();
    fixesApplied.push('Removed narrative preamble');
  }

  // 1. Remove the "x" streaming artifact (CRITICAL - corrupts everything)
  const firstLine = fixedCode.split('\n')[0].trim();
  if (firstLine === 'x' || firstLine === 'x;' || firstLine === 'x ') {
    console.error('[CODE VALIDATOR] Removing streaming artifact "x"');
    const lines = fixedCode.split('\n');
    lines.shift();
    fixedCode = lines.join('\n').trim();
    fixesApplied.push('Removed streaming artifact');
  }
  
  // 2. Fix duplicate fps in spring calls (CRITICAL - syntax error)
  const duplicateFpsPattern = /spring\s*\(\s*\{([^}]*?)fps\s*,\s*fps\s*,/g;
  if (duplicateFpsPattern.test(fixedCode)) {
    fixedCode = fixedCode.replace(duplicateFpsPattern, 'spring({$1fps,');
    fixesApplied.push('Fixed duplicate fps parameters');
  }
  
  // 3. Fix currentFrame to frame (CRITICAL - Remotion convention)
  if (/const\s+currentFrame\s*=\s*useCurrentFrame\(\)/.test(fixedCode)) {
    fixedCode = fixedCode.replace(
      /const\s+currentFrame\s*=\s*useCurrentFrame\(\)/g,
      'const frame = useCurrentFrame()'
    );
    fixedCode = fixedCode.replace(/\bcurrentFrame\b/g, 'frame');
    fixesApplied.push('Fixed frame variable naming');
  }
  
  // 4. Ensure duration export exists (CRITICAL - Remotion requirement)
  if (!/export\s+const\s+durationInFrames/.test(fixedCode)) {
    const durationMatch = fixedCode.match(/durationInFrames[_\w]*\s*=\s*(\d+)/);
    const duration = durationMatch ? durationMatch[1] : '150';
    fixedCode += `\n\nexport const durationInFrames = ${duration};`;
    fixesApplied.push('Added duration export');
  }
  
  // 5. Ensure Remotion imports exist (CRITICAL - nothing works without this)
  if (!/const\s*\{[^}]*\}\s*=\s*window\.Remotion/.test(fixedCode)) {
    fixedCode = fixAllRemotionImports(fixedCode);
    fixesApplied.push('Added Remotion imports');
  }
  
  // DISABLED: These "helpful" fixes cause more problems:
  // - fixAllDuplicates: Removes valid variables in different scopes
  // - fixAllUndefinedVariables: Adds variables that break compilation
  // The real fix is proper scene isolation during generation
  
  console.log(`[CODE VALIDATOR] Applied ${fixesApplied.length} critical fixes`);
  
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
