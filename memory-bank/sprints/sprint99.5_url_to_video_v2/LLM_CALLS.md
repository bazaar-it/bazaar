# Sprint 99.5: **CORRECTED** LLM Calls Documentation
## Complete LLM Architecture for URL to Video V2 Pipeline

**Reality Check**: After analyzing the actual codebase, the previous documentation was completely wrong.

---

## 📋 **ACTUAL** LLM Call Overview

**Total LLM Calls per URL**: 8-15 calls per complete pipeline
- **Brain Orchestrator**: 1 call (tool selection)
- **Hero's Journey LLM**: 1 call (narrative planning)  
- **Add Tool**: 5-6 calls (one per scene generation)
- **Edit Tool**: Multiple calls (scene modifications)
- **Title Generator**: Multiple calls (scene naming)
- **Typography Tool**: Additional calls (text scenes)
- **Image Recreator Tool**: Additional calls (image-based scenes)
- **Scene Planner Tool**: Optional calls (multi-scene planning)
- **WebAnalysisAgentV4**: **0 calls** (pure DOM extraction)

---

## 🧠 Call 1: Brain Orchestrator - Tool Selection

### **Timing**: First call in every user interaction
### **Purpose**: Analyze user intent and select appropriate tools

### **Implementation**: `/src/brain/orchestrator_functions/intentAnalyzer.ts`
### **Model Config**: `getModel('brain')` - GPT-5 or Sonnet-4 depending on pack
### **System Prompt**: `BRAIN_ORCHESTRATOR` from `/src/config/prompts/active/brain-orchestrator.ts`

### **Input Schema**:
```typescript
interface BrainOrchestratorInput {
  prompt: string
  projectId: string
  storyboardSoFar: SceneEntity[]
  userContext: {
    imageUrls?: string[]
    videoUrls?: string[]
    audioUrls?: string[]
  }
  chatHistory: Message[]
  projectFormat: {
    format: 'landscape' | 'portrait' | 'square'
    width: number
    height: number
  }
}
```

### **LLM Configuration**:
- **Model**: GPT-5 (OpenAI pack) or Claude Sonnet-4 (Anthropic pack)
- **Temperature**: 0.4-0.6 depending on pack
- **Response Format**: JSON object

### **Available Tools**:
- `addScene` - Create new scenes from scratch or images
- `editScene` - Modify existing scenes  
- `deleteScene` - Remove scenes
- `trimScene` - Duration adjustments
- `typographyScene` - Animated text scenes
- `imageRecreatorScene` - Recreate images as motion graphics
- `websiteToVideo` - Complete website analysis and video generation
- `scenePlanner` - Multi-scene video planning
- `addAudio` - Audio integration

### **Expected Output**:
```typescript
interface BrainOrchestratorOutput {
  toolName: 'addScene' | 'editScene' | 'deleteScene' | 'trimScene' | 'websiteToVideo' | etc.
  reasoning: string
  targetSceneId?: string      // For edit/delete/trim operations
  targetDuration?: number     // For trim operations
  referencedSceneIds?: string[] // For style matching
  websiteUrl?: string         // For websiteToVideo
  userFeedback: string
  needsClarification: boolean
  clarificationQuestion?: string
}
```

---

## 🎯 Call 2: Hero's Journey LLM - Narrative Planning

### **Timing**: When websiteToVideo tool is selected
### **Purpose**: Generate narrative structure for website-based videos

### **Implementation**: `/src/tools/narrative/herosJourneyLLM.ts`
### **Model Config**: `getModel('generation')` - Sonnet-4 or GPT-4o
### **System Prompt**: Custom narrative generation prompt

### **Input Schema**:
```typescript
interface HeroJourneyInput {
  extraction: ExtractedBrandDataV4  // From WebAnalysisAgentV4
  sceneCount: number                // Default 5
  totalDuration: number            // In frames (450 = 15s)
}
```

### **LLM Configuration**:
- **Model**: Sonnet-4 or GPT-4o (text-only)
- **Temperature**: 0.3 (controlled creativity)
- **Response Format**: JSON object

