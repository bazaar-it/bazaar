# API Types - Sprint 41 Architecture

## Current Type System

### 🎯 Sprint 41 Types (Active)

#### 1. Tool Types (`/src/tools/helpers/types.ts`)
- `BaseToolInput/Output` - Base interfaces for all tools
- `AddToolInput/Output` - Add scene operation
- `EditToolInput/Output` - Edit scene operation  
- `DeleteToolInput/Output` - Delete scene operation
- Zod schemas for validation

#### 2. Brain Types (`/src/brain/orchestrator_functions/types.ts`)
- `OrchestrationInput` - Input to brain
- `OrchestrationOutput` - Brain decision output

#### 3. Decision Types (`brain-decision.ts`)
- `BrainDecision` - Simple decision interface
- Used by generation.ts to execute tools

### ⚠️ Legacy Types (Being Phased Out)

#### Golden Rule Contracts (`golden-rule-contracts.ts`)
- Still used by old scene services
- Contains `StandardApiResponse`, `Scene` types
- Will be removed once services are migrated

## Type Flow

```
User Input → OrchestrationInput → BrainDecision → Tool Input → Tool Output
```

## Migration Status
- ✅ Tools: Fully migrated
- ✅ Brain: Fully migrated
- ✅ Generation Router: Fully migrated
- ⏳ Scene Services: Using legacy types
- ⏳ Other Services: May use legacy types

## Deleted Files (Sprint 41 Cleanup)
- `brain-contracts.ts` - Replaced by brain-decision.ts
- `tool-contracts.ts` - Replaced by /tools/helpers/types.ts
- `tool-contracts.simplified.ts` - Not used
- `service-contracts.ts` - Not used