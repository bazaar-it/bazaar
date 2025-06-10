//src/lib/evals/suites/model-pack-performance.ts

import type { EvalSuite, EvalPrompt } from '../types';
import crypto from 'crypto';

// 🎯 Real workflow scenarios that test the complete pipeline
const REAL_WORKFLOWS: EvalPrompt[] = [
  // ⚡ SPEED TEST: Simple operations that should be fast
  {
    id: 'speed-simple-scene',
    name: '⚡ Speed: Simple Scene Creation',
    type: 'text',
    input: {
      text: 'create a welcome scene with fade-in animation'
    },
    expectedBehavior: {
      toolCalled: 'addScene',
      complexity: 'low',
      shouldMention: ['welcome', 'fade-in'],
      expectedDuration: 180
    }
  },
  
  {
    id: 'speed-simple-edit',
    name: '⚡ Speed: Simple Text Edit',
    type: 'code',
    input: {
      text: 'change the text to "Hello World"',
      context: {
        existingCode: `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_${crypto.randomUUID().slice(0, 8)}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, fps * 1], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "white",
        fontSize: "2rem",
        opacity
      }}>
        Welcome to Bazaar
      </div>
    </AbsoluteFill>
  );
}`,
        sceneId: crypto.randomUUID(),
        sceneName: 'Test Scene'
      }
    },
    expectedBehavior: {
      toolCalled: 'editScene',
      editType: 'surgical',
      complexity: 'low',
      shouldModify: ['text content']
    }
  },

  // 🔥 QUALITY TEST: Complex operations that require high-quality reasoning
  {
    id: 'quality-company-intro',
    name: '🔥 Quality: Company Intro Creation',
    type: 'text',
    input: {
      text: 'create a professional intro video for Nexus AI. We provide AI-powered cybersecurity solutions for Fortune 500 companies. The video should feel enterprise-grade and trustworthy with smooth modern animations'
    },
    expectedBehavior: {
      toolCalled: 'addScene',
      complexity: 'high',
      shouldMention: ['Nexus AI', 'cybersecurity', 'enterprise', 'Fortune 500', 'trustworthy']
    }
  },

  {
    id: 'quality-complex-animation',
    name: '🔥 Quality: Complex Animation Logic',
    type: 'code',
    input: {
      text: 'add floating particles that move in a spiral pattern and change colors dynamically based on time',
      context: {
        existingCode: `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_${crypto.randomUUID().slice(0, 8)}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <h1 style={{
        color: "white",
        fontSize: "3rem",
        fontWeight: "700"
      }}>
        Data Analytics
      </h1>
    </AbsoluteFill>
  );
}`,
        sceneId: crypto.randomUUID(),
        sceneName: 'Analytics Scene'
      }
    },
    expectedBehavior: {
      toolCalled: 'editScene',
      editType: 'creative',
      complexity: 'very-high',
      shouldModify: ['particle system', 'spiral pattern', 'dynamic colors']
    }
  },

  // 🖼️ VISION TEST: Image analysis and integration
  {
    id: 'vision-button-integration',
    name: '🖼️ Vision: Button Integration from Screenshot',
    type: 'image',
    input: {
      text: 'recreate this button exactly with hover animations and integrate it into the scene',
      image: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Screenshot%202025-06-02%20at%2022.21.58.png',
      context: {
        existingCode: `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_${crypto.randomUUID().slice(0, 8)}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{
      backgroundColor: "#f8fafc",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        textAlign: "center",
        padding: "2rem"
      }}>
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: "600",
          color: "#1e293b",
          marginBottom: "1rem"
        }}>
          Welcome to Our Platform
        </h1>
        <p style={{
          fontSize: "1.1rem",
          color: "#64748b",
          marginBottom: "2rem"
        }}>
          Ready to get started?
        </p>
      </div>
    </AbsoluteFill>
  );
}`,
        sceneId: crypto.randomUUID(),
        sceneName: 'Platform Welcome'
      }
    },
    expectedBehavior: {
      workflow: [
        { toolName: 'analyzeImage', context: 'extract button design specifications' },
        { toolName: 'editSceneWithImage', context: 'integrate button into existing scene' }
      ],
      shouldAnalyzeImage: true,
      complexity: 'very-high',
      shouldModify: ['button element', 'hover animations', 'design integration']
    }
  },

  // 💰 COST-EFFICIENCY TEST: Operations where cheaper models might work
  {
    id: 'cost-simple-duration',
    name: '💰 Cost: Simple Duration Change',
    type: 'code',
    input: {
      text: 'make it 5 seconds',
      context: {
        existingCode: `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_${crypto.randomUUID().slice(0, 8)}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, fps * 2], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={{ color: "white", opacity }}>Test</div>
    </AbsoluteFill>
  );
}`,
        sceneId: crypto.randomUUID(),
        sceneName: 'Test Scene'
      }
    },
    expectedBehavior: {
      toolCalled: 'changeDuration',
      complexity: 'low',
      expectedDuration: 150 // 5 seconds at 30fps
    }
  },

  {
    id: 'cost-color-change',
    name: '💰 Cost: Simple Color Change',
    type: 'code',
    input: {
      text: 'change the background to blue',
      context: {
        existingCode: `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_${crypto.randomUUID().slice(0, 8)}() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#ff0000" }}>
      <div style={{ color: "white" }}>Red Background</div>
    </AbsoluteFill>
  );
}`,
        sceneId: crypto.randomUUID(),
        sceneName: 'Red Scene'
      }
    },
    expectedBehavior: {
      toolCalled: 'editScene',
      editType: 'surgical',
      complexity: 'low',
      shouldModify: ['backgroundColor']
    }
  },

  // 🧠 REASONING TEST: Complex multi-step workflows
  {
    id: 'reasoning-workflow',
    name: '🧠 Reasoning: Multi-Step Workflow',
    type: 'text',
    input: {
      text: 'create a welcome scene and then add a transition to a product showcase scene'
    },
    expectedBehavior: {
      workflow: [
        { toolName: 'addScene', context: 'create welcome scene' },
        { toolName: 'addScene', context: 'create product showcase scene with transition' }
      ],
      complexity: 'high',
      shouldMention: ['welcome', 'transition', 'product showcase']
    }
  },

  // 🎨 CREATIVITY TEST: Requires creative interpretation
  {
    id: 'creativity-brand-style',
    name: '🎨 Creativity: Brand Style Interpretation',
    type: 'text',
    input: {
      text: 'create a scene that feels like Apple\'s design language - minimalist, elegant, with that characteristic Apple aesthetic'
    },
    expectedBehavior: {
      toolCalled: 'addScene',
      complexity: 'high',
      shouldMention: ['minimalist', 'elegant', 'Apple', 'aesthetic', 'clean']
    }
  }
];