### **Narrative Prompt**:
```
Generate a {{sceneCount}}-scene narrative for a {{durationSeconds}}-second motion graphics video.

BRAND INFO:
- Name: {{extraction.brand.identity.name}}
- Tagline: {{extraction.brand.identity.tagline}}
- Problem: {{extraction.product.problem}}
- Solution: {{extraction.product.value_prop.headline}}
- Features: {{extraction.product.features}}

Create {{sceneCount}} unique scenes following the hero's journey structure.
Each scene should have:
- title: Catchy scene title
- duration: Duration in frames
- narrative: What happens in this scene  
- visualElements: Array of 3-4 visual elements
- emotionalBeat: 'problem', 'tension', 'discovery', 'transformation', 'triumph', 'invitation'

Return a JSON array of {{sceneCount}} scenes.
```

### **Expected Output**:
```typescript
interface HeroJourneyOutput {
  scenes: Array<{
    title: string
    duration: number          // In frames
    narrative: string
    visualElements: string[]
    emotionalBeat: 'problem' | 'tension' | 'discovery' | 'transformation' | 'triumph' | 'invitation'
    brandElements: {
      colors: string[]
      typography: string
      motion: 'slow' | 'dynamic'
    }
  }>
}
```

---

## 🎨 Call 3: Edit Tool - Template-Based Scene Generation

### **Timing**: For each scene in the hero's journey (typically 5-6 calls)
### **Purpose**: Modify template TSX code with brand-specific content

### **Implementation**: `/src/tools/edit/edit.ts` (called via websiteToVideoHandler)
### **Model Config**: `getModel('editScene')` - Sonnet-4 or GPT-4o
### **System Prompt**: `CODE_EDITOR` from `/src/config/prompts/active/code-editor.ts`

**Important**: For URL to video, the system uses the **Edit Tool** to modify pre-existing templates with website content, NOT the Add Tool which generates from scratch.

### **Input Schema** (for URL to video context):
```typescript
interface EditToolInput {
  userPrompt: string         // Scene description from hero's journey
  tsxCode: string           // Template TSX code to modify
  webContext: {             // Website brand context
    originalUrl: string
    pageData: ExtractedBrandDataV4
    screenshotUrls: {
      desktop: string
      mobile: string
    }
  }
  imageUrls?: string[]      // Website screenshots for brand matching
}
```

### **LLM Configuration**:
- **Model**: Sonnet-4 or GPT-4o (vision capable)
- **Temperature**: 0.3
- **Max Tokens**: 16,000
- **Vision Support**: Yes - processes website screenshots for brand matching

### **Template Modification Process**:
1. Receives pre-selected template TSX code
2. Analyzes website screenshots for brand matching
3. Uses hero's journey scene description as prompt
4. Modifies template with actual website content
5. Applies brand colors, fonts, and styling
6. Preserves template structure and animations

### **Expected Output**:
```typescript
interface EditToolOutput {
  success: boolean
  code?: string             // Modified template TSX code
  name?: string            // Scene name
  duration?: number        // Duration in frames
  reasoning?: string       // Modification explanation
  error?: string          // Error message if failed
}
```

---

## ✏️ Call 4: Edit Tool - Scene Modifications

### **Timing**: When user requests scene edits or auto-fix triggers
### **Purpose**: Modify existing scene code based on user prompts or error fixes

### **Implementation**: `/src/tools/edit/edit.ts`
### **Model Config**: `getModel('editScene')` - Sonnet-4 or GPT-4o with fallback
### **System Prompt**: `CODE_EDITOR` from `/src/config/prompts/active/code-editor.ts`

### **Input Schema**:
```typescript
interface EditToolInput {
  userPrompt: string           // Edit request
  tsxCode: string             // Existing scene code
  errorDetails?: string       // Compilation errors to fix
  webContext?: {              // Website brand context (for brand-aware edits)
    originalUrl: string
    pageData: ExtractedBrandDataV4
    screenshotUrls: {
      desktop: string
      mobile: string
    }
  }
  imageUrls?: string[]        // Additional images for editing
  videoUrls?: string[]
  audioUrls?: string[]
  referenceScenes?: Array<{   // Other scenes for style matching
    id: string
    name: string
    tsxCode: string
  }>
  modelOverride?: string      // Force specific model
}
```

### **LLM Configuration**:
- **Model**: Sonnet-4 or GPT-4o (vision capable)
- **Temperature**: 0.3
- **Max Tokens**: 16,000
- **Vision Support**: Yes - processes screenshots and images
- **Fallback**: Automatic fallback to OpenAI if Anthropic fails
- **Priority**: High (4/5) for responsiveness

