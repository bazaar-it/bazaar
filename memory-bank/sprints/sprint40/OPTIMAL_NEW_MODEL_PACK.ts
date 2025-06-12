// Optimal-New Model Pack - Only the models we actually need

/**
 * MODELS ACTUALLY USED IN SIMPLIFIED ARCHITECTURE:
 * 
 * 1. brain - For orchestrator decision making
 * 2. layoutGenerator - Step 1 of scene creation
 * 3. codeGenerator - Step 2 of scene creation  
 * 4. createSceneFromImage - Direct vision-based creation
 * 5. directCodeEditor.surgical - Targeted edits
 * 6. directCodeEditor.creative - Creative rewrites
 * 7. directCodeEditor.structural - Architecture changes
 * 8. editSceneWithImage - Vision-based edits
 * 
 * REMOVED (not needed with simplified architecture):
 * - addScene, editScene, deleteScene (tools don't need models)
 * - analyzeImage (handled by vision models)
 * - fixBrokenScene (can use surgical edit)
 * - sceneBuilder (replaced by direct service calls)
 * - visionAnalysis, imageDescription (consolidated)
 * - titleGenerator, conversationalResponse (separate concern)
 */

export const optimalNewPack: ModelPack = {
  name: 'Optimal New Pack',
  description: 'Streamlined model selection for simplified architecture',
  models: {
    // BRAIN - Orchestrator decision making
    brain: { 
      provider: 'openai', 
      model: 'gpt-4.1',  // Best reasoning for tool selection
      temperature: 0.6 
    },
    
    // SCENE CREATION PIPELINE
    layoutGenerator: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514',  // Excellent for structured JSON
      temperature: 0.3 
    },
    codeGenerator: { 
      provider: 'anthropic', 
      model: 'claude-sonnet-4-20250514',  // Best for React/Remotion code
      temperature: 0.3 
    },
    
    // VISION-BASED CREATION
    createSceneFromImage: { 
      provider: 'openai', 
      model: 'gpt-4o',  // Best vision capabilities
      temperature: 0.5 
    },
    
    // EDIT OPERATIONS
    directCodeEditor: {
      surgical: { 
        provider: 'openai', 
        model: 'gpt-4.1-mini',  // Fast & cheap for small changes
        temperature: 0.2, 
        maxTokens: 8000 
      },
      creative: { 
        provider: 'anthropic', 
        model: 'claude-sonnet-4-20250514',  // Creative rewrites
        temperature: 0.4, 
        maxTokens: 16000 
      },
      structural: { 
        provider: 'anthropic', 
        model: 'claude-sonnet-4-20250514',  // Complex refactoring
        temperature: 0.3, 
        maxTokens: 16000 
      }
    },
    
    // VISION-BASED EDITS
    editSceneWithImage: { 
      provider: 'openai', 
      model: 'gpt-4o',  // Vision for style matching
      temperature: 0.3 
    },
    
    // DEPRECATED - Keep for backward compatibility but not used
    addScene: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5 },
    editScene: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    deleteScene: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5 },
    analyzeImage: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    fixBrokenScene: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2 },
    sceneBuilder: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5 },
    visionAnalysis: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    imageDescription: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 },
    titleGenerator: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 100 },
    conversationalResponse: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 150 }
  }
};

/**
 * PROMPTS ACTUALLY USED:
 * 
 * From SceneService:
 * 1. 'layout-generator' - For layoutGenerator model
 * 2. 'code-generator' - For codeGenerator model
 * 3. 'create-scene-from-image' - For createSceneFromImage model
 * 4. 'direct-code-editor-surgical' - For surgical edits
 * 5. 'direct-code-editor-creative' - For creative edits
 * 6. 'direct-code-editor-structural' - For structural edits
 * 7. 'edit-scene-with-image' - For image-based edits
 * 
 * From Brain Orchestrator:
 * 8. 'brain-orchestrator' - Main system prompt for tool selection
 */

/**
 * COST OPTIMIZATION:
 * 
 * Per 1000 operations estimate:
 * - 70% surgical edits → GPT-4.1-mini ($0.60/1M tokens)
 * - 20% scene creation → Sonnet-4 ($3/1M tokens)
 * - 10% creative/structural → Sonnet-4 ($3/1M tokens)
 * 
 * Average cost per operation: ~$0.002
 */