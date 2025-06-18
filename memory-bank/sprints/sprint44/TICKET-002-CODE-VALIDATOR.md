# TICKET-002: Implement Code Validation System

## Priority: HIGH
## Status: TODO
## Estimated: 3 hours
## Depends on: TICKET-001

## Objective
Create a validation system that ensures AI-generated code follows the dependency contract and technical rules, preventing broken scenes from reaching users.

## Background
Currently there's no validation after AI generates code. This can lead to:
- Import statements that break at runtime
- Use of unavailable dependencies
- Missing required exports
- Security vulnerabilities

## Implementation Details

### 1. Create Validator Module
**Location**: `src/lib/codegen/code-validator.ts`

```typescript
import { DEPENDENCIES_CONTRACT } from './dependencies-contract';

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: {
    detectedDeps: string[];
    lineCount: number;
    hasExportDefault: boolean;
  };
}

export interface ValidationError {
  type: 'import' | 'require' | 'missing_export' | 'forbidden_pattern' | 'invalid_window_dep';
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  type: 'large_file' | 'complex_transform' | 'performance';
  message: string;
}

export class CodeValidator {
  constructor(private contract = DEPENDENCIES_CONTRACT) {}
  
  validate(code: string, sceneName: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const lines = code.split('\n');
    
    // Check 1: No imports/requires
    this.checkNoImports(code, lines, errors);
    
    // Check 2: Valid export pattern
    this.checkExportPattern(code, sceneName, errors);
    
    // Check 3: Window dependencies
    this.checkWindowDependencies(code, errors);
    
    // Check 4: Forbidden patterns
    this.checkForbiddenPatterns(code, lines, errors);
    
    // Check 5: CSS quoting rules
    this.checkCSSQuoting(code, lines, warnings);
    
    // Check 6: File size
    if (code.length > this.contract.constraints.maxFileSize) {
      warnings.push({
        type: 'large_file',
        message: `File exceeds ${this.contract.constraints.maxFileSize} characters`
      });
    }
    
    // Metadata
    const metadata = {
      detectedDeps: this.extractWindowDeps(code),
      lineCount: lines.length,
      hasExportDefault: code.includes('export default function')
    };
    
    return {
      ok: errors.length === 0,
      errors,
      warnings,
      metadata
    };
  }
  
  private checkNoImports(code: string, lines: string[], errors: ValidationError[]) {
    // Check for import statements
    lines.forEach((line, index) => {
      if (/^\s*import\s+/.test(line)) {
        errors.push({
          type: 'import',
          message: 'Import statements are not allowed. Use window.* pattern instead.',
          line: index + 1
        });
      }
    });
    
    // Check for require()
    if (/require\s*\(/.test(code)) {
      errors.push({
        type: 'require',
        message: 'require() is not allowed. Use window.* pattern instead.'
      });
    }
  }
  
  private checkExportPattern(code: string, sceneName: string, errors: ValidationError[]) {
    const expectedExport = this.contract.rules.functionSignature
      .replace('{{SCENE_NAME}}', sceneName);
    
    if (!code.includes('export default function')) {
      errors.push({
        type: 'missing_export',
        message: `Missing required export: ${expectedExport}`
      });
    }
  }
  
  private checkWindowDependencies(code: string, errors: ValidationError[]) {
    const windowRefs = code.match(/window\.(\w+)/g) || [];
    const enabledDeps = Object.keys(this.contract.windowDeps)
      .filter(dep => this.contract.windowDeps[dep].enabled);
    
    windowRefs.forEach(ref => {
      const depName = ref.split('.')[1];
      if (!enabledDeps.includes(depName)) {
        errors.push({
          type: 'invalid_window_dep',
          message: `window.${depName} is not available. Available: ${enabledDeps.join(', ')}`
        });
      }
    });
  }
  
  private checkForbiddenPatterns(code: string, lines: string[], errors: ValidationError[]) {
    this.contract.constraints.forbiddenPatterns.forEach(pattern => {
      if (code.includes(pattern)) {
        errors.push({
          type: 'forbidden_pattern',
          message: `Forbidden pattern detected: ${pattern}`
        });
      }
    });
  }
  
  private checkCSSQuoting(code: string, lines: string[], warnings: ValidationWarning[]) {
    // Simple check for unquoted numeric CSS values
    const cssPattern = /style=\{\{[^}]*\}\}/g;
    const matches = code.match(cssPattern) || [];
    
    matches.forEach(match => {
      if (/fontSize:\s*\d+[^"']/.test(match) || /padding:\s*\d+[^"']/.test(match)) {
        warnings.push({
          type: 'performance',
          message: 'CSS numeric values should be quoted (e.g., fontSize: "24px")'
        });
      }
    });
  }
  
  private extractWindowDeps(code: string): string[] {
    const deps = new Set<string>();
    const matches = code.match(/window\.(\w+)/g) || [];
    matches.forEach(match => {
      deps.add(match.split('.')[1]);
    });
    return Array.from(deps);
  }
}

// Convenience function for one-shot validation
export function validateCode(
  code: string, 
  sceneName: string,
  contract = DEPENDENCIES_CONTRACT
): ValidationResult {
  const validator = new CodeValidator(contract);
  return validator.validate(code, sceneName);
}
```

### 2. Create Validator Tests
**Location**: `src/lib/codegen/__tests__/code-validator.test.ts`

Test cases for all validation rules.

### 3. Integration Points

1. **Code Generator** - After LLM response:
   ```typescript
   const validation = validateCode(generatedCode, functionName);
   if (!validation.ok) {
     // Log errors
     // Optionally retry with errors in context
   }
   ```

2. **Edit Tools** - Same pattern

3. **API Endpoints** - Validate before saving to storage

## Validation Rules Summary

1. **No imports/requires** - Must use window.* pattern
2. **Export pattern** - Must match contract function signature
3. **Window deps** - Only enabled dependencies allowed
4. **Forbidden patterns** - No eval, Function(), innerHTML, etc.
5. **CSS quoting** - Warn if numeric values unquoted
6. **File size** - Warn if exceeds limit

## Testing Strategy
1. Unit tests for each validation rule
2. Integration test with real generated code
3. Test with contract changes (enable/disable deps)
4. Performance test with large files

## Success Criteria
- [ ] Validator catches all rule violations
- [ ] Clear error messages with line numbers
- [ ] Performance: <10ms for typical files
- [ ] Integration with code generator working
- [ ] Zero false positives on valid code

## Future Enhancements
- AST-based validation for deeper analysis
- Auto-fix capability for common issues
- Telemetry on validation failures
- Custom rules per scene type