### **Edit Process**:
1. Analyzes existing TSX code structure
2. Applies user-requested changes
3. Maintains brand consistency (if webContext provided)
4. Fixes compilation errors (if errorDetails provided)
5. Preserves Remotion hooks and structure

### **Expected Output**:
```typescript
interface EditToolOutput {
  success: boolean
  code?: string           // Modified TSX code
  name?: string          // Updated scene name
  duration?: number      // Updated duration
  reasoning?: string     // Edit explanation
  error?: string        // Error message if failed
  validationIssues?: {  // Code quality checks
    compilation: boolean
    performance: boolean
    accessibility: boolean
  }
}
```

---

## 🔤 Call 5: Typography Tool - Text Scene Generation

### **Timing**: When brain selects `typographyScene` tool
### **Purpose**: Generate animated text-focused scenes

### **Implementation**: `/src/tools/typography/typography.ts`
### **Model Config**: Uses `codeGenerator.generateTypographyScene()` - Sonnet-4 or GPT-4o
### **System Prompt**: `TYPOGRAPHY_AGENT` from `/src/config/prompts/active/typography-generator.ts`

### **Input Schema**:
```typescript
interface TypographyToolInput {
  userPrompt: string
  projectFormat: {
    format: 'landscape' | 'portrait' | 'square'
    width: number
    height: number
  }
  previousSceneContext?: {
    tsxCode: string
    name: string
  }
}
```

### **LLM Configuration**:
- **Model**: Sonnet-4 or GPT-4o
- **Temperature**: 0.3
- **Specialized**: Focused on text animation and typography

---

## 🖼️ Call 6: Image Recreator Tool - Image-to-Scene Generation

### **Timing**: When brain selects `imageRecreatorScene` tool
### **Purpose**: Recreate uploaded images as motion graphics scenes

### **Implementation**: `/src/tools/image-recreator/image-recreator.ts`
### **Model Config**: Uses `codeGenerator.generateImageRecreationScene()` - Sonnet-4 or GPT-4o
### **System Prompt**: `IMAGE_RECREATOR` from `/src/config/prompts/active/image-recreator.ts`

### **Input Schema**:
```typescript
interface ImageRecreatorToolInput {
  userPrompt: string
  imageUrls: string[]       // Required - at least one image
  projectFormat: {
    format: 'landscape' | 'portrait' | 'square'
    width: number
    height: number
  }
}
```

### **LLM Configuration**:
- **Model**: Sonnet-4 or GPT-4o (vision capable)
- **Temperature**: 0.3
- **Vision Support**: Yes - processes uploaded images for recreation

---

## 📋 Call 7: Scene Planner Tool - Multi-Scene Planning

### **Timing**: When brain selects `scenePlanner` tool (currently disabled)
### **Purpose**: Plan complex multi-scene video sequences

### **Implementation**: `/src/tools/scene-planner/scene-planner.ts`
### **Model Config**: `getModel('brain')` - GPT-5 or Sonnet-4
### **System Prompt**: `SCENE_PLANNER` from `/src/config/prompts/active/scene-planner.ts`

### **Input Schema**:
```typescript
interface ScenePlannerToolInput {
  userPrompt: string
  requestedScenes?: number
  totalDuration?: number
  projectFormat: {
    format: 'landscape' | 'portrait' | 'square'
    width: number
    height: number
  }
  storyboardSoFar: SceneEntity[]
}
```

### **LLM Configuration**:
- **Model**: GPT-5 or Sonnet-4 (same as brain)
- **Temperature**: 0.4-0.6
- **Planning Focus**: Multi-scene narrative structure

---

## 🏷️ Call 8: Title Generator - Scene Naming

### **Timing**: After scene generation or when scene names need updates
### **Purpose**: Generate descriptive names for scenes

### **Implementation**: `/src/server/services/ai/titleGenerator.service.ts`
### **Model Config**: `getModel('titleGenerator')` - GPT-4o-mini or Sonnet-4
### **System Prompt**: `TITLE_GENERATOR` from `/src/config/prompts/active/title-generator.ts`

### **Input**: Scene TSX code
### **Output**: Descriptive scene name

### **LLM Configuration**:
- **Model**: GPT-4o-mini (fast and cost-effective)
- **Temperature**: 0.9 (creative naming)
- **Max Tokens**: 100-400

---

## 🚫 **ZERO LLM** Components