// 🎯 Model pack performance evaluation suite
export const modelPackPerformanceSuite: EvalSuite = {
  id: 'model-pack-performance',
  name: '🎯 Model Pack Performance Analysis',
  description: 'Compare all model packs across speed, cost, quality, and accuracy dimensions',
  modelPacks: [
    'starter-pack-1',     // GPT-4o-mini (cheapest)
    'performance-pack',   // GPT-4o (balanced)
    'openai-pack',        // GPT-4.1 + GPT-4o mix (premium)
    'claude-pack',        // Claude Sonnet 4 (code quality)
    'mixed-pack',         // O1-mini + Claude + GPT-4o mix
    'haiku-pack'          // Claude Haiku (speed)
  ],
  services: ['brain', 'addScene', 'editScene', 'analyzeImage', 'codeGenerator'],
  prompts: REAL_WORKFLOWS
};

// 🔬 Prompt optimization evaluation suite
export const promptOptimizationSuite: EvalSuite = {
  id: 'prompt-optimization',
  name: '🔬 Prompt Optimization Testing',
  description: 'A/B test different system prompts for each service to find optimal configurations',
  modelPacks: ['claude-pack'], // Use one consistent model pack
  services: ['brain', 'addScene', 'editScene'],
  prompts: [
    // Test brain orchestrator prompt variations
    {
      id: 'brain-prompt-v1',
      name: 'Brain Orchestrator: Current Prompt',
      type: 'text',
      input: {
        text: 'create a modern landing page scene with smooth animations and professional typography'
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        complexity: 'medium'
      }
    },
    
    // Same prompt, different expected behavior with alternative prompts
    {
      id: 'brain-prompt-v2',
      name: 'Brain Orchestrator: Enhanced Decision Making',
      type: 'text',
      input: {
        text: 'create a modern landing page scene with smooth animations and professional typography'
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        complexity: 'medium'
      }
    },

    // Test addScene prompt variations
    {
      id: 'addscene-prompt-v1',
      name: 'AddScene: Current Creativity Level',
      type: 'text',
      input: {
        text: 'create an innovative product demo for a fintech app'
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        complexity: 'high',
        shouldMention: ['fintech', 'product demo', 'innovative']
      }
    }
  ]
};

