# Complete Flow with MODEL_PACK=optimal-pack

## 1. Environment Setup
When you have `MODEL_PACK=optimal-pack` in your .env file, the system uses these models:
- **brain**: `openai/gpt-4.1` (temperature: 0.6)
- **codeGenerator**: `anthropic/claude-sonnet-4-20250514` (temperature: 0.3, maxTokens: 16000)
- **editScene**: `anthropic/claude-sonnet-4-20250514` (temperature: 0.3, maxTokens: 16000)
- **titleGenerator**: `openai/gpt-4o-mini` (temperature: 0.5, maxTokens: 100)

## 2. Flow Sequence

### Step 1: User Makes Request
User sends prompt to `/api/trpc/generation.chatStream`

### Step 2: Generation Router
`/src/server/api/routers/generation.universal.ts`
- Receives the request
- Calls the NEW orchestrator

### Step 3: Brain Orchestrator
`/src/brain/orchestratorNEW.ts`
- Creates instance of OrchestratorNEW
- Calls `orchestrate()` method

### Step 4: Context Building
`/src/brain/orchestrator_functions/contextBuilder.ts`
- Builds context packet with:
  - User preferences
  - Scene history
  - Conversation context
  - Image context

### Step 5: Intent Analysis
`/src/brain/orchestrator_functions/intentAnalyzer.ts`
- Uses `getModel("brain")` → Gets GPT-4.1 config
- Calls AIClientService with brain prompt
- **ONE MODEL INITIALIZATION**: The brain model (GPT-4.1) is initialized here

### Step 6: Brain Decision
The brain decides which tool to use:
- `addScene` → Add new scene
- `editScene` → Edit existing scene
- `deleteScene` → Delete scene (no AI)
- `trimScene` → Change duration (no AI)

### Step 7: Tool Execution
Based on brain decision, router calls appropriate tool:

#### If addScene:
1. `/src/tools/add/add.ts`
   - Validates input
   - Calls CodeGeneratorNEW

2. `/src/tools/add/add_helpers/CodeGeneratorNEW.ts`
   - Uses `getModel('codeGenerator')` → Gets Claude Sonnet 4 config
   - Generates React/Remotion code
   - **SECOND MODEL INITIALIZATION**: Claude Sonnet 4 for code generation

#### If editScene:
1. `/src/tools/edit/edit.ts`
   - Uses `getModel('editScene')` → Gets Claude Sonnet 4 config
   - Edits existing scene code
   - **SECOND MODEL INITIALIZATION**: Claude Sonnet 4 for editing

### Step 8: AI Client Service
`/src/server/services/ai/aiClient.service.ts`
- Handles actual API calls to OpenAI/Anthropic
- Uses the client cache from models.config.ts
- Manages streaming responses

## 3. Model Initialization

Models are initialized **lazily** when first used:

1. **First time `getModel('brain')` is called**:
   - Creates OpenAI client with API key
   - Caches the client for reuse

2. **First time `getModel('codeGenerator')` is called**:
   - Creates Anthropic client with API key
   - Caches the client for reuse

3. **Subsequent calls reuse cached clients**

## 4. Prompts Used

Active prompts from `/src/config/prompts/active/`:
- `brain-orchestrator.ts` - Used by brain for decision making
- `code-generator.ts` - Used for generating new scenes
- `edit-scene.ts` - Used for editing scenes

## 5. Complete Data Flow

```
User Prompt
    ↓
generation.universal.ts (router)
    ↓
orchestratorNEW.ts
    ↓
contextBuilder.ts + intentAnalyzer.ts
    ↓ (uses brain model - GPT-4.1)
Brain Decision
    ↓
Tool Selection (add/edit/delete/trim)
    ↓
Tool Execution
    ↓ (uses codeGenerator or editScene model - Claude Sonnet 4)
Generated/Modified Code
    ↓
Response to User
```

## Key Points

1. **Only 2 AI calls per request**:
   - Brain decision (GPT-4.1)
   - Tool execution (Claude Sonnet 4)

2. **Models initialized on-demand**:
   - Not at startup
   - Only when first used
   - Cached for subsequent requests

3. **Clear separation**:
   - Brain: Decision making only
   - Tools: Execution only
   - No circular dependencies