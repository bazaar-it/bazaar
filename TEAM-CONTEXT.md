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
- **AI**: OpenAI GPT-4o-mini with multi-agent system
- **Real-time**: Server-Sent Events + JSON Patch for collaboration

### Production Flow (CRITICAL TO UNDERSTAND):
```
User Prompt → ChatPanelG → generation.generateScene → MCP Tools → sceneBuilder → Custom React Code → Video
```

---

## 📁 CODEBASE STRUCTURE (SINGLE SOURCE OF TRUTH)

### Root Directory:
```
├── src/                          # All application code
├── scripts/                      # Essential production scripts ONLY
├── drizzle/                      # Database migrations (canonical)
├── memory-bank/                  # Project documentation & history
├── package.json                  # Dependencies & scripts
├── CLAUDE.md                     # Project instructions (READ THIS!)
└── TEAM-CONTEXT.md              # This file
```

### Core Application Structure:
```
src/
├── app/                          # Next.js App Router pages
│   ├── projects/[id]/generate/   # Main video editor interface
│   ├── admin/                    # Admin dashboard
│   └── api/                      # API route handlers
├── server/                       # Backend services & APIs
│   ├── services/                 # Business logic (ORGANIZED!)
│   │   ├── ai/                   # AI client & title generation
│   │   ├── brain/                # Orchestrator & scene repository  
│   │   ├── data/                 # Data lifecycle & project memory
│   │   ├── generation/           # Code generation & scene building
│   │   └── mcp/                  # MCP tools (PRODUCTION SYSTEM)
│   ├── api/routers/              # tRPC API endpoints
│   └── db/                       # Database schema & queries
├── lib/                          # Shared utilities & types
│   ├── types/                    # TypeScript definitions (ORGANIZED!)
│   │   ├── ai/                   # AI & brain types
│   │   ├── api/                  # API & chat types  
│   │   ├── database/             # Database types
│   │   ├── shared/               # Shared utilities
│   │   └── video/                # Video & remotion types
│   └── evals/                    # Evaluation system (CRITICAL!)
├── components/                   # Reusable UI components
├── remotion/                     # Video composition components
├── hooks/                        # React hooks
├── stores/                       # State management
└── templates/                    # Pre-built animation templates
```

---

## 🎯 WHERE TO CREATE NEW FILES

### Frontend Components:
- **UI Components**: `src/components/ui/`
- **Client Components**: `src/components/client/`
- **Page Components**: `src/app/[route]/`

### Backend Services:
- **AI Services**: `src/server/services/ai/`
- **Generation Services**: `src/server/services/generation/`
- **Data Services**: `src/server/services/data/`
- **MCP Tools**: `src/server/services/mcp/tools/`

### API Routes:
- **tRPC Routers**: `src/server/api/routers/`
- **REST Endpoints**: `src/app/api/`

### Types:
- **AI Types**: `src/lib/types/ai/`
- **API Types**: `src/lib/types/api/`
- **Video Types**: `src/lib/types/video/`
- **Shared Types**: `src/lib/types/shared/`

### Database:
- **Schema**: `src/server/db/schema.ts` (SINGLE FILE)
- **Migrations**: Auto-generated in `drizzle/migrations/`

---

## 🧭 HOW TO NAVIGATE THE CODEBASE

### Key Files to Understand:
1. **`CLAUDE.md`** - Project instructions & quick start
2. **`coco_notes.md`** - Main functionality reference
3. **`src/app/projects/[id]/generate/`** - Main video editor
4. **`src/server/services/brain/orchestrator.ts`** - AI orchestration
5. **`src/server/services/mcp/tools/`** - Production AI tools
6. **`src/server/api/routers/generation.ts`** - Main API endpoint

### Main User Flow Files:
```
ChatPanelG.tsx → generation.generateScene → brain/orchestrator.ts → MCP tools → sceneBuilder.service.ts
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

*Last Updated: 09.14.2025 After comprehensive repository cleanup - single source of truth achieved!*