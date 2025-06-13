# TICKET-003: Refactor Tools to Pure Functions

## Overview
Tools should ONLY generate/transform content. NO database access allowed. They are pure functions: same input always produces same output.

## Current State

### Problem Areas

1. **Tools might access database directly** (need to verify and remove)
2. **Field naming issues**:
   ```typescript
   // Current EditToolInput uses wrong field name
   export interface EditToolInput extends BaseToolInput {
     existingCode: string;  // ❌ Should be tsxCode
   }
   ```
3. **Tool output format** might include database operations
4. **Unclear separation** between generation and persistence

## Implementation Plan

### Step 1: Update Tool Type Definitions

Update `/src/tools/helpers/types.ts`:
```typescript
import { z } from "zod";

// ============================================================================
// TOOL INTERFACES - Pure Functions Only
// ============================================================================

/**
 * Base input that all tools receive
 */
export interface BaseToolInput {
  userPrompt: string;
  projectId: string;  // For context only, not DB access
  userId?: string;    // For context only
}

/**
 * Base output that all tools return
 * MUST match database field names exactly
 */
export interface BaseToolOutput {
  success: boolean;
  tsxCode?: string;      // ✓ FIXED: Was sceneCode
  name?: string;         // ✓ FIXED: Was sceneName
  duration?: number;     // Always in frames
  reasoning: string;
  chatResponse?: string;
  error?: string;
  debug?: Record<string, unknown>;
}

// ============================================================================
// ADD TOOL TYPES
// ============================================================================

export interface AddToolInput extends BaseToolInput {
  sceneNumber?: number;
  previousSceneContext?: {
    tsxCode: string;
    style?: string;
  };
  imageUrls?: string[];
  visionAnalysis?: any;
}

export interface AddToolOutput extends BaseToolOutput {
  tsxCode: string;       // Required for new scenes
  name: string;          // Required for new scenes
  duration: number;      // Required for new scenes
  layoutJson?: string;
  props?: Record<string, any>;
}

// ============================================================================
// EDIT TOOL TYPES
// ============================================================================

export interface EditToolInput extends BaseToolInput {
  sceneId: string;       // Just for reference
  tsxCode: string;       // ✓ FIXED: Was existingCode
  currentDuration?: number;
  editType: 'creative' | 'surgical' | 'error-fix';
  imageUrls?: string[];
  visionAnalysis?: any;
  errorDetails?: string;
}

export interface EditToolOutput extends BaseToolOutput {
  tsxCode: string;       // Updated code
  duration?: number;     // Only if changed
  props?: Record<string, any>;
  changesApplied?: string[];
}

// ============================================================================
// DELETE TOOL TYPES
// ============================================================================

export interface DeleteToolInput extends BaseToolInput {
  sceneId: string;       // Which scene to delete
  confirmDeletion?: boolean;
}

export interface DeleteToolOutput extends BaseToolOutput {
  deletedSceneId: string;
  // No content generation needed for delete
}
```

### Step 2: Refactor Add Tool

