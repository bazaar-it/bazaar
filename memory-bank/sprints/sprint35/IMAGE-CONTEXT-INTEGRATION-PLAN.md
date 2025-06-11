# Image Context Integration Plan

## Current State
Image context is built directly in the orchestrator, which works but violates separation of concerns and misses opportunities for preference learning.

## Proposed Architecture

### 1. Move to ContextBuilder
Move all image context building from orchestrator to contextBuilder:

```typescript
// contextBuilder.service.ts
interface BuiltContext {
  // ... existing fields
  imageContext: {
    conversationImages: Array<{
      position: number;
      userPrompt: string;
      imageCount: number;
      messageIndex: number;
      imageUrls: string[];
      // New fields for richer context:
      analysisResults?: {
        colors?: string[];
        style?: string;
        mood?: string;
      };
    }>;
    imagePatterns: string[]; // e.g., ["consistent blue gradients", "modern style"]
    totalImageCount: number;
  };
}
```

### 2. Enhanced Preference Learning
The preferenceExtractor should analyze image patterns:

```typescript
// When 3+ images uploaded:
const imagePreferences = await preferenceExtractor.extractImagePreferences({
  imageHistory: context.imageContext.conversationImages,
  projectId,
  currentRequest
});

// Might extract:
{
  "visual_style": "modern_gradients",
  "color_scheme": "blue_dominant",
  "complexity": "minimal"
}
```

### 3. Project Memory Integration
Store rich image analysis for future reference:

```typescript
// After image upload (async):
await projectMemoryService.storeImageAnalysis(projectId, messageId, {
  imageUrls,
  analysis: {
    dominantColors: ["#3B82F6", "#10B981"],
    style: "gradient",
    mood: "professional",
    elements: ["geometric", "smooth transitions"]
  },
  timestamp: new Date()
});
```

### 4. Orchestrator Simplification
The orchestrator would just use the context:

```typescript
// Before: 100+ lines of image building
// After:
const imageInfo = this.formatImageContext(contextPacket.imageContext);
```

## Benefits

1. **Separation of Concerns**: Each service does one thing well
2. **Preference Learning**: Learn visual preferences from image choices
3. **Long-term Memory**: "Make it like that gradient from last week"
4. **Reusability**: Any service can access image context
5. **Testability**: Easier to test isolated image logic

## Implementation Steps

### Phase 1: Move Logic (No behavior change)
1. Copy image building logic to contextBuilder
2. Update orchestrator to use contextBuilder's image context
3. Verify no regression

### Phase 2: Add Intelligence
1. Add image pattern extraction
2. Integrate with preferenceExtractor
3. Store analysis in projectMemory

### Phase 3: Enhanced Features
1. Enable "the blue one" type references
2. Learn style preferences from uploads
3. Suggest similar styles based on history

## Migration Path

```typescript
// Step 1: Add to contextBuilder
async buildContext() {
  // ... existing code
  const imageContext = await this.buildImageContext(chatHistory, currentImageUrls);
  
  return {
    // ... existing fields
    imageContext
  };
}

// Step 2: Update orchestrator
const imageInfo = contextPacket.imageContext 
  ? this.formatImageContext(contextPacket.imageContext)
  : "";

// Step 3: Remove old code from orchestrator
```

## Risk Assessment
- **Low Risk**: Refactoring with no behavior change
- **High Value**: Enables preference learning and better architecture
- **Backwards Compatible**: No API changes needed