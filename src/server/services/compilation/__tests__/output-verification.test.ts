/**
 * Sprint 106 - Compiled Output Verification Tests
 * 
 * Tests that verify the correctness of compiled JavaScript output
 * Ensures the compiled code will execute properly in the browser
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SceneCompilerService } from '../scene-compiler.service';

describe('Compiled Output Verification Tests', () => {
  let compiler: SceneCompilerService;

  beforeEach(() => {
    compiler = SceneCompilerService.getInstance();
  });

  describe('JavaScript Output Structure', () => {
    test('should produce valid JavaScript syntax', async () => {
      const tsxCode = `
const { Spring, interpolate, useCurrentFrame } = window.Remotion;

const Button = ({ text, onClick }) => {
  return React.createElement('button', { onClick }, text);
};

export default function ValidScene() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return React.createElement('div', 
    { style: { opacity } },
    React.createElement(Button, { text: 'Click me' })
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'valid-js',
        existingScenes: []
      });

      // Should be valid JS that can be parsed
      expect(() => new Function(result.jsCode)).not.toThrow();
      
      // Should contain Remotion destructuring near the top (allow whitespace/newlines)
      expect(result.jsCode).toMatch(/const\s*{[\s\S]*}\s*=\s*window\.Remotion/);
      // Should end with a return of a component identifier
      expect(result.jsCode).toMatch(/return\s+[A-Z][A-Za-z0-9_]*;?\s*$/);
    });

    test('should maintain React.createElement calls', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export default function ElementScene() {
  return (
    <div className="container">
      <h1>Title</h1>
      <p>Paragraph</p>
      <button onClick={() => console.log('clicked')}>Button</button>
    </div>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'elements',
        existingScenes: []
      });

      // JSX should be converted to React.createElement
      expect(result.jsCode).toContain('React.createElement');
      // Accept either single or double quotes in emitted createElement calls
      expect(result.jsCode).toMatch(/React\.createElement\((['"])div\1/);
      expect(result.jsCode).toMatch(/React\.createElement\((['"])h1\1/);
      expect(result.jsCode).toMatch(/React\.createElement\((['"])p\1/);
      expect(result.jsCode).toMatch(/React\.createElement\((['"])button\1/);
      expect(result.jsCode).toContain('className: "container"');
    });
  });

  describe('Remotion API Preservation', () => {
    test('should preserve all Remotion imports', async () => {
      const tsxCode = `
const { 
  Spring, 
  interpolate, 
  useCurrentFrame, 
  useVideoConfig,
  Sequence,
  AbsoluteFill,
  Img,
  Video,
  Audio,
  interpolateColors,
  random,
  staticFile
} = window.Remotion;

export default function RemotionScene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  
  const progress = interpolate(frame, [0, durationInFrames], [0, 1]);
  const color = interpolateColors(progress, [0, 1], ['#ff0000', '#0000ff']);
  const springValue = Spring({ frame, fps, from: 0, to: 1 });
  
  return (
    <AbsoluteFill style={{ backgroundColor: color }}>
      <Sequence from={0} durationInFrames={30}>
        <Img src={staticFile('image.png')} />
      </Sequence>
      <Sequence from={30} durationInFrames={60}>
        <Video src={staticFile('video.mp4')} />
      </Sequence>
      <Audio src={staticFile('audio.mp3')} />
    </AbsoluteFill>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'remotion-full',
        existingScenes: []
      });

      // All Remotion APIs should be preserved
      const remotionApis = [
        'Spring', 'interpolate', 'useCurrentFrame', 'useVideoConfig',
        'Sequence', 'AbsoluteFill', 'Img', 'Video', 'Audio',
        'interpolateColors', 'random', 'staticFile'
      ];

      remotionApis.forEach(api => {
        expect(result.jsCode).toContain(api);
      });

      // Should maintain the destructuring (allow multiline and leading whitespace)
      expect(result.jsCode).toMatch(/const\s*{[\s\S]*Spring[\s\S]*}\s*=\s*window\.Remotion/);
    });

    test('should handle Remotion component usage correctly', async () => {
      const tsxCode = `
const { Sequence, AbsoluteFill, useCurrentFrame } = window.Remotion;

export default function SequenceScene() {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={30}>
        <div>First</div>
      </Sequence>
      <Sequence from={30} durationInFrames={30}>
        <div>Second</div>
      </Sequence>
      <Sequence from={60} durationInFrames={30}>
        <div>Third</div>
      </Sequence>
    </AbsoluteFill>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'sequences',
        existingScenes: []
      });

      // Should convert Remotion components to React.createElement
      expect(result.jsCode).toContain('React.createElement(AbsoluteFill');
      expect(result.jsCode).toContain('React.createElement(Sequence');
      
      // Should preserve props
      expect(result.jsCode).toContain('from: 0');
      expect(result.jsCode).toContain('from: 30');
      expect(result.jsCode).toContain('from: 60');
      expect(result.jsCode).toContain('durationInFrames: 30');
    });
  });

  describe('Component Name Resolution', () => {
    test('should correctly rename conflicting components', async () => {
      const scene1 = `
const { Spring } = window.Remotion;
const Card = () => React.createElement('div', null, 'Card 1');
export default function Scene1() {
  return React.createElement(Card);
}`;

      const scene2 = `
const { Spring } = window.Remotion;
const Card = () => React.createElement('div', null, 'Card 2');
export default function Scene2() {
  return React.createElement(Card);
}`;

      const result1 = await compiler.compileScene(scene1, {
        projectId: 'test',
        sceneId: 'scene1',
        existingScenes: []
      });

      const result2 = await compiler.compileScene(scene2, {
        projectId: 'test',
        sceneId: 'scene2',
        existingScenes: [{ id: 'scene1', name: 'Scene 1', tsxCode: scene1 }]
      });

      // First scene unchanged
      expect(result1.jsCode).toContain('const Card = ');
      expect(result1.jsCode).toContain('React.createElement(Card)');

      // Second scene should have renamed component
      expect(result2.jsCode).toContain('const Card_scene2 = ');
      expect(result2.jsCode).toContain('React.createElement(Card_scene2)');
      expect(result2.jsCode).not.toContain('React.createElement(Card)');
    });

    test('should handle nested component references', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

const Inner = () => React.createElement('span', null, 'Inner');
const Middle = () => React.createElement('div', null, React.createElement(Inner));
const Outer = () => React.createElement('section', null, React.createElement(Middle));

export default function NestedScene() {
  return React.createElement(Outer);
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'nested',
        existingScenes: []
      });

      // All components should be defined
      expect(result.jsCode).toContain('const Inner = ');
      expect(result.jsCode).toContain('const Middle = ');
      expect(result.jsCode).toContain('const Outer = ');
      
      // References should be maintained
      expect(result.jsCode).toContain('React.createElement(Inner)');
      expect(result.jsCode).toContain('React.createElement(Middle)');
      expect(result.jsCode).toContain('React.createElement(Outer)');
    });
  });

  describe('Icon Handling Verification', () => {
    test('should convert Icon components to window.IconifyIcon', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export default function IconScene() {
  return (
    <div>
      <Icon icon="mdi:home" width={24} height={24} />
      <Icon icon="carbon:user" color="blue" />
      <IconifyIcon icon="material-symbols:check" />
    </div>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'icons',
        existingScenes: []
      });

      // Should use window.IconifyIcon
      expect(result.jsCode).toContain('window.IconifyIcon');
      
      // Should preserve icon props
      expect(result.jsCode).toContain('icon: "mdi:home"');
      expect(result.jsCode).toContain('icon: "carbon:user"');
      expect(result.jsCode).toContain('icon: "material-symbols:check"');
      expect(result.jsCode).toContain('width: 24');
      expect(result.jsCode).toContain('height: 24');
      expect(result.jsCode).toContain('color: "blue"');
    });

    test('should handle inline icon definitions', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export default function InlineIconScene() {
  return (
    <div>
      {React.createElement(window.IconifyIcon, { icon: "mdi:alert" })}
      <button>
        {React.createElement(window.IconifyIcon, { icon: "carbon:add" })}
        Add Item
      </button>
    </div>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'inline-icons',
        existingScenes: []
      });

      // Should preserve inline icon usage
      expect(result.jsCode).toContain('window.IconifyIcon');
      expect(result.jsCode).toContain('icon: "mdi:alert"');
      expect(result.jsCode).toContain('icon: "carbon:add"');
    });
  });

  describe('State and Hook Preservation', () => {
    test('should preserve React hooks', async () => {
      const tsxCode = `
const { useCurrentFrame, useVideoConfig } = window.Remotion;
const { useState, useEffect, useMemo, useCallback } = React;

export default function HooksScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const doubled = useMemo(() => count * 2, [count]);
  const handleClick = useCallback(() => setCount(0), []);
  
  return React.createElement('div', null, 
    \`Frame: \${frame}, FPS: \${fps}, Count: \${count}, Doubled: \${doubled}\`
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'hooks',
        existingScenes: []
      });

      // All hooks should be preserved
      expect(result.jsCode).toContain('useState');
      expect(result.jsCode).toContain('useEffect');
      expect(result.jsCode).toContain('useMemo');
      expect(result.jsCode).toContain('useCallback');
      expect(result.jsCode).toContain('useCurrentFrame');
      expect(result.jsCode).toContain('useVideoConfig');
    });
  });

  describe('Style Handling', () => {
    test('should preserve inline styles', async () => {
      const tsxCode = `
const { Spring, interpolate, useCurrentFrame } = window.Remotion;

export default function StyleScene() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const scale = interpolate(frame, [0, 20], [0.5, 1]);
  
  return (
    <div style={{
      opacity,
      transform: \`scale(\${scale})\`,
      backgroundColor: 'rgba(0, 0, 255, 0.5)',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      Styled Content
    </div>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'styles',
        existingScenes: []
      });

      // Style object should be preserved
      expect(result.jsCode).toContain('style: {');
      expect(result.jsCode).toContain('opacity');
      expect(result.jsCode).toContain('transform:');
      expect(result.jsCode).toContain('backgroundColor:');
      expect(result.jsCode).toContain('padding:');
      expect(result.jsCode).toContain('borderRadius:');
      expect(result.jsCode).toContain('boxShadow:');
    });

    test('should handle className attributes', async () => {
      const tsxCode = `
const { Spring } = window.Remotion;

export default function ClassScene() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-blue-600">Title</h1>
      <p className="mt-4 text-gray-700">Content</p>
    </div>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'classes',
        existingScenes: []
      });

      // className should be preserved
      expect(result.jsCode).toContain('className: "container mx-auto p-4"');
      expect(result.jsCode).toContain('className: "text-3xl font-bold text-blue-600"');
      expect(result.jsCode).toContain('className: "mt-4 text-gray-700"');
    });
  });

  describe('Complex Expression Handling', () => {
    test('should handle conditional rendering', async () => {
      const tsxCode = `
const { useCurrentFrame } = window.Remotion;

export default function ConditionalScene() {
  const frame = useCurrentFrame();
  const showContent = frame > 30;
  
  return (
    <div>
      {showContent && <p>Visible after 30 frames</p>}
      {frame < 60 ? <span>First minute</span> : <span>After minute</span>}
      {[1, 2, 3].map(i => <div key={i}>Item {i}</div>)}
    </div>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'conditional',
        existingScenes: []
      });

      // Conditional logic should be preserved
      expect(result.jsCode).toContain('showContent &&');
      expect(result.jsCode).toContain('frame < 60 ?');
      expect(result.jsCode).toContain('.map(');
      expect(result.jsCode).toContain('key: i');
    });

    test('should handle template literals and expressions', async () => {
      const tsxCode = `
const { useCurrentFrame } = window.Remotion;

export default function ExpressionScene() {
  const frame = useCurrentFrame();
  const progress = frame / 90;
  
  return (
    <div>
      <p>{\`Frame: \${frame} / 90\`}</p>
      <p>{\`Progress: \${(progress * 100).toFixed(1)}%\`}</p>
      <div style={{ width: \`\${progress * 100}%\` }}>
        Progress Bar
      </div>
    </div>
  );
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'expressions',
        existingScenes: []
      });

      // Template literals should be preserved
      expect(result.jsCode).toContain('`Frame: ${frame} / 90`');
      expect(result.jsCode).toContain('`Progress: ${(progress * 100).toFixed(1)}%`');
      expect(result.jsCode).toContain('width: `${progress * 100}%`');
    });
  });

  describe('Function Constructor Compatibility', () => {
    test('compiled code should be executable with Function constructor', async () => {
      const tsxCode = `
const { Spring, interpolate, useCurrentFrame } = window.Remotion;

const AnimatedBox = () => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 30], [0, 1]);
  
  return React.createElement('div', {
    style: { transform: \`scale(\${scale})\` }
  }, 'Animated Box');
};

export default function ExecutableScene() {
  return React.createElement(AnimatedBox);
}`;

      const result = await compiler.compileScene(tsxCode, {
        projectId: 'test',
        sceneId: 'executable',
        existingScenes: []
      });

      // Mock the required globals
      const mockWindow = {
        Remotion: {
          Spring: () => 1,
          interpolate: () => 0.5,
          useCurrentFrame: () => 15
        },
        IconifyIcon: () => null
      };

      const mockReact = {
        createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children })
      };

      // Should be able to create a function from the compiled code
      const createScene = () => {
        const func = new Function('window', 'React', result.jsCode);
        return func(mockWindow, mockReact);
      };

      expect(createScene).not.toThrow();
      
      // Should return the scene component
      const SceneComponent = createScene();
      expect(SceneComponent).toBeDefined();
      expect(typeof SceneComponent).toBe('function');
    });
  });
});
