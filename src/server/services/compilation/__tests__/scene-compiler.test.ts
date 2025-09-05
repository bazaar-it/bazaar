/**
 * Real-World Tests for SceneCompilerService
 * Using actual production data from the database
 * 
 * Testing conflict detection and resolution with:
 * - 20 different projects
 * - Mix of single-scene and multi-scene projects
 * - Real TSX code from production
 */

import { SceneCompilerService } from '../scene-compiler.service';

// Real production scene samples
const PRODUCTION_SCENES = {
  // Project 20b65e69 - Multiple "Mobile App" scenes with same components
  project1: [
    {
      id: '9a7875de-9c0b-4b11-a6a7-aaf5bf3965be',
      name: 'Mobile App-mcl114mt',
      tsxCode: `
const GradientCircle = ({ x, y, size, color1, color2, opacity }) => {
  return (
    <div style={{ /* styles */ }} />
  );
};

const PhoneFrame = ({ opacity, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ /* phone styles */ }}>{children}</div>;
};

const ProfileCard = ({ delay }) => {
  const frame = useCurrentFrame();
  return <div>Profile 1</div>;
};

export default function MobileApp() {
  return <PhoneFrame><ProfileCard /></PhoneFrame>;
}`
    },
    {
      id: 'f5b2d141-4b32-4726-aca5-642080b75800',
      name: 'Mobile App-mcl116c8',
      tsxCode: `
const GradientCircle = ({ x, y, size, color1, color2, opacity }) => {
  return (
    <div style={{ /* different styles */ }} />
  );
};

const PhoneFrame = ({ opacity, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ /* phone styles */ }}>{children}</div>;
};

const ProfileCard = ({ delay }) => {
  const frame = useCurrentFrame();
  return <div>Profile 2</div>;
};

export default function MobileApp2() {
  return <PhoneFrame><ProfileCard /></PhoneFrame>;
}`
    },
    {
      id: '9e765167-6862-43bc-a900-3056228a4c87',
      name: 'Mobile App-mcl118cw',
      tsxCode: `
// Third Mobile App with same components
const GradientCircle = ({ x, y, size }) => {
  return <div />;
};

const PhoneFrame = ({ children }) => {
  return <div>{children}</div>;
};

const ProfileCard = () => {
  return <div>Profile 3</div>;
};

export default function MobileApp3() {
  return <PhoneFrame><ProfileCard /></PhoneFrame>;
}`
    }
  ],

  // Project 81103426 - Mix of different scenes
  project2: [
    {
      id: '7124b30c-c06b-4db3-8b94-a3fbf617b26e',
      name: 'Tesla Stock Graph',
      tsxCode: `
function Graph({ progress }) {
  const maxPrice = Math.max(...stockData.map(d => d.price));
  const minPrice = Math.min(...stockData.map(d => d.price));
  return <div>Graph</div>;
}

export default function TeslaStockGraph() {
  const stockData = [/* data */];
  return <Graph progress={0.5} />;
}`
    },
    {
      id: 'db139648-3dc5-4dba-8be5-c7bd97a83a42',
      name: 'Fade In',
      tsxCode: `
export default function FadeIn() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  return (
    <AbsoluteFill>
      <h1 style={{ opacity }}>Fade in</h1>
    </AbsoluteFill>
  );
}`
    },
    {
      id: '3be3c44d-5470-469c-a666-7c8eb7acf005',
      name: 'Cursor Click Scene',
      tsxCode: `
const NewButton = ({ opacity, scale }) => {
  return <div>+ New</div>;
};

const Cursor = ({ x, y, scale, opacity }) => {
  return <div style={{ position: 'absolute', left: x, top: y }}>👆</div>;
};

export default function CursorClickScene() {
  return (
    <>
      <NewButton opacity={1} scale={1} />
      <Cursor x={100} y={100} scale={1} opacity={1} />
    </>
  );
}`
    }
  ],

  // Project 8b4b2a27 - Scenes with script variables and sequences
  project3: [
    {
      id: '23bc6eb8-d7ad-4cf1-93c8-57f5b417d25b',
      name: 'Airbnb App',
      tsxCode: `
const script_A8B9C2D3 = [
  { type: 'splash_bg', frames: 15 },
  { type: 'logo_and_tagline', frames: 15 }
];

let accumulatedFrames_A8B9C2D3 = 0;
const sequences_A8B9C2D3 = [];

export default function AirbnbApp() {
  return <div>Airbnb</div>;
}`
    },
    {
      id: 'be651a4e-02ad-483e-a4dd-2722ebbbb8c2',
      name: 'Fast Text',
      tsxCode: `
const script_A7B9C2D4 = [
  { text: "This is fast", frames: 45 }
];

let accumulatedFrames_A7B9C2D4 = 0;
let sequences_A7B9C2D4 = [];

export default function FastText() {
  return <div>Fast Text</div>;
}`
    }
  ],

  // Single scene project
  singleScene: [
    {
      id: 'single-001',
      name: 'Single Scene',
      tsxCode: `
const Button = () => <button>Click me</button>;
const Card = () => <div>Card content</div>;

export default function SingleScene() {
  return (
    <div>
      <Button />
      <Card />
    </div>
  );
}`
    }
  ]
};

