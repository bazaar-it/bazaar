# /src/lib Directory Structure Analysis

## Overview
Analysis of the `/src/lib` directory structure to identify duplications and issues with timeline.ts references.

## Key Findings

### 1. Critical Issue: Missing Type Definitions
**File**: `/src/lib/utils/timeline.ts`
- **Problem**: Imports `TimelineUpdate` and `TimelineState` from `~/lib/types/api/brain-contracts`
- **Root Cause**: `brain-contracts.ts` was deleted during Sprint 41 cleanup
- **Impact**: Type errors preventing proper TypeScript compilation

### 2. Timeline File Duplication
Two `timeline.ts` files exist with completely different purposes:
- `/src/lib/utils/timeline.ts` - Utility functions for scene timing calculations
- `/src/lib/types/video/timeline.ts` - Type definitions for UI timeline component

### 3. Multiple index.ts Files
Found 6 `index.ts` files across the type system:
- `/src/lib/types/index.ts` - Main types export
- `/src/lib/types/ai/index.ts`
- `/src/lib/types/api/index.ts`
- `/src/lib/types/database/index.ts`
- `/src/lib/types/shared/index.ts`
- `/src/lib/types/video/index.ts`

This is actually **proper organization**, not duplication - each serves as a module entry point.

## Detailed Analysis

### Missing Types Structure
Based on the timeline.ts utility functions, the missing types likely had this structure:

```typescript
// TimelineUpdate - tracks changes when scene durations change
interface TimelineUpdate {
  sceneId: string;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  duration: number;
}

// TimelineState - represents the current state of all scenes
interface TimelineState {
  scenes: Array<{
    id: string;
    start: number;
    end: number;
    duration: number;
  }>;
  totalDuration: number;
}
```

### Current Directory Structure
```
src/lib/
├── api/                    # API client utilities
├── cn.ts                   # Class name utility
├── evals/                  # Evaluation framework
├── types/                  # Type definitions (well-organized)
│   ├── ai/                # AI-related types
│   ├── api/               # API communication types
│   ├── database/          # Database types
│   ├── shared/            # Shared utility types
│   └── video/             # Video-related types
└── utils/                 # Utility functions
    ├── timeline.ts        # ⚠️ BROKEN - missing imports
    └── [other utils]
```

## Recommendations

### 1. Fix Timeline Utils (Immediate)
**Option A**: Define missing types locally in the file
```typescript
// Add to /src/lib/utils/timeline.ts
interface TimelineUpdate {
  sceneId: string;
  oldStart: number;
  oldEnd: number;
  newStart: number;
  newEnd: number;
  duration: number;
}

interface TimelineState {
  scenes: Array<{
    id: string;
    start: number;
    end: number;
    duration: number;
  }>;
  totalDuration: number;
}
```

**Option B**: Move types to appropriate location
- Create `/src/lib/types/video/scene-timeline.ts` for these specific types
- Update import in timeline.ts utility

### 2. Naming Clarification
Consider renaming to avoid confusion:
- `/src/lib/utils/timeline.ts` → `/src/lib/utils/scene-timing.ts`
- Or `/src/lib/types/video/timeline.ts` → `/src/lib/types/video/timeline-component.ts`

### 3. Usage Check
Verify if `/src/lib/utils/timeline.ts` is actually being used:
- No other files currently import these functions
- May be dead code from previous implementation

## Current State Summary
- **Duplications**: Only `timeline.ts` filename duplication (different purposes)
- **Broken Import**: timeline.ts utility has unresolved type imports
- **Organization**: Generally well-structured with clear separation of concerns
- **Action Needed**: Fix or remove the broken timeline utility file

## Next Steps
1. Determine if timeline.ts utility is still needed
2. If needed, implement one of the fix options
3. If not needed, remove the file
4. Consider renaming to clarify purpose differences