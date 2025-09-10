# Bazaar.it: AI-Powered Motion graphics for software demos

## Database Access Note
Use MCP tools to query both dev and prod Neon databases:
- `mcp__pg-dev__query` - Development database (use when working locally)
- `mcp__pg-prod__query` - Production database (read-only access)

## Progress & TODO Guidelines (CRITICAL - READ FIRST)

**All development work MUST follow these guidelines:**

always find root issues, use mcp tool to query the database, either prod or dev or both, to double check when u can. never just patch things to make it work in a hacky way, but try to be smart and think long term. Often, when I state something as the porblem, its just an exmaple of the problem. So dont just make custom solution for this one exmaple, but try to find out what this exmaple, and other exmaples, are a symptomps of.
### Sprint-Based Workflow
- **Active Sprints** (ALWAYS check these first):
  - Sprint 116 - Images: Unified multimodal image workflow (`/memory-bank/sprints/sprint116_images/`)
  - Sprint 108 - One Last Export: Reliable export pipeline (`/memory-bank/sprints/sprint108_one_last_export/`)
  - Sprint 107 - General Reliability: Core system fixes (`/memory-bank/sprints/sprint107_general_reliability/`)
  - Sprint 106 - Server-Side Compilation: TSX→JS on server (`/memory-bank/sprints/sprint106_server_side_compilation/`)
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

Bazaar.it is a sophisticated full-stack video creation platform that enables users to generate custom video content through natural language prompts. Built with Next.js 15, Remotion, and AI services, it provides real-time collaboration and dynamic component generation.

## System Architecture & Simplification

### The Power of Simplification
Our journey from complexity to clarity demonstrates how powerful simplification can be. We've transformed a codebase that even the team struggled to understand into a clear, maintainable system.

### Modularization Success Story
The most dramatic example is ChatPanelG:
- **Before**: 1400+ lines of tangled logic (messages, uploads, voice, errors, state)
- **After**: ~760 lines of orchestration + 5 focused components
- **Result**: 44% code reduction, 100% clarity improvement

#### Extracted Components:
```
components/chat/
├── ChatMessage.tsx         # Display individual messages
├── ChatWelcome.tsx        # Welcome screen for new chats  
├── GeneratingMessage.tsx  # Loading states during generation
├── ImageUpload.tsx        # Image handling with compression
└── VoiceInput.tsx         # Voice-to-text functionality
```
Note: AutoFixErrorBanner.tsx was deleted in Sprint 98 as auto-fix now runs completely silently.

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
  - Text input → Direct code generation
  - Image input → Branches on `imageAction` (embed vs recreate)
  - Multi-image support with per-asset directives
  - Template context for better first scenes
  
- **Edit Tool** (`/src/tools/edit/edit.ts`):
  - Surgical edits: "make the button blue" → Precise code changes
  - Creative edits: "make it better" → Enhanced animations
  - Image handling: Full URL context (not just filenames)
  - Scene name preservation
  
- **Delete Tool** (`/src/tools/delete/delete.ts`):
  - Removes scenes cleanly from timeline
  
- **Trim Tool** (`/src/tools/trim/trim.ts`):
  - Adjusts scene timing and duration

- **WebsiteToVideo Tool** (`/src/tools/website-to-video/`):
  - Creates 5-scene branded videos from URLs
  - Extracts brand colors, fonts, and style

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

### System Prompts - Unified and Modular

We've evolved from 40+ scattered prompts to a modular system:

1. **Brain Orchestrator** (`/src/config/prompts/active/brain-orchestrator.ts`)
   - Understands user request
   - Selects appropriate tools
   - Returns `imageAction` for image handling

2. **Code Generator** (`/src/config/prompts/active/code-generator.ts`)
   - Base prompt for code generation
   - Modular modes: embed vs recreate
   - Technical guardrails base

3. **Code Editor** (`/src/config/prompts/active/code-editor.ts`)
   - Makes precise edits to existing code
   - Handles multi-image context
   - URL preservation for images

4. **Title Generator** (`/src/config/prompts/active/title-generator.ts`)
   - Generates scene names from code

