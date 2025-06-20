# Quick Start: Adding Mobile Support

## Minimal Implementation Path

### Step 1: Add Format to Project Schema
```typescript
// src/server/db/schema/projects.ts
export const projects = pgTable('projects', {
  // ... existing fields
  videoWidth: integer('video_width').notNull().default(1280),
  videoHeight: integer('video_height').notNull().default(720),
  videoFormat: varchar('video_format', { length: 50 }).notNull().default('desktop'),
});
```

### Step 2: Update PreviewPanelG
```typescript
// Remove hardcoded values at line 634-635
compositionWidth={project.videoWidth || 1280}
compositionHeight={project.videoHeight || 720}
```

### Step 3: Add Format Selector
```typescript
// In project creation flow
const VIDEO_FORMATS = [
  { id: 'desktop', label: 'Desktop (16:9)', width: 1280, height: 720 },
  { id: 'mobile', label: 'Mobile (9:16)', width: 1080, height: 1920 },
  { id: 'square', label: 'Square (1:1)', width: 1080, height: 1080 },
];
```

### Step 4: Update InputProps
```typescript
// src/lib/types/video/index.ts
export interface InputProps {
  meta: {
    durationInFrames: number;
    fps: number;
    width: number;  // ADD
    height: number; // ADD
  };
  // ... rest
}
```

### Step 5: Pass Dimensions to AI
```typescript
// When calling AI generation
const promptContext = `
Generate for ${width}x${height} canvas (${width > height ? 'landscape' : 'portrait'}).
`;
```

## Testing Mobile Format
1. Create project with mobile format (1080x1920)
2. Generate a scene with text
3. Check if content fits properly
4. Verify preview displays correctly

## Next Steps
- Run database migration
- Update project creation UI
- Test with different formats
- Refine AI prompts for format-specific content