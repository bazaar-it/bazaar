# Models and Prompts Actually Used in Simplified Architecture

## Models Used (8 total)

### 1. Brain Orchestrator
- **Model**: `brain` 
- **Used for**: Tool selection and decision making
- **Optimal choice**: GPT-4.1 (best reasoning)

### 2. Scene Creation (2-step pipeline)
- **Model 1**: `layoutGenerator`
- **Used for**: Converting user prompt to structured JSON layout
- **Optimal choice**: Claude Sonnet-4 (excellent for structured output)

- **Model 2**: `codeGenerator`  
- **Used for**: Converting JSON layout to React/Remotion code
- **Optimal choice**: Claude Sonnet-4 (best for code generation)

### 3. Vision-Based Creation
- **Model**: `createSceneFromImage`
- **Used for**: Direct code generation from images
- **Optimal choice**: GPT-4o (vision capabilities)

### 4. Edit Operations (2 types)
- **Model**: `directCodeEditor.surgical`
- **Used for**: Small, targeted changes
- **Optimal choice**: GPT-4.1-mini (fast & cheap)

- **Model**: `directCodeEditor.creative`
- **Used for**: Bigger changes (visual, structural, creative)
- **Optimal choice**: Claude Sonnet-4 (creative & complex)

### 5. Vision-Based Edits
- **Model**: `editSceneWithImage`
- **Used for**: Editing scenes based on image references
- **Optimal choice**: GPT-4o (vision capabilities)

### 6. Error Fixing (Special Case)
- **Model**: `fixBrokenScene`
- **Used for**: Fixing syntax errors, runtime issues, export problems
- **Optimal choice**: GPT-4.1-mini (fast, precise, low temperature)
- **Why separate**: Uses specialized prompt focused on minimal changes

## Prompts Used (8 total)

### From SceneService:
1. `'layout-generator'` - For step 1 of scene creation
2. `'code-generator'` - For step 2 of scene creation
3. `'create-scene-from-image'` - For vision-based creation
4. `'direct-code-editor-surgical'` - For targeted edits
5. `'direct-code-editor-creative'` - For bigger edits
6. `'edit-scene-with-image'` - For vision-based edits
7. `'fix-broken-scene'` - For error correction (FIX_BROKEN_SCENE prompt)

### From Brain Orchestrator:
8. `'brain-orchestrator'` - Main system prompt for tool selection

## NOT Used Anymore

### Models (removed in optimal-new):
- `addScene` - Not needed, tools don't call AI directly
- `editScene` - Not needed, tools don't call AI directly
- `deleteScene` - Not needed, tools don't call AI directly
- `analyzeImage` - Consolidated into vision models
- `fixBrokenScene` - Use surgical edit instead
- `sceneBuilder` - Replaced by direct service calls
- `visionAnalysis` - Consolidated into vision models
- `imageDescription` - Consolidated into vision models

### Services (to be deprecated):
- SceneBuilderService
- CodeGeneratorService  
- DirectCodeEditorService
- LayoutGeneratorService
- ConversationalResponseService (already removed from tools)

## Cost Optimization

With optimal-new pack:
- **70% of edits** are surgical → GPT-4.1-mini ($0.60/1M tokens)
- **20% are creations** → Claude Sonnet-4 ($3/1M tokens)
- **10% are creative/structural** → Claude Sonnet-4 ($3/1M tokens)

Average cost per operation: ~$0.002

## To Use Optimal-New Pack

Set environment variable:
```bash
MODEL_PACK=optimal-new
```

Or in .env:
```
MODEL_PACK=optimal-new
```