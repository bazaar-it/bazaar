# Sprint 48: Final Decision - Simple Format Selection

## Decision: Project-Level Format Selection

After thorough analysis, we've decided to implement a **simple, project-level format selection** approach.

## The Approach

### 1. Format Selection at Project Creation
```typescript
interface VideoFormat {
  id: 'youtube' | 'stories' | 'square';
  name: string;
  width: number;
  height: number;
  icon: string;
  description: string;
}

const VIDEO_FORMATS: VideoFormat[] = [
  {
    id: 'youtube',
    name: 'YouTube / Desktop',
    width: 1280,
    height: 720,
    icon: '📺',
    description: 'Traditional horizontal video'
  },
  {
    id: 'stories',
    name: 'Stories / Reels / TikTok',
    width: 1080,
    height: 1920,
    icon: '📱',
    description: 'Vertical format for mobile platforms'
  },
  {
    id: 'square',
    name: 'Instagram Post',
    width: 1080,
    height: 1080,
    icon: '📷',
    description: 'Square format for feed posts'
  }
];
```

### 2. One Format Per Project
- User selects format when creating project
- All scenes in that project use the same dimensions
- No format mixing within a project
- Clear, predictable behavior

### 3. Future Enhancement: Cross-Format Export
```typescript
// Phase 2 feature (not initial implementation)
function exportToFormat(projectId: string, targetFormat: VideoFormat) {
  // Creates new project with all scenes converted
  // Preserves original project
  // User can then fine-tune the new version
}
```

## Why This Approach Won

### ✅ Pros:
1. **Simplicity** - No complex state management
2. **Clarity** - "This is a Stories project" - no ambiguity
3. **Performance** - One preview, one format, no juggling
4. **AI Context** - Clear what format to generate for
5. **No Sync Issues** - Each project is independent
6. **Minimal Changes** - VideoState stays exactly as is

### ❌ Rejected: Multi-Preview Approach
- Too complex for the value provided
- Timeline synchronization issues
- Edit propagation complexity
- Performance concerns with multiple previews
- Ambiguous user intent ("make title bigger" - which format?)

## Implementation Plan

### Phase 1: Core Format Support (Immediate)
1. Add format selection to project creation UI
2. Store format/dimensions in project database
3. Update PreviewPanelG to use project dimensions
4. Pass format context to AI generation
5. Remove hardcoded 1280x720 values

### Phase 2: Format-Aware AI (Week 1)
1. Update prompts with format context
2. Create format-specific generation guidelines
3. Test vertical vs horizontal layouts
4. Ensure proper text scaling for mobile

### Phase 3: Export Feature (Future)
1. "Create Stories Version" button
2. Batch convert all scenes
3. Create new project with converted content
4. Allow fine-tuning per format

## User Journey

### Creating for TikTok:
1. New Project → Select "Stories/Reels" format
2. AI generates all content optimized for 1080x1920
3. Preview shows vertical format
4. Export perfect for TikTok

### Need YouTube Version Later:
1. Complete TikTok project
2. Click "Export as YouTube Version"
3. New project created with horizontal layout
4. Fine-tune if needed
5. Export for YouTube

## Technical Implementation

### 1. Database Schema
```sql
ALTER TABLE projects 
ADD COLUMN format VARCHAR(20) DEFAULT 'youtube',
ADD COLUMN width INTEGER DEFAULT 1280,
ADD COLUMN height INTEGER DEFAULT 720;
```

### 2. Update PreviewPanelG
```typescript
// Line 634-635 - Replace hardcoded values
compositionWidth={project.width}
compositionHeight={project.height}
```

### 3. AI Context
```typescript
const formatContext = {
  format: project.format,
  width: project.width,
  height: project.height,
  isVertical: project.height > project.width,
  guidelines: getFormatGuidelines(project.format)
};
```

## Success Metrics
- [ ] Users can select format at project creation
- [ ] Preview displays correct dimensions
- [ ] AI generates format-appropriate content
- [ ] Exports match selected format
- [ ] No breaking changes to existing projects

## Conclusion

By keeping it simple, we deliver immediate value without overengineering. Users get format-specific videos, we maintain system simplicity, and we can always add more complex features if user demand justifies it.

**Start simple. Ship fast. Iterate based on feedback.**