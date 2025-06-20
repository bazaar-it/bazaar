# Bazaar-Vid: AI-Powered Video Creation Platform

## Progress & TODO Guidelines (CRITICAL - READ FIRST)

**All development work MUST follow these guidelines:**

### Sprint-Based Workflow
- **Current Sprint**: Sprint 48 - Mobile Support (check `/memory-bank/sprints/sprint48/` for context)
- **Documentation First**: For complex tasks, create analysis docs in sprint folder before coding
- **Progress Tracking**: Update `/memory-bank/progress.md` AND sprint-specific progress files
- **Memory Bank**: Always check relevant docs in `/memory-bank/` before starting work

### TODO Organization Structure
```
/memory-bank/
├── TODO-critical.md        # Immediate blockers & bugs
├── TODO.md                 # General backlog
├── sprints/sprintX/
│   ├── TODO.md            # Sprint-specific tasks
│   ├── progress.md        # Sprint progress log
│   └── [analysis-docs]    # Technical analysis files
└── progress.md            # Overall project progress
```

### Documentation Patterns
1. **Before Complex Work**: Create analysis document in current sprint folder
2. **During Work**: Update progress files continuously
3. **After Work**: Document findings and next steps
4. **Cross-Reference**: Link related docs and maintain memory bank connections

### Work Approach
- **Read First**: Check existing documentation before starting
- **Document Everything**: Decisions, findings, and reasoning
- **Progress Updates**: Real-time updates to progress files
- **Sprint Focus**: Stay within current sprint scope unless critical

## Project Overview

Bazaar-Vid is a sophisticated full-stack video creation platform that enables users to generate custom video content through natural language prompts. Built with Next.js 15, Remotion, and AI services, it provides real-time collaboration and dynamic component generation.

## System Architecture & Simplification

### The Power of Simplification
Our journey from complexity to clarity demonstrates how powerful simplification can be. We've transformed a codebase that even the team struggled to understand into a clear, maintainable system.

### Modularization Success Story
The most dramatic example is ChatPanelG:
- **Before**: 1400+ lines of tangled logic (messages, uploads, voice, errors, state)
- **After**: ~760 lines of orchestration + 6 focused components
- **Result**: 44% code reduction, 100% clarity improvement

#### Extracted Components:
```
components/chat/
├── ChatMessage.tsx         # Display individual messages
├── ChatWelcome.tsx        # Welcome screen for new chats  
├── GeneratingMessage.tsx  # Loading states during generation
├── ImageUpload.tsx        # Image handling with compression
├── VoiceInput.tsx         # Voice-to-text functionality
└── AutoFixErrorBanner.tsx # Error detection and auto-fix
```

### How The System Works - Complete Flow

#### 1. User Journey Begins
Users land on `/projects/[id]/generate/page.tsx` with one goal: **create amazing motion graphics videos**. They see:

```
┌─────────────────────────────────────────────────────┐
│  Generate Workspace                                 │
├─────────────────┬───────────────────────────────────┤
│                 │                                   │
│   ChatPanelG    │        PreviewPanelG            │
│                 │                                   │
│ "Create a video │     [Live Video Preview]        │
│  with floating  │                                   │
│  particles..."  │                                   │
│                 │                                   │
├─────────────────┴───────────────────────────────────┤
│ Templates | Code Panel | My Projects                │
└─────────────────────────────────────────────────────┘
```

#### 2. The Magic Flow - From Prompt to Video

**Step 1: User Input**
```typescript
// User types in ChatPanelG or uploads image
"Create a finance dashboard animation with blue charts"
```

**Step 2: API Router** (`/src/server/api/routers/generation.universal.ts`)
```typescript
generateScene: protectedProcedure
  .input(generateSceneSchema)
  .mutation(async ({ input, ctx }) => {
    // 1. Validate user & project
    // 2. Call Brain Orchestrator
    const result = await orchestrator.process(input);
    // 3. Return generated code
    return result;
  })
```

**Step 3: Brain Orchestrator** (`/src/brain/orchestratorNEW.ts`)
```typescript
class BrainOrchestrator {
  async process(input) {
    // 1. Build context from entire conversation
    const context = await this.buildContext(chatHistory, currentState);
    
    // 2. Understand what user wants
    const intent = await this.analyzeIntent(input.prompt, context);
    
    // 3. Select the right tool(s)
    const tools = this.selectTools(intent);
    // Example: "create finance dashboard" → AddScene tool
    
    // 4. Execute selected tools with context
    return await this.executeTools(tools, context);
  }
}
```

**Step 4: Generation Tools** (`/src/tools/`)
Tools are specialized functions that generate Remotion code:

- **Add Tool** (`/src/tools/add/add.ts`):
  - Text input → Direct code generation (no layout step)
  - Image input → Direct code generation from visual
  - Previous scene reference → Code generation with style matching
  
