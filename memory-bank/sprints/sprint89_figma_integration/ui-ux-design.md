# UI/UX Design: Figma Integration

## User Flow

### 1. Connection Flow
```
User clicks "Connect Figma" 
    ↓
OAuth redirect (or PAT input)
    ↓
Permission grant
    ↓
Return to Bazaar
    ↓
Show connected status
    ↓
Auto-open Figma panel
```

### 2. Discovery Flow
```
Figma panel opens
    ↓
Shows teams/projects/files hierarchy
    ↓
User selects a file
    ↓
System indexes in background
    ↓
Components appear in categories
    ↓
User can search/filter
```

### 3. Animation Flow
```
User sees component card
    ↓
Hovers to see preview
    ↓
Drags component
    ↓
Drops in chat input
    ↓
Message auto-fills: "Animate [ComponentName] from Figma"
    ↓
User can add details or just send
    ↓
Animation generates
```

## Panel Design

### FigmaDiscoveryPanel Layout

```
┌─────────────────────────────────────────┐
│ 🎨 Figma Designs          [Disconnect] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 📁 Select File                      │ │
│ │ ▼ My Team                          │ │
│ │   ▼ Website Redesign               │ │
│ │     • Landing Page v3              │ │
│ │     • Component Library ✓          │ │
│ │     • Mobile Designs               │ │
│ │   ▶ Marketing Materials            │ │
│ │ ▶ Another Team                     │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 🔍 Search components...                  │
├─────────────────────────────────────────┤
│ ◉ All  ○ Core  ○ Auth  ○ Commerce      │
├─────────────────────────────────────────┤
│ 🔐 Authentication (3)                    │
│ ┌──────┐ ┌──────┐ ┌──────┐            │
│ │      │ │      │ │      │            │
│ │Login │ │SignUp│ │Forgot│            │
│ │  📐  │ │  📐  │ │  📐  │            │
│ └──────┘ └──────┘ └──────┘            │
│                                         │
│ 🏗️ Core Components (5)                  │
│ ┌──────┐ ┌──────┐ ┌──────┐            │
│ │Header│ │Nav   │ │Footer│            │
│ │  📐  │ │  📐  │ │  📐  │            │
│ └──────┘ └──────┘ └──────┘            │
│ [Load More...]                          │
│                                         │
│ 💳 Commerce (2)                         │
│ ┌──────┐ ┌──────┐                     │
│ │Price │ │Check │                     │
│ │Card  │ │out   │                     │
│ │  📐  │ │  📐  │                     │
│ └──────┘ └──────┘                     │
│                                         │
│ [Indexing... 47%] ████████░░░░         │
└─────────────────────────────────────────┘

💡 Drag any design to chat to animate it
```

### Component Card Design

```
┌─────────────────┐
│   [Thumbnail]   │  ← Actual Figma preview
│                 │     (PNG from export API)
├─────────────────┤
│ LoginForm       │  ← Component name
│ Auth • Frame    │  ← Category • Type
│ 1920×1080       │  ← Dimensions
└─────────────────┘
     ↑
 Draggable element
```

### Hover State
```
┌─────────────────┐
│   [Preview]     │  ← Larger preview
│                 │
│ • 12 layers     │
│ • 3 text blocks │
│ • 2 buttons     │
│                 │
│ [Drag to chat]  │  ← Hint text
└─────────────────┘
```

## Visual States

### 1. Not Connected
```
┌─────────────────────────────────────────┐
│ 🎨 Connect Figma                        │
├─────────────────────────────────────────┤
│                                         │
│     Connect your Figma account to      │
│     import and animate designs         │
│                                         │
│        [Connect with Figma]            │
│                                         │
│     Or use a Personal Access Token:    │
│        [________________]              │
│        [Connect with PAT]              │
│                                         │
└─────────────────────────────────────────┘
```

### 2. Loading/Indexing
```
┌─────────────────────────────────────────┐
│ 🎨 Figma Designs                        │
├─────────────────────────────────────────┤
│                                         │
│     Discovering components...          │
│                                         │
│     ████████████░░░░░░ 67%            │
│                                         │
│     Found: 42 components               │
│     Categorizing designs...            │
│                                         │
└─────────────────────────────────────────┘
```

### 3. Empty State
```
┌─────────────────────────────────────────┐
│ 🎨 Figma Designs                        │
├─────────────────────────────────────────┤
│                                         │
│     No components found                │
│                                         │
│     Select a different file or         │
│     check that your file contains      │
│     frames or components                │
│                                         │
│     [Select Another File]              │
│                                         │
└─────────────────────────────────────────┘
```

### 4. Error State
```
┌─────────────────────────────────────────┐
│ 🎨 Figma Designs                        │
├─────────────────────────────────────────┤
│                                         │
│     ⚠️ Unable to access file           │
│                                         │
│     Check your permissions or          │
│     try reconnecting                   │
│                                         │
│     [Reconnect] [Try Another File]     │
│                                         │
└─────────────────────────────────────────┘
```

## Interaction Patterns