Update `/src/tools/add/add.ts`:
```typescript
import { BaseMCPTool } from "~/tools/helpers/base";
import { layoutGenerator } from "./add_helpers/layoutGeneratorNEW";
import { codeGenerator } from "./add_helpers/CodeGeneratorNEW";
import { imageToCodeGenerator } from "./add_helpers/ImageToCodeGeneratorNEW";
import type { AddToolInput, AddToolOutput } from "~/tools/helpers/types";
import { addToolInputSchema } from "~/tools/helpers/types";

/**
 * ADD Tool - Pure function that generates scene content
 * NO DATABASE ACCESS - only generation
 */
export class AddTool extends BaseMCPTool<AddToolInput, AddToolOutput> {
  name = "ADD";
  description = "Generate new motion graphics scene content";
  inputSchema = addToolInputSchema;

  protected async execute(input: AddToolInput): Promise<AddToolOutput> {
    try {
      // Handle image-based scene creation
      if (input.imageUrls && input.imageUrls.length > 0) {
        return await this.generateFromImages(input);
      }
      
      // Handle text-based scene creation
      return await this.generateFromText(input);
    } catch (error) {
      return {
        success: false,
        reasoning: `Failed to generate scene: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate scene from text prompt
   * PURE FUNCTION - no side effects
   */
  private async generateFromText(input: AddToolInput): Promise<AddToolOutput> {
    // Generate function name (deterministic based on input)
    const functionName = this.generateFunctionName(input.projectId, input.sceneNumber);
    
    // Step 1: Generate layout JSON
    const layoutResult = await layoutGenerator.generateLayout({
      userPrompt: input.userPrompt,
      projectId: input.projectId,
      previousSceneJson: input.previousSceneContext?.style,
      visionAnalysis: input.visionAnalysis,
    });

    // Step 2: Generate React code from layout
    const codeResult = await codeGenerator.generateCode({
      userPrompt: input.userPrompt,
      layoutJson: layoutResult.layoutJson,
      functionName: functionName,
      projectId: input.projectId,
    });

    // Return generated content - NO DATABASE!
    return {
      success: true,
      tsxCode: codeResult.code,         // ✓ Correct field name
      name: codeResult.name,
      duration: codeResult.duration,    // In frames
      layoutJson: JSON.stringify(layoutResult.layoutJson),
      props: codeResult.props,
      reasoning: `Generated ${codeResult.name}: ${codeResult.reasoning}`,
      chatResponse: `I've created ${codeResult.name} with ${codeResult.elements?.length || 0} elements`,
      debug: {
        layoutGeneration: layoutResult.debug,
        codeGeneration: codeResult.debug,
      },
    };
  }

  /**
   * Generate scene from images
   * PURE FUNCTION - no side effects
   */
  private async generateFromImages(input: AddToolInput): Promise<AddToolOutput> {
    if (!input.imageUrls || input.imageUrls.length === 0) {
      throw new Error("No images provided");
    }

    const functionName = this.generateFunctionName(input.projectId, input.sceneNumber);

    // Generate code directly from images
    const codeResult = await imageToCodeGenerator.generateCodeFromImage({
      imageUrls: input.imageUrls,
      userPrompt: input.userPrompt,
      functionName: functionName,
      visionAnalysis: input.visionAnalysis,
    });

    // Return generated content - NO DATABASE!
    return {
      success: true,
      tsxCode: codeResult.code,         // ✓ Correct field name
      name: codeResult.name,
      duration: codeResult.duration,    // In frames
      reasoning: `Generated from ${input.imageUrls.length} image(s): ${codeResult.reasoning}`,
      chatResponse: `I've created ${codeResult.name} based on your image(s)`,
      debug: {
        imageGeneration: codeResult.debug,
      },
    };
  }

  /**
   * Generate deterministic function name
   */
  private generateFunctionName(projectId: string, sceneNumber?: number): string {
    // Use projectId hash for consistency
    const projectHash = projectId.slice(-6);
    const sceneNum = sceneNumber || 1;
    return `Scene${sceneNum}_${projectHash}`;
  }
}

// Export singleton instance
export const addTool = new AddTool();
```

### Step 3: Refactor Edit Tool

Update `/src/tools/edit/edit.ts`:
```typescript
import { BaseMCPTool } from "~/tools/helpers/base";
import { creativeEditor } from "./edit_helpers/CreativeEditor";
import { surgicalEditor } from "./edit_helpers/SurgicalEditor";
import { errorFixer } from "./edit_helpers/ErrorFixer";
import type { EditToolInput, EditToolOutput } from "~/tools/helpers/types";

/**
 * EDIT Tool - Pure function that transforms scene content
 * NO DATABASE ACCESS - only transformation
 */
