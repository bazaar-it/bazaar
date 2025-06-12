# Modular Scene Service Architecture

## Overview
A clean, modular architecture that provides a simple 3-method interface while maintaining single responsibility for each service.

## Architecture

```
src/server/services/scene/
├── scene.service.ts              # Coordinator (3 public methods)
├── add/                          # Add scene services
│   ├── LayoutGenerator.ts        # Prompt → JSON layout
│   ├── CodeGenerator.ts          # JSON → TSX code
│   └── ImageToCodeGenerator.ts   # Image → TSX code
├── edit/                         # Edit scene services  
│   ├── BaseEditor.ts             # Shared logic for editors
│   ├── SurgicalEditor.ts         # Minimal targeted changes
│   ├── CreativeEditor.ts         # Bigger changes (visual or structural)
│   └── ErrorFixer.ts             # Fix broken scenes
└── delete/                       # Delete scene services
    └── SceneDeleter.ts           # Handle deletions
```

## Key Benefits

### 1. Simple Public Interface
```typescript
class SceneService {
  addScene()    // Create scenes
  editScene()   // Edit scenes
  deleteScene() // Delete scenes
}
```

### 2. Single Responsibility
- Each service does ONE thing well
- No mixed concerns (unlike old CodeGeneratorService)
- Clear, focused classes

### 3. Standardized I/O
- All services return `StandardApiResponse`
- All use exact DB field names (`tsxCode`, not `code`)
- Zero transformations needed

### 4. Modular & Testable
- Easy to mock individual services
- Clear dependencies
- Isolated functionality

## Service Responsibilities

### Add Services
1. **LayoutGenerator**: Converts prompts to structured JSON layouts
2. **CodeGenerator**: Converts JSON layouts to React/Remotion code
3. **ImageToCodeGenerator**: Direct image-to-code generation

### Edit Services
1. **SurgicalEditor**: Minimal, targeted changes (+ duration updates) - supports images
2. **CreativeEditor**: Bigger changes (visual, structural, creative) - supports images
3. **ErrorFixer**: Fix syntax/runtime errors with specialized prompt
4. **BaseEditor**: Shared logic for handling both text and image-based edits

### Delete Service
1. **SceneDeleter**: Simple database deletion

## Data Flow Example

### Adding a Scene from Text:
```
User Input → SceneService.addScene() 
  → LayoutGenerator.generateLayout() 
  → CodeGenerator.generateFromLayout()
  → Database
  → StandardApiResponse
```

### Editing a Scene:
```
User Input → SceneService.editScene()
  → Route by editType
  → SurgicalEditor.edit() (or other editor)
  → Database Update
  → StandardApiResponse
```

## Models & Prompts Used

Each service uses specific models and prompts:
- LayoutGenerator: `layoutGenerator` model + `layout-generator` prompt
- CodeGenerator: `codeGenerator` model + `code-generator` prompt
- SurgicalEditor: `directCodeEditor.surgical` model + `direct-code-editor-surgical` prompt
- ErrorFixer: `fixBrokenScene` model + `fix-broken-scene` prompt
- etc.

## Migration from Old Architecture

### Before:
- 13 services with mixed responsibilities
- CodeGeneratorService did both creation AND editing
- Complex routing between services
- Field name transformations everywhere

### After:
- 1 coordinator + 11 focused services
- Each service has single responsibility
- Simple routing in coordinator
- Zero transformations (all use DB field names)

## Testing Strategy

```typescript
// Easy to test each service independently
describe('SurgicalEditor', () => {
  it('makes minimal changes', async () => {
    const mockScene = { tsxCode: '...', name: 'Test' };
    const result = await surgicalEditor.edit({
      scene: mockScene,
      prompt: 'Change color to red'
    });
    expect(result.data.scene.tsxCode).toContain('red');
  });
});
```

## Future Extensibility

Adding new edit types is simple:
1. Create new editor in `edit/` folder
2. Add to SceneService routing
3. Add edit type to enum

No changes needed to tools or frontend!