### Drag & Drop
```typescript
// Component card behavior
<ComponentCard
  draggable
  onDragStart={(e) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'figma-component',
      fileKey: component.fileKey,
      nodeId: component.nodeId,
      name: component.name,
      thumbnailUrl: component.thumbnailUrl
    }));
    
    // Visual feedback
    setDragging(true);
  }}
  onDragEnd={() => setDragging(false)}
/>

// Chat input behavior
<ChatInput
  onDragOver={(e) => {
    if (e.dataTransfer.types.includes('application/json')) {
      e.preventDefault();
      setDropTarget(true);
    }
  }}
  onDrop={(e) => {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data.type === 'figma-component') {
      setMessage(`Animate ${data.name} from Figma`);
      setContext({ figma: data });
    }
    setDropTarget(false);
  }}
/>
```

### File Selection UI
```tsx
const FileSelector = () => {
  return (
    <div className="file-tree">
      {teams.map(team => (
        <TreeNode key={team.id} defaultExpanded>
          <TeamIcon /> {team.name}
          {team.projects.map(project => (
            <TreeNode key={project.id}>
              <ProjectIcon /> {project.name}
              {project.files.map(file => (
                <TreeLeaf
                  key={file.key}
                  selected={selectedFile === file.key}
                  onClick={() => selectFile(file.key)}
                >
                  <FileIcon /> {file.name}
                  {file.isIndexed && <CheckIcon />}
                </TreeLeaf>
              ))}
            </TreeNode>
          ))}
        </TreeNode>
      ))}
    </div>
  );
};
```

### Category Filter
```tsx
const CategoryFilter = () => {
  const categories = ['All', 'Core', 'Auth', 'Commerce', 'Interactive', 'Content'];
  
  return (
    <div className="flex gap-2">
      {categories.map(cat => (
        <button
          key={cat}
          className={cn(
            "px-3 py-1 rounded-full text-sm",
            selectedCategory === cat 
              ? "bg-blue-500 text-white" 
              : "bg-gray-100 hover:bg-gray-200"
          )}
          onClick={() => setSelectedCategory(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
};
```

## Responsive Behavior

### Desktop (Default)
- Full panel width with 3-column grid
- Thumbnails at 160x120px
- File tree fully expanded

### Tablet
- 2-column grid
- Thumbnails at 140x105px
- File tree collapsed by default

### Mobile
- Single column
- Thumbnails at full width
- Swipeable categories
- Bottom sheet pattern

## Animation & Feedback

### Loading States
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-card {
  animation: pulse 2s infinite;
  background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Drag Feedback
```css
.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.drop-target {
  border: 2px dashed #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

.drag-preview {
  position: fixed;
  pointer-events: none;
  z-index: 1000;
  transform: rotate(2deg);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}
```

### Success Animation
```css
@keyframes success-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.import-success {
  animation: success-pulse 0.3s ease;
  border-color: #10b981;
}
```

## Accessibility

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to select files
- Arrow keys to navigate tree
- Escape to close panel

### Screen Reader Support
```tsx
<div
  role="tree"
  aria-label="Figma file browser"
  aria-multiselectable="false"
>
  <div
    role="treeitem"
    aria-expanded={expanded}
    aria-selected={selected}
    aria-level={level}
  >
    {file.name}
  </div>
</div>

<div
  role="grid"
  aria-label="Figma components"
>
  <div
    role="gridcell"
    draggable
    aria-grabbed={dragging}
    aria-label={`${component.name} component, ${component.category} category`}
  >
    {/* Component card */}
  </div>
</div>
```

### Focus Management
```tsx
// Auto-focus search on panel open
useEffect(() => {
  if (isPanelOpen) {
    searchInputRef.current?.focus();
  }
}, [isPanelOpen]);

// Trap focus in modal
useFocusTrap(panelRef, isPanelOpen);
```

## Performance Considerations

### Virtual Scrolling
```tsx
// For large component lists
import { FixedSizeGrid } from 'react-window';

<FixedSizeGrid
  columnCount={3}
  rowCount={Math.ceil(components.length / 3)}
  columnWidth={160}
  rowHeight={140}
  height={600}
  width={500}
>
  {ComponentCard}
</FixedSizeGrid>
```

### Image Optimization
```tsx
// Lazy load thumbnails
<img
  loading="lazy"
  src={component.thumbnailUrl}
  srcSet={`
    ${component.thumbnailUrl}?w=160 1x,
    ${component.thumbnailUrl}?w=320 2x
  `}
  alt={component.name}
/>
```

### Debounced Search
```tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    filterComponents(debouncedSearch);
  }
}, [debouncedSearch]);
```

## Integration Points

### With Existing Panels
- Add to panel registry
- Follow same open/close patterns
- Share sidebar space
- Consistent styling

### With Chat System
- Reuse drag-drop handlers
- Extend message context type
- Add Figma-specific rendering

### With Preview
- Show "Importing from Figma..." state
- Display source attribution
- Link back to original design

---

This UI/UX design ensures a smooth, intuitive experience for importing Figma designs while maintaining consistency with the existing Bazaar-Vid interface.