# Scene Generation: Unique Component Names

## Overview
The scene generation system now ensures that each generated Remotion component has a unique name to prevent JavaScript identifier conflicts.

## Problem Solved
Previously, when users created multiple scenes with similar prompts (e.g., "firework animation", "fireworks display"), the system would generate components with identical names like `Firework` or `FireworkScene`, causing compilation errors:

```
Error: Identifier 'Firework' has already been declared
```

## Solution Architecture

### 1. Unique Name Generation Function
```typescript
function generateUniqueComponentName(userPrompt: string, existingNames: Set<string>): string
```

**Process:**
1. Extracts meaningful words from user prompt (filters out common words)
2. Creates base name from 1-3 words + "Scene" suffix
3. Sanitizes to ensure valid JavaScript identifier
4. Checks against existing names and appends numeric suffix if needed

**Examples:**
- "firework animation" → `FireworkAnimationScene`
- "firework animation" (second time) → `FireworkAnimationScene1`
- "red fireworks" → `RedFireworksScene`

### 2. Database Integration
Before generating code, the system:
1. Queries existing scenes in the project
2. Extracts component names from existing TSX code
3. Builds a Set of existing names for uniqueness checking

### 3. LLM Prompt Enhancement
The system prompt now includes the specific component name:

```typescript
export default function ${uniqueComponentName}() {
  // Component code
}
```

And explicitly instructs the LLM:
```
IMPORTANT: The component MUST be named exactly "${uniqueComponentName}" to avoid naming conflicts.
```

### 4. Post-Processing Validation
After LLM generation, the system:
1. Checks if the generated code uses the correct component name
2. Replaces any incorrect names with the required unique name
3. Logs any replacements for debugging

## API Endpoint Changes

### `generateSceneCode` Mutation
**Location:** `src/server/api/routers/generation.ts`

**New Steps:**
1. Fetch existing component names from database
2. Generate unique component name for new scenes (skip for edits)
3. Include unique name in LLM prompts
4. Validate and fix component name in generated code
5. Use unique names in error fallbacks

## Error Handling
- **Edit Mode**: Preserves existing component names to avoid breaking edits
- **Fallback Cases**: Generate unique names even for error scenarios
- **Database Failures**: Graceful degradation with timestamp-based uniqueness

## Benefits
1. **Eliminates Conflicts**: No more "already declared" identifier errors
2. **Predictable Naming**: Consistent, meaningful component names
3. **Scalable**: Works for projects with many similar scenes
4. **Backward Compatible**: Existing scenes remain unchanged
5. **Debug Friendly**: Clear logging of name generation and replacements

## Usage Examples

### Creating Multiple Similar Scenes
```typescript
// User creates: "firework explosion"
// Generated: FireworkExplosionScene

// User creates: "firework explosion" again
// Generated: FireworkExplosionScene1

// User creates: "blue firework explosion"
// Generated: BlueFireworkExplosionScene
```

### Edge Cases Handled
- Empty prompts → `Scene`, `Scene1`, etc.
- Special characters → Sanitized to valid identifiers
- Very long prompts → Truncated to reasonable length
- Non-English characters → Filtered to alphanumeric only

## Implementation Notes
- Component names are generated at scene creation time
- Names are stored implicitly in the TSX code, not as separate database fields
- The system is case-sensitive and follows JavaScript identifier rules
- Numeric suffixes start at 1 (not 0) for better readability 