# BAZAAR-VID: TEAM DEVELOPMENT CONTEXT
## Single Source of Truth for All Development Work

> **COPY THIS ENTIRE DOCUMENT INTO YOUR FIRST PROMPT** when starting any development work on Bazaar-Vid

---

## 🎯 WHAT IS BAZAAR-VID?

Bazaar-Vid is a **sophisticated AI-powered video creation platform** that enables users to generate custom video content through natural language prompts. Users can create professional videos by simply describing what they want, and our AI agents generate the necessary React/Remotion components and compose them into videos.

### Core Value Proposition:
- **Input**: Natural language description ("Create a video with floating particles and fade-in text")
- **Output**: Professional video with custom AI-generated React components
- **Magic**: Real-time AI component generation, composition, and rendering

---

## 🏗️ ARCHITECTURE OVERVIEW

### Tech Stack:
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS + shadcn/ui
- **Backend**: tRPC v11 + Next.js API Routes  
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Storage**: Cloudflare R2 for assets
- **Video**: Remotion for composition and rendering
- **AI**: OpenAI GPT-4o-mini with MCP tools, Claude sonnet 4 for codegen. 
- **Real-time**: Server-Sent Events (SSE) for chat streaming
- **Media**: Voice-to-text input, Image upload with compression

### Production Flow (CRITICAL TO UNDERSTAND):
```
User Prompt → ChatPanelG → generation.generateScene → MCP Tools  → Custom React Code → Video
```

### State Management Flow (SIMPLIFIED - Sprint 35):
```
Backend Response → VideoState (Direct Update) → React Re-render → UI Updates Immediately
```

---

## 🎯 SYSTEM SIMPLIFICATION (CRITICAL)

### Modularization Success
We've transformed our codebase from monolithic files to focused, maintainable modules:
- **ChatPanelG**: 1400+ lines → ~760 lines (44% reduction)
- **Clear Separation**: Each component has ONE responsibility
- **Better Developer Experience**: New team members understand the flow

### Simplified Flow - The Complete Journey

```
1. User types in ChatPanelG or uploads image
   └─> "Create a tech startup video with animations"

2. Request flows to generation.universal.ts (API Router)
   └─> Validates user, prepares for Brain

3. Brain Orchestrator (orchestratorNEW.ts) takes over
   ├─> Builds context from chat history & current state
   ├─> Understands intent: "User wants to create new scene"
   └─> Selects tool: AddScene

4. MCP Tool executes (src/tools/addScene.ts)
   ├─> If text: Layout Generation → Code Generation
   ├─> If image: Direct Code Generation
   └─> Returns Remotion-compatible React code

5. VideoState updates directly (src/stores/videoState.ts)
   └─> updateScene(projectId, sceneId, generatedCode)

6. Preview auto-refreshes (PreviewPanelG.tsx)
   └─> Zustand reactivity triggers re-render
   └─> User sees video immediately
```

### The Magic of Simplification

**Before**: 2+ minutes, unclear flow, 40+ prompts, race conditions
**After**: 60-90 seconds, linear flow, 5 prompts, no race conditions

**See SYSTEM-ARCHITECTURE.md for complete technical documentation**

---

## 🚀 ENHANCED FEATURES (NEW - Sprints 45-48)

### Chat System Improvements:
- **SSE Streaming**: Real-time chat messages via Server-Sent Events
- **No More Duplicates**: Database as single source of truth
- **Voice Input**: Voice-to-text transcription for chat
- **Image Upload**: Advanced compression and R2 storage
- **Auto-Fix**: One-click error fixing with progress feedback

### New UI Components:
- **Modular Chat**: ChatMessage, ChatWelcome, GeneratingMessage
- **AutoFixErrorBanner**: Shows compilation errors with fix button
- **ImageUpload**: Drag-and-drop with preview and compression
- **VoiceInput**: Record and transcribe voice messages

### Multi-Format Support (Sprint 48):
- **YouTube**: 1920x1080 (16:9) - landscape
- **TikTok/Reels**: 1080x1920 (9:16) - portrait  
- **Instagram**: 1080x1080 (1:1) - square
- **Custom**: Any dimensions supported

### API Endpoints:
- **`/api/generate-stream`**: SSE endpoint for real-time chat
- **Standard tRPC routers**: All existing functionality

---

## 🎮 STATE MANAGEMENT (CRITICAL - Updated Sprint 35)

### Core Principle: Trust Your State
```typescript
// ✅ CORRECT: Direct state update
updateScene(projectId, sceneId, newSceneData);
// Preview updates immediately via Zustand reactivity

// ❌ WRONG: Don't refetch after updates
updateScene(projectId, sceneId, newSceneData);
await refetchFromDatabase(); // This causes race conditions!
```

