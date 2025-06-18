# Current vs Ideal Structure Comparison

## Current Working Pipeline
```
ChatPanel (components) 
    ↓
generation.universal.ts (server/api/routers/)
    ↓
orchestratorNEW.ts (brain/)
    ↓
tools (tools/)
    ↓
Database (server/db/)
```

## Key Observations

### What's Already Good ✅
1. **Brain location**: `/src/brain/` - Already in the right place
2. **Tools location**: `/src/tools/` - Already in the right place
3. **Pipeline flow**: Clean separation between router → brain → tools

### What Needs Consolidation 🔧

#### 1. API Routes
**Current**: `/src/server/api/routers/`
**Ideal**: `/src/api/`
**Action**: Move and simplify path

#### 2. Database
**Current**: `/src/server/db/`
**Ideal**: `/src/db/`
**Action**: Move up one level

#### 3. Services
**Current**: Scattered in `/src/server/services/`
**Ideal**: `/src/services/` with clear naming
**Action**: Consolidate and move

#### 4. Client Components
**Current**: 
- `/src/client/components/`
- `/src/components/client/`
- `/src/components/`
**Ideal**: `/src/components/` (organized by feature)
**Action**: Merge all into one location

#### 5. Utils
**Current**:
- `/src/utils/`
- `/src/server/utils/`
- `/src/lib/utils/`
**Ideal**: `/src/lib/utils/`
**Action**: Consolidate into one location

#### 6. Configuration
**Current**:
- `/src/config/`
- `/src/brain/config/`
**Ideal**: `/src/config/`
**Action**: Consolidate

## Safe Reorganization Plan

### Phase 1: Move Without Breaking (Low Risk)
1. Move `/server/api/routers/*.ts` → `/api/*.ts`
2. Move `/server/db/` → `/db/`
3. Create re-export files for backward compatibility

### Phase 2: Consolidate Services (Medium Risk)
1. Keep only essential services:
   - `ai.service.ts` (AI client wrapper)
   - `memory.service.ts` (project memory)
   - `storage.service.ts` (R2 operations)
2. Remove duplicate implementations

### Phase 3: Clean Components (Low Risk)
1. Merge all component directories
2. Organize by feature (chat/, video/, ui/)

### Phase 4: Delete Orphans (After Testing)
1. Remove 86 orphaned files identified
2. Delete empty directories
3. Remove unused templates

## Files to Keep vs Delete

### Definitely Keep
- `/brain/orchestratorNEW.ts` ✅
- `/tools/` (all tools) ✅
- `/api/generation.universal.ts` ✅
- `/components/` (active UI components) ✅
- `/lib/types/` (type definitions) ✅
- `/remotion/` (video components) ✅

### Definitely Delete
- `/server/services/scene/` (replaced by tools)
- `/templates/` (unused, 15 files)
- Duplicate utils across 3 locations
- Old generation routers
- Empty service files

### Need Investigation
- `/shared/modules/` - What is this?
- `/stores/` - Which video state to keep?
- Various test files - Are they for active code?