# Sprint 39: Scene Naming Consistency Issues

## Overview

Multiple critical issues exist with scene naming that affect user experience and code functionality. These issues compound when scenes are deleted, created from images, or when templates are used.

## Issue #1: Inconsistent Scene Naming

### Current Behavior
From the screenshot and system behavior:
- Regular scenes: "Scene 1", "Scene 2" ✅
- Image-created scenes: "Scene3_mbs7rxk8" ❌
- Template scenes: May have duplicate export names ❌

### Problems This Causes
1. **User Confusion**: Mixed naming patterns look unprofessional
2. **Timeline Confusion**: Hard to track which scene is which
3. **Export Conflicts**: Duplicate function names cause compilation errors

## Issue #2: Scene Numbering After Deletion

### Scenario
```
Initial: Scene 1, Scene 2, Scene 3, Scene 4
Delete: Scene 1, Scene 2
Result: Scene 3, Scene 4
Add New: Scene 5? Scene 1? Scene3_xyz123?
```

### Current Problems
1. **Gap Confusion**: Users see "Scene 3, Scene 4" and wonder where 1 & 2 went
2. **Numbering Logic**: No clear strategy for new scene numbers
3. **Mental Model**: Users expect continuous numbering OR gap filling

## Issue #3: Template Export Name Conflicts

### Problem
When adding multiple templates, they often have the same export name:
```typescript
// Template 1
export default function HeroScene() { ... }

// Template 2 (also exports HeroScene!)
export default function HeroScene() { ... }
```

### Result
- Compilation errors
- Runtime conflicts
- Broken preview

## Proposed Solutions

### Solution 1: Unified Scene Naming System

#### 1.1 Name Generation Rules
```typescript
class SceneNameGenerator {
  // Always generate clean display names
  generateDisplayName(projectScenes: Scene[], sourceType: 'manual' | 'image' | 'template'): string {
    const existingNumbers = this.extractSceneNumbers(projectScenes);
    const nextNumber = this.getNextNumber(existingNumbers);
    
    // Always return "Scene X" regardless of source
    return `Scene ${nextNumber}`;
  }
  
  // Function names still need uniqueness
  generateFunctionName(displayName: string): string {
    const baseNumber = this.extractNumber(displayName);
    const uniqueId = nanoid(8);
    return `Scene${baseNumber}_${uniqueId}`;
  }
  
  private getNextNumber(existingNumbers: number[]): number {
    if (existingNumbers.length === 0) return 1;
    
    // Option A: Fill gaps
    for (let i = 1; i <= existingNumbers.length + 1; i++) {
      if (!existingNumbers.includes(i)) return i;
    }
    
    // Option B: Always increment (current approach)
    // return Math.max(...existingNumbers) + 1;
  }
}
```

#### 1.2 Implementation for Different Sources

**For Image-Created Scenes:**
```typescript
// In createSceneFromImage tool
const displayName = sceneNameGenerator.generateDisplayName(existingScenes, 'image');
const functionName = sceneNameGenerator.generateFunctionName(displayName);

// Result: Display = "Scene 3", Function = "Scene3_abc123"
```

**For Templates:**
```typescript
// In template insertion
const displayName = sceneNameGenerator.generateDisplayName(existingScenes, 'template');
const functionName = sceneNameGenerator.generateFunctionName(displayName);

// Rewrite template export
const modifiedCode = templateCode.replace(
  /export\s+default\s+function\s+\w+/,
  `export default function ${functionName}`
);
```

### Solution 2: Scene Numbering Strategies

#### Option A: Gap Filling (Recommended)
```typescript
// Example flow:
Initial: [1, 2, 3, 4]
Delete 1, 2: [3, 4]
Add new: [1, 3, 4] // Fills gap at position 1
Add another: [1, 2, 3, 4] // Fills gap at position 2
Add another: [1, 2, 3, 4, 5] // No gaps, increment
```

**Pros:**
- Maintains clean 1, 2, 3... sequence
- Matches user mental model
- No confusing gaps

**Cons:**
- Scene 1 might not be the "first" scene chronologically
- Could confuse users who remember "I deleted Scene 1"

#### Option B: Always Increment
```typescript
// Example flow:
Initial: [1, 2, 3, 4]
Delete 1, 2: [3, 4]
Add new: [3, 4, 5] // Always increment
Add another: [3, 4, 5, 6]
```

**Pros:**
- Scene numbers indicate creation order
- No number reuse

**Cons:**
- Gaps look unprofessional
- Users wonder "where are scenes 1 & 2?"