### VideoState Store (`src/stores/videoState.ts`):
- **Single Source of Truth** for all video project data
- **Direct Updates Only** - no complex refresh mechanisms
- **Zustand Reactivity** - components auto-update when state changes
- **No Custom Events** - removed all window.dispatchEvent patterns

### Key Methods:
```typescript
// Core update methods (use these!)
updateScene(projectId, sceneId, scene)  // Edit existing scene
addScene(projectId, scene)              // Add new scene
deleteScene(projectId, sceneId)         // Remove scene
setProject(projectId, props)            // Initial project load

// REMOVED (don't use):
forceRefresh()    // ❌ Removed - redundant
applyPatch()      // ❌ Removed - unused
globalRefreshCounter // ❌ Removed - overcomplicated
```

### Update Flow:
1. User action in ChatPanelG
2. Backend processes request
3. Backend returns updated data
4. Call updateScene() with fresh data
5. PreviewPanelG auto-recompiles via Zustand subscription
6. User sees update immediately

### Common Patterns:
```typescript
// In ChatPanelG after backend response:
updateScene(projectId, sceneId, transformedScene);
// That's it! No refetch, no events, no refresh tokens

// In PreviewPanelG:
const scenes = currentProps?.scenes || [];
useEffect(() => {
  if (scenes.length > 0) {
    compileMultiSceneComposition();
  }
}, [scenes]); // Simple direct watching
```

---

## 🧠 CONTEXT BUILDING ARCHITECTURE (Updated Sprint 38)

### Image Context System:
The image context building has been moved from the orchestrator to the contextBuilder for better separation of concerns:

#### Architecture Benefits:
- **Centralized Context**: All context (preferences, scenes, images) built in one place
- **Reusability**: Any service can access image context via contextBuilder
- **AI Learning**: Image patterns can trigger preference learning
- **Clean Code**: Orchestrator focuses on tool selection, not context building

#### Image Context Flow:
```
ChatHistory → ContextBuilder.buildImageContext() → ImageContext {
  conversationImages: Array of image positions and prompts
  imagePatterns: AI-detected usage patterns
  totalImageCount: Number of images in conversation
  currentImageUrls: Current upload if any
}
```

#### Image Reference Resolution:
```typescript
// User says "use the first image" or "the image I uploaded earlier"
const imageRef = contextBuilder.extractImageReference(userPrompt);
const imageUrls = contextBuilder.getImageUrlsFromReference(imageContext, imageRef);
```

#### Integration Points:
1. **Orchestrator**: Passes chatHistory to contextBuilder, uses image context for decisions
2. **MCP Tools**: Receive resolved image URLs directly, no need to parse references
3. **Preference Learning**: Image patterns contribute to user preference extraction
4. **Project Memory**: Image analysis results stored for long-term context

---

¨

### Main User Flow Files:
```
ChatPanelG.tsx → generation.generateScene → brain/orchestrator.ts → MCP tools → 
```

### Quick Navigation Commands:
```bash
# Find files by pattern
find src/ -name "*component*" -type f

# Search for code patterns
rg "generateScene" src/

# Find type definitions
find src/lib/types/ -name "*.ts"

# Locate API endpoints
ls src/server/api/routers/
```

---

## ⚡ DEVELOPMENT WORKFLOW

### Getting Started:
```bash
# Setup
npm install
cp .env.example .env.local  # Configure DATABASE_URL, OPENAI_API_KEY, etc.

# Development
npm run dev                 # Start dev server
npm run db:studio          # View database
npm run db:seed            # Seed test data

# Testing
npm run build              # Production build
npm run typecheck          # TypeScript validation
npm run evals              # Run evaluation system
```

### Making Changes:
1. **Read `CLAUDE.md`** for project context
2. **Check `coco_notes.md`** for main functionality
3. **Follow the organized structure** - don't create new directories
4. **Use existing patterns** - mimic similar components/services
5. **Update types** in the appropriate `src/lib/types/` subdirectory

---

## 🎨 CODE STYLE & PATTERNS

### TypeScript:
- **Strict mode enabled** - all code must be properly typed
- **Use organized imports** - group by external/internal
- **Prefer interfaces** over types for objects
- **Use the `~` alias** for imports from src/

### React Components:
- **Use TypeScript** with proper prop interfaces
- **Prefer function components** with hooks
- **Use Tailwind CSS** for styling (no CSS modules)
- **Follow shadcn/ui patterns** for UI components

### API Design:
- **Use tRPC** for type-safe APIs
- **Prefer small, focused procedures** over large ones
- **Use proper error handling** with TRPCError
- **Follow existing router patterns**

### Database:
- **Use Drizzle ORM** - no raw SQL unless necessary
- **Define relationships** in schema.ts
- **Use transactions** for multi-table operations
- **Follow naming conventions** (camelCase for fields)

---

## 🚨 CRITICAL RULES & CONSTRAINTS

