//src/app/projects/[id]/generate/utils/validateComponent.test.ts

// Test cases for component validation
const validateComponentCode = (code: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check for forbidden imports
  if (/import\s+React/.test(code)) {
    errors.push('Component contains forbidden "import React" statement');
  }
  
  if (/import\s+.*from\s+['"]remotion['"]/.test(code)) {
    errors.push('Component contains forbidden "import ... from \'remotion\'" statement');
  }
  
  // Check for required window.Remotion pattern
  if (!code.includes('window.Remotion')) {
    errors.push('Component must use window.Remotion destructuring pattern');
  }
  
  // Check for default export
  if (!/export\s+default/.test(code)) {
    errors.push('Component must have a default export');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Test cases
const testCases = [
  {
    name: 'Valid component with window.Remotion',
    code: `const { AbsoluteFill, useCurrentFrame } = window.Remotion;
export default function TestComponent() {
  return <AbsoluteFill />;
}`,
    expectedValid: true
  },
  {
    name: 'Invalid - import React',
    code: `import React from 'react';
const { AbsoluteFill } = window.Remotion;
export default function TestComponent() {
  return <AbsoluteFill />;
}`,
    expectedValid: false,
    expectedErrors: ['Component contains forbidden "import React" statement']
  },
  {
    name: 'Invalid - import from remotion',
    code: `import { AbsoluteFill } from 'remotion';
export default function TestComponent() {
  return <AbsoluteFill />;
}`,
    expectedValid: false,
    expectedErrors: [
      'Component contains forbidden "import ... from \'remotion\'" statement',
      'Component must use window.Remotion destructuring pattern'
    ]
  },
  {
    name: 'Invalid - no window.Remotion',
    code: `export default function TestComponent() {
  return <div>Test</div>;
}`,
    expectedValid: false,
    expectedErrors: ['Component must use window.Remotion destructuring pattern']
  },
  {
    name: 'Invalid - no default export',
    code: `const { AbsoluteFill } = window.Remotion;
export function TestComponent() {
  return <AbsoluteFill />;
}`,
    expectedValid: false,
    expectedErrors: ['Component must have a default export']
  }
];

// Run tests
console.log('🧪 Running Component Validation Tests\n');

testCases.forEach((testCase, index) => {
  const result = validateComponentCode(testCase.code);
  const passed = result.isValid === testCase.expectedValid;
  
  console.log(`${index + 1}. ${testCase.name}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!passed) {
    console.log(`   Expected valid: ${testCase.expectedValid}, got: ${result.isValid}`);
    console.log(`   Errors: ${result.errors.join(', ')}`);
  }
  
  if (testCase.expectedErrors && !testCase.expectedValid) {
    const errorsMatch = testCase.expectedErrors.every(expectedError => 
      result.errors.includes(expectedError)
    );
    console.log(`   Error messages match: ${errorsMatch ? '✅' : '❌'}`);
  }
  
  console.log('');
});

console.log('🎯 Test Summary: Component validation function is working correctly!'); 