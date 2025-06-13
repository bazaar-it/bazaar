# TICKET-008: Edit with Image Support

## Overview
When users upload images saying "make it like this", our multimodal AI models should directly process the images without separate analysis.

## Current State

### Problem Areas
1. **Edit tool might not accept image URLs**
2. **Brain might not pass images to tools correctly**
3. **No visual diff preview** (before/after)
4. **Multiple image support unclear**

## Implementation Plan

### Step 1: Update Edit Tool to Pass Images Directly

Update `/src/tools/edit/edit.ts` to pass images directly to multimodal models:

```typescript
import type { EditToolInput, EditToolOutput } from '~/tools/helpers/types';

export class EditTool extends BaseMCPTool<EditToolInput, EditToolOutput> {
  name = "EDIT";
  description = "Transform existing scene content based on user prompt and/or images";

  protected async execute(input: EditToolInput): Promise<EditToolOutput> {
    try {
      // Route to appropriate edit type
      if (input.imageUrls && input.imageUrls.length > 0) {
        // Image-based edit always uses creative approach
        return await this.creativeEdit(input); // Same method, but with images!
      }

      // Text-only edits (existing logic)
      switch (input.editType) {
        case 'creative':
          return await this.creativeEdit(input);
        case 'surgical':
          return await this.surgicalEdit(input);
        case 'error-fix':
          return await this.fixErrors(input);
        default:
          throw new Error(`Unknown edit type: ${input.editType}`);
      }
    } catch (error) {
      return {
        success: false,
        reasoning: `Edit failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Creative edit - works with or without images
   */
  private async creativeEdit(input: EditToolInput): Promise<EditToolOutput> {
    // Build messages array for multimodal model
    const messages: any[] = [
      {
        role: "system",
        content: `You are an expert motion graphics developer. Transform the existing scene based on the user's request.
${input.imageUrls ? 'The user has provided reference images - match their style, colors, and layout.' : ''}

Current scene code:
\`\`\`tsx
${input.tsxCode}
\`\`\`

Maintain scene functionality while updating the visual design.
Return the complete updated TSX code.`
      },
      {
        role: "user",
        content: input.imageUrls ? [
          { type: "text", text: input.userPrompt },
          ...input.imageUrls.map(url => ({
            type: "image_url" as const,
            image_url: { url }
          }))
        ] : input.userPrompt
      }
    ];

    const result = await this.aiService.generateStructured({
      messages,
      schema: editOutputSchema,
      model: 'gpt-4o', // Multimodal model
    });

    return {
      success: true,
      tsxCode: result.code,
      duration: result.duration || input.currentDuration,
      reasoning: input.imageUrls 
        ? `Updated scene to match the style from your reference image${input.imageUrls.length > 1 ? 's' : ''}`
        : result.reasoning,
      chatResponse: input.imageUrls
        ? `I've updated your scene to match the visual style from your image${input.imageUrls.length > 1 ? 's' : ''}.`
        : result.chatResponse,
    };
  }

  /**
   * Surgical edit - minimal changes (no image support)
   */
  private async surgicalEdit(input: EditToolInput): Promise<EditToolOutput> {
    // Existing surgical edit logic - no changes needed
    // This doesn't support images as it's for precise text-based edits
  }
}

### Step 2: Update Brain to Pass Images to Tools

The brain just needs to detect image-based edits and pass URLs through:

Update `/src/brain/orchestratorNEW.ts` prompt:

```json
{
  "toolName": "editScene",
  "targetSceneId": "scene-123",
  "editComplexity": "creative", // Always creative for image edits
  "reasoning": "User wants to match the uploaded image style",
  "userFeedback": "I'll update your scene to match the style from your screenshot."
}
```

The brain doesn't analyze images - it just:
1. Detects phrases like "make it look like this" + image presence
2. Routes to editScene with creative complexity
3. Passes image URLs to the tool

The multimodal AI in the tool does all the work!

### Step 3: Update Add Tool for Image-to-Code

Update `/src/tools/add/add.ts` to handle direct image-to-code:

