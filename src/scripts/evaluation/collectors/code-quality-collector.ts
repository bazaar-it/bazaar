//src/scripts/evaluation/collectors/code-quality-collector.ts
import { v4 as uuidv4 } from "uuid";

/**
 * Results from ESLint analysis
 */
export interface ESLintResults {
  /** Number of errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Detailed messages */
  messages: Array<{
    /** Error or warning message */
    message: string;
    /** Rule that was violated */
    ruleId?: string;
    /** Severity (1 = warning, 2 = error) */
    severity: number;
    /** Line number */
    line: number;
    /** Column number */
    column: number;
  }>;
}

/**
 * Common issues in component code
 */
export interface ComponentIssues {
  /** Whether the component is missing an export statement */
  missingExport: boolean;
  /** Whether the component has direct imports instead of using window globals */
  directImports: boolean;
  /** Whether the component has symbol redeclaration issues */
  symbolRedeclaration: boolean;
  /** Whether the component has deprecated API usage */
  deprecatedApiUsage: boolean;
  /** Lines with potential issues */
  issueLines: Array<{
    /** Line number */
    line: number;
    /** Issue description */
    issue: string;
    /** Code snippet */
    code: string;
  }>;
}

/**
 * Quality metrics for generated code
 */
export interface CodeQualityMetrics {
  /** Number of ESLint errors */
  eslintErrorCount: number;
  /** Number of ESLint warnings */
  eslintWarningCount: number;
  /** Whether the component is missing an export statement */
  missingExport: boolean;
  /** Whether the component has direct imports instead of using window globals */
  directImports: boolean;
  /** Whether the component has symbol redeclaration issues */
  symbolRedeclaration: boolean;
  /** Whether the component has deprecated API usage */
  deprecatedApiUsage: boolean;
  /** Code length in characters */
  codeLength: number;
  /** Cyclomatic complexity score */
  complexity?: number;
  /** Number of imports */
  importCount: number;
  /** Detailed issue lines */
  issueLines?: Array<{
    line: number;
    issue: string;
    code: string;
  }>;
}

/**
 * Collects code quality metrics for generated components
 */
export class CodeQualityMetricsCollector {
  /**
   * Analyze code and collect quality metrics
   */
  async analyzeCode(code: string): Promise<CodeQualityMetrics> {
    // Since we can't actually run ESLint here, we'll use simpler analysis
    const eslintResults = this.simulateEslint(code);
    const componentIssues = this.checkComponentIssues(code);
    
    const importCount = this.countImports(code);
    
    return {
      eslintErrorCount: eslintResults.errorCount,
      eslintWarningCount: eslintResults.warningCount,
      missingExport: componentIssues.missingExport,
      directImports: componentIssues.directImports,
      symbolRedeclaration: componentIssues.symbolRedeclaration,
      deprecatedApiUsage: componentIssues.deprecatedApiUsage,
      codeLength: code.length,
      importCount,
      issueLines: componentIssues.issueLines
    };
  }
  
