// src/server/workers/__tests__/repairComponentSyntax.test.ts
import { describe, it, expect } from '@jest/globals';
import { repairComponentSyntax } from '../repairComponentSyntax';
import { preprocessTsx } from '../../src/server/utils/tsxPreprocessor';

describe('repairComponentSyntax', () => {
  it('should fix duplicate frame declarations', () => {
    const input = `
      const frame = useCurrentFrame();
      // Some code
      const frame = useCurrentFrame(); // Duplicate
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Removed duplicate frame declarations");
    expect(fixedSyntaxErrors).toBe(true);
    expect(code).toContain("// Removed duplicate: const frame = useCurrentFrame();");
    expect(code.match(/const\s+frame\s*=\s*useCurrentFrame\(\);/g)?.length).toBe(1);
  });
  
  it('should fix unescaped characters in string literals', () => {
    const input = `
      const svgContent = "<svg><path d='M10 10'></path></svg>";
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Escaped < and > characters in string literals");
    expect(fixedSyntaxErrors).toBe(true);
    expect(code).toContain("&lt;svg&gt;");
  });
  
  it('should add missing exports', () => {
    const input = `
      function MyComponent() {
        return <div>Hello</div>;
      }
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Added missing export default for MyComponent");
    expect(fixedSyntaxErrors).toBe(true);
    expect(code).toContain("export default MyComponent;");
  });
  
  it('should not modify code that has no issues', () => {
    const input = `
      const frame = useCurrentFrame();
      const config = useVideoConfig();
      
      function MyComponent() {
        return (
          <div>
            <h1>Hello World</h1>
            <p>Frame: {frame}</p>
          </div>
        );
      }
      
      export default MyComponent;
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toHaveLength(0);
    expect(fixedSyntaxErrors).toBe(false);
    expect(code).toBe(input);
  });
  
  it('should handle multiple issues at once', () => {
    const input = `
      const frame = useCurrentFrame();
      const config = useVideoConfig();
      
      // Duplicate frame declaration
      const frame = useCurrentFrame();
      
      function MyComponent() {
        // Unescaped SVG in string
        const svgCode = "<svg><circle cx='50' cy='50' r='40'></circle></svg>";
        
        return (
          <div>
            <h1>Component Test</h1>
            <div dangerouslySetInnerHTML={{ __html: svgCode }} />
          </div>
        );
      }
      // Missing export
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Removed duplicate frame declarations");
    expect(fixes).toContain("Escaped < and > characters in string literals");
    expect(fixes).toContain("Added missing export default for MyComponent");
    expect(fixedSyntaxErrors).toBe(true);
    expect(fixes.length).toBe(3);
  });
  
  it('should detect potential missing closing tags', () => {
    const input = `
      function BadComponent() {
        return (
          <div>
            <h1>Missing Tag
            <p>This paragraph is not closed
            <span>This span is fine</span>
          </div>
        );
      }
      
      export default BadComponent;
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Detected potential missing closing tag for <h1>");
    expect(fixes).toContain("Detected potential missing closing tag for <p>");
  });
  
  it('should handle config variable redeclaration', () => {
    const input = `
      const frame = useCurrentFrame();
      const config = useVideoConfig();
      
      function TestComponent() {
        // Redeclares config incorrectly
        const config = useVideoConfig();
        
        return (
          <div style={{ width: config.width, height: config.height }}>
            Frame: {frame}
          </div>
        );
      }
      
      export default TestComponent;
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Removed duplicate config declarations");
    expect(fixedSyntaxErrors).toBe(true);
    expect(code).toContain("// Removed duplicate: const config = useVideoConfig();");
  });
});

/**
 * Test suite for the TSX preprocessor (tsxPreprocessor.ts) that fixes common syntax issues
 * in LLM-generated Remotion components.
 * 
 * These tests validate that the preprocessor can handle all the error cases we've identified
 * in the component generation pipeline.
 */

// Test cases for component syntax errors
const TEST_CASES = {
  // Variable redeclaration
  redeclaration: `
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const frame = useCurrentFrame(); // First declaration
const videoConfig = useVideoConfig();

export default function TestComponent() {
  const frame = useCurrentFrame(); // Duplicate declaration
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div style={{color: 'white'}}>Frame: {frame}</div>
    </AbsoluteFill>
  );
}`,

  // Unclosed SVG tags
  unclosedTags: `
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

export default function TestComponent() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <svg width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red"
        <rect x="20" y="20" width="60" height="60" fill="blue"
      </svg>
    </AbsoluteFill>
  );
}`,

  // Unescaped HTML in string literals
  unescapedHtml: `
import { AbsoluteFill } from 'remotion';
import React from 'react';

export default function TestComponent() {
  // String with unescaped HTML
  const svgContent = "<svg><circle cx='50' cy='50' r='40'/></svg>";
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div dangerouslySetInnerHTML={{__html: svgContent}} />
    </AbsoluteFill>
  );
}`,

  // Missing export
  missingExport: `
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