### What to double check before Touch:
- **`src/lib/evals/`** - Evaluation system (team uses this for testing)
- **Database schema** - Always discuss schema changes first
- **Production API routes** - Don't break existing endpoints
- **MCP tools** - These are the production AI system

### File Organization Rules:
- **One service per file** - don't create god files
- **Types go in `src/lib/types/`** - organized by domain
- **No duplicate code** - use shared utilities
- **No circular dependencies** - check import paths

### Performance Rules:
- **Use React.memo** for expensive components
- **Lazy load** heavy components with dynamic imports
- **Optimize database queries** - avoid N+1 problems
- **Cache API responses** where appropriate

---

## 🛠️ COMMON TASKS & PATTERNS

### Adding a New AI Tool:
1. Create in `src/server/services/mcp/tools/`
2. Follow existing tool patterns (see `addScene.ts`)
3. Register in `src/server/services/mcp/tools/registry.ts`
4. Add types to `src/lib/types/ai/`

### Adding a New API Endpoint:
1. Add to appropriate router in `src/server/api/routers/`
2. Use `protectedProcedure` for authenticated endpoints
3. Add input validation with Zod
4. Add types to `src/lib/types/api/`

### Adding a New Component:
1. Create in appropriate `src/components/` subdirectory
2. Use TypeScript with proper props interface
3. Follow Tailwind + shadcn/ui patterns
4. Add to exports if reusable

### Database Changes:
1. Update `src/server/db/schema.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply changes
4. Update types if necessary

---

## 🔍 DEBUGGING & TROUBLESHOOTING

### Common Issues:
- **Build errors**: Check TypeScript imports and types
- **Database errors**: Check schema and migrations
- **API errors**: Check tRPC router definitions
- **Component errors**: Check prop types and imports

### Debug Tools:
- **Database**: `npm run db:studio`
- **Types**: `npm run typecheck`
- **API**: Check Network tab in browser
- **Logs**: Check browser console and terminal

### Getting Help:
- **Check `memory-bank/`** for historical context
- **Look at similar patterns** in existing code
- **Use evaluation system** to test changes
- **Follow the main flow** in `coco_notes.md`

---

## 📚 TEAM KNOWLEDGE BASE

### Important Context:
- **Main flow is working** - ChatPanelG → generation → MCP tools
- **State management simplified (Sprint 35)** - Direct updates only, no refetching
- **Image context refactored (Sprint 38)** - Now centralized in contextBuilder
- **A2A system was removed** - don't reference old agent system
- **Evaluation system is critical** - don't break `src/lib/evals/`
- **Database is production** - be careful with schema changes
- **Repository was recently cleaned** - follow new organization

### Success Patterns:
- **Small, focused changes** work better than large refactors
- **Follow existing patterns** rather than creating new ones
- **Test with evaluation system** before major changes
- **Use the organized type structure** for better maintainability

---

## 🎯 SUCCESS CRITERIA

### Your code change is successful if:
- ✅ **Builds without errors** (`npm run build`)
- ✅ **Types are correct** (`npm run typecheck`)
- ✅ **Follows existing patterns** (check similar code)
- ✅ **Uses organized structure** (types in right place)
- ✅ **Doesn't break main flow** (test ChatPanelG → generation)
- ✅ **Evaluation system still works** (`npm run evals`)

---

## 🚀 READY TO DEVELOP!

You now have the complete context for Bazaar-Vid development. Follow this structure, use existing patterns, and you'll be productive immediately.

**Key Reminder**: This is a **video creation platform** where users describe videos in natural language and AI generates the React/Remotion components. The magic happens in the MCP tools and generation services!

---
---

*Last Updated: 11.06.2025 After state management simplification (Sprint 35) - trust your state, no refetching!*

->

---

## 🌿 GIT WORKFLOW

### Branch Strategy:
- **`main`** - Production branch (DO NOT TOUCH during development)
- **`dev`** - Development branch (our working branch)
- **Feature branches** - Branch out from `dev` for all work

### Workflow Process:
1. **Always branch from `dev`**: `git checkout dev && git pull && git checkout -b feature/your-feature-name`
2. **Make your changes** on your feature branch
3. **Create PR from your feature branch → `dev`** (never directly to `main`)
4. **After PR approval**: Merge into `dev`
5. **Main branch is protected** - only releases/hotfixes touch `main`

### Commands:
```bash
# Start new work
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# Push your work
git push origin feature/your-feature-name
# Then create PR: feature/your-feature-name → dev

# Update your branch with latest dev
git checkout dev && git pull
git checkout feature/your-feature-name
git merge dev
```

**CRITICAL**: Never push directly to `main` or create PRs to `main` during regular development work.

---

*Last Updated: 11.06.2025 After image context refactoring (Sprint 38) - centralized in contextBuilder for better architecture!*