  /**
   * Simulate running ESLint on the code
   * This is a placeholder for the actual ESLint implementation
   */
  simulateEslint(code: string): ESLintResults {
    const results: ESLintResults = {
      errorCount: 0,
      warningCount: 0,
      messages: []
    };
    
    // Check for common issues that would trigger ESLint errors
    const lines = code.split('\n');
    
    // Check for missing semicolons (warning)
    lines.forEach((line, index) => {
      if (line.trim().length > 0 && 
          !line.trim().endsWith(';') && 
          !line.trim().endsWith('{') && 
          !line.trim().endsWith('}') && 
          !line.trim().endsWith(',') &&
          !line.trim().startsWith('//') &&
          !line.trim().startsWith('import') &&
          !line.trim().startsWith('export')) {
        results.warningCount++;
        results.messages.push({
          message: 'Missing semicolon',
          ruleId: 'semi',
          severity: 1,
          line: index + 1,
          column: line.length
        });
      }
    });
    
    // Check for undefined variables (error)
    const variableDefRegex = /const|let|var|function|class/g;
    const definedVars = new Set<string>();
    
    lines.forEach((line) => {
      if (line.match(variableDefRegex)) {
        const match = line.match(/(const|let|var|function|class)\s+([a-zA-Z0-9_]+)/);
        if (match && match[2]) {
          definedVars.add(match[2]);
        }
      }
    });
    
    // Check for potential undefined variables
    const varUsageRegex = /[a-zA-Z0-9_]+/g;
    lines.forEach((line, index) => {
      // Skip comments, imports, and exports
      if (line.trim().startsWith('//') || 
          line.trim().startsWith('import') || 
          line.trim().startsWith('export')) {
        return;
      }
      
      const matches = line.match(varUsageRegex);
      if (matches) {
        matches.forEach(match => {
          // Skip keywords, properties, and standard globals
          if (['const', 'let', 'var', 'function', 'class', 'if', 'else', 'return', 'true', 'false', 'null', 'undefined', 'window', 'document', 'console', 'React', 'Remotion'].includes(match)) {
            return;
          }
          
          // Skip property access (rough approximation)
          if (line.includes(`.${match}`)) {
            return;
          }
          
          if (!definedVars.has(match) && match.length > 2) {
            results.errorCount++;
            results.messages.push({
              message: `'${match}' is not defined`,
              ruleId: 'no-undef',
              severity: 2,
              line: index + 1,
              column: line.indexOf(match)
            });
          }
        });
      }
    });
    
    return results;
  }
  
  /**
   * Check for common issues in component code
   */
  checkComponentIssues(code: string): ComponentIssues {
    const issues: ComponentIssues = {
      missingExport: false,
      directImports: false,
      symbolRedeclaration: false,
      deprecatedApiUsage: false,
      issueLines: []
    };
    
    const lines = code.split('\n');
    
    // Check for export statement
    const hasDefaultExport = code.includes('export default') || code.includes('export default function');
    const hasNamedExport = code.includes('export const') || code.includes('export function');
    
    issues.missingExport = !hasDefaultExport && !hasNamedExport;
    
    if (issues.missingExport) {
      issues.issueLines.push({
        line: 0,
        issue: 'Missing export statement',
        code: 'Component must be exported using "export default" or "export const"'
      });
    }
    
    // Check for direct imports (should use window globals)
    const directImportRegex = /import\s+(?:React|.*?from\s+['"]react['"])|import\s+(?:.*?from\s+['"]remotion['"])/;
    if (directImportRegex.test(code)) {
      issues.directImports = true;
      
      // Find the line numbers
      lines.forEach((line, index) => {
        if (directImportRegex.test(line)) {
          issues.issueLines.push({
            line: index + 1,
            issue: 'Direct import',
            code: line.trim()
          });
        }
      });
    }
    
    // Check for symbol redeclaration
    if (code.includes('window.__REMOTION_COMPONENT') || 
        code.includes('window.ReactDOM') || 
        code.includes('window.React')) {
      issues.symbolRedeclaration = true;
      
      // Find the line numbers
      lines.forEach((line, index) => {
        if (line.includes('window.__REMOTION_COMPONENT') || 
            line.includes('window.ReactDOM') || 
            line.includes('window.React')) {
          issues.issueLines.push({
            line: index + 1,
            issue: 'Symbol redeclaration',
            code: line.trim()
          });
        }
      });
    }
    
    // Check for deprecated API usage
    const deprecatedApiRegex = /useCurrentFrame\(\)/;
    if (deprecatedApiRegex.test(code)) {
      issues.deprecatedApiUsage = true;
      
      // Find the line numbers
      lines.forEach((line, index) => {
        if (deprecatedApiRegex.test(line)) {
          issues.issueLines.push({
            line: index + 1,
            issue: 'Deprecated API usage',
            code: line.trim()
          });
        }
      });
    }
    
    return issues;
  }
  
  /**
   * Count the number of imports in the code
   */
  countImports(code: string): number {
    const importRegex = /import\s+/g;
    const matches = code.match(importRegex);
    return matches ? matches.length : 0;
  }
}