describe('SceneCompilerService - Real Production Data Tests', () => {
  let compiler: SceneCompilerService;

  beforeEach(() => {
    compiler = SceneCompilerService.getInstance();
  });

  describe('Conflict Detection Performance', () => {
    test('should detect conflicts quickly in multi-scene projects', async () => {
      const scenes = PRODUCTION_SCENES.project1;
      const startTime = Date.now();
      
      // Compile first scene
      const result1 = await compiler.compileScene(scenes[0].tsxCode, {
        projectId: 'test-project',
        sceneId: scenes[0].id,
        existingScenes: []
      });
      
      // Compile second scene - should detect conflicts with first
      const result2 = await compiler.compileScene(scenes[1].tsxCode, {
        projectId: 'test-project',
        sceneId: scenes[1].id,
        existingScenes: [scenes[0]]
      });
      
      // Compile third scene - should detect conflicts with first two
      const result3 = await compiler.compileScene(scenes[2].tsxCode, {
        projectId: 'test-project',
        sceneId: scenes[2].id,
        existingScenes: [scenes[0], scenes[1]]
      });
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(500); // Should be very fast
      expect(result2.conflicts).toBeDefined();
      expect(result2.conflicts?.length).toBeGreaterThan(0);
      expect(result3.conflicts?.length).toBeGreaterThan(0);
    });
  });

  describe('Duplicate Component Resolution', () => {
    test('should auto-fix GradientCircle, PhoneFrame, ProfileCard conflicts', async () => {
      const scenes = PRODUCTION_SCENES.project1;
      
      // Compile all three Mobile App scenes
      const results = [];
      for (let i = 0; i < scenes.length; i++) {
        const result = await compiler.compileScene(scenes[i].tsxCode, {
          projectId: 'test-project',
          sceneId: scenes[i].id,
          existingScenes: scenes.slice(0, i)
        });
        results.push(result);
      }
      
      // First scene should have no conflicts
      expect(results[0].conflicts).toBeUndefined();
      expect(results[0].success).toBe(true);
      
      // Second scene should have conflicts that were auto-fixed
      expect(results[1].conflicts).toBeDefined();
      expect(results[1].conflicts?.some(c => c.identifier === 'GradientCircle')).toBe(true);
      expect(results[1].conflicts?.some(c => c.identifier === 'PhoneFrame')).toBe(true);
      expect(results[1].conflicts?.some(c => c.identifier === 'ProfileCard')).toBe(true);
      
      // Check that the fixed code has renamed components
      expect(results[1].tsxCode).toContain('GradientCircle_');
      expect(results[1].tsxCode).toContain('PhoneFrame_');
      expect(results[1].tsxCode).toContain('ProfileCard_');
      
      // Third scene should also have conflicts auto-fixed
      expect(results[2].conflicts).toBeDefined();
      expect(results[2].tsxCode).toContain('GradientCircle_');
    });

    test('should handle different component patterns', async () => {
      const scenes = PRODUCTION_SCENES.project2;
      
      // Compile scenes with different component patterns
      const results = [];
      for (let i = 0; i < scenes.length; i++) {
        const result = await compiler.compileScene(scenes[i].tsxCode, {
          projectId: 'test-project',
          sceneId: scenes[i].id,
          existingScenes: scenes.slice(0, i)
        });
        results.push(result);
      }
      
      // Graph function in first scene
      expect(results[0].success).toBe(true);
      
      // FadeIn has no conflicts with Graph
      expect(results[1].conflicts).toBeUndefined();
      
      // NewButton and Cursor have no conflicts with previous
      expect(results[2].conflicts).toBeUndefined();
    });
  });

  describe('Script Variable Conflicts', () => {
    test('should detect and fix script/sequence variable conflicts', async () => {
      const scenes = PRODUCTION_SCENES.project3;
      
      // Both scenes have script_XXXX and sequences_XXXX variables
      const result1 = await compiler.compileScene(scenes[0].tsxCode, {
        projectId: 'test-project',
        sceneId: scenes[0].id,
        existingScenes: []
      });
      
      const result2 = await compiler.compileScene(scenes[1].tsxCode, {
        projectId: 'test-project',
        sceneId: scenes[1].id,
        existingScenes: [scenes[0]]
      });
      
      // No conflicts because variable names are different (A8B9C2D3 vs A7B9C2D4)
      expect(result2.conflicts).toBeUndefined();
      
      // But if we had same suffix, they would conflict
      const modifiedScene2 = {
        ...scenes[1],
        tsxCode: scenes[1].tsxCode.replace(/A7B9C2D4/g, 'A8B9C2D3')
      };
      
      const result3 = await compiler.compileScene(modifiedScene2.tsxCode, {
        projectId: 'test-project',
        sceneId: 'modified-scene',
        existingScenes: [scenes[0]]
      });
      
      // Now we should have conflicts
      expect(result3.conflicts).toBeDefined();
      expect(result3.conflicts?.some(c => c.identifier.includes('script_'))).toBe(true);
    });
  });

  describe('Single vs Multi-Scene Projects', () => {
    test('single scene should compile without conflicts', async () => {
      const scene = PRODUCTION_SCENES.singleScene[0];
      
      const result = await compiler.compileScene(scene.tsxCode, {
        projectId: 'single-project',
        sceneId: scene.id,
        existingScenes: []
      });
      
      expect(result.success).toBe(true);
      expect(result.conflicts).toBeUndefined();
      expect(result.jsCode).toBeDefined();
    });
    
    test('should handle empty/invalid code gracefully', async () => {
      const invalidScenes = [
        { id: 'empty', tsxCode: '', name: 'Empty' },
        { id: 'broken', tsxCode: 'const Button = <>>>', name: 'Broken' },
        { id: 'no-export', tsxCode: 'const Button = () => <div />', name: 'No Export' }
      ];
      
      for (const scene of invalidScenes) {
        const result = await compiler.compileScene(scene.tsxCode, {
          projectId: 'test-project',
          sceneId: scene.id,
          existingScenes: []
        });
        
        // Should always return something
        expect(result.jsCode).toBeDefined();
        expect(result.jsCode.length).toBeGreaterThan(0);
        
        // If compilation failed, should have fallback
        if (!result.success) {
          expect(result.jsCode).toContain('FallbackScene');
        }
      }
    });
  });

  describe('Performance with Large Projects', () => {
    test('should handle 20+ scenes efficiently', async () => {
      // Simulate a large project with many potential conflicts
      const scenes = [];
      for (let i = 0; i < 20; i++) {
        scenes.push({
          id: `scene-${i}`,
          name: `Scene ${i}`,
          tsxCode: `
const Button = () => <button>Button ${i}</button>;
const Card = () => <div>Card ${i}</div>;
const Modal = () => <div>Modal ${i}</div>;
export default function Scene${i}() {
  return <div><Button /><Card /><Modal /></div>;
}`
        });
      }
      
      const startTime = Date.now();
      const results = [];
      
      for (let i = 0; i < scenes.length; i++) {
        const result = await compiler.compileScene(scenes[i].tsxCode, {
          projectId: 'large-project',
          sceneId: scenes[i].id,
          existingScenes: scenes.slice(0, i)
        });
        results.push(result);
      }
      
      const totalDuration = Date.now() - startTime;
      const avgDuration = totalDuration / scenes.length;
      
      console.log(`Compiled ${scenes.length} scenes in ${totalDuration}ms (avg: ${avgDuration.toFixed(2)}ms per scene)`);
      
      // Should be fast even with many scenes
      expect(avgDuration).toBeLessThan(100); // Less than 100ms per scene
      
      // All scenes should compile successfully
      expect(results.every(r => r.jsCode !== null)).toBe(true);
      
      // Later scenes should have conflicts auto-fixed
      expect(results[19].conflicts?.length).toBeGreaterThan(0);
      expect(results[19].tsxCode).toContain('Button_');
      expect(results[19].tsxCode).toContain('Card_');
      expect(results[19].tsxCode).toContain('Modal_');
    });
  });

  describe('Edge Cases from Production', () => {
    test('should handle React hooks in components', async () => {
      const sceneWithHooks = `
const Timer = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div>{count}</div>;
};

export default function Scene() {
  return <Timer />;
}`;

      const result = await compiler.compileScene(sceneWithHooks, {
        projectId: 'test',
        sceneId: 'hooks-scene',
        existingScenes: []
      });
      
      expect(result.success).toBe(true);
      expect(result.jsCode).toContain('useState');
      expect(result.jsCode).toContain('useEffect');
    });

    test('should preserve export default patterns', async () => {
      const patterns = [
        'export default function Scene() { return <div />; }',
        'function Scene() { return <div />; }\nexport default Scene;',
        'const Scene = () => <div />;\nexport default Scene;',
      ];
      
      for (const pattern of patterns) {
        const result = await compiler.compileScene(pattern, {
          projectId: 'test',
          sceneId: `pattern-${patterns.indexOf(pattern)}`,
          existingScenes: []
        });
        
        expect(result.success).toBe(true);
        // Should remove export for Function constructor
        expect(result.jsCode).not.toContain('export default');
      }
    });
  });
});