export class EditTool extends BaseMCPTool<EditToolInput, EditToolOutput> {
  name = "EDIT";
  description = "Transform existing scene content based on user prompt";

  protected async execute(input: EditToolInput): Promise<EditToolOutput> {
    try {
      // Validate input
      if (!input.tsxCode) {  // ✓ Using correct field name
        throw new Error("No scene code provided");
      }

      let result: EditToolOutput;

      switch (input.editType) {
        case 'creative':
          result = await this.creativeEdit(input);
          break;
          
        case 'surgical':
          result = await this.surgicalEdit(input);
          break;
          
        case 'error-fix':
          result = await this.fixErrors(input);
          break;
          
        default:
          throw new Error(`Unknown edit type: ${input.editType}`);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        reasoning: `Edit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async creativeEdit(input: EditToolInput): Promise<EditToolOutput> {
    const functionName = this.extractFunctionName(input.tsxCode);
    
    const result = await creativeEditor.executeEdit({
      userPrompt: input.userPrompt,
      tsxCode: input.tsxCode,           // ✓ Correct field name
      functionName: functionName,
      imageUrls: input.imageUrls,
      visionAnalysis: input.visionAnalysis,
    });

    return {
      success: true,
      tsxCode: result.code,              // ✓ Correct field name
      duration: result.duration,         // Only if changed
      props: result.props,
      reasoning: result.reasoning,
      chatResponse: `I've updated the scene: ${result.changes?.join(', ') || 'Made creative improvements'}`,
      changesApplied: result.changes,
    };
  }

  private async surgicalEdit(input: EditToolInput): Promise<EditToolOutput> {
    const functionName = this.extractFunctionName(input.tsxCode);
    
    const result = await surgicalEditor.executeEdit({
      userPrompt: input.userPrompt,
      tsxCode: input.tsxCode,           // ✓ Correct field name
      functionName: functionName,
      targetElement: this.extractTargetElement(input.userPrompt),
    });

    return {
      success: true,
      tsxCode: result.code,              // ✓ Correct field name
      reasoning: result.reasoning,
      chatResponse: `Made precise edit: ${result.changeDescription}`,
      changesApplied: [result.changeDescription],
    };
  }

  private async fixErrors(input: EditToolInput): Promise<EditToolOutput> {
    const result = await errorFixer.fixErrors({
      tsxCode: input.tsxCode,           // ✓ Correct field name
      errorDetails: input.errorDetails || 'Unknown error',
      userPrompt: input.userPrompt,
    });

    return {
      success: true,
      tsxCode: result.code,              // ✓ Correct field name
      reasoning: result.reasoning,
      chatResponse: `Fixed errors: ${result.fixesApplied?.join(', ') || 'Corrected issues'}`,
      changesApplied: result.fixesApplied,
    };
  }

  private extractFunctionName(tsxCode: string): string {
    const match = tsxCode.match(/function\s+(\w+)|const\s+(\w+)\s*=/);
    return match?.[1] || match?.[2] || 'Scene';
  }

  private extractTargetElement(prompt: string): string | undefined {
    // Simple extraction logic
    const match = prompt.match(/(?:the|change|update|edit)\s+(\w+)/i);
    return match?.[1];
  }
}

export const editTool = new EditTool();
```

### Step 4: Update Delete Tool

Update `/src/tools/delete/delete.ts`:
```typescript
import { BaseMCPTool } from "~/tools/helpers/base";
import type { DeleteToolInput, DeleteToolOutput } from "~/tools/helpers/types";

/**
 * DELETE Tool - Pure function that validates deletion
 * NO DATABASE ACCESS - only returns deletion confirmation
 */
export class DeleteTool extends BaseMCPTool<DeleteToolInput, DeleteToolOutput> {
  name = "DELETE";
  description = "Validate scene deletion request";