// No export keyword
function TestComponent() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div style={{color: 'white'}}>Frame: {frame}</div>
    </AbsoluteFill>
  );
}
// Missing window.__REMOTION_COMPONENT assignment
`,

  // Multiple issues combined
  multipleIssues: `
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const frame = useCurrentFrame();
const videoConfig = useVideoConfig();

// No export, variable redeclaration, unclosed tags, unescaped HTML
function TestComponent() {
  const frame = useCurrentFrame(); // Duplicate
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <svg width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red"
      </svg>
      <div dangerouslySetInnerHTML={{__html: "<div>Test</div>"}} />
    </AbsoluteFill>
  );
}`
};

/**
 * Expected functionality for the TSX preprocessor:
 * 
 * - Should fix variable redeclarations (frame, videoConfig)
 * - Should fix unclosed JSX/SVG tags
 * - Should escape HTML in string literals
 * - Should add missing exports
 * - Should add window.__REMOTION_COMPONENT assignment
 * 
 * The implementation should report each issue fixed and return modified code
 * that has all these issues corrected.
 */

describe('TSX Preprocessor', () => {
  it('should fix variable redeclaration issues', () => {
    // Arrange
    const code = `
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const frame = useCurrentFrame();
const videoConfig = useVideoConfig();

export default function TestComponent() {
  // This is the problematic line - redeclaring frame
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div style={{color: 'white'}}>Frame: {frame}</div>
    </AbsoluteFill>
  );
}`;
    
    // Act
    const result = preprocessTsx(code, 'TestComponent');
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues).toContain('Fixed duplicate frame declaration (useCurrentFrame)');
    
    // Verify the fix actually works
    const frameMatches = result.code.match(/const\s+frame\s*=\s*useCurrentFrame\(\);/g);
    expect(frameMatches).toHaveLength(1);
  });
  
  it('should fix malformed SVG syntax', () => {
    // Arrange
    const code = `
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const frame = useCurrentFrame();
const videoConfig = useVideoConfig();

export default function TestComponent() {
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <svg width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red"
        <rect x="20" y="20" width="60" height="60" fill="blue"
      </svg>
    </AbsoluteFill>
  );
}`;
    
    // Act
    const result = preprocessTsx(code, 'TestComponent');
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues.some(issue => issue.includes('circle') || issue.includes('rect'))).toBe(true);
  });
  
  it('should escape HTML in string literals', () => {
    // Arrange
    const code = `
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const frame = useCurrentFrame();
const videoConfig = useVideoConfig();

export default function TestComponent() {
  // This string has unescaped < and > characters
  const svgContent = "<svg><circle cx='50' cy='50' r='40'/></svg>";
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div dangerouslySetInnerHTML={{__html: svgContent}} />
    </AbsoluteFill>
  );
}`;
    
    // Act
    const result = preprocessTsx(code, 'TestComponent');
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues).toContain('Fixed unescaped HTML characters in string literal');
    expect(result.code).toContain('&lt;svg&gt;');
  });
  
  it('should add missing export statement', () => {
    // Arrange
    const code = `
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const frame = useCurrentFrame();
const videoConfig = useVideoConfig();

export default function TestComponent() {
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div>Test</div>
    </AbsoluteFill>
  );
}`;
    
    // Act
    const result = preprocessTsx(code, 'TestComponent');
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues).toContain('Added missing default export for TestComponent');
    expect(result.code).toContain('export default TestComponent');
  });
  
  it('should add missing window.__REMOTION_COMPONENT assignment', () => {
    // Arrange
    const code = `
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const frame = useCurrentFrame();
const videoConfig = useVideoConfig();

export default function TestComponent() {
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <div>Test</div>
    </AbsoluteFill>
  );
}`;
    
    // Act
    const result = preprocessTsx(code, 'TestComponent');
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues).toContain('Added missing window.__REMOTION_COMPONENT assignment');
    expect(result.code).toContain('window.__REMOTION_COMPONENT = TestComponent');
  });
  
  it('should handle multiple issues simultaneously', () => {
    // Arrange
    const code = `
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

const frame = useCurrentFrame();
const videoConfig = useVideoConfig();

function TestComponent() {
  const frame = useCurrentFrame(); // duplicate
  
  return (
    <AbsoluteFill style={{backgroundColor: 'blue'}}>
      <svg width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red"
      </svg>
      <div dangerouslySetInnerHTML={{__html: "<div>Test</div>"}} />
    </AbsoluteFill>
  );
}`;
    
    // Act
    const result = preprocessTsx(code, 'TestComponent');
    
    // Assert
    expect(result.fixed).toBe(true);
    expect(result.issues.length).toBeGreaterThan(3); // Should find multiple issues
    expect(result.code).toContain('export default TestComponent');
    expect(result.code).toContain('window.__REMOTION_COMPONENT');
    expect(result.code).not.toContain('const frame = useCurrentFrame(); // duplicate');
  });
}); 