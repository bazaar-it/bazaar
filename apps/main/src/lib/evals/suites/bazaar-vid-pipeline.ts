import type { EvalSuite, EvalPrompt } from '../types';

// 🚨 REAL UPLOADED IMAGES: Use actual URLs instead of base64
const REAL_BUTTON_IMAGE = "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Screenshot%202025-06-02%20at%2022.21.58.png";
const REAL_OVERVIEW_IMAGE = "https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/Screenshot%202025-06-02%20at%2022.20.10.png";

// ✅ REAL EXISTING SCENE CODE for button insertion test
const EXISTING_SCENE_CODE = `const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } = window.Remotion;

export default function Scene1_12345() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const fadeIn = interpolate(frame, [0, fps * 1], [0, 1], { 
    extrapolateLeft: "clamp", 
    extrapolateRight: "clamp" 
  });
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Inter, sans-serif",
      opacity: fadeIn
    }}>
      <div style={{
        textAlign: "center",
        color: "white",
        padding: "2rem"
      }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: "700",
          margin: "0 0 1rem 0",
          textShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}>
          Welcome to Bazaar
        </h1>
        <p style={{
          fontSize: "1.2rem",
          opacity: "0.9",
          margin: "0"
        }}>
          Create amazing motion graphics
        </p>
      </div>
    </AbsoluteFill>
  );
}`;