  protected async execute(input: DeleteToolInput): Promise<DeleteToolOutput> {
    try {
      // Validate deletion request
      if (!input.sceneId) {
        throw new Error("No scene ID provided for deletion");
      }

      if (!input.confirmDeletion) {
        return {
          success: false,
          reasoning: "Deletion not confirmed by user",
          chatResponse: "Please confirm you want to delete this scene",
        };
      }

      // Return deletion confirmation - NO DATABASE!
      return {
        success: true,
        deletedSceneId: input.sceneId,
        reasoning: `Scene ${input.sceneId} marked for deletion`,
        chatResponse: "I'll remove that scene for you",
      };
    } catch (error) {
      return {
        success: false,
        reasoning: `Delete validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const deleteTool = new DeleteTool();
```

### Step 5: Update Service Helpers

Update service helpers to use correct field names:

```typescript
// src/tools/edit/edit_helpers/CreativeEditor.ts
export interface CreativeEditInput {
  userPrompt: string;
  tsxCode: string;        // ✓ FIXED: Was existingCode
  functionName: string;
  imageUrls?: string[];
  visionAnalysis?: any;
}

// src/tools/edit/edit_helpers/SurgicalEditor.ts
export interface SurgicalEditInput {
  userPrompt: string;
  tsxCode: string;        // ✓ FIXED: Was existingCode
  functionName: string;
  targetElement?: string;
}
```

## After Implementation

### Pure Function Tools
```typescript
// Tools are now pure functions
const input = {
  userPrompt: "Create blue intro",
  projectId: "123",
  tsxCode: "<div>...</div>"  // Always correct field name
};

const output1 = await editTool.execute(input);
const output2 = await editTool.execute(input);

// output1 === output2 (same input, same output)
```

### No Database Access
```typescript
// This is now IMPOSSIBLE in tools:
import { db } from "~/server/db";  // ❌ No DB imports

// Tools only return generated content:
return {
  tsxCode: generatedCode,  // ✓ Pure generation
  duration: 150,
  // No database operations!
};
```

## Testing Plan

### 1. Unit Tests for Pure Functions
```typescript
describe('AddTool', () => {
  it('is a pure function', async () => {
    const input = {
      userPrompt: "Create intro scene",
      projectId: "test-123",
    };
    
    const result1 = await addTool.execute(input);
    const result2 = await addTool.execute(input);
    
    // Should generate similar content for same input
    expect(result1.name).toBe(result2.name);
    expect(result1.duration).toBe(result2.duration);
  });
  
  it('uses correct field names', async () => {
    const result = await addTool.execute({
      userPrompt: "Create scene",
      projectId: "123"
    });
    
    expect(result).toHaveProperty('tsxCode');
    expect(result).not.toHaveProperty('code');
    expect(result).not.toHaveProperty('sceneCode');
  });
});
```

### 2. Integration Tests
```typescript
describe('Tool Integration', () => {
  it('tools have no database dependencies', () => {
    // Check imports
    const toolFile = fs.readFileSync('src/tools/add/add.ts', 'utf8');
    expect(toolFile).not.toContain('~/server/db');
    expect(toolFile).not.toContain('drizzle');
  });
});
```

### 3. Type Safety Tests
```typescript
// This should NOT compile:
const badInput: EditToolInput = {
  existingCode: "...",  // ❌ TypeScript error!
};

// This SHOULD compile:
const goodInput: EditToolInput = {
  tsxCode: "...",      // ✓ Correct field
  editType: 'creative',
  userPrompt: "Make it blue"
};
```

## Success Criteria

- [ ] All tools use `tsxCode` field name (not existingCode)
- [ ] No database imports in any tool file
- [ ] Tools are pure functions (deterministic)
- [ ] Tool outputs match expected types
- [ ] All tests pass

## Dependencies

- TICKET-001 must be complete (for correct types)

## Time Estimate

- Type updates: 1 hour
- Add tool refactor: 2 hours
- Edit tool refactor: 2 hours
- Delete tool refactor: 30 minutes
- Testing: 30 minutes
- **Total: 6 hours**