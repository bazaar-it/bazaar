# Complete Testing Guide - Code Validation System

## 🧪 Testing Overview

This guide provides comprehensive testing procedures for the Sprint 98 code validation implementation.

## 1. Unit Testing

### Running Existing Tests

```bash
# Run validation tests
npm test -- src/lib/utils/__tests__/codeValidation.test.ts

# Run with coverage
npm test -- src/lib/utils/__tests__/codeValidation.test.ts --coverage

# Watch mode for development
npm test -- src/lib/utils/__tests__/codeValidation.test.ts --watch
```

### Current Test Status
- ✅ **10/12 tests passing** (83% success rate)
- ✅ All individual fix utilities work correctly
- ⚠️ 2 complex integration tests need refinement

### Test Categories

#### ✅ Working Tests
1. X variable bug removal
2. Duplicate function declarations
3. Duplicate const declarations  
4. Missing Remotion imports
5. Spring fps parameter fixes
6. Undefined position variables
7. Missing function generation
8. CurrentFrame variable naming
9. Missing duration export

#### ⚠️ Failing Tests
1. Complex multi-error scenario (spring fps pattern matching)
2. Production-like error combinations

## 2. Manual Testing Procedures

### 2.1 Basic Validation Testing

Create test files in `src/lib/utils/__tests__/manual/`:

```typescript
// test-x-bug.ts
const testXBug = `x
const { AbsoluteFill } = window.Remotion;
export default function Scene() {
  return <AbsoluteFill />;
}`;

import { validateAndFixCode } from '../codeValidator';
const result = validateAndFixCode(testXBug);
console.log('Fixed:', !result.fixedCode?.includes('x\n'));
```

### 2.2 Production Error Pattern Testing

Test with actual error patterns from Sprint 98 analysis:

```bash
# Create test runner
node -e "
const { validateAndFixCode } = require('./src/lib/utils/codeValidator.ts');

// Test patterns from production errors
const testCases = [
  'x\nconst scene = () => null;',
  'function generateStars(){} function generateStars(){}',
  'const scale = spring({ frame, config: {} });',
  'return <div style={{ left: card3X }} />;'
];

testCases.forEach((code, i) => {
  const result = validateAndFixCode(code);
  console.log(\`Test \${i+1}: \${result.isValid ? 'PASS' : 'FAIL'}\`);
  console.log('Fixes applied:', result.fixesApplied);
});
"
```

## 3. Integration Testing

### 3.1 End-to-End Pipeline Testing

Test the complete generation → validation → fix pipeline:

```typescript
// Create test in src/lib/utils/__tests__/integration/
import { UnifiedCodeProcessor } from '~/tools/add/add_helpers/CodeGeneratorNEW';

describe('Integration Testing', () => {
  it('should handle complete generation pipeline', async () => {
    const processor = new UnifiedCodeProcessor();
    
    // Test with prompt that typically generates problematic code
    const input = {
      prompt: 'Create animated particles with generateStars function',
      format: { width: 1920, height: 1080 },
      previousScenes: []
    };
    
    const result = await processor.generateCode(input);
    
    // Verify code is valid and fixes were applied
    expect(result.code).toBeDefined();
    expect(result.code).not.toContain('x\n');
    expect(result.code).toContain('export const durationInFrames');
  });
});
```

### 3.2 Auto-Fix Loop Prevention Testing

```typescript
// Test infinite loop prevention
describe('Auto-Fix Loop Prevention', () => {
  it('should not exceed 3 attempts', async () => {
    // Mock a scene that will consistently fail
    const mockScene = {
      id: 'test-scene',
      tsxCode: 'invalid syntax here',
    };
    
    const attemptCounts = [];
    
    // Hook into the auto-fix system
    const originalExecuteAutoFix = executeAutoFix;
    executeAutoFix = jest.fn().mockImplementation((...args) => {
      attemptCounts.push(args[2]); // attempt number
      throw new Error('Mock failure');
    });
    
    // Trigger auto-fix
    await triggerAutoFix(mockScene);
    
    // Verify max 3 attempts
    expect(Math.max(...attemptCounts)).toBeLessThanOrEqual(3);
    
    // Restore original
    executeAutoFix = originalExecuteAutoFix;
  });
});
```

## 4. Performance Testing

### 4.1 Validation Performance Benchmarks

```typescript
// Create performance test
import { performance } from 'perf_hooks';
import { validateAndFixCode } from '../codeValidator';

describe('Performance Tests', () => {
  it('should complete validation in under 100ms', () => {
    const largeCode = `
    // Generate large test code with multiple issues
    x
    function generateStars() { return []; }
    function generateStars() { return []; }
    const scale = spring({ frame, config: {} });
    `.repeat(10);
    
    const start = performance.now();
    const result = validateAndFixCode(largeCode);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100); // 100ms limit
    expect(result.fixesApplied.length).toBeGreaterThan(0);
  });
  
  it('should handle complex multi-fix scenarios efficiently', () => {
    const complexCode = generateComplexTestCode();
    
    const start = performance.now();
    const result = validateAndFixCode(complexCode);
    const duration = performance.now() - start;
    
    console.log(`Complex validation took: ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(200); // Allow more time for complex cases
  });
});
```

### 4.2 Memory Usage Testing

```typescript
// Test memory usage doesn't grow excessively
describe('Memory Tests', () => {
  it('should not leak memory during repeated validations', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Run validation 1000 times
    for (let i = 0; i < 1000; i++) {
      validateAndFixCode('x\nconst test = () => null;');
    }
    
    global.gc?.(); // Force garbage collection if available
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;
    
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
  });
});
```

## 5. Production Testing

### 5.1 Error Analytics Dashboard Testing

```bash
# Access admin panel (requires admin permissions)
# Navigate to: http://localhost:3000/admin/error-analytics