5. **Media Modes** (`/src/config/prompts/active/modes/`)
   - `image-embed.ts`: Exact image placement
   - `image-recreate.ts`: Reference-only recreation

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
- **AI**: 
  - OpenAI GPT-5-mini for brain/orchestration
  - Claude Sonnet 4 for multimodal code generation
  - Model rotation for reliability
- **Real-time**: Server-Sent Events (SSE) for chat streaming
- **Media**: Image upload with compression, Voice-to-text input, MediaMetadataService

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
- Server-side compilation (Sprint 106): TSX→JS on server
- Compiled JS stored in R2 with versioning
- Client imports pre-compiled JS (no client-side compilation)
- Automatic error detection and progressive fixing

### 5. Enhanced Chat Features
- **Voice Input**: Voice-to-text transcription for chat
- **Image Upload**: Advanced image compression and R2 storage
- **Media Panel**: Browse and select from uploaded media assets
- **Auto-Fix**: Silent progressive error fixing (Sprint 73 - completely automatic)
- **Modular Components**: ChatMessage, ChatWelcome, GeneratingMessage
- **Real-time Streaming**: Live updates via SSE connection
- **Metadata Analysis**: Automatic tagging of uploaded images (logo/ui/photo)

### 6. Multi-Format Video Support (In Development)
- YouTube (1920x1080) - landscape
- TikTok/Instagram Reels (1080x1920) - portrait
- Instagram Posts (1080x1080) - square
- Custom dimensions support

### 7. Video Export with AWS Lambda
- **Export Button**: Integrated in preview panel header
- **Lambda Rendering**: Cloud-based video rendering via Remotion Lambda
- **Progress Tracking**: Real-time export progress with percentage display
- **Auto-Download**: Automatic download when rendering completes
- **Rate Limiting**: 10 exports per day per user (configurable)
- **Format Support**: MP4, WebM, GIF with quality settings
- **Production Ready**: Requires AWS Lambda configuration (see Environment Variables)

**⚠️ CRITICAL S3 SETUP**: After deploying Remotion Lambda, you MUST run:
```bash
npm run setup:s3-public
```
This configures public read access for rendered videos. Without this step, all exports will fail with "access denied" errors when users try to download.

### 8. Email Marketing System
- **Resend Integration**: Professional email delivery service
- **Admin Dashboard**: `/admin/email-marketing` for campaign management
- **Email Templates**: Welcome emails and newsletters with React Email
- **Campaign Tracking**: Monitor email performance and engagement
- **User Management**: Send to all users or specific segments

## Development Workflow

### Essential Commands
```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm run test               # Run Jest tests
npm run lint               # Linting
npm run typecheck         # Type checking

# Database - WITH EXTREME CAUTION
npm run db:generate        # Generate migrations (uses tsx)
npm run db:migrate         # Apply migrations (uses tsx)
npm run db:push            # Push schema changes (uses tsx)
npm run db:studio          # Database UI
```

### Configuration Files
- `next.config.js` - Next.js configuration
- `remotion.config.ts` - Remotion setup
- `drizzle.config.ts` - Database configuration
- `tailwind.config.ts` - Styling configuration

## 🚨 CRITICAL DATABASE MIGRATION GUIDELINES 🚨

**⚠️ WARNING: Improper database migrations caused complete data loss in Sprint 32!**

### Database Branch Strategy
- **Development Branch**: Connected to development database (safe for testing)
- **Production Branch**: Connected to production database (EXTREME CAUTION)
- **NEVER run migrations directly on production without testing**

### Safe Migration Process

#### 1. Local Development (Dev Branch)
```bash
# When adding new tables or columns:
1. Make schema changes in src/server/db/schema.ts
2. npm run db:generate    # Creates migration file
3. Review the generated SQL in drizzle/migrations/
4. npm run db:push        # Apply to dev database
5. Test thoroughly
```

#### 2. CRITICAL: Before Merging to Production
```bash
# DO NOT MERGE if migration contains:
- ALTER COLUMN that changes data types (e.g., varchar → uuid)
- DROP TABLE or DROP COLUMN
- Any destructive changes

# Safe migrations include:
- CREATE TABLE (new tables)
- ADD COLUMN (new columns)
- CREATE INDEX
```

#### 3. Production Deployment Process
```bash
1. BACKUP PRODUCTION DATABASE FIRST
2. Test migration on staging database
3. Create rollback plan
4. Apply migration during low-traffic period
5. Verify data integrity immediately
```

