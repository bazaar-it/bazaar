import { compileSceneToJS, needsCompilation } from './compile-scene';

describe('compileSceneToJS', () => {
  it('should compile valid TSX to JS', () => {
    const tsxCode = `
      export default function Scene() {
        return <div>Hello World</div>;
      }
    `;
    
    const result = compileSceneToJS(tsxCode);
    
    expect(result.success).toBe(true);
    expect(result.jsCode).toContain('React.createElement');
    expect(result.jsCode).toContain('export default');
    expect(result.error).toBeUndefined();
  });

  it('should handle TypeScript features', () => {
    const tsxCode = `
      interface Props {
        name: string;
      }
      
      export default function Scene({ name }: Props) {
        const message: string = 'Hello';
        return <div>{message} {name}</div>;
      }
    `;
    
    const result = compileSceneToJS(tsxCode);
    
    expect(result.success).toBe(true);
    expect(result.jsCode).not.toContain('interface'); // TypeScript removed
    expect(result.jsCode).not.toContain(': string'); // Type annotations removed
  });

  it('should handle empty input', () => {
    const result = compileSceneToJS('');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('No code provided');
  });

  it('should handle syntax errors', () => {
    const tsxCode = `
      export default function Scene() {
        return <div>Unclosed div
      }
    `;
    
    const result = compileSceneToJS(tsxCode);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Compilation failed');
  });

  it('should compile JSX with Remotion components', () => {
    const tsxCode = `
      import { AbsoluteFill, useCurrentFrame } from 'remotion';
      
      export default function Scene() {
        const frame = useCurrentFrame();
        return (
          <AbsoluteFill style={{ backgroundColor: 'blue' }}>
            <h1>Frame {frame}</h1>
          </AbsoluteFill>
        );
      }
    `;
    
    const result = compileSceneToJS(tsxCode);
    
    expect(result.success).toBe(true);
    expect(result.jsCode).toContain('React.createElement');
    expect(result.jsCode).toContain('AbsoluteFill');
  });
});

describe('needsCompilation', () => {
  it('should return true if no JS code exists', () => {
    const scene = {
      tsxCode: 'export default function() {}',
      jsCode: null
    };
    
    expect(needsCompilation(scene)).toBe(true);
  });

  it('should return false if JS code exists and is current', () => {
    const now = new Date();
    const scene = {
      tsxCode: 'export default function() {}',
      jsCode: 'compiled code',
      jsCompiledAt: now,
      updatedAt: new Date(now.getTime() - 1000) // Updated before compilation
    };
    
    expect(needsCompilation(scene)).toBe(false);
  });

  it('should return true if TSX was updated after compilation', () => {
    const compiledAt = new Date('2025-01-01');
    const updatedAt = new Date('2025-01-02');
    
    const scene = {
      tsxCode: 'export default function() {}',
      jsCode: 'compiled code',
      jsCompiledAt: compiledAt,
      updatedAt: updatedAt
    };
    
    expect(needsCompilation(scene)).toBe(true);
  });
});