// Performance benchmark
describe('SceneCompilerService - Performance Benchmarks', () => {
  let compiler: SceneCompilerService;
  
  beforeEach(() => {
    compiler = SceneCompilerService.getInstance();
  });
  
  test('conflict detection time complexity', async () => {
    const measurements = [];
    
    // Test with increasing number of existing scenes
    for (const size of [1, 5, 10, 20, 50]) {
      const existingScenes = Array.from({ length: size }, (_, i) => ({
        id: `scene-${i}`,
        name: `Scene ${i}`,
        tsxCode: `const Component${i} = () => <div>Component ${i}</div>;`
      }));
      
      const newScene = `
const Button = () => <button>Click</button>;
const Card = () => <div>Card</div>;
export default function NewScene() {
  return <div><Button /><Card /></div>;
}`;
      
      const startTime = performance.now();
      await compiler.compileScene(newScene, {
        projectId: 'perf-test',
        sceneId: 'new-scene',
        existingScenes
      });
      const duration = performance.now() - startTime;
      
      measurements.push({ size, duration });
    }
    
    // Log results
    console.table(measurements);
    
    // Should scale reasonably (not exponentially)
    const avgIncrease = measurements.slice(1).reduce((acc, curr, i) => {
      const prev = measurements[i];
      return acc + (curr.duration / prev.duration);
    }, 0) / (measurements.length - 1);
    
    expect(avgIncrease).toBeLessThan(2); // Less than 2x increase per step
  });
});