- **Edit Tool** (`/src/tools/edit/edit.ts`):
  - Surgical edits: "make the button blue" → Precise code changes
  - Creative edits: "make it better" → Enhanced animations
  
- **Delete Tool** (`/src/tools/delete/delete.ts`):
  - Removes scenes cleanly from timeline
  
- **Trim Tool** (`/src/tools/trim/trim.ts`):
  - Adjusts scene timing and duration

**Step 5: State Management** (`/src/stores/videoState.ts`)
```typescript
// Direct, simple updates - no complexity
updateScene(projectId, sceneId, newCode);
// That's it! Zustand handles everything else
```

**Step 6: Automatic UI Updates**
```typescript
// PreviewPanelG watches state changes
const scenes = useVideoState(state => state.projects[projectId]?.scenes);
// Automatically recompiles when scenes change
```

#### 3. Database Persistence
All changes persist to PostgreSQL via Drizzle ORM, ensuring users never lose work.

### Why This Architecture Works

#### 1. Linear Flow
```
User → Chat → API → Brain → Tools → State → UI
```
No circular dependencies, no confusion.

#### 2. Single Responsibility
- **ChatPanelG**: User interaction only
- **Brain**: Intent understanding only  
- **Tools**: Code generation only
- **State**: Data storage only

#### 3. Trust the Framework
- Zustand handles reactivity
- React handles re-renders
- No manual refresh needed

### Performance Improvements

**Before Simplification**:
- 2+ minutes for generation
- Race conditions common
- Duplicate messages frequent
- Complex debugging

**After Simplification**:
- 60-90 seconds generation
- No race conditions
- No duplicates (SSE + database truth)
- Clear debugging path

### System Prompts - From 40+ to 4

We discovered we had 40+ system prompts scattered throughout the codebase. Through careful analysis, we reduced to 4 essential prompts:

1. **Brain Orchestrator** (`/src/config/prompts/active/brain-orchestrator.ts`)
   - Understands user request
   - Selects appropriate tools

2. **Code Generator** (`/src/config/prompts/active/code-generator.ts`)
   - Transforms text/images directly to Remotion code

3. **Code Editor** (`/src/config/prompts/active/code-editor.ts`)
   - Makes precise edits to existing code

4. **Title Generator** (`/src/config/prompts/active/title-generator.ts`)
   - Generates scene names from code

### Key Simplifications Summary

1. **Modularization**: Large files → Small, focused components
2. **Direct State Updates**: Complex refresh → Trust Zustand
3. **Clear Data Flow**: Spaghetti → Linear pipeline
4. **Reduced Prompts**: 40+ → 5 essential
5. **Single Truth**: Multiple sources → Database + VideoState

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Configure: DATABASE_URL, OPENAI_API_KEY, CLOUDFLARE_R2_*, AUTH_SECRET

# Start development
npm run dev

# Database setup
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # View database
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Backend**: tRPC v11 + Next.js API Routes  
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Storage**: Cloudflare R2
- **Video**: Remotion for composition and rendering
- **AI**: OpenAI GPT-4o-mini for code generation
- **Real-time**: Server-Sent Events (SSE) for chat streaming
- **Media**: Image upload with compression, Voice-to-text input

### Organized File Structure (Single Source of Truth)

```
src/
├── app/                    # Next.js App Router pages
├── server/                 # Backend services and APIs
│   ├── api/routers/       # tRPC API endpoints
│   ├── services/          # Business logic services
│   │   ├── ai/            # AI & LLM services  
│   │   ├── generation/    # Code generation services
│   │   ├── data/          # Data management
│   │   ├── generation/    # Code generation services
│   │   └── brain/         # Core orchestration
│   ├── db/                # Database schema and queries
│   └── auth/              # Authentication
├── lib/                   # Shared libraries
│   ├── types/             # TypeScript type definitions
│   │   ├── api/           # API and communication types
│   │   ├── video/         # Video and timeline types
│   │   ├── ai/            # AI-related types
│   │   └── shared/        # Shared utility types
│   ├── services/client/   # Client-side only services
│   ├── evals/             # Evaluation framework (CRITICAL)
│   └── utils/             # Utility functions
├── components/            # Reusable UI components
│   └── chat/              # Modular chat components
├── remotion/              # Video composition components
├── hooks/                 # React hooks
│   ├── use-sse-generation # SSE chat streaming
│   └── use-auto-fix       # Automatic error fixing
└── stores/                # State management (Zustand)
```

## Key Features

### 1. Scene Generation System
Modern AI pipeline for video generation:
- **Brain Orchestrator**: Coordinates scene planning and generation
- **Generation Tools**: Structured functions for scene creation (`/src/tools/`)
- **Generation Router**: Manages component building and storage
- **Evaluation System**: Tests and validates AI pipeline (`/src/lib/evals/`)

