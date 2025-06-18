# Ideal Bazaar-Vid File Structure

## Core Principle: One Source of Truth
Each concept has ONE location. No duplicates, no confusion.

## Proposed Clean Structure

```
src/
├── app/                          # Next.js App Router pages ONLY
│   ├── (marketing)/             # Public pages
│   ├── admin/                   # Admin pages
│   ├── projects/                # Project pages
│   ├── dashboard/               # Dashboard
│   └── api/                     # API routes (webhooks, edge functions)
│       └── trpc/[trpc]/        # tRPC endpoint
│
├── brain/                        # SINGLE brain/planner location
│   ├── planner.ts              # Main intelligent planner
│   └── prompts.ts              # Brain-specific prompts
│
├── tools/                        # MCP-style tools (pure functions)
│   ├── add.ts                  # Add scene tool
│   ├── edit.ts                 # Edit scene tool
│   ├── delete.ts               # Delete scene tool
│   └── types.ts                # Tool interfaces
│
├── api/                          # tRPC routers ONLY
│   ├── generation.ts           # Main generation router
│   ├── project.ts              # Project management
│   ├── chat.ts                 # Chat/messages
│   ├── scenes.ts               # Scene CRUD
│   └── root.ts                 # Root router
│
├── services/                     # Infrastructure services
│   ├── ai.service.ts           # LLM client wrapper
│   ├── db.service.ts           # Database operations
│   ├── storage.service.ts      # R2/file storage
│   └── memory.service.ts       # Project memory (metadata)
│
├── components/                   # React components
│   ├── ui/                     # shadcn/ui components
│   ├── chat/                   # Chat-related components
│   ├── video/                  # Video player components
│   └── shared/                 # Shared components
│
├── lib/                          # Shared utilities & types
│   ├── types/                  # TypeScript types
│   │   ├── api.ts             # API types
│   │   ├── video.ts           # Video/Remotion types
│   │   └── database.ts        # DB entity types
│   └── utils/                  # Utility functions
│       ├── cn.ts              # Class name utils
│       └── video.ts           # Video helpers
│
├── remotion/                     # Remotion-specific code
│   ├── scenes/                 # Scene components
│   ├── compositions/           # Video compositions
│   └── Root.tsx               # Remotion root
│
├── db/                          # Database layer
│   ├── schema.ts              # Drizzle schema
│   └── index.ts               # DB client
│
├── stores/                      # Client state (Zustand)
│   └── video.store.ts         # Video state management
│
├── config/                      # Configuration
│   ├── prompts.ts             # System prompts (5 total)
│   ├── models.ts              # AI model config
│   └── site.ts                # Site metadata
│
└── hooks/                       # React hooks
    └── use-video.ts           # Video-related hooks
```

## What Goes Where

### 1. Brain/Planner Logic
- **Location**: `/src/brain/`
- **Contents**: Intelligent planner that decides which tools to use
- **NOT**: Complex orchestration, tool execution

### 2. Tools (MCP Pattern)
- **Location**: `/src/tools/`
- **Contents**: Pure functions that generate/edit/delete scenes
- **NOT**: Database access, side effects

### 3. API Routes (tRPC)
- **Location**: `/src/api/`
- **Contents**: tRPC routers that handle requests
- **Responsibilities**: Auth, DB operations, tool execution, response formatting

### 4. Services (Infrastructure)
- **Location**: `/src/services/`
- **Contents**: Wrappers for external services (AI, DB, Storage)
- **NOT**: Business logic, tool implementations

### 5. Components
- **Location**: `/src/components/`
- **Organization**: By feature (chat/, video/, ui/)
- **NOT**: Pages (those go in app/)

### 6. Libraries
- **Location**: `/src/lib/`
- **Contents**: Shared types and utilities
- **NOT**: Components, services, or business logic

## Files to Consolidate/Move

### 1. Duplicate Client Folders
- `/src/client/components/` → `/src/components/`
- `/src/components/client/` → `/src/components/`

### 2. Scattered Utils
- `/src/utils/` → `/src/lib/utils/`
- `/src/server/utils/` → `/src/lib/utils/` (if shared) or `/src/services/`

### 3. Multiple Config Locations
- `/src/brain/config/` → `/src/config/`
- All prompts → `/src/config/prompts.ts`

### 4. Old Service Implementations
- `/src/server/services/scene/` → DELETE (replaced by tools)
- `/src/server/services/generation/` → Move needed parts to `/src/services/`

### 5. Templates
- `/src/templates/` → `/src/remotion/templates/` (if used) or DELETE

### 6. Scattered Types
- All types → `/src/lib/types/` (organized by domain)

## Migration Plan

### Phase 1: Create Target Structure
1. Create the clean directory structure
2. Move files to their correct locations
3. Update imports

### Phase 2: Delete Duplicates
1. Remove empty directories
2. Delete orphaned files
3. Clean up test files for deleted code

### Phase 3: Consolidate
1. Merge duplicate implementations
2. Combine scattered configs
3. Unify type definitions

## Benefits

1. **Clear Mental Model**: Developers know exactly where to find/put things
2. **No Duplicates**: One implementation per concept
3. **Easy Onboarding**: New team members understand structure immediately
4. **Maintainable**: Changes happen in one place
5. **Scalable**: Clear patterns for adding new features