// 🖼️ Image-to-code pipeline evaluation suite
export const imageToCodePipelineSuite: EvalSuite = {
  id: 'image-to-code-pipeline',
  name: '🖼️ Image-to-Code Pipeline Testing',
  description: 'Test the complete workflow from screenshot analysis to code integration',
  modelPacks: ['claude-pack', 'mixed-pack', 'performance-pack'],
  services: ['brain', 'analyzeImage', 'createSceneFromImage', 'editSceneWithImage'],
  prompts: [
    // 📊 Dashboard recreation test
    {
      id: 'dashboard-recreation',
      name: '📊 Dashboard Recreation from Screenshot',
      type: 'image',
      input: {
        text: 'recreate this dashboard exactly with animated charts and data visualization',
        image: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Screenshot%202025-06-02%20at%2022.20.10.png'
      },
      expectedBehavior: {
        workflow: [
          { toolName: 'analyzeImage', context: 'extract dashboard layout and components' },
          { toolName: 'createSceneFromImage', context: 'recreate with animations' }
        ],
        shouldAnalyzeImage: true,
        complexity: 'very-high',
        shouldMention: ['dashboard', 'charts', 'data visualization', 'animated']
      }
    },

    // 🔘 Button integration test
    {
      id: 'button-integration',
      name: '🔘 Button Integration into Existing Scene',
      type: 'image',
      input: {
        text: 'add this button design to the scene with perfect hover effects',
        image: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Screenshot%202025-06-02%20at%2022.21.58.png',
        context: {
          existingCode: `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_${crypto.randomUUID().slice(0, 8)}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, sans-serif",
      padding: "2rem"
    }}>
      <h1 style={{
        fontSize: "2.5rem",
        fontWeight: "600",
        color: "#1e293b",
        marginBottom: "1rem",
        textAlign: "center"
      }}>
        Join Our Platform
      </h1>
      <p style={{
        fontSize: "1.1rem",
        color: "#64748b",
        textAlign: "center",
        maxWidth: "600px",
        lineHeight: "1.6"
      }}>
        Experience the next generation of digital collaboration tools designed for modern teams.
      </p>
    </AbsoluteFill>
  );
}`,
          sceneId: crypto.randomUUID(),
          sceneName: 'Join Platform Scene'
        }
      },
      expectedBehavior: {
        workflow: [
          { toolName: 'analyzeImage', context: 'extract button design specifications' },
          { toolName: 'editSceneWithImage', context: 'integrate button with hover effects' }
        ],
        shouldAnalyzeImage: true,
        complexity: 'very-high',
        shouldModify: ['button element', 'hover effects', 'styling integration']
      }
    },

    // 🎨 Style matching test
    {
      id: 'style-matching',
      name: '🎨 Style Matching from Reference',
      type: 'image',
      input: {
        text: 'match the exact color scheme and typography style from this design',
        image: 'https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Screenshot%202025-06-02%20at%2022.20.10.png',
        context: {
          existingCode: `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_${crypto.randomUUID().slice(0, 8)}() {
  return (
    <AbsoluteFill style={{
      backgroundColor: "#f0f0f0",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{
        textAlign: "center",
        color: "#333333",
        fontFamily: "Arial, sans-serif"
      }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "normal" }}>
          Generic Title
        </h1>
        <p style={{ fontSize: "1rem" }}>
          Generic description text here
        </p>
      </div>
    </AbsoluteFill>
  );
}`,
          sceneId: crypto.randomUUID(),
          sceneName: 'Generic Scene'
        }
      },
      expectedBehavior: {
        workflow: [
          { toolName: 'analyzeImage', context: 'extract color scheme and typography' },
          { toolName: 'editSceneWithImage', context: 'apply exact styling' }
        ],
        shouldAnalyzeImage: true,
        complexity: 'high',
        shouldModify: ['color scheme', 'typography', 'styling']
      }
    }
  ]
};

