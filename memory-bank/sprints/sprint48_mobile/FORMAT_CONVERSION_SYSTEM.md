# Format Conversion System Design

## Core Concept
- Each scene has a **primary format** (default: YouTube 1280x720)
- Users can switch formats via dropdown in preview panel
- AI automatically converts scenes to new format on-demand
- All format versions are saved and linked

## User Experience Flow

1. **Default Creation** (current behavior)
   - User creates scene in YouTube format (1280x720)
   - Scene saved as normal: `scene_abc123.js`

2. **Format Switching**
   - Dropdown in preview panel shows: [YouTube ✓] [Stories] [Square]
   - User clicks "Stories"
   - System auto-sends to AI: "Convert this scene to Stories format (1080x1920)"
   - AI rewrites layout for vertical format
   - New version saved as: `scene_abc123_stories.js`

3. **Smart Version Management**
   ```typescript
   // Scene file structure
   scenes/
   ├── scene_abc123.js         // Primary (youtube format)
   ├── scene_abc123_stories.js  // Stories version
   └── scene_abc123_square.js   // Square version
   ```

## Technical Implementation

### 1. Format Dropdown Component
```typescript
// In PreviewPanelG.tsx
const FormatSelector = ({ currentScene, onFormatChange }) => {
  const formats = [
    { id: 'youtube', label: 'YouTube', width: 1280, height: 720 },
    { id: 'stories', label: 'Stories', width: 1080, height: 1920 },
    { id: 'square', label: 'Square', width: 1080, height: 1080 }
  ];
  
  return (
    <Select onValueChange={onFormatChange}>
      {formats.map(format => (
        <SelectItem key={format.id} value={format.id}>
          {format.label} ({format.width}x{format.height})
        </SelectItem>
      ))}
    </Select>
  );
};
```

### 2. Format Conversion Prompt
```typescript
const FORMAT_CONVERTER = {
  role: 'system',
  content: `You are an expert at converting React/Remotion scenes between different video formats.

TASK: Convert the provided scene to ${targetFormat} format (${width}x${height}).

CONVERSION RULES:
- Preserve ALL animations and functionality
- Adapt layout for new aspect ratio
- Adjust element sizes and positions appropriately

For STORIES (1080x1920 vertical):
- Stack elements vertically
- Increase text sizes by 1.5-2x for mobile readability
- Use full height, center horizontally
- Move side-by-side elements to top/bottom arrangement

For SQUARE (1080x1080):
- Center all content
- Reduce spacing between elements
- Keep important content within center 80%
- Balance layout symmetrically

For YOUTUBE (1280x720 horizontal):
- Spread elements horizontally
- Use multi-column layouts where appropriate
- Standard desktop-readable text sizes

CRITICAL: Return ONLY the converted code with proper destructuring:
const { width, height } = useVideoConfig();
`
};
```

### 3. Scene Version Management
```typescript
interface SceneVersions {
  primary: string;        // Original format
  youtube?: string;       // YouTube version code
  stories?: string;       // Stories version code  
  square?: string;        // Square version code
  primaryFormat: 'youtube' | 'stories' | 'square';
}

// In scene metadata
const sceneData = {
  id: 'scene_abc123',
  versions: {
    primary: 'youtube',
    youtube: 's3://bucket/scene_abc123.js',
    stories: 's3://bucket/scene_abc123_stories.js',
    square: null  // Not generated yet
  }
};
```

### 4. Auto-Conversion Flow
```typescript
const handleFormatChange = async (newFormat: string) => {
  // Check if version exists
  if (scene.versions[newFormat]) {
    // Load existing version
    loadScene(scene.versions[newFormat]);
  } else {
    // Generate new version
    const currentCode = await loadScene(scene.versions.primary);
    const convertedCode = await convertSceneFormat(currentCode, newFormat);
    
    // Save new version
    const filename = `${scene.id}_${newFormat}.js`;
    await saveScene(filename, convertedCode);
    
    // Update metadata
    scene.versions[newFormat] = filename;
  }
  
  // Update preview
  setCurrentFormat(newFormat);
};
```

### 5. Edit Synchronization
When user edits a scene:
- Edit applies to current format version
- Option to "Apply to all formats" (regenerates other versions)
- Or keep formats independent for custom tweaks

## Benefits

1. **Backward Compatible** - Existing scenes work unchanged
2. **On-Demand** - Only generate formats users need
3. **Flexible** - Can customize each format independently
4. **Smart Storage** - Reuse existing versions
5. **Fast Switching** - Instant preview of different formats

## Database Schema Update
```sql
-- Add to scenes table
ALTER TABLE scenes ADD COLUMN format_versions JSONB DEFAULT '{"primary": "youtube"}';

-- Example data
{
  "primary": "youtube",
  "primaryUrl": "s3://scene_abc123.js",
  "versions": {
    "youtube": "s3://scene_abc123.js",
    "stories": "s3://scene_abc123_stories.js",
    "square": null
  }
}
```

## Implementation Steps

1. **Phase 1: Preview Format Switching**
   - Add format dropdown to preview panel
   - Change player dimensions dynamically
   - No conversion yet, just preview size

2. **Phase 2: AI Conversion**
   - Implement format conversion prompt
   - Test conversions between formats
   - Handle conversion errors gracefully

3. **Phase 3: Version Management**  
   - Save multiple versions
   - Track in database
   - Load correct version on format switch

4. **Phase 4: Edit Sync**
   - Handle edits per format
   - Option to sync changes across formats
   - Smart regeneration

## Example Conversion

**Original YouTube (1280x720):**
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <h1 style={{ fontSize: '48px' }}>Title</h1>
  <img src="..." style={{ width: '400px' }} />
</div>
```

**Converted to Stories (1080x1920):**
```jsx
<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
  <h1 style={{ fontSize: '72px', marginBottom: '40px' }}>Title</h1>
  <img src="..." style={{ width: '80%' }} />
</div>
```

This system provides maximum flexibility while keeping the current workflow intact!