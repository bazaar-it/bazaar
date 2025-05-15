import { describe, it, expect } from '@jest/globals';
import { repairComponentSyntax } from '../repairComponentSyntax';
import { preprocessTsx } from '../../utils/tsxPreprocessor';

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
    expect(code.split('const frame = useCurrentFrame();').length - 1).toBe(2);
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
    expect(fixes.length).toBe(5);
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

  it('should handle fps variable redeclaration in destructuring', () => {
    const input = `
      // First declaration with destructuring
      const { width, height, fps, durationInFrames } = useVideoConfig();
      
      function TestComponent() {
        // Redeclares fps incorrectly in another destructuring
        const { fps, width, height } = useVideoConfig();
        
        return (
          <div style={{ width, height }}>
            FPS: {fps}, Duration: {durationInFrames}
          </div>
        );
      }
      
      export default TestComponent;
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Removed duplicate fps declarations");
    expect(fixedSyntaxErrors).toBe(true);
    expect(code).toContain("// Removed duplicate:");
  });

  it('should handle fps variable redeclaration with direct property access', () => {
    const input = `
      // First declaration with destructuring
      const { width, height, fps, durationInFrames } = useVideoConfig();
      
      function TestComponent() {
        // Redeclares fps incorrectly with direct property access
        const fps = useVideoConfig().fps;
        
        return (
          <div style={{ width, height }}>
            FPS: {fps}, Duration: {durationInFrames}
          </div>
        );
      }
      
      export default TestComponent;
    `;
    
    const { code, fixes, fixedSyntaxErrors } = repairComponentSyntax(input);
    
    expect(fixes).toContain("Removed duplicate fps declarations");
    expect(fixedSyntaxErrors).toBe(true);
    expect(code).toContain("// Removed duplicate: const fps = useVideoConfig().fps;");
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
  // Additional test cases...
  // ... existing test cases ...
}

// ... rest of the file ... 