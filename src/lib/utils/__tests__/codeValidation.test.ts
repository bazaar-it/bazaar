/**
 * Test suite for code validation and fixing utilities
 * Based on actual production errors from Sprint 98 analysis
 */

import { validateAndFixCode } from '../codeValidator';
import { fixAllDuplicates } from '../fixDuplicateDeclarations';
import { fixAllRemotionImports } from '../fixMissingRemotionImports';
import { fixAllUndefinedVariables } from '../fixUndefinedVariables';

describe('Code Validation and Fixing', () => {
  
  describe('X Variable Bug', () => {
    it('should remove standalone x from first line', () => {
      const badCode = `x
const { AbsoluteFill } = window.Remotion;
export default function Scene() {
  return <AbsoluteFill />;
}`;
      
      const result = validateAndFixCode(badCode);
      expect(result.fixedCode).not.toContain('x\n');
      expect(result.fixedCode).toStartWith('const {');
      expect(result.fixesApplied).toContain('Removed "x" prefix bug');
    });
    
    it('should handle x with semicolon', () => {
      const badCode = `x;
const { AbsoluteFill } = window.Remotion;`;
      
      const result = validateAndFixCode(badCode);
      expect(result.fixedCode).not.toMatch(/^x;/);
    });
  });
  
  describe('Duplicate Declarations', () => {
    it('should remove duplicate function declarations', () => {
      const codeWithDuplicates = `
function generateStars() {
  return [];
}

function generateStars() {
  return [];
}

export default function Scene() {
  const stars = generateStars();
  return null;
}`;
      
      const fixed = fixAllDuplicates(codeWithDuplicates);
      const matches = (fixed.match(/function generateStars/g) || []).length;
      expect(matches).toBe(1);
    });
    
    it('should remove duplicate const declarations', () => {
      const codeWithDuplicates = `
const spacing = 20;
const padding = 10;
const spacing = 30;`;
      
      const fixed = fixAllDuplicates(codeWithDuplicates);
      const matches = (fixed.match(/const spacing/g) || []).length;
      expect(matches).toBe(1);
      expect(fixed).toContain('const spacing = 20'); // Should keep first
    });
  });
  
  describe('Missing Remotion Imports', () => {
    it('should add missing spring and fps imports', () => {
      const codeWithoutImports = `
const { AbsoluteFill, useCurrentFrame } = window.Remotion;

export default function Scene() {
  const frame = useCurrentFrame();
  const scale = spring({ frame, config: { damping: 10 } });
  return <AbsoluteFill />;
}`;
      
      const fixed = fixAllRemotionImports(codeWithoutImports);
      expect(fixed).toContain('spring');
      expect(fixed).toContain('useVideoConfig'); // Needed for fps
    });
    
    it('should fix spring calls missing fps parameter', () => {
      const codeWithBadSpring = `
const { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } = window.Remotion;

export default function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, config: { damping: 10 } });
  return <AbsoluteFill />;
}`;
      
      const fixed = fixAllRemotionImports(codeWithBadSpring);
      expect(fixed).toContain('spring({ frame, fps,');
    });
    
    it('should add Img when used but not imported', () => {
      const code = `
const { AbsoluteFill } = window.Remotion;

export default function Scene() {
  return (
    <AbsoluteFill>
      <Img src="test.jpg" />
    </AbsoluteFill>
  );
}`;
      
      const fixed = fixAllRemotionImports(code);
      expect(fixed).toContain('Img');
    });
  });
  
  describe('Undefined Variables', () => {
    it('should add defaults for card position variables', () => {
      const codeWithUndefined = `
export default function Scene() {
  return (
    <div style={{ left: card3X, top: card3Y }}>
      Card
    </div>
  );
}`;
      
      const fixed = fixAllUndefinedVariables(codeWithUndefined);
      expect(fixed).toContain('const card3X');
      expect(fixed).toContain('const card3Y');
    });
    
    it('should add generateStars function when called but not defined', () => {
      const code = `
export default function Scene() {
  const stars = generateStars();
  return null;
}`;
      
      const fixed = fixAllUndefinedVariables(code);
      expect(fixed).toContain('const generateStars');
      expect(fixed).toContain('return items');
    });
  });
  
  describe('CurrentFrame Variable Naming', () => {
    it('should fix currentFrame to frame', () => {
      const badCode = `
const { AbsoluteFill, useCurrentFrame } = window.Remotion;

export default function Scene() {
  const currentFrame = useCurrentFrame();
  const opacity = currentFrame / 30;
  return <AbsoluteFill style={{ opacity }} />;
}`;
      
      const result = validateAndFixCode(badCode);
      expect(result.fixedCode).not.toContain('const currentFrame');
      expect(result.fixedCode).toContain('const frame = useCurrentFrame()');
      expect(result.fixedCode).toContain('frame / 30');
    });
  });
  
  describe('Missing Duration Export', () => {
    it('should add duration export if missing', () => {
      const codeWithoutDuration = `
const { AbsoluteFill } = window.Remotion;

export default function Scene() {
  return <AbsoluteFill />;
}`;
      
      const result = validateAndFixCode(codeWithoutDuration);
      expect(result.fixedCode).toContain('export const durationInFrames');
    });
  });
  
  describe('Complex Real-World Example', () => {
    it('should fix multiple issues in production-like code', () => {
      const complexBadCode = `x
const { AbsoluteFill, useCurrentFrame } = window.Remotion;

function generateStars() {
  return [];
}

function generateStars() {
  return [{ x: 100, y: 100 }];
}

export default function Scene() {
  const currentFrame = useCurrentFrame();
  const scale = spring({ frame: currentFrame, config: { damping: 10 } });
  const stars = generateStars();
  
  return (
    <AbsoluteFill>
      <div style={{ transform: \`scale(\${scale})\`, left: card1X }}>
        <Img src="logo.png" />
      </div>
    </AbsoluteFill>
  );
}`;
      
      const result = validateAndFixCode(complexBadCode);
      
      // Check all fixes were applied
      expect(result.fixedCode).not.toContain('x\n');
      expect(result.fixedCode).toContain('const frame = useCurrentFrame()');
      expect(result.fixedCode).toContain('spring({ frame, fps,');
      expect(result.fixedCode).toContain('Img');
      expect(result.fixedCode).toContain('const card1X');
      expect(result.fixedCode).toContain('export const durationInFrames');
      
      // Only one generateStars function
      const matches = (result.fixedCode!.match(/function generateStars/g) || []).length;
      expect(matches).toBe(1);
      
      // Should have multiple fixes applied
      expect(result.fixesApplied.length).toBeGreaterThan(3);
    });
  });
});