# Test scenarios:
1. Generate scenes with known problematic patterns
2. Verify auto-fix attempts show in dashboard
3. Confirm attempt counts never exceed 3
4. Check error categorization accuracy
```

### 5.2 Live Production Monitoring

```sql
-- Query production database for validation metrics
-- Use MCP tool: mcp__pg-prod__query

-- Check auto-fix attempt patterns
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_attempts,
  COUNT(DISTINCT chat_id) as unique_chats,
  AVG(CASE WHEN content LIKE '%attempt 1%' THEN 1
           WHEN content LIKE '%attempt 2%' THEN 2  
           WHEN content LIKE '%attempt 3%' THEN 3
           ELSE 0 END) as avg_attempts
FROM messages 
WHERE content LIKE 'Fixing%' 
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 5.3 Success Rate Monitoring

```sql
-- Monitor success patterns after fixes
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_generations,
  COUNT(CASE WHEN content LIKE '%Scene completed successfully%' THEN 1 END) as successful,
  ROUND(
    COUNT(CASE WHEN content LIKE '%Scene completed successfully%' THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as success_rate_percent
FROM messages 
WHERE role = 'assistant'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 6. Regression Testing

### 6.1 Before/After Comparisons

```typescript
// Test that fixes don't break working code
describe('Regression Tests', () => {
  const workingCodes = [
    `const { AbsoluteFill } = window.Remotion;
     export default function Scene() { return null; }
     export const durationInFrames = 150;`,
    
    `const { spring, useCurrentFrame, useVideoConfig } = window.Remotion;
     export default function Scene() {
       const frame = useCurrentFrame();
       const { fps } = useVideoConfig();
       const scale = spring({ frame, fps, config: {} });
       return null;
     }`,
  ];
  
  workingCodes.forEach((code, index) => {
    it(`should not modify working code ${index + 1}`, () => {
      const result = validateAndFixCode(code);
      
      // Should be valid and not significantly changed
      expect(result.isValid).toBe(true);
      expect(result.fixesApplied.length).toBe(0); // No fixes needed
      expect(result.fixedCode).toEqual(code.trim()); // Unchanged
    });
  });
});
```

## 7. Stress Testing

### 7.1 High Volume Testing

```bash
# Create stress test script
cat > stress-test.js << 'EOF'
const { validateAndFixCode } = require('./src/lib/utils/codeValidator');

console.log('Starting stress test...');

const testCodes = [
  'x\nconst test = () => null;',
  'function duplicate(){} function duplicate(){}',
  'const scale = spring({ frame });',
  'const pos = card1X + card2Y;'
];

const startTime = Date.now();

for (let i = 0; i < 1000; i++) {
  const code = testCodes[i % testCodes.length];
  const result = validateAndFixCode(code);
  
  if (i % 100 === 0) {
    console.log(`Processed ${i} validations...`);
  }
}

const duration = Date.now() - startTime;
console.log(`Completed 1000 validations in ${duration}ms`);
console.log(`Average: ${duration/1000}ms per validation`);
EOF

node stress-test.js
```

## 8. Manual Validation Checklist

### ✅ Pre-Deployment Checklist

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Performance benchmarks met (<100ms)
- [ ] Memory usage stable
- [ ] Error analytics dashboard working
- [ ] 3-attempt limit enforced
- [ ] Circuit breaker functional
- [ ] Logging comprehensive
- [ ] No infinite loops possible

### ✅ Post-Deployment Validation

- [ ] Monitor success rates (target: 80%+)
- [ ] Check auto-fix attempt distributions
- [ ] Verify no attempts exceed 3
- [ ] Monitor performance metrics
- [ ] Watch for new error patterns
- [ ] Confirm user experience improved

## 9. Troubleshooting Guide

### Common Issues

1. **Tests Failing Locally**
   ```bash
   # Clear node modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Run specific test
   npm test -- src/lib/utils/__tests__/codeValidation.test.ts --verbose
   ```

2. **Performance Issues**
   ```bash
   # Check for memory leaks
   node --inspect --expose-gc test-performance.js
   ```

3. **Production Monitoring Not Working**
   - Verify MCP database connections
   - Check admin panel permissions
   - Confirm error message patterns in queries

## 10. Future Test Expansion

### New Test Cases to Add

1. **Edge Cases**
   - Empty code strings
   - Very large code blocks
   - Malformed syntax
   - Unicode characters

2. **Real Production Patterns**
   - Export from actual failing scenes
   - Test with user-generated prompts
   - Seasonal/trend-based error patterns

3. **Performance Edge Cases**
   - Deeply nested code structures
   - Very long variable names
   - Extreme indentation patterns

This testing guide ensures comprehensive validation of the code validation system and provides ongoing monitoring capabilities.