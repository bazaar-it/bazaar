/**
 * Test sanitizeTsx functionality directly without imports
 */
describe('sanitizeTsx', () => {
  // Reimplement the function to test in isolation
  function sanitizeTsx(tsxCode: string): string {
    // The regex needs to handle multi-line correctly - add the global flag
    const safeImportRegex = /^import\s+.*\s+from\s+['"](?:react|remotion|@remotion\/.*)['"]/;
    
    // Split by lines, filter only safe imports
    const lines = tsxCode.split('\n');
    const safeLines = lines.filter(line => {
      const trimmedLine = line.trim();
      const isImport = trimmedLine.startsWith('import ');
      return !isImport || safeImportRegex.test(line);
    });
    
    return safeLines.join('\n');
  }

  it('should allow safe imports', () => {
    const safeImports = [
      `import React from 'react';`,
      `import { AbsoluteFill } from 'remotion';`,
      `import { useTransitions } from '@remotion/transitions';`
    ].join('\n');
    
    const result = sanitizeTsx(safeImports);
    expect(result).toBe(safeImports);
  });
  
  it('should filter out unsafe imports', () => {
    const code = [
      `import React from 'react';`,
      `import fs from 'fs';`,
      `import { exec } from 'child_process';`,
      `import { AbsoluteFill } from 'remotion';`
    ].join('\n');
    
    const expected = [
      `import React from 'react';`,
      `import { AbsoluteFill } from 'remotion';`
    ].join('\n');
    
    const result = sanitizeTsx(code);
    expect(result).toBe(expected);
  });
});

/**
 * Test functionality from buildCustomComponent in isolation
 */
describe('TSX Code Processing Functions', () => {
  // Test sanitizeTsx function
  describe('sanitizeTsx', () => {
    // Reimplement the function to test in isolation
    function sanitizeTsx(tsxCode: string): string {
      // The regex needs to handle multi-line correctly
      const safeImportRegex = /^import\s+.*\s+from\s+['"](?:react|remotion|@remotion\/.*)['"]/;
      
      // Split by lines, filter only safe imports
      const lines = tsxCode.split('\n');
      const safeLines = lines.filter(line => {
        const trimmedLine = line.trim();
        const isImport = trimmedLine.startsWith('import ');
        return !isImport || safeImportRegex.test(line);
      });
      
      return safeLines.join('\n');
    }

    it('should allow safe imports', () => {
      const safeImports = [
        `import React from 'react';`,
        `import { AbsoluteFill } from 'remotion';`,
        `import { useTransitions } from '@remotion/transitions';`
      ].join('\n');
      
      const result = sanitizeTsx(safeImports);
      expect(result).toBe(safeImports);
    });
    
    it('should filter out unsafe imports', () => {
      const code = [
        `import React from 'react';`,
        `import fs from 'fs';`,
        `import { exec } from 'child_process';`,
        `import { AbsoluteFill } from 'remotion';`
      ].join('\n');
      
      const expected = [
        `import React from 'react';`,
        `import { AbsoluteFill } from 'remotion';`
      ].join('\n');
      
      const result = sanitizeTsx(code);
      expect(result).toBe(expected);
    });
  });

  // Test wrapTsxWithGlobals function
  describe('wrapTsxWithGlobals', () => {
    // Reimplement the function to test in isolation
    function wrapTsxWithGlobals(tsxCode: string): string {
      return `
// Ensure React and Remotion are available globally
const React = globalThis.React || require('react');
const { 
  AbsoluteFill, 
  useCurrentFrame, 
  useVideoConfig, 
  spring, 
  interpolate, 
  Sequence,
  Audio,
  Img,
  staticFile,
  Series,
  interpolateColors
} = globalThis.remotion || require('remotion');

// Original component code
${tsxCode}
`;
    }

    it('should wrap TSX code with global React and Remotion references', () => {
      const originalCode = `export default function MyComponent() {
  return <div>Hello world</div>;
}`;
      
      const result = wrapTsxWithGlobals(originalCode);
      
      // Verify the wrapper includes React and Remotion globals
      expect(result).toContain('const React = globalThis.React || require(\'react\')');
      expect(result).toContain('AbsoluteFill');
      expect(result).toContain('useCurrentFrame');
      expect(result).toContain('globalThis.remotion || require(\'remotion\')');
      
      // Verify it includes the original code
      expect(result).toContain(originalCode);
    });
  });
}); 