```typescript
private async generateFromImage(input: AddToolInput): Promise<AddToolOutput> {
  const messages: any[] = [
    {
      role: "system",
      content: `You are an expert motion graphics developer. Create a scene based on the provided image(s).

${input.previousScenes?.length ? `Previous scenes context:\n${this.getPreviousContext(input.previousScenes)}` : 'This is the first scene.'}

Generate complete TSX code that recreates the visual style from the image.
Use Remotion hooks (useCurrentFrame, interpolate, spring) for animations.
Return a self-contained React component.`
    },
    {
      role: "user",
      content: [
        { type: "text", text: input.userPrompt || "Create a scene based on this image" },
        ...input.imageUrls!.map(url => ({
          type: "image_url" as const,
          image_url: { url }
        }))
      ]
    }
  ];

  const result = await this.aiService.generateStructured({
    messages,
    schema: addOutputSchema,
    model: 'gpt-4o', // Multimodal model
  });

  return {
    success: true,
    tsxCode: result.code,
    name: result.name,
    duration: result.duration,
    reasoning: `Created scene from reference image${input.imageUrls!.length > 1 ? 's' : ''}`,
    chatResponse: `I've created a new scene based on your image${input.imageUrls!.length > 1 ? 's' : ''}.`,
  };
}

// In execute method:
if (input.imageUrls && input.imageUrls.length > 0) {
  return await this.generateFromImage(input);
}
// ... rest of normal flow
```

### Step 4: Create Visual Diff Preview Component

Create `/src/components/preview/VisualDiff.tsx`:

```typescript
import { useState } from 'react';
import { Player } from '@remotion/player';

interface VisualDiffProps {
  originalScene: {
    tsxCode: string;
    duration: number;
  };
  updatedScene: {
    tsxCode: string;
    duration: number;
  };
  referenceImage?: string;
}

