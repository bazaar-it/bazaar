# Brain Orchestrator Prompt Analysis

## Overview
The brain orchestrator prompt is the decision-making engine that analyzes user intent and routes to the appropriate tool (addScene, editScene, deleteScene, trimScene).

## Line-by-Line Analysis

### Header Documentation (Lines 1-5)
✅ **Good**: Clear documentation showing usage location and purpose
- Explicitly states where it's used: `src/brain/orchestrator_functions/intentAnalyzer.ts`
- Clear purpose definition

### Role Definition (Lines 8-9)
✅ **Good**: Proper system role assignment with TypeScript const assertion

### Opening Statement (Line 9)
✅ **Good**: Clear, concise role definition
- Establishes authority as "Brain Orchestrator"
- Defines dual responsibility: understanding intent + tool selection

### Available Tools Section (Lines 11-15)
✅ **Good**: Well-structured tool listing
- Clear enumeration of all 4 tools
- Brief, accurate descriptions for each
- Good separation between create/modify/remove/adjust

### Decision Process (Lines 17-26)
✅ **Excellent**: Comprehensive scene reference resolution
- Line 21-25: Detailed contextual reference handling ("it", "the scene", "that")
- Smart defaults (newest scene for ambiguous references)
- Position-based identification (scene numbers, first/last)
- Image consideration included

⚠️ **Could improve**: The reference resolution logic is quite complex and could benefit from examples

### Duration Changes Section (Lines 28-32)
✅ **Excellent**: Clear distinction between trimScene vs editScene
- Line 29-30: trimScene for simple duration changes (PREFERRED - faster)
- Line 31-32: editScene for animation timing adjustments
- Good performance consideration noting trimScene is faster

### Response Format (Lines 34-42)
✅ **Good**: Well-structured JSON response format
- All necessary fields included
- Clear type definitions for toolName
- Includes user-facing feedback
- Clarification mechanism built-in

### Critical Clarification Rules (Lines 44-49)
✅ **Good**: Explicit handling of ambiguous cases
- Clear boolean flag for clarification
- Null handling specified (not undefined)
- Mandatory fields defined

### Examples Section (Lines 51-55)
✅ **Good**: Practical examples showing tool selection
- Clear trim vs edit distinctions
- Real-world use cases

⚠️ **Missing**: No examples for addScene or deleteScene decisions

### Important Notes (Lines 57-60)
✅ **Good**: Clear operational guidelines
- Emphasis on decisiveness
- Clarification only when truly needed
- Required fields for operations

## Strengths

1. **Clear Tool Differentiation**: Excellent distinction between trimScene (fast) and editScene (slow)
2. **Context Awareness**: Sophisticated scene reference resolution
3. **Performance Consideration**: Explicitly guides toward faster operations
4. **Structured Output**: Well-defined JSON response format
5. **Error Prevention**: Built-in clarification mechanism

## Weaknesses & Bloat

1. **No addScene Examples**: Missing examples for the most common operation
2. **Complex Reference Logic**: Lines 21-25 could be simplified or restructured
3. **Repetitive Instructions**: Some overlap between sections
4. **No Vision Context**: Doesn't explain how to handle image inputs for tool selection

## Usage Context Analysis

From `intentAnalyzer.ts`:
```typescript
const messages = [
  { role: "system", content: BRAIN_ORCHESTRATOR.content },
  { role: "user", content: userMessage }
];
```

**Input**: 
- User prompt
- Current storyboard (scene list)
- Optional images
- Conversation history

**Output**: Structured decision object with tool selection

## Comparison with Implementation

✅ **Alignment**: The prompt output format matches the TypeScript interface perfectly
✅ **Model Choice**: Uses GPT-4o-mini for fast, cost-effective decisions
✅ **Temperature**: 0.4-0.6 range appropriate for consistent but not rigid decisions

## Recommendations

1. **Add More Examples**: Include addScene and deleteScene examples
2. **Simplify Reference Logic**: Consider a decision tree format
3. **Add Image Handling**: Explain how images influence tool selection
4. **Reduce Redundancy**: Consolidate overlapping instructions
5. **Add Edge Cases**: What if no scenes exist? Multiple scenes mentioned?

## Overall Assessment

**Score: 8/10**

A well-structured prompt that effectively guides tool selection. The distinction between trimScene and editScene is particularly well done. Main improvements needed are more comprehensive examples and clearer image handling guidelines.

The prompt successfully balances being prescriptive (clear rules) with being flexible (clarification mechanism). It's appropriately sized for its task - not too verbose but comprehensive enough to handle complex scenarios.