### 2. Video Generation Pipeline
```
User Prompt → Scene Planning → Component Generation → 
Building → Storage → Preview → Chat Updates
```

### 3. Real-time Communication
- Server-Sent Events (SSE) for chat message streaming
- Live progress updates during generation
- Database as single source of truth for messages
- Automatic duplicate message prevention

### 4. Dynamic Component System
- Built-in scenes: Text, images, shapes, animations
- AI-generated custom components via generation tools
- ESM loading from R2 storage
- Automatic error detection and fixing for scene compilation

### 5. Enhanced Chat Features
- **Voice Input**: Voice-to-text transcription for chat
- **Image Upload**: Advanced image compression and R2 storage
- **Auto-Fix**: One-click error fixing with humorous feedback
- **Modular Components**: ChatMessage, ChatWelcome, GeneratingMessage
- **Real-time Streaming**: Live updates via SSE connection

### 6. Multi-Format Video Support (In Development)
- YouTube (1920x1080) - landscape
- TikTok/Instagram Reels (1080x1920) - portrait
- Instagram Posts (1080x1080) - square
- Custom dimensions support

## Development Workflow

### Essential Commands
```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm run test               # Run Jest tests
npm run lint               # Linting
npm run typecheck         # Type checking

# Database
npm run db:generate        # Generate migrations
npm run db:migrate         # Apply migrations
npm run db:studio          # Database UI
```

### Configuration Files
- `next.config.js` - Next.js configuration
- `remotion.config.ts` - Remotion setup
- `drizzle.config.ts` - Database configuration
- `tailwind.config.ts` - Styling configuration

## Memory Bank System (ESSENTIAL)

The `memory-bank/` directory contains ALL project documentation:
- **Progress**: `/memory-bank/progress.md` + sprint-specific files
- **Sprints**: `/memory-bank/sprints/sprint48/` (current - Mobile Support)
- **Architecture**: System design and patterns
- **API docs**: Service documentation
- **Testing**: Test strategies and results
- **Fixes**: Technical solutions and debugging
- **Recent Sprints**: 
  - Sprint 45: Chat modularization & SSE implementation
  - Sprint 46: Duration system standardization
  - Sprint 47: General cleaning & motion libraries
  - Sprint 48: Mobile/social format support

**ALWAYS check memory bank before starting any work.**

## Environment Variables

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-...

# Cloudflare R2
CLOUDFLARE_R2_BUCKET_NAME=...
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...

# Auth
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Current Development Context

### Sprint 48 Focus - Mobile Support
- Multi-format video support (mobile, square, desktop)
- Dynamic preview dimensions (no multi-preview panel)
- Format-specific AI generation guidelines
- Social media platform optimization

### Recent Achievements
- **SSE Chat Streaming**: Eliminated duplicate messages
- **Auto-Fix System**: Automatic error detection and repair
- **Chat Modularization**: 44% code reduction in ChatPanelG
- **Duration Standardization**: Fixed hardcoded frame issues
- **Voice & Image Input**: Enhanced media capabilities

### Critical Systems
- **Evaluation Framework**: `/src/lib/evals/` - DO NOT DELETE
- **Generation Tools**: `/src/tools/` - Core AI pipeline
- **SSE Generation**: `/src/app/api/generate-stream/` - Real-time chat
- **Auto-Fix Hook**: `/src/hooks/use-auto-fix.ts` - Error handling
- **Chat Components**: `/src/components/chat/` - Modular UI

## Contributing Guidelines

1. **Read memory-bank documentation first**
2. **Update progress files during work**
3. **Create analysis docs for complex tasks**
4. **Follow single source of truth patterns**
5. **Test thoroughly with evaluation framework**
6. **Document decisions and findings**

## Troubleshooting

### Common Issues
1. **Component Loading**: Check R2 storage and generation tools
2. **Database**: Verify migrations and connection
3. **AI Pipeline**: Check OpenAI key and evaluation results
4. **Build**: Review TypeScript errors and organized imports
5. **Duplicate Messages**: Fixed via SSE implementation
6. **Scene Errors**: Use auto-fix feature in chat
7. **Timeline Utils**: Known broken imports issue

### Debug Resources
- Memory bank documentation
- Sprint-specific analysis files
- `/src/lib/evals/` testing framework
- Browser DevTools for real-time updates

## Resources

- **Memory Bank**: Primary source of truth for project knowledge
- **Sprint Docs**: Current sprint folder for active work context  
- [Next.js Documentation](https://nextjs.org/docs)
- [Remotion Documentation](https://remotion.dev/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [tRPC Documentation](https://trpc.io/docs)

---

**Remember: Documentation first, memory bank always, progress tracking continuous.**