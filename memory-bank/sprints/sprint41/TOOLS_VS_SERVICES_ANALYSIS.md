# Sprint 41: Tools vs Services Implementation Analysis

## Overview

We have two parallel implementations of scene management functionality:
1. **"Their" Tools** (`/src/tools/`) - From restructure_brain branch
2. **"Our" Services** (`/src/server/services/scene/`) - Original mark-12

## Detailed Comparison

### 1. Architectural Philosophy

#### Their Tools Approach
```
/src/tools/
├── ARCHITECTURE.md              # Clear documentation
├── sceneBuilderNEW.ts          # Facade pattern
├── add/
│   ├── add.ts                  # Self-contained tool
│   └── add_helpers/            # Tool-specific helpers
├── edit/
│   ├── edit.ts                 # Self-contained tool
│   └── edit_helpers/           # Tool-specific helpers
└── delete/
    └── delete.ts               # Self-contained tool
```

**Philosophy**: Tool as a complete unit of work

#### Our Services Approach
```
/src/server/services/scene/
├── scene.service.ts            # Coordinator pattern
├── add/                        # Service collection
├── edit/                       # Service collection
└── delete/                     # Service collection
```

**Philosophy**: Service-oriented with separation of concerns

### 2. Key Differences

#### Database Access
- **Their**: Direct database access in tools
  ```typescript
  const [savedScene] = await db.insert(scenes).values({...})
  ```
- **Our**: Repository pattern abstraction
  ```typescript
  await this.sceneRepository.createScene({...})
  ```

#### Field Naming
- **Their**: Tool returns `sceneCode`, maps to `tsxCode` for DB
- **Our**: Internal `code`, maps to `tsxCode` for DB
- **Database**: Always `tsxCode`

#### Error Handling
- **Their**: Simple try-catch at tool level
- **Our**: Multi-layer error handling with proper error types

#### Type System
- **Their**: Unified `BaseToolInput/Output` across all tools
- **Our**: Separate types per service with `StandardApiResponse`

### 3. What Each Does Better

#### Their Implementation Strengths ✅
1. **Simplicity**: Direct, easy to understand flow
2. **Documentation**: Has ARCHITECTURE.md explaining the design
3. **Unified Types**: Consistent input/output across all tools
4. **Self-Contained**: Each tool is a complete unit
5. **Testing**: Easier to test tools in isolation

#### Our Implementation Strengths ✅
1. **Abstraction**: Better separation of database concerns
2. **Flexibility**: Easier to swap implementations
3. **Clean Naming**: No "NEW" suffixes
4. **Repository Pattern**: Better for testing and mocking
5. **Service Composition**: More flexible combinations

### 4. The Hybrid Problem

Currently after the merge, we have:
- Their tools in `/src/tools/`
- Our services in `/src/server/services/scene/`
- Both trying to do the same thing!
- Confusion about which to use

### 5. Field Name Alignment Issue

Both have the same problem:
- **Database**: `tsxCode`
- **Internal**: `code` or `sceneCode`
- **Result**: Mapping required

This violates Sprint 40's "zero transformation" goal.

### 6. Recommendation: Best of Both Worlds

#### Keep from "Their" Implementation:
1. **Directory Structure**: Clean organization by operation
2. **Documentation**: ARCHITECTURE.md pattern
3. **Unified Types**: Consistent BaseToolInput/Output
4. **Simplicity**: Direct approach where appropriate

#### Keep from "Our" Implementation:
1. **Service Pattern**: Better abstraction
2. **Repository Pattern**: Database separation
3. **Clean Naming**: No "NEW" suffixes
4. **Location**: `/src/server/services/` is the right place

#### Fix in Both:
1. **Field Names**: Use `tsxCode` everywhere (no mapping!)
2. **Remove Duplication**: One implementation only
3. **Clarify Execution**: Tools called by generation.ts, not brain

### 7. Proposed Unified Structure

```
/src/server/services/scene/
├── README.md                    # Architecture documentation
├── scene.service.ts             # Main coordinator (from our impl)
├── types.ts                     # Unified types (from their impl)
├── add/
│   ├── AddScene.service.ts      # Service pattern (our approach)
│   ├── LayoutGenerator.ts       # Keep as is
│   ├── CodeGenerator.ts         # Keep as is
│   └── ImageToCode.ts           # Keep as is
├── edit/
│   ├── EditScene.service.ts     # Service pattern
│   ├── SurgicalEditor.ts        # Keep as is
│   ├── CreativeEditor.ts        # Keep as is
│   └── ErrorFixer.ts            # Keep as is
└── delete/
    └── DeleteScene.service.ts   # Service pattern
```

### 8. Integration with Brain/Generation

The key is WHERE execution happens:

#### Current (Wrong):
```
Brain → ToolExecutor → Tools
```

#### Target (Right):
```
Brain → Decision
Generation.ts → Scene Service → Individual Services
```

### 9. Action Items

1. **Decide on One Implementation**
   - Recommend: Our service pattern with their organization

2. **Fix Field Names**
   - Change everything to `tsxCode` (match database)

3. **Move Execution**
   - Remove ToolExecutor from brain
   - Put execution in generation.ts

4. **Clean Up**
   - Delete `/src/tools/` after migration
   - Keep only one implementation

### 10. The Winner: Hybrid Approach

Take the best of both:
- **Structure**: Their clean directory organization
- **Pattern**: Our service abstraction
- **Types**: Their unified approach
- **Location**: Our `/src/server/services/`
- **Execution**: Neither! Should be in generation.ts

This gives us:
- Clean, understandable structure
- Proper abstraction
- Database separation
- Correct execution flow
- No duplication