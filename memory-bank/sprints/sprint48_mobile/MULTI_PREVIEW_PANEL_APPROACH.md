# Multi-Preview Panel with Tagged Scenes

## Brilliant Concept: Multiple Preview Panels, Same Project

### Core Idea
- Keep single project with shared chat/context
- Add format selector in current preview panel
- When switching formats, spawn new preview panel
- Each panel shows only scenes tagged for its format
- Scenes exist in multiple versions with format tags

## Architecture Design

### 1. Scene Tagging System
```typescript
interface Scene {
  id: string;
  code: string;
  format: 'youtube' | 'stories' | 'square';  // Tag for format
  baseSceneId?: string;  // Links to original scene if converted
  // ... other fields
}

// Example scenes in VideoState
scenes: [
  { id: 'scene_1', code: '...', format: 'youtube' },
  { id: 'scene_1_stories', code: '...', format: 'stories', baseSceneId: 'scene_1' },
  { id: 'scene_2', code: '...', format: 'youtube' },
  { id: 'scene_2_stories', code: '...', format: 'stories', baseSceneId: 'scene_2' }
]
```

### 2. Preview Panel Filtering
```typescript
// Each preview panel subscribes to filtered scenes
const PreviewPanelG = ({ format }: { format: 'youtube' | 'stories' | 'square' }) => {
  const allScenes = useVideoState();
  
  // Only show scenes matching this panel's format
  const filteredScenes = allScenes.filter(scene => scene.format === format);
  
  return (
    <Player
      scenes={filteredScenes}
      compositionWidth={FORMAT_DIMENSIONS[format].width}
      compositionHeight={FORMAT_DIMENSIONS[format].height}
    />
  );
};
```

### 3. Format Switcher UI
```typescript
// In main preview panel header
const FormatSwitcher = () => {
  const [activePanels, setActivePanels] = useState(['youtube']);
  
  const handleFormatChange = (newFormat: string) => {
    if (!activePanels.includes(newFormat)) {
      // Spawn new preview panel
      setActivePanels([...activePanels, newFormat]);
      
      // Auto-suggest conversion
      showConversionPrompt(newFormat);
    }
  };
  
  return (
    <Select onValueChange={handleFormatChange}>
      <SelectItem value="youtube">YouTube View</SelectItem>
      <SelectItem value="stories">Stories View (+)</SelectItem>
      <SelectItem value="square">Square View (+)</SelectItem>
    </Select>
  );
};
```

### 4. Auto-Conversion Flow
```typescript
// When user switches to new format
const showConversionPrompt = (targetFormat: string) => {
  const unconvertedScenes = scenes.filter(s => 
    s.format === 'youtube' && 
    !scenes.find(conv => conv.baseSceneId === s.id && conv.format === targetFormat)
  );
  
  if (unconvertedScenes.length > 0) {
    // Show prompt in chat
    addSystemMessage({
      content: `Found ${unconvertedScenes.length} scenes to convert to ${targetFormat} format. 
                Would you like me to adapt them for ${targetFormat}?`,
      actions: [
        { label: 'Convert All', action: () => convertScenes(unconvertedScenes, targetFormat) },
        { label: 'Skip', action: () => {} }
      ]
    });
  }
};
```

### 5. Conversion Service
```typescript
// Dedicated LLM for format conversion
const convertSceneFormat = async (scene: Scene, targetFormat: string) => {
  const prompt = `Convert this ${scene.format} scene to ${targetFormat} format.
    
  Original dimensions: ${FORMAT_DIMENSIONS[scene.format].width}x${FORMAT_DIMENSIONS[scene.format].height}
  Target dimensions: ${FORMAT_DIMENSIONS[targetFormat].width}x${FORMAT_DIMENSIONS[targetFormat].height}
  
  ${getFormatConversionRules(scene.format, targetFormat)}
  
  Original code:
  ${scene.code}`;
  
  const convertedCode = await llm.convert(prompt);
  
  return {
    id: `${scene.id}_${targetFormat}`,
    code: convertedCode,
    format: targetFormat,
    baseSceneId: scene.id
  };
};
```

### 6. Workspace Layout
```
┌─────────────────────────────────────────────────┐
│ Chat Panel                                       │
│ (Shared context for all formats)                 │
├─────────────────┬───────────────┬───────────────┤
│ YouTube Preview │ Stories Preview│ Square Preview│
│   1280x720      │   1080x1920   │   1080x1080   │
│                 │                │                │
│ [Scene 1]       │ [Scene 1 📱]  │ [Scene 1 ⬜]  │
│ [Scene 2]       │ [Scene 2 📱]  │ [Scene 2 ⬜]  │
│ [Scene 3]       │ [Converting...] │ [Not converted]│
└─────────────────┴───────────────┴───────────────┘
```

## Implementation Benefits

1. **Shared Context** - One chat, one project, multiple outputs
2. **Visual Comparison** - See all formats side by side
3. **Lazy Conversion** - Only convert what's needed
4. **Format Independence** - Edit each format separately if needed
5. **Smart Sync** - Option to propagate edits across formats

## VideoState Management

```typescript
interface VideoState {
  scenes: Scene[];  // All scenes, all formats
  
  // Helper methods
  getScenesForFormat: (format: string) => Scene[];
  getBaseScene: (sceneId: string) => Scene | null;
  getConvertedVersions: (baseSceneId: string) => Scene[];
}

// Usage in preview panels
const storiesScenes = videoState.getScenesForFormat('stories');
```

## User Workflow

1. **Create video normally** (YouTube format by default)
2. **Want Stories version?** → Select from dropdown
3. **New panel appears** → "Convert scenes for Stories?"
4. **Auto-conversion runs** → See both versions
5. **Edit in either panel** → Changes independent
6. **Export either/both** → Get files for each platform

## Database Schema Update

```sql
-- Add format tag to scenes
ALTER TABLE scenes ADD COLUMN format VARCHAR(20) DEFAULT 'youtube';
ALTER TABLE scenes ADD COLUMN base_scene_id UUID REFERENCES scenes(id);

-- Index for fast format filtering
CREATE INDEX idx_scenes_format ON scenes(project_id, format);
```

## Advantages Over Single Format

- **Flexibility** - Work on multiple platforms in one project
- **Context Preservation** - Keep all chat history
- **Visual Comparison** - See how content adapts
- **Iterative Refinement** - Tweak each format perfectly
- **Single Source** - One project, multiple outputs

This approach gives maximum flexibility while maintaining project coherence!