### Migration Red Flags 🚩
- **Type Changes**: NEVER change column types without data migration plan
- **NextAuth.js**: User IDs MUST remain varchar(255), not UUID
- **Foreign Keys**: Check cascade effects before any changes
- **Data Loss**: Any ALTER TABLE can potentially destroy data

### Emergency Procedures
If data loss occurs:
1. Stop all database operations immediately
2. Check `/memory-bank/sprints/sprint32/CRITICAL-DATA-LOSS-INCIDENT.md`
3. Restore from most recent backup
4. Document incident in memory bank

### Best Practices
1. **Always backup before migrations**
2. **Test on development branch first**
3. **Review generated SQL manually**
4. **Never trust automatic migrations blindly**
5. **Keep migrations small and focused**
6. **Document migration purpose in memory bank**

## Memory Bank System (ESSENTIAL)

The `memory-bank/` directory contains ALL project documentation:
- **Progress**: `/memory-bank/progress.md` + sprint-specific files
- **Active Sprints**: Always check `/memory-bank/sprints/sprint116_images/`, `/memory-bank/sprints/sprint108_one_last_export/`, `/memory-bank/sprints/sprint107_general_reliability/`, `/memory-bank/sprints/sprint106_server_side_compilation/`
- **Architecture**: System design and patterns
- **API docs**: Service documentation
- **Testing**: Test strategies and results
- **Fixes**: Technical solutions and debugging
- **Recent Completed Sprints**: 
  - Sprint 111: Motion graphics principles
  - Sprint 104: Validation testing
  - Sprint 103: Multi-tool system
  - Sprint 100: Evaluation suite
  - Sprint 99: General findings & URL to video
  - Sprint 98: Auto-fix analysis and stabilization
  - Sprint 91: Promo codes & multi-tool system planning

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

# AWS Lambda (for video export)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
REMOTION_FUNCTION_NAME=remotion-render-...
REMOTION_BUCKET_NAME=remotionlambda-...
RENDER_MODE=lambda  # Set to 'lambda' for cloud rendering
```

## Current Development Context

### Sprint 116 - Images (Unified Multimodal Workflow) [ACTIVE]
- Single brain, fewer tools approach
- Brain returns `imageAction` (embed|recreate) per asset
- Upload-time metadata analysis via MediaMetadataService
- Multimodal prompts with Sonnet 4
- First-class multi-image support with per-asset directives

### Sprint 108 - One Last Export (Reliability) [ACTIVE]
- Hybrid icon inlining (local → Iconify API → placeholder)
- Post-transform validation to prevent React #130 errors
- Scene isolation for failure containment
- UI gating for icon set support

### Sprint 107 - General Reliability [ACTIVE]
- Fix component loading incompatibility
- Reduce over-aggressive preprocessing
- Simplify compilation layers
- Improve error isolation

### Sprint 106 - Server-Side Compilation [ACTIVE]
- Move TSX→JS compilation from client to server
- Store compiled JS in R2 with versioning
- Serve unchanged JS to client for all environments
- Single artifact across preview, share, and export

### Recent Achievements
- **Silent Auto-Fix (Sprint 73)**: Progressive error fixing with zero user intervention
- **SSE Chat Streaming**: Eliminated duplicate messages
- **Chat Modularization**: 44% code reduction in ChatPanelG
- **Duration Standardization**: Fixed hardcoded frame issues
- **Voice & Image Input**: Enhanced media capabilities

### Critical Systems
- **Evaluation Framework**: `/src/lib/evals/` - DO NOT DELETE
- **Generation Tools**: `/src/tools/` - Core AI pipeline
- **SSE Generation**: `/src/app/api/generate-stream/` - Real-time chat
- **Auto-Fix Hook**: `/src/hooks/use-auto-fix.ts` - Silent progressive error fixing
- **Chat Components**: `/src/components/chat/` - Modular UI

### Silent Auto-Fix System
- Automatically fixes scene compilation errors in the background
- Progressive fix strategy: minimal → comprehensive → rewrite
- No UI interruptions - completely silent operation
- Implementation: `/src/hooks/use-auto-fix.ts`

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