// 📊 Performance benchmarking suite
export const performanceBenchmarkSuite: EvalSuite = {
  id: 'performance-benchmark',
  name: '📊 Performance Benchmarking Suite',
  description: 'Benchmark speed, cost, and quality across all scenarios',
  modelPacks: [
    'starter-pack-1',
    'performance-pack', 
    'openai-pack',
    'claude-pack',
    'mixed-pack',
    'haiku-pack'
  ],
  services: ['brain'],
  prompts: [
    // Quick operations (should favor speed)
    {
      id: 'benchmark-quick-1',
      name: '⚡ Quick: Simple Welcome Scene',
      type: 'text',
      input: {
        text: 'create a welcome scene'
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        complexity: 'low'
      }
    },
    
    {
      id: 'benchmark-quick-2',
      name: '⚡ Quick: Change Text Color',
      type: 'code',
      input: {
        text: 'make the text red',
        context: {
          existingCode: `const { AbsoluteFill } = window.Remotion;
export default function Scene() {
  return <AbsoluteFill><div style={{color: "blue"}}>Hello</div></AbsoluteFill>;
}`,
          sceneId: crypto.randomUUID(),
          sceneName: 'Test'
        }
      },
      expectedBehavior: {
        toolCalled: 'editScene',
        editType: 'surgical',
        complexity: 'low'
      }
    },

    // Complex operations (should favor quality)
    {
      id: 'benchmark-complex-1',
      name: '🔥 Complex: Enterprise Dashboard',
      type: 'text',
      input: {
        text: 'create a sophisticated enterprise dashboard scene with animated KPI cards, real-time data visualization, and professional corporate styling that would impress C-level executives'
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        complexity: 'very-high',
        shouldMention: ['enterprise', 'dashboard', 'KPI', 'data visualization', 'corporate']
      }
    },

    {
      id: 'benchmark-complex-2',
      name: '🔥 Complex: Advanced Animation System',
      type: 'code',
      input: {
        text: 'add a complex particle system with physics-based interactions, gravity effects, and color transitions that respond to audio frequencies',
        context: {
          existingCode: `const { AbsoluteFill, useCurrentFrame, useVideoConfig } = window.Remotion;

export default function Scene1_${crypto.randomUUID().slice(0, 8)}() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "white",
        fontSize: "3rem",
        fontWeight: "700"
      }}>
        Audio Visualizer
      </div>
    </AbsoluteFill>
  );
}`,
          sceneId: crypto.randomUUID(),
          sceneName: 'Audio Visualizer'
        }
      },
      expectedBehavior: {
        toolCalled: 'editScene',
        editType: 'creative',
        complexity: 'very-high',
        shouldModify: ['particle system', 'physics', 'gravity', 'audio responsive']
      }
    }
  ]
};

// Export all performance-focused suites
export const performanceEvalSuites = [
  modelPackPerformanceSuite,
  promptOptimizationSuite,
  imageToCodePipelineSuite,
  performanceBenchmarkSuite
];