export const bazaarVidPipelineSuite: EvalSuite = {
  id: 'bazaar-vid-pipeline',
  name: 'Bazaar-Vid Pipeline Testing',
  description: 'Test real user workflows with actual functionality',
  modelPacks: ['claude-pack', 'performance-pack', 'starter-pack-1'],
  services: ['brain'],
  prompts: [
    // ✅ SCENE CREATION TESTS
    {
      id: 'company-intro',
      name: 'Company Intro Creation',
      type: 'text',
      input: {
        text: 'generate an intro video for my company. its called Spinlio. we do cyber security. we have a new feature we want to showcase. its called cloud security with AI'
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldMention: ['Spinlio', 'cyber security', 'cloud security', 'AI'],
        complexity: 'medium'
      }
    },
    {
      id: 'product-demo',
      name: 'Product Demo Creation',
      type: 'text',
      input: {
        text: 'create a product demo scene showing our new dashboard. use modern colors and smooth animations. the product is called DataViz Pro'
      },
      expectedBehavior: {
        toolCalled: 'addScene',
        shouldMention: ['DataViz Pro', 'dashboard', 'product demo'],
        complexity: 'medium'
      }
    },

    // ✅ SCENE EDITING TESTS (with real code context)
    {
      id: 'make-faster',
      name: 'Make Scene Faster',
      type: 'code',
      input: {
        text: 'make it faster',
        context: {
          existingCode: EXISTING_SCENE_CODE,
          sceneId: 'test-scene-1',
          sceneName: 'Scene 1'
        }
      },
      expectedBehavior: {
        toolCalled: 'editScene',
        editType: 'surgical',
        shouldModify: ['animation timing', 'interpolate frames'],
        complexity: 'low'
      }
    },
    {
      id: 'speed-and-duration',
      name: 'Speed Up and Set Duration',
      type: 'code',
      input: {
        text: 'speed it up and make the scene 3 seconds',
        context: {
          existingCode: EXISTING_SCENE_CODE,
          sceneId: 'test-scene-1',
          sceneName: 'Scene 1'
        }
      },
      expectedBehavior: {
        toolCalled: 'editScene',
        editType: 'surgical',
        shouldModify: ['duration', 'animation speed'],
        expectedDuration: 90, // 3 seconds at 30fps
        complexity: 'low'
      }
    },
    {
      id: 'center-content',
      name: 'Center Content',
      type: 'code',
      input: {
        text: 'make it centered',
        context: {
          existingCode: EXISTING_SCENE_CODE,
          sceneId: 'test-scene-1',
          sceneName: 'Scene 1'
        }
      },
      expectedBehavior: {
        toolCalled: 'editScene',
        editType: 'surgical',
        shouldModify: ['justifyContent', 'alignItems', 'text-align'],
        complexity: 'low'
      }
    },
    {
      id: 'animate-background',
      name: 'Animate Background Elements',
      type: 'code',
      input: {
        text: 'animate the background circles to move inward in a spiral pattern',
        context: {
          existingCode: EXISTING_SCENE_CODE,
          sceneId: 'test-scene-1',
          sceneName: 'Scene 1'
        }
      },
      expectedBehavior: {
        toolCalled: 'editScene',
        editType: 'creative',
        shouldModify: ['background animation', 'spiral pattern', 'moving elements'],
        complexity: 'high'
      }
    },

    // ✅ DELETION TESTS
    {
      id: 'delete-scene',
      name: 'Delete Scene',
      type: 'text',
      input: {
        text: 'delete the scene',
        context: {
          sceneId: 'test-scene-1',
          sceneName: 'Scene 1'
        }
      },
      expectedBehavior: {
        toolCalled: 'deleteScene',
        complexity: 'low'
      }
    },

    // 🖼️ IMAGE-BASED TESTS (FIXED: Use real uploaded images)
    {
      id: 'add-button-with-image',
      name: 'Add Button with Image Reference',
      type: 'image',
      input: {
        text: 'recreate this button with hover animations and glow effects',
        image: REAL_BUTTON_IMAGE, // ✅ Real button image
        context: {
          existingCode: EXISTING_SCENE_CODE,
          sceneId: 'test-scene-1',
          sceneName: 'Scene 1'
        }
      },
      expectedBehavior: {
        workflow: [
          { toolName: 'analyzeImage', context: 'analyze button design' },
          { toolName: 'editSceneWithImage', context: 'add button to existing scene' }
        ],
        shouldAnalyzeImage: true,
        shouldModify: ['button element', 'hover animations', 'glow effects'],
        complexity: 'high'
      }
    },
    {
      id: 'create-scene-from-image',
      name: 'Create Scene from Image',
      type: 'image',
      input: {
        text: 'create this design with smooth motion graphics animations',
        image: REAL_OVERVIEW_IMAGE // ✅ Real overview image
      },
      expectedBehavior: {
        workflow: [
          { toolName: 'analyzeImage', context: 'analyze complete design' },
          { toolName: 'addScene', context: 'create scene from analysis' }
        ],
        shouldAnalyzeImage: true,
        shouldMention: ['motion graphics', 'smooth animations'],
        complexity: 'very-high'
      }
    },
    {
      id: 'analyze-then-create',
      name: 'Analyze Image Then Create',
      type: 'image',
      input: {
        text: 'analyze this design in detail and recreate it with particle effects',
        image: REAL_OVERVIEW_IMAGE // ✅ Real overview image
      },
      expectedBehavior: {
        workflow: [
          { toolName: 'analyzeImage', context: 'detailed design analysis' },
          { toolName: 'addScene', context: 'create with particle effects' }
        ],
        shouldAnalyzeImage: true,
        shouldMention: ['particle effects', 'detailed analysis'],
        complexity: 'very-high'
      }
    },

    // ✅ CONTEXT-AWARE TESTS
    {
      id: 'context-aware-edit',
      name: 'Context-Aware Scene Edit',
      type: 'code',
      input: {
        text: 'make the background more corporate and professional',
        context: {
          existingCode: EXISTING_SCENE_CODE,
          sceneId: 'test-scene-1',
          sceneName: 'Scene 1',
          chatHistory: [
            { role: 'user', content: 'create a cybersecurity company intro' },
            { role: 'assistant', content: 'I created a modern intro scene with gradient background...' },
            { role: 'user', content: 'the colors are too playful for a B2B audience' }
          ]
        }
      },
      expectedBehavior: {
        toolCalled: 'editScene',
        shouldUseContext: true,
        shouldMention: ['corporate', 'professional', 'B2B'],
        complexity: 'medium'
      }
    },

    // ✅ CLARIFICATION TESTS
    {
      id: 'ambiguous-request',
      name: 'Ambiguous Request Clarification',
      type: 'text',
      input: {
        text: 'make it better',
        context: {
          existingCode: EXISTING_SCENE_CODE,
          sceneId: 'test-scene-1',
          sceneName: 'Scene 1'
        }
      },
      expectedBehavior: {
        needsClarification: true,
        shouldAsk: ['what specific aspect', 'which part', 'how should I improve'],
        complexity: 'low'
      }
    },

    // ✅ ERROR HANDLING TESTS
    {
      id: 'edit-without-scene',
      name: 'Edit Without Scene Context',
      type: 'text',
      input: {
        text: 'change the text color to blue'
        // No scene context provided
      },
      expectedBehavior: {
        needsClarification: true,
        shouldAsk: ['which scene', 'select a scene', 'create a scene first'],
        complexity: 'low'
      }
    }
  ]
}; 