### **WebAnalysisAgentV4** - Pure DOM Extraction
- **Implementation**: `/src/tools/webAnalysis/WebAnalysisAgentV4.ts`
- **Process**: Playwright → DOM analysis → Brand data extraction
- **No LLM calls**: Pure programmatic analysis of HTML, CSS, screenshots
- **Output**: `ExtractedBrandDataV4` with colors, fonts, content, features

### **Template Selection** (Future Enhancement)
- **Current**: Basic matching in `template-selector.ts`
- **Sprint 99.5 Plan**: Metadata-driven algorithm
- **No LLM needed**: Scoring based on template capabilities vs scene requirements

### **Audio Integration**
- **Implementation**: `addAudio` tool
- **Process**: File handling and audio library matching
- **No LLM**: Direct audio file processing and integration

---

## 📊 **ACTUAL** LLM Usage Per URL to Video

### **Complete URL to Video Pipeline**:
1. **Brain Orchestrator**: 1 call (tool selection)
2. **Hero's Journey LLM**: 1 call (narrative planning)
3. **Edit Tool**: 5-6 calls (template modification for each scene)
4. **Title Generator**: 5-6 calls (scene naming)

**Total: 12-14 LLM calls for complete URL to video**

**Note**: The URL to video pipeline uses the Edit Tool to modify pre-existing templates with website content, not the Add Tool which generates scenes from scratch.

### **Additional Calls** (user-initiated, separate from URL to video):
- **Add Tool**: For creating new scenes from scratch
- **Edit Tool**: For modifying existing scenes
- **Typography Tool**: For text-focused scenes
- **Image Recreator**: For recreating uploaded images
- **Scene Planner**: For complex multi-scene planning

### **Performance Targets**:
- **Brain Orchestrator**: <5s
- **Hero's Journey**: <15s
- **Scene Generation**: <20s per scene (5-6 scenes = 100-120s total)
- **Edits**: <15s per edit
- **Total URL to Video Pipeline**: 2-3 minutes

---

## 🛠️ Implementation Details

### **Model Configuration** (`/src/config/models.config.ts`):
```typescript
// Active model pack determines which models are used
MODEL_PACKS = {
  'optimal-pack': {
    brain: 'gpt-5-mini',
    codeGenerator: 'claude-sonnet-4',
    editScene: 'claude-sonnet-4',
    titleGenerator: 'gpt-4o-mini'
  },
  'anthropic-pack': {
    brain: 'claude-sonnet-4',
    codeGenerator: 'claude-sonnet-4',
    editScene: 'claude-sonnet-4', 
    titleGenerator: 'claude-sonnet-4'
  },
  'openai-pack': {
    brain: 'gpt-4o',
    codeGenerator: 'gpt-4o',
    editScene: 'gpt-4o',
    titleGenerator: 'gpt-4o-mini'
  }
}
```

### **System Prompts** (`/src/config/prompts/active/`):
- `brain-orchestrator.ts` - Tool selection logic
- `code-generator.ts` - Scene generation instructions
- `code-editor.ts` - Scene modification guidelines
- `title-generator.ts` - Scene naming rules
- `typography-generator.ts` - Text animation prompts
- `image-recreator.ts` - Image recreation prompts
- `scene-planner.ts` - Multi-scene planning prompts

### **Error Handling**:
- Automatic fallback between providers (Anthropic → OpenAI)
- Retry logic with exponential backoff
- Graceful degradation for failed calls
- Comprehensive error logging and monitoring

### **Quality Assurance**:
- JSON schema validation on all LLM outputs
- Code compilation validation before saving scenes
- Brand consistency checks for website-based videos
- Performance monitoring and cost tracking

---

## 🎯 Sprint 99.5 Enhancements

For Sprint 99.5, the LLM architecture remains the same but will be enhanced with:

1. **Better Brand Context**: WebAnalysisAgentV4 improvements feed richer data to LLMs
2. **Visual Element Classification**: Add tool gets better prompts distinguishing UI vs photo elements  
3. **Template Preference**: Scene generation includes UI template preference hints
4. **Evidence Validation**: All LLM outputs must reference actual extracted data
5. **Multi-pass Validation**: Quality gates ensure fidelity to source website
6. **Rebuild-Ready Descriptions**: UI components get precise recreation specifications

**The core LLM architecture is solid - Sprint 99.5 focuses on improving data quality and prompt engineering to achieve "film the website, don't imagine it" fidelity.**