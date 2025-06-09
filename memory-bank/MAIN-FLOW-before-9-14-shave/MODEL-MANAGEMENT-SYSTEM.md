//memory-bank/MAIN-FLOW/MODEL-MANAGEMENT-SYSTEM.md

# Model Management System

## Overview

The Model Management System provides centralized control over AI models used throughout the Bazaar-Vid pipeline. Instead of hardcoding model selections in individual services, all AI model configurations are managed through a single source of truth.

## Architecture

### Core Components

1. **`src/config/models.config.ts`** - Main configuration file
2. **`src/config/prompts.config.ts`** - Centralized system prompts
3. **`src/lib/services/aiClient.service.ts`** - Unified AI client service
4. **`scripts/switch-models.js`** - CLI for switching model packs

### File Structure
```
src/config/
├── models.config.ts      # Model configurations and packs
└── prompts.config.ts     # System prompts for all services

src/lib/services/
└── aiClient.service.ts   # Unified AI client

scripts/
└── switch-models.js      # CLI for pack switching
```

## Model Packs

### Available Packs

1. **Starter Pack 1** (`starter-pack-1`)
   - GPT-4.1-mini for everything
   - Fast and cost-effective
   - Best for development and testing

2. **Performance Pack** (`performance-pack`)
   - GPT-4o for core functions
   - Optimized for quality
   - Higher cost but better results

3. **Mixed Pack** (`mixed-pack`)
   - O1-mini for brain orchestration
   - GPT-4o for vision tasks
   - Claude 3.5 Sonnet for code generation
   - Strategic model selection for each task

4. **Claude Pack** (`claude-pack`)
   - Claude 3.5 Sonnet for everything
   - Excellent for code generation
   - Consistent experience across pipeline

5. **Haiku Pack** (`haiku-pack`)
   - Claude 3.5 Haiku for everything
   - Maximum speed and cost efficiency
   - Good for rapid prototyping

### Model Assignments by Service

Each pack defines models for:

#### Brain & Orchestration
- `brain` - Brain Orchestrator decision making
- `addScene` - Add Scene tool
- `editScene` - Edit Scene tool
- `deleteScene` - Delete Scene tool

#### Image & Vision
- `analyzeImage` - Image analysis tool
- `createSceneFromImage` - Scene creation from images
- `editSceneWithImage` - Scene editing with images
- `visionAnalysis` - General vision tasks
- `imageDescription` - Image descriptions

#### Code Generation
- `codeGenerator` - Main code generation
- `directCodeEditor.surgical` - Precise edits (temp: 0.25)
- `directCodeEditor.creative` - Creative edits (temp: 0.4)
- `directCodeEditor.structural` - Layout changes (temp: 0.3)
- `sceneBuilder` - Scene building coordination
- `layoutGenerator` - Layout generation

#### Specialized Tools
- `fixBrokenScene` - Scene error fixing

## Usage

### Switching Model Packs

```bash
# List available packs
node scripts/switch-models.js list

# Check current pack
node scripts/switch-models.js current

# Switch to a specific pack
node scripts/switch-models.js claude-pack

# Show help
node scripts/switch-models.js help
```

### In Code

```typescript
// Get the current model configuration
import { getBrainModel, getCodeGeneratorModel } from '~/config/models.config';

// Use in services
const brainConfig = getBrainModel();
const codeConfig = getCodeGeneratorModel();

// Use with AI client
import { AIClientService } from '~/lib/services/aiClient.service';
import { getSystemPrompt } from '~/config/prompts.config';

const response = await AIClientService.generateResponse(
  brainConfig,
  messages,
  getSystemPrompt('BRAIN_ORCHESTRATOR')
);
```

## System Prompts

### Centralized Prompt Management

All system prompts are stored in `src/config/prompts.config.ts`:

- **BRAIN_ORCHESTRATOR** - Main orchestration logic
- **ADD_SCENE** - Scene creation prompts
- **EDIT_SCENE** - Scene editing prompts
- **CODE_GENERATOR** - Code generation prompts
- **DIRECT_CODE_EDITOR_SURGICAL** - Precise editing
- **DIRECT_CODE_EDITOR_CREATIVE** - Creative editing
- **DIRECT_CODE_EDITOR_STRUCTURAL** - Layout editing
- **VISION_ANALYSIS** - Image analysis prompts

### Updating Prompts

```typescript
import { getSystemPrompt, updatePrompt } from '~/config/prompts.config';

// Get a prompt
const prompt = getSystemPrompt('CODE_GENERATOR');

// Update a prompt (development only)
updatePrompt('CODE_GENERATOR', 'New prompt content...');
```

## AI Client Service

### Unified Interface

The `AIClientService` provides a consistent interface across all AI providers:

```typescript
// Basic completion
const result = await AIClientService.generateCompletion(
  modelConfig,
  'Generate a scene...',
  systemPrompt
);

// With conversation context
const result = await AIClientService.generateResponse(
  modelConfig,
  messages,
  systemPrompt
);
```

### Provider Support

- **OpenAI** - GPT models including O1 series
- **Anthropic** - Claude models (Sonnet, Haiku)
- **Future** - Google, Azure support ready

### Features

- Automatic provider detection
- Consistent error handling
- Usage tracking and logging
- Legacy compatibility helpers

## Migration Strategy

### Phase 1: Infrastructure ✅
- [x] Create model configuration system
- [x] Create system prompts configuration
- [x] Create AI client service
- [x] Create CLI switching tool

### Phase 2: Service Integration
- [ ] Update Brain Orchestrator to use new system
- [ ] Update MCP tools to use centralized models
- [ ] Update DirectCodeEditor service
- [ ] Update CodeGenerator service
- [ ] Update Vision services

### Phase 3: Legacy Cleanup
- [ ] Remove hardcoded model references
- [ ] Update environment variable usage
- [ ] Consolidate AI client creation
- [ ] Update documentation

## Benefits

### Developer Experience
- **Single Source of Truth** - All model configs in one place
- **Easy Switching** - Change models with one command
- **Experimentation** - Test different model combinations easily
- **Consistency** - Same model selection logic everywhere

### Performance & Cost
- **Optimized Packs** - Pre-configured combinations for different needs
- **Temperature Control** - Appropriate settings per task type
- **Provider Flexibility** - Use best model for each task
- **Cost Management** - Easy switch to cheaper models for development

### Maintenance
- **Centralized Updates** - Update prompts in one place
- **Version Control** - Track model selection changes
- **Testing** - Easy A/B testing of model combinations
- **Debugging** - Consistent logging and error handling

## Example Workflows

### Development Workflow
```bash
# Start with cost-effective models
node scripts/switch-models.js starter-pack-1
npm run dev

# Test with higher quality models
node scripts/switch-models.js performance-pack
npm run dev

# Production deployment
node scripts/switch-models.js mixed-pack
npm run build
```

### Custom Pack Creation
```typescript
// In models.config.ts
const myCustomPack = createCustomPack(
  'my-pack',
  'Custom optimized pack',
  {
    brain: { provider: 'openai', model: 'o1-mini' },
    codeGenerator: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    // ... other models
  }
);
```

## Future Enhancements

- **Dynamic Pack Loading** - Load packs from external configs
- **A/B Testing Framework** - Built-in model comparison
- **Cost Tracking** - Monitor usage and costs per pack
- **Performance Metrics** - Track speed and quality per model
- **Auto-Selection** - AI-driven model selection based on task complexity