#### Option C: Smart Renumbering (Advanced)
```typescript
class SmartSceneRenumbering {
  // After any scene operation, renumber all scenes
  async renumberScenes(projectId: string) {
    const scenes = await getProjectScenes(projectId);
    
    // Sort by timeline position
    scenes.sort((a, b) => a.start - b.start);
    
    // Renumber based on position
    for (let i = 0; i < scenes.length; i++) {
      const newDisplayName = `Scene ${i + 1}`;
      if (scenes[i].name !== newDisplayName) {
        await updateSceneName(scenes[i].id, newDisplayName);
      }
    }
  }
}
```

**Pros:**
- Always clean 1, 2, 3... sequence
- Matches timeline order
- Professional appearance

**Cons:**
- Scene numbers change (Scene 4 might become Scene 2)
- Could break user mental model
- More database updates

### Solution 3: Template Export Conflict Resolution

#### 3.1 Automatic Export Renaming
```typescript
class TemplateProcessor {
  processTemplate(templateCode: string, sceneName: string): string {
    const functionName = sceneName.replace(/\s+/g, '');
    
    // Find and replace export
    const processed = templateCode
      // Replace default export function
      .replace(
        /export\s+default\s+function\s+(\w+)/,
        `export default function ${functionName}`
      )
      // Replace component references
      .replace(
        /<(\w+)\s*\/>/g,
        (match, componentName) => {
          if (componentName === 'Component') {
            return `<${functionName} />`;
          }
          return match;
        }
      );
      
    return processed;
  }
}
```

#### 3.2 Template Metadata System
```typescript
interface TemplateMetadata {
  id: string;
  displayName: string;
  category: string;
  exportName: string; // Original export name
  processingRules?: {
    renameExport: boolean;
    prefixComponents: boolean;
  };
}

// In template registry
const templates: TemplateMetadata[] = [
  {
    id: 'hero-gradient',
    displayName: 'Hero Gradient',
    exportName: 'HeroScene',
    processingRules: {
      renameExport: true,
      prefixComponents: true
    }
  }
];
```

## Implementation Plan

### Phase 1: Fix Scene Naming (High Priority)
1. **Update Scene Builder** to always generate clean display names
2. **Update Image Tools** to use consistent naming
3. **Add Tests** for naming consistency

### Phase 2: Implement Numbering Strategy (Medium Priority)
1. **Choose Strategy** (recommend Gap Filling)
2. **Update SceneBuilder** and all scene creation tools
3. **Add User Preference** for numbering style (optional)

### Phase 3: Fix Template Conflicts (High Priority)
1. **Add Template Processor** to rewrite exports
2. **Update Template System** to handle duplicates
3. **Test with Multiple Templates**

## Database Migration

If implementing renumbering, add a migration:

```sql
-- Add display_order column for explicit ordering
ALTER TABLE scenes ADD COLUMN display_order INTEGER;

-- Update existing scenes
UPDATE scenes 
SET display_order = ROW_NUMBER() OVER (
  PARTITION BY project_id 
  ORDER BY "order"
);

-- Add index for performance
CREATE INDEX idx_scenes_display_order 
ON scenes(project_id, display_order);
```

## Testing Scenarios

### Test Case 1: Mixed Creation
1. Create Scene 1 (manual)
2. Create scene from image → Should be "Scene 2"
3. Add template → Should be "Scene 3"
4. Verify all have consistent display names

### Test Case 2: Deletion and Recreation
1. Create Scenes 1, 2, 3, 4
2. Delete Scenes 2, 3
3. Add new scene → Should be "Scene 2" (gap filled)
4. Add another → Should be "Scene 3" (gap filled)
5. Add another → Should be "Scene 5" (increment)

### Test Case 3: Template Conflicts
1. Add Hero template
2. Add another Hero template
3. Both should work without conflicts
4. Verify unique export names

## User Communication

### Option 1: Status Bar Notification
```
"Scene 2 deleted. New scenes will fill the gap."
```

### Option 2: Settings Toggle
```
Scene Numbering:
○ Fill gaps (1, 2, 3...)
○ Always increment (preserve history)
○ Auto-renumber (match timeline)
```

## Risks and Mitigations

### Risk 1: Breaking Existing Projects
**Mitigation**: Only apply new naming to new scenes

### Risk 2: User Confusion with Renumbering
**Mitigation**: Make it optional or only for new projects

### Risk 3: Complex State Management
**Mitigation**: Keep numbering logic centralized in one service

## Conclusion

Scene naming consistency is crucial for professional appearance and user understanding. The recommended approach:

1. **Always use "Scene X" format** for display names
2. **Implement gap filling** for intuitive numbering
3. **Automatically handle template conflicts**
4. **Keep function names unique** with suffixes

This will create a clean, predictable experience regardless of how scenes are created or deleted.