# Revised Approach: Format Consistency

## The Problem
- A video project has multiple scenes
- All scenes MUST have the same dimensions
- Can't mix 1280x720 with 1080x1920 in one video
- VideoState tracks all scenes for a single video

## Solution: Project-Level Format Selection

### Option 1: Format at Project Creation (Recommended)
```typescript
// When creating a new project
interface ProjectCreation {
  name: string;
  format: 'youtube' | 'stories' | 'square';  // Choose once
  // This determines dimensions for ALL scenes
}
```

**Workflow:**
1. User creates project and selects format (e.g., "Stories")
2. ALL scenes in that project are 1080x1920
3. AI generates all content for that format
4. Preview always shows selected format
5. Can't change format after project creation

### Option 2: Duplicate Project for Different Format
```typescript
// "Export to Different Format" feature
async function exportToFormat(projectId: string, newFormat: string) {
  // 1. Create new project with new format
  const newProject = await createProject({
    name: `${originalProject.name} (${newFormat})`,
    format: newFormat
  });
  
  // 2. Convert all scenes to new format
  for (const scene of originalScenes) {
    const convertedCode = await convertSceneToFormat(scene.code, newFormat);
    await addSceneToProject(newProject.id, convertedCode);
  }
  
  return newProject;
}
```

**Workflow:**
1. User completes video in YouTube format
2. Clicks "Create Stories Version"
3. System duplicates project with new format
4. All scenes auto-converted to vertical
5. User has two separate projects

### Option 3: Format Templates per Scene Type
```typescript
// Scenes could have format-aware templates
const SCENE_TEMPLATES = {
  'intro': {
    youtube: 'intro_youtube_template',
    stories: 'intro_stories_template',
    square: 'intro_square_template'
  },
  'outro': {
    youtube: 'outro_youtube_template',
    stories: 'outro_stories_template',
    square: 'outro_square_template'
  }
};
```

## Recommended Implementation

### 1. Add Format to Project Level
```typescript
// Database schema
interface Project {
  id: string;
  name: string;
  format: 'youtube' | 'stories' | 'square';
  width: number;   // Set based on format
  height: number;  // Set based on format
  // ... other fields
}
```

### 2. Project Creation UI
```tsx
<RadioGroup value={format} onValueChange={setFormat}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="youtube" id="youtube" />
    <Label htmlFor="youtube">
      YouTube / Landscape (1280×720)
      <span className="text-muted">Best for desktop viewing</span>
    </Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="stories" id="stories" />
    <Label htmlFor="stories">
      Stories / Reels (1080×1920)
      <span className="text-muted">Vertical for mobile platforms</span>
    </Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="square" id="square" />
    <Label htmlFor="square">
      Square Post (1080×1080)
      <span className="text-muted">Instagram feed posts</span>
    </Label>
  </div>
</RadioGroup>
```

### 3. Update VideoState Context
```typescript
// Pass project format to all components
const videoStateContext = {
  ...existingState,
  format: project.format,
  width: project.width,
  height: project.height
};
```

### 4. AI Generation Context
```typescript
// When generating any scene
const aiContext = {
  projectFormat: project.format,
  dimensions: `${project.width}x${project.height}`,
  formatGuidelines: getFormatGuidelines(project.format)
};
```

## Benefits of Project-Level Format

1. **Consistency** - All scenes match, video renders correctly
2. **Clarity** - Users understand they're making a Stories video
3. **AI Optimization** - Every scene generated for chosen format
4. **No Confusion** - Can't accidentally mix formats

## Future Enhancement: Cross-Format Export

Once a project is complete, offer:
```
"Export this video in different format"
- Creates new project
- Converts all scenes
- Preserves original
- Allows platform-specific versions
```

## Migration Path

1. Add format field to projects table (default: 'youtube')
2. Update project creation flow
3. Pass format to AI generation
4. Update preview to use project dimensions
5. Later: Add cross-format export feature

This maintains video integrity while still supporting multiple formats!