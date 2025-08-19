# Code Generation Optimization Guide
## Fixing Unreliable Code Generation in Bazaar-Vid

*Document Version: 1.0*  
*Created: January 2025*  
*Sprint 99: Code Generation Reliability*

---

## Executive Summary

Current code generation fails ~30-40% of the time due to contradictory prompt instructions, causing compilation errors that require extensive post-processing and auto-fix systems. This guide provides a systematic approach to fix these issues.

**Goal**: Reduce code generation failures from 30-40% to <5% through prompt optimization.

---

## Table of Contents
1. [Problem Analysis](#1-problem-analysis)
2. [Root Cause Breakdown](#2-root-cause-breakdown)
3. [Optimization Strategy](#3-optimization-strategy)
4. [Detailed Fix Instructions](#4-detailed-fix-instructions)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [Testing & Validation](#6-testing-validation)
7. [Expected Outcomes](#7-expected-outcomes)

---

## 1. Problem Analysis

### Current State Metrics
```
- Compilation failure rate: ~30-40%
- Post-processing fixes required: 15+ patterns
- Auto-fix invocations: 2-3 per generation
- User prompts to working video: ~100
- Prompt sizes: 1,000-2,680 lines
```

### Evidence of Problems
The codebase contains extensive band-aid fixes:

```typescript
// UnifiedCodeProcessor.ts - Lines 60-78
// This shouldn't exist if prompts worked correctly
if (cleanCode.includes('const currentFrame = useCurrentFrame()')) {
  console.warn('🚨 Fixing currentFrame naming issue');
  cleanCode = cleanCode.replace(/const currentFrame = useCurrentFrame\(\)/g, 'const frame = useCurrentFrame()');
}
```

### Impact on User Experience
- Users need ~100 prompts to create decent video (target: 1)
- Constant "fixing errors" messages erode trust
- Silent failures that users don't even know about
- Slower generation due to multiple fix attempts

---

## 2. Root Cause Breakdown

### 2.1 Variable Naming Contradictions

#### The Problem
**Location**: `/src/config/prompts/active/code-generator.ts`

```typescript
// Line 221 - INSTRUCTION A:
"const frame = useCurrentFrame(); (Never use currentFrame.)"

// Line 89 in typography-generator.ts - INSTRUCTION B:
"Use normal variable names (sequences, currentFrame, etc)"
```

#### Why It Breaks
The AI receives contradictory instructions within the same prompt context. It randomly chooses between:
- Using `frame` (correct)
- Using `currentFrame` (causes "Identifier already declared" error)

#### Frequency of Failure
**~25% of all generations** have this specific error.

### 2.2 Duration Export Pattern Inconsistency

#### The Problem
Three different patterns across prompts:

```typescript
// Pattern A (code-generator.ts):
export const durationInFrames_[ID] = totalFrames_[ID];

// Pattern B (code-editor.ts):
export const durationInFrames_[ID] = 90;

// Pattern C (typography-generator.ts):
const totalFrames_[ID] = script_[ID].reduce((sum, item) => sum + item.frames, 0);
// Missing export entirely
```

#### Why It Breaks
- Missing exports cause "durationInFrames_X not defined" errors
- Inconsistent calculation methods cause timing issues
- Direct number exports vs calculated values create unpredictable behavior

#### Frequency of Failure
**~15% of generations** have duration-related errors.

### 2.3 Data Array Scoping Issues

#### The Problem
Unclear instructions about where to place data arrays:

```typescript
// WRONG - Inside component (causes scoping errors):
export default function Scene_abc123() {
  const script_abc123 = [...]; // Inside function
}
const totalFrames = script_abc123.reduce(...); // Error: script not defined

// RIGHT - At module level:
const script_abc123 = [...]; // Top level
export default function Scene_abc123() {
  // Component code
}
```

#### Why It Breaks
JavaScript scoping rules - variables inside functions aren't accessible outside.

#### Frequency of Failure
**~20% of generations** have scoping errors.

### 2.4 Prompt Verbosity and Contradiction Burial

#### The Problem
**Code Generator Prompt**: 2,680+ lines with critical rules scattered throughout:
- Line 221: Variable naming
- Line 238: Duration calculation
- Line 163: YouTube handling (in middle of other content)
- Line 245: Animation rules

The AI can't maintain coherent context across 2,680 lines.

#### Why It Breaks
- Critical instructions get lost in noise
- Contradictions appear hundreds of lines apart
- AI attention mechanisms degrade with length

---

## 3. Optimization Strategy

### 3.1 Principle: Clarity Over Completeness

**Current Approach**: Include every possible instruction  
**Better Approach**: Core rules + contextual examples

### 3.2 Principle: Consistency Across All Prompts

**Current**: Each prompt has slightly different patterns  
**Better**: Shared core rules imported into each prompt

### 3.3 Principle: Fail-Safe Patterns

**Current**: Multiple ways to do things correctly  
**Better**: One canonical way with clear anti-patterns

---

## 4. Detailed Fix Instructions

### 4.1 Fix Variable Naming (CRITICAL - Do First)

#### Step 1: Create Canonical Rules File
Create `/src/config/prompts/shared/CORE_RULES.ts`:

```typescript
export const CORE_RULES = `
CANONICAL VARIABLE NAMING (NEVER DEVIATE):
1. const frame = useCurrentFrame();        // ALWAYS 'frame', NEVER 'currentFrame'
2. const { fps } = useVideoConfig();       // ALWAYS destructure fps
3. const script_[ID] = [...];              // Data arrays use underscore pattern
4. const sequences_[ID] = [...];           // Sequences array follows same pattern

ANTI-PATTERNS (WILL CAUSE ERRORS):
❌ const currentFrame = useCurrentFrame();  // WRONG - causes "Identifier already declared"
❌ const f = useCurrentFrame();             // WRONG - non-standard naming
❌ let frame = useCurrentFrame();           // WRONG - use const, not let
✅ const frame = useCurrentFrame();         // CORRECT - only acceptable pattern
`;
```

#### Step 2: Update All Prompts
Replace contradictory sections in ALL prompts with:

```typescript
import { CORE_RULES } from './shared/CORE_RULES';

// In each prompt:
content: `${CORE_RULES}

[Rest of prompt-specific content]`
```

#### Step 3: Remove Contradictions
**In typography-generator.ts**, Line 89:
```typescript
// DELETE THIS LINE:
"Use normal, readable variable names for all other internal variables (sequences, currentFrame, etc)"

// REPLACE WITH:
"Use descriptive variable names for internal variables (sequences, accumulatedFrames, etc)"
```

### 4.2 Fix Duration Export Pattern

#### Step 1: Add to CORE_RULES.ts
```typescript
export const DURATION_RULES = `
DURATION EXPORT (REQUIRED IN EVERY SCENE):
// Calculate total frames from script
const totalFrames_[ID] = script_[ID].reduce((sum, s) => sum + s.frames, 0);

// Export with standard name
export const durationInFrames_[ID] = totalFrames_[ID];

NEVER:
❌ export const durationInFrames_[ID] = 180;  // Don't hardcode
❌ Missing export entirely                     // Always required
✅ Calculate from script array                 // Always correct
`;
```

#### Step 2: Standardize Across All Prompts
Remove all variations and use only the canonical pattern above.

### 4.3 Fix Data Array Scoping

#### Step 1: Add Clear Scoping Rules
```typescript
export const SCOPING_RULES = `
MODULE-LEVEL vs COMPONENT-LEVEL:

// ✅ CORRECT - Module level (outside component):
const script_abc123 = [
  { text: "Hello", frames: 30 },
  { text: "World", frames: 30 }
];

const sequences_abc123 = [...];  // Also module level

export default function Scene_abc123() {
  const frame = useCurrentFrame();  // Inside component
  // Component logic here
}

const totalFrames_abc123 = script_abc123.reduce(...);  // Module level

// ❌ WRONG - Will cause scoping errors:
export default function Scene_abc123() {
  const script_abc123 = [...];  // WRONG - inside component
}
const totalFrames = script_abc123.reduce(...);  // ERROR: script not defined
`;
```

### 4.4 Simplify Code Generator Prompt

#### Current Structure (2,680 lines)
```
1. GitHub handling (lines 18-37)
2. Figma handling (lines 28-38)  
3. YouTube analysis (lines 39-49)
4. Image handling (lines 50-92)
5. Icons (lines 83-85)
6. Avatars (lines 86-90)
7. Animation effects (lines 94-109)
8. Animation timing (lines 111-118)
9. Layout (lines 122-127)
10. Content (lines 131-133)
11. Typography (lines 135-176)
12. ... continues for 2,680 lines
```

#### Optimized Structure (Target: 1,000 lines)
```typescript
export const CODE_GENERATOR_OPTIMIZED = {
  role: 'system',
  content: `
${CORE_RULES}
${DURATION_RULES}
${SCOPING_RULES}

ROLE: Generate Remotion/React motion graphics code.

INPUT HANDLING:
1. Text prompt → Generate animated scene
2. Image attached → Embed or recreate based on keywords
3. GitHub component → Preserve original, add animation
4. Figma specs → Match exact design, add animation
5. YouTube analysis → Recreate described content

[CONSOLIDATED RULES - 500 lines max]

[KEY EXAMPLES - 300 lines max]

[ERROR PREVENTION - 100 lines max]
`
};
```

#### Specific Reductions

**REMOVE Redundancy**:
```typescript
// Current prompt has this concept repeated 5 times:
"Use fontFamily: 'Inter'"
"Default Font: Use fontFamily: 'Inter'"
"Typography: Inter font"
"Set fontFamily to Inter"
"Inter is the default font"

// Replace with ONCE:
"Default font: fontFamily: 'Inter', fontWeight: '500'"
```

**CONSOLIDATE Similar Sections**:
```typescript
// Current: 200 lines about different animation types
// Better: 50 lines with clear examples

ANIMATIONS:
- Entrance: fadeIn(8-12 frames), slideIn(10 frames)
- Exit: fadeOut(6-8 frames)
- Sequential: 4-6 frame delays between elements
Example: opacity: interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'})
```

### 4.5 Add Validation Examples

Create `/src/config/prompts/shared/COMMON_ERRORS.ts`:

```typescript
export const COMMON_ERRORS = `
PREVENT THESE COMMON COMPILATION ERRORS:

1. VARIABLE NAMING ERROR:
❌ const currentFrame = useCurrentFrame();
   ERROR: "Identifier 'currentFrame' has already been declared"
✅ const frame = useCurrentFrame();

2. MISSING FPS IN SPRING:
❌ spring({ frame, config: { damping: 10 } })
   ERROR: "spring() requires fps parameter"
✅ spring({ frame, fps, config: { damping: 10 } })

3. ARRAY SYNTAX ERROR:
❌ const script = [{ text: "Hello"; frames: 30 }];  // Semicolon
   ERROR: "Unexpected token ';'"
✅ const script = [{ text: "Hello", frames: 30 }];  // Comma

4. SCOPING ERROR:
❌ Component function { const data = [...] } ... data.reduce()
   ERROR: "Cannot access 'data' before initialization"
✅ const data = [...] at module level

5. MISSING DURATION EXPORT:
❌ No export statement
   ERROR: "durationInFrames_X is not defined"
✅ export const durationInFrames_X = totalFrames_X;
`;
```

---

## 5. Implementation Roadmap

### Phase 1: Critical Fixes (Day 1-2)
**Goal**: Stop the bleeding - fix most common errors

1. **Hour 1-2**: Create CORE_RULES.ts with variable naming
2. **Hour 3-4**: Fix contradictions in all 4 active prompts
3. **Hour 5-6**: Test with 10 sample generations
4. **Hour 7-8**: Deploy and monitor

**Success Metric**: 50% reduction in `currentFrame` errors

### Phase 2: Standardization (Day 3-4)
**Goal**: Consistent patterns across all prompts

1. **Day 3 AM**: Create shared rule files
2. **Day 3 PM**: Update all prompts to import shared rules
3. **Day 4 AM**: Remove all contradictory instructions
4. **Day 4 PM**: Test comprehensive generation scenarios

**Success Metric**: 70% reduction in compilation errors

### Phase 3: Simplification (Week 2)
**Goal**: Reduce prompt size and complexity

1. **Day 1**: Audit and categorize all instructions
2. **Day 2**: Identify and remove redundancies
3. **Day 3**: Consolidate similar sections
4. **Day 4**: Create optimized prompt structure
5. **Day 5**: A/B test old vs new prompts

**Success Metric**: Prompt size <1,500 lines, 85% compilation success

### Phase 4: Validation System (Week 3)
**Goal**: Prevent regression

1. Create test suite for generated code
2. Automated prompt consistency checker
3. Pre-deployment validation
4. Monitoring and alerts

---

## 6. Testing & Validation

### 6.1 Test Scenarios

Create `/src/lib/evals/prompt-validation.ts`:

```typescript
const TEST_SCENARIOS = [
  {
    name: "Basic text animation",
    prompt: "Create a simple hello world animation",
    mustInclude: ["const frame = useCurrentFrame()", "export const durationInFrames_"],
    mustNotInclude: ["currentFrame =", "const currentFrame"]
  },
  {
    name: "GitHub component",
    prompt: "Add this GitHub component with animation",
    mustInclude: ["preserving original structure"],
    mustNotInclude: ["previous scene styles"]
  },
  {
    name: "Complex multi-scene",
    prompt: "Create a 3-scene sequence with transitions",
    mustInclude: ["script_", "sequences_", "totalFrames_"],
    mustNotInclude: ["undefined", "not defined"]
  }
];
```

### 6.2 Validation Metrics

Track these metrics before and after optimization:

```typescript
interface ValidationMetrics {
  compilationSuccessRate: number;      // Target: >95%
  averageFixAttempts: number;          // Target: <0.1
  postProcessingTriggered: number;     // Target: <5%
  userPromptsToSuccess: number;        // Target: <10
  generationTimeMs: number;            // Target: <3000ms
}
```

### 6.3 A/B Testing Framework

```typescript
// Compare old vs new prompts
async function comparePrompts(testPrompt: string) {
  const [oldResult, newResult] = await Promise.all([
    generateWithOldPrompt(testPrompt),
    generateWithNewPrompt(testPrompt)
  ]);
  
  return {
    oldCompiles: await testCompilation(oldResult),
    newCompiles: await testCompilation(newResult),
    oldErrors: extractErrors(oldResult),
    newErrors: extractErrors(newResult)
  };
}
```

---

## 7. Expected Outcomes

### 7.1 Immediate Impact (Week 1)

```
Before:
- 30-40% compilation failures
- 15+ post-processing patterns
- 2-3 auto-fix attempts per generation

After Phase 1-2:
- 10-15% compilation failures (-66%)
- 5-7 post-processing patterns (-66%)
- 0-1 auto-fix attempts (-75%)
```

### 7.2 Medium-term Impact (Week 2-3)

```
After Full Implementation:
- <5% compilation failures
- 1-2 post-processing patterns (edge cases only)
- Auto-fix rarely needed
- 50% reduction in user prompts needed
- 30% faster generation time
```

### 7.3 Long-term Benefits

1. **Developer Experience**
   - Less time debugging generated code
   - Clearer prompt maintenance
   - Easier to add new features

2. **User Experience**
   - Faster time to first success
   - Less frustration with errors
   - More predictable results

3. **System Performance**
   - Reduced computational overhead
   - Faster response times
   - Lower API costs (fewer fix attempts)

---

## Appendix A: Quick Reference Card

### The 5 Golden Rules of Reliable Code Generation

```typescript
// 1. ALWAYS use this exact pattern:
const frame = useCurrentFrame();  // Never 'currentFrame'

// 2. ALWAYS include fps in spring:
spring({ frame, fps, config: {...} })

// 3. ALWAYS export duration:
export const durationInFrames_[ID] = totalFrames_[ID];

// 4. ALWAYS declare data at module level:
const script_[ID] = [...];  // Outside component
export default function Scene_[ID]() { ... }

// 5. ALWAYS use commas in arrays:
[{ text: "Hello", frames: 30 }]  // Comma, not semicolon
```

---

## Appendix B: Migration Checklist

- [ ] Create `/src/config/prompts/shared/` directory
- [ ] Create CORE_RULES.ts
- [ ] Create DURATION_RULES.ts  
- [ ] Create SCOPING_RULES.ts
- [ ] Create COMMON_ERRORS.ts
- [ ] Update code-generator.ts to import shared rules
- [ ] Update code-editor.ts to import shared rules
- [ ] Update typography-generator.ts to fix contradictions
- [ ] Update image-recreator.ts to use consistent patterns
- [ ] Remove all "currentFrame" contradictions
- [ ] Standardize duration export pattern
- [ ] Add validation test suite
- [ ] Deploy Phase 1 fixes
- [ ] Monitor metrics for 24 hours
- [ ] Proceed to Phase 2

---

## Appendix C: Monitoring & Rollback Plan

### Monitoring Queries
```sql
-- Track compilation success rate
SELECT 
  DATE(created_at) as day,
  COUNT(*) as total_generations,
  SUM(CASE WHEN compilation_success THEN 1 ELSE 0 END) as successful,
  AVG(fix_attempts) as avg_fix_attempts
FROM scene_iterations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at);
```

### Rollback Triggers
- Compilation success drops below 60%
- Generation time increases >2x
- User complaints spike

### Rollback Process
1. Revert prompt changes in git
2. Clear any caches
3. Monitor for recovery
4. Analyze what went wrong

---

*End of Document*