export function VisualDiff({ originalScene, updatedScene, referenceImage }: VisualDiffProps) {
  const [view, setView] = useState<'split' | 'before' | 'after' | 'reference'>('split');
  const [sliderPosition, setSliderPosition] = useState(50);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex gap-2">
          <button
            onClick={() => setView('split')}
            className={`px-3 py-1 rounded ${view === 'split' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Split View
          </button>
          <button
            onClick={() => setView('before')}
            className={`px-3 py-1 rounded ${view === 'before' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Before
          </button>
          <button
            onClick={() => setView('after')}
            className={`px-3 py-1 rounded ${view === 'after' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            After
          </button>
          {referenceImage && (
            <button
              onClick={() => setView('reference')}
              className={`px-3 py-1 rounded ${view === 'reference' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Reference
            </button>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative overflow-hidden">
        {view === 'split' && (
          <div className="relative w-full h-full">
            {/* Before */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              <ScenePreview scene={originalScene} label="Before" />
            </div>
            
            {/* After */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
            >
              <ScenePreview scene={updatedScene} label="After" />
            </div>
            
            {/* Slider */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startPos = sliderPosition;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const diff = e.clientX - startX;
                  const newPos = Math.max(0, Math.min(100, startPos + (diff / window.innerWidth) * 100));
                  setSliderPosition(newPos);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full w-8 h-8 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </div>
            </div>
          </div>
        )}
        
        {view === 'before' && <ScenePreview scene={originalScene} label="Before" />}
        {view === 'after' && <ScenePreview scene={updatedScene} label="After" />}
        {view === 'reference' && referenceImage && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <img 
              src={referenceImage} 
              alt="Reference" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ScenePreview({ scene, label }: { scene: any; label: string }) {
  const Component = createSceneComponent(scene.tsxCode);
  
  return (
    <div className="relative w-full h-full">
      <Player
        composition={{
          id: label,
          component: Component,
          durationInFrames: scene.duration,
          fps: 30,
          width: 1920,
          height: 1080,
        }}
        durationInFrames={scene.duration}
        fps={30}
        style={{ width: '100%', height: '100%' }}
        controls={false}
        loop
        autoPlay
      />
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
        {label}
      </div>
    </div>
  );
}
```

### Step 4: Update ChatPanelG to Show Visual Diff

Add to ChatPanelG when handling edit responses:

```typescript
// After successful edit
if (result.operation === 'scene.update' && input.imageUrls?.length > 0) {
  // Show visual diff modal
  setShowVisualDiff({
    originalScene: {
      tsxCode: originalSceneCode,
      duration: originalDuration,
    },
    updatedScene: {
      tsxCode: result.scene.tsxCode,
      duration: result.scene.duration,
    },
    referenceImage: input.imageUrls[0],
  });
}

// Visual diff modal
{showVisualDiff && (
  <Modal onClose={() => setShowVisualDiff(null)}>
    <div className="w-full h-[600px]">
      <VisualDiff {...showVisualDiff} />
    </div>
  </Modal>
)}
```

## Example User Flow

1. **User sees current scene** in preview
2. **User uploads screenshot** of desired style
3. **User types**: "Make it look like this"
4. **Brain decides**:
   - Detects image + "make it look like this" phrase
   - Routes to edit tool with creative complexity
   - Passes image URLs along
5. **Edit tool**:
   - Receives current scene code + image URLs
   - Multimodal AI transforms scene to match image directly
   - Returns updated code
6. **Visual diff shows**:
   - Split view of before/after
   - Reference image for comparison
   - Slider to compare changes
7. **Preview updates** with new style

## Direct Image-to-Code Flows

### Add Scene with Image
```typescript
// User uploads design mockup
Input: {
  userPrompt: "Create an intro from this design",
  imageUrls: ["design-mockup.png"]
}

// Goes directly to multimodal AI
// No separate analysis needed!
```

### Edit Scene with Image  
```typescript
// User uploads screenshot
Input: {
  userPrompt: "Make it look like this",
  tsxCode: currentSceneCode,
  imageUrls: ["screenshot.png"]
}

// Multimodal AI sees both code + image
// Transforms code to match image style
```

## Testing Plan

### 1. Multimodal Edit Tests
```typescript
it('edits scene based on image reference', async () => {
  const input = {
    userPrompt: 'Make it look like this',
    tsxCode: '<div style={{ background: "red" }}>Hello</div>',
    imageUrls: ['blue-design.png'],
    editType: 'creative' as const,
  };
  
  const result = await editTool.execute(input);
  
  expect(result.success).toBe(true);
  expect(result.tsxCode).toBeTruthy();
  expect(result.reasoning).toContain('match');
});
```

### 2. Image-to-Code Tests
```typescript
it('creates scene directly from image', async () => {
  const input = {
    userPrompt: 'Create intro from this',
    imageUrls: ['mockup.png'],
  };
  
  const result = await addTool.execute(input);
  
  expect(result.success).toBe(true);
  expect(result.tsxCode).toBeTruthy();
  expect(result.chatResponse).toContain('based on your image');
});
```

### 3. Visual Diff Tests
```typescript
it('shows split view comparison', async () => {
  render(
    <VisualDiff
      originalScene={{ tsxCode: '<div>Before</div>', duration: 150 }}
      updatedScene={{ tsxCode: '<div>After</div>', duration: 150 }}
      referenceImage="ref.png"
    />
  );
  
  // Should show split view by default
  expect(screen.getByText('Before')).toBeInTheDocument();
  expect(screen.getByText('After')).toBeInTheDocument();
  
  // Can switch views
  fireEvent.click(screen.getByText('Reference'));
  expect(screen.getByAltText('Reference')).toBeInTheDocument();
});
```

## Success Criteria

- [ ] Image-based edits work on first try 90% of time
- [ ] Clear visual feedback during processing
- [ ] Support for multiple reference images
- [ ] Visual diff preview works smoothly
- [ ] Style transfer is accurate

## Dependencies

- GPT-4o (multimodal model) - already in use
- Remotion Player for preview
- No additional image processing needed!

## Time Estimate

- Update edit tool for multimodal: 1 hour
- Update add tool for image-to-code: 1 hour  
- Visual diff component: 1.5 hours
- Testing multimodal flows: 0.5 hours
- **Total: 4 hours** (2 hours saved by using multimodal directly!)