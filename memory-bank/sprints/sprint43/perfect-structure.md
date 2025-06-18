# Perfect Bazaar-Vid Structure

## Core Principle: Database-Driven Types
The database schema should be the single source of truth, with TypeScript types generated from it.

## Perfect Structure

```
src/
├── app/                              # Next.js App Router (pages only)
│   ├── (marketing)/                  # Public pages
│   ├── admin/                        # Admin dashboard
│   ├── projects/                     # Project pages
│   │   └── [id]/generate/           
│   │       └── workspace/            # Main workspace UI
│   │           └── panels/           # All workspace panels
│   └── api/                          # API routes (webhooks, edge)
│       └── trpc/[trpc]/             # tRPC endpoint
│
├── server/                           # T3 Backend (keep this structure!)
│   ├── db/                          # Database configuration
│   │   ├── schema.ts                # ⭐ Single source of truth
│   │   └── index.ts                 # DB client
│   ├── api/                         # tRPC routers
│   │   ├── routers/                 # All API endpoints
│   │   │   ├── generation.ts        # Main generation logic
│   │   │   ├── scenes.ts           # Scene CRUD
│   │   │   └── ...                 # Other routers
│   │   ├── root.ts                 # Root router
│   │   └── trpc.ts                 # tRPC setup
│   └── services/                    # Business logic services
│       ├── ai/                      # AI/LLM services
│       ├── data/                    # Data management
│       └── generation/              # Generation services
│
├── generated/                        # ⭐ Auto-generated from DB
│   ├── entities.ts                  # DB entity types
│   ├── api-types.ts                # API types from entities
│   └── zod-schemas.ts              # Zod schemas from entities
│
├── brain/                           # AI Orchestration
│   ├── planner.ts                  # Intelligent planner
│   └── functions/                  # Brain helpers
│       ├── contextBuilder.ts       
│       └── intentAnalyzer.ts       
│
├── tools/                           # MCP Tools (pure functions)
│   ├── add/                        # Add scene tool
│   ├── edit/                       # Edit scene tool
│   ├── delete/                     # Delete scene tool
│   └── types.ts                    # Tool interfaces
│
├── components/                      # React Components
│   ├── ui/                         # shadcn/ui components
│   ├── workspace/                  # Workspace-specific
│   ├── video/                      # Video player components
│   └── shared/                     # Shared components
│
├── lib/                            # Shared Libraries
│   ├── api/                        # API helpers
│   ├── utils/                      # Utilities
│   └── types/                      # Manual types (not from DB)
│       ├── api/                    # API-specific types
│       └── video/                  # Video/Remotion types
│
├── hooks/                          # React Hooks
├── stores/                         # Client State (Zustand)
├── templates/                      # Pre-built Templates
├── remotion/                       # Video Rendering
└── config/                         # Configuration
    ├── prompts.ts                  # System prompts (5 only!)
    ├── models.ts                   # AI models config
    └── site.ts                     # Site metadata
```

## Key Improvements Over Current Structure

### 1. Database-Driven Development
```typescript
// 1. Define in database schema
// server/db/schema.ts
export const scenes = pgTable("scenes", {
  id: uuid("id").primaryKey(),
  tsxCode: text("tsx_code").notNull(),
  duration: integer("duration").notNull(),
  // ... other fields
});

// 2. Auto-generate types
// generated/entities.ts (auto-generated)
export interface SceneEntity {
  id: string;
  tsxCode: string;  // ✅ Always correct field name
  duration: number;
}

// 3. Use everywhere
import { SceneEntity } from "~/generated/entities";
```

### 2. Clear Separation of Concerns

**What Goes Where:**
- `app/` - ONLY Next.js pages and layouts
- `server/` - ALL backend logic (T3 convention)
- `generated/` - ALL auto-generated types
- `components/` - ALL React components
- `lib/` - ONLY shared utilities and manual types

### 3. Remove Duplications

**Current Issues:**
- Multiple test directories scattered
- Duplicate type definitions
- Mixed concerns in directories

**Solution:**
- One test directory: `__tests__/` at root
- Generated types from DB schema
- Clear directory purposes

### 4. Simplified Prompts System

**Current:** 40+ prompts in `prompts.config.ts`
**Ideal:** 5 essential prompts only

```typescript
// config/prompts.ts
export const PROMPTS = {
  PLANNER: "...",        // Brain/planner prompt
  ADD_SCENE: "...",      // Scene generation
  EDIT_SCENE: "...",     // Scene editing
  FIX_ERRORS: "...",     // Error fixing
  ANALYZE_IMAGE: "..."   // Image analysis
};
```

## What to Change from Current Structure

### 1. Move Tests to Root
```bash
# Current: Tests scattered everywhere
src/__tests__/
src/app/__tests__/
src/server/services/__tests__/

# Ideal: One test directory
__tests__/
├── unit/
├── integration/
└── e2e/
```

### 2. Consolidate Types
```bash
# Current: Types everywhere
lib/types/ai/
lib/types/api/
lib/types/database/
lib/types/shared/
lib/types/video/

# Ideal: Generated + minimal manual
generated/          # From DB schema
lib/types/         # Only non-DB types
├── api/           # API-specific
└── video/         # Remotion-specific
```

### 3. Clean Services
```bash
# Current: Old service pattern
server/services/generation/
├── codeGenerator.service.ts
├── layoutGenerator.service.ts
├── sceneBuilder.service.ts

# Ideal: Keep only what tools need
server/services/
├── ai.service.ts     # LLM wrapper
├── memory.service.ts # Project memory
└── storage.service.ts # R2 operations
```

### 4. Simplify Brain
```bash
# Current: Complex orchestration
brain/
├── orchestratorNEW.ts
├── orchestrator_functions/
└── README.md

# Ideal: Simple planner
brain/
├── planner.ts        # Main brain
└── helpers.ts        # Helper functions
```

## Benefits of This Structure

1. **Type Safety**: Database schema drives all types
2. **No Duplicates**: One place for each concept
3. **Clear Ownership**: Easy to know where code belongs
4. **T3 Compatible**: Respects T3 App conventions
5. **Fast Onboarding**: New devs understand immediately

## Migration Steps

1. **Set up type generation**
   ```bash
   npm run generate:types  # Creates generated/entities.ts
   ```

2. **Consolidate tests**
   - Move all tests to `__tests__/`
   - Organize by type (unit/integration/e2e)

3. **Simplify prompts**
   - Reduce from 40+ to 5 essential
   - Delete unused prompt files

4. **Clean services**
   - Keep only infrastructure services
   - Move business logic to tools

5. **Update imports**
   - Use generated types everywhere
   - Remove manual type duplicates

## Current Structure Analysis

**Good Parts to Keep:**
- ✅ T3 structure (app/, server/)
- ✅ Tools pattern (tools/)
- ✅ Brain location (brain/)
- ✅ Workspace panels
- ✅ Templates (needed for UI)

**Parts to Improve:**
- ❌ Scattered tests
- ❌ 40+ prompts
- ❌ Duplicate types
- ❌ Old service patterns
- ❌ Complex brain orchestration

## Summary

The perfect structure:
1. Uses database schema as source of truth
2. Follows T3 App conventions
3. Has clear separation of concerns
4. Minimizes duplications
5. Is easy to understand and maintain