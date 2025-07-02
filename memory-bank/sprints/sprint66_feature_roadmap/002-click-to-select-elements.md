# Feature 002: Click to Select Elements

**Feature ID**: 002  
**Priority**: HIGH  
**Complexity**: HIGH  
**Created**: January 2, 2025  

## Overview

Enable users to click on preview elements to select and edit them directly, providing an intuitive visual editing experience similar to design tools like Figma or Canva. This feature bridges the gap between visual preview and code editing, making the platform more accessible to non-technical users.

## Current State

- Preview panel displays video but is read-only
- Editing requires understanding and modifying code directly
- No visual indication of selectable elements
- Users must mentally map between visual elements and code structure
- Only way to edit is through chat prompts or code editor

## Problem Statement / User Need

Users struggle to identify which code corresponds to which visual element. They want to:
- Click on an element in the preview to select it
- See visual feedback (bounding box, handles) for selected elements
- Edit properties through a visual interface
- Avoid needing to understand React/TypeScript code
- Have a more intuitive, design-tool-like experience

Common user feedback:
- "How do I change just this text?"
- "Which part of the code controls this animation?"
- "Can I click on it to edit it?"

## Proposed Solution

Create an interactive preview system with element selection and property editing:

1. **Element Inspector Layer**: Overlay system that detects clickable elements
2. **Selection UI**: Visual bounding boxes and selection handles
3. **Property Panel**: Context-sensitive property editor for selected elements
4. **Code Bridge**: Two-way sync between visual selection and code editor
5. **Multi-select**: Support for selecting multiple elements

## Technical Implementation

### Phase 1: Element Detection System
```typescript
// Create element tracking in preview
interface SelectableElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'container';
  bounds: DOMRect;
  path: string[]; // Component tree path
  props: Record<string, any>;
  codeLocation: {
    file: string;
    line: number;
    column: number;
  };
}

// Inject data attributes during render
<div 
  data-selectable="true"
  data-element-id={elementId}
  data-element-type="text"
  onClick={handleElementClick}
>
  {content}
</div>
```

### Phase 2: Selection Overlay
```typescript
// Selection overlay component
const SelectionOverlay: React.FC = () => {
  const selectedElements = useSelectionStore();
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {selectedElements.map(element => (
        <SelectionBox
          key={element.id}
          bounds={element.bounds}
          onResize={handleResize}
          onMove={handleMove}
        />
      ))}
    </div>
  );
};

// Bounding box with handles
const SelectionBox = ({ bounds, onResize, onMove }) => {
  return (
    <>
      <div className="selection-outline" style={boundsToStyle(bounds)} />
      <ResizeHandles bounds={bounds} onResize={onResize} />
    </>
  );
};
```

### Phase 3: Property Panel Integration
```typescript
// Dynamic property editor based on element type
const PropertyPanel: React.FC<{ element: SelectableElement }> = ({ element }) => {
  switch (element.type) {
    case 'text':
      return <TextProperties element={element} />;
    case 'image':
      return <ImageProperties element={element} />;
    case 'shape':
      return <ShapeProperties element={element} />;
    default:
      return <GenericProperties element={element} />;
  }
};

// Example text property editor
const TextProperties = ({ element }) => {
  return (
    <div className="property-panel">
      <Input
        label="Text"
        value={element.props.children}
        onChange={(value) => updateElementProp(element.id, 'children', value)}
      />
      <ColorPicker
        label="Color"
        value={element.props.style?.color}
        onChange={(color) => updateElementStyle(element.id, 'color', color)}
      />
      <Select
        label="Font Size"
        value={element.props.style?.fontSize}
        options={['16px', '20px', '24px', '32px', '48px']}
        onChange={(size) => updateElementStyle(element.id, 'fontSize', size)}
      />
    </div>
  );
};
```

### Phase 4: AST Bridge for Code Updates
```typescript
// Bridge visual changes to code updates
import { parse, generate } from '@babel/core';

const updateElementInCode = async (
  elementId: string, 
  property: string, 
  value: any
) => {
  const scene = getCurrentScene();
  const ast = parse(scene.tsxCode);
  
  // Find element in AST by data-element-id
  const element = findElementById(ast, elementId);
  
  // Update property
  updateASTNode(element, property, value);
  
  // Generate updated code
  const updatedCode = generate(ast).code;
  
  // Update scene
  await updateScene(scene.id, { tsxCode: updatedCode });
};
```

### Phase 5: Advanced Features
- **Multi-select**: Cmd/Ctrl+click for multiple selection
- **Group operations**: Edit multiple elements simultaneously
- **Alignment tools**: Align, distribute selected elements
- **Layer management**: Z-index control through visual interface
- **Animation preview**: Scrub through animations for selected elements

## Success Metrics

1. **Adoption Rate**: 60% of users use click-to-select within first session
2. **Code Editor Usage**: 50% reduction in direct code editor usage
3. **Task Completion**: 40% faster element editing tasks
4. **User Satisfaction**: Increase NPS score by 15 points
5. **Support Tickets**: 30% reduction in "how to edit" questions

## Future Enhancements

1. **Drag-and-drop**: Move elements by dragging in preview
2. **Component library**: Drag components from sidebar to preview
3. **Responsive design**: Visual breakpoint editing
4. **Animation timeline**: Visual keyframe editor for selected elements
5. **Collaborative editing**: Real-time multi-user selection and editing
6. **AI-assisted editing**: "Make this bigger" on selected element
7. **Component extraction**: Select elements and create reusable component

## Implementation Timeline

- **Week 1**: Element detection and basic selection UI
- **Week 2**: Property panel and code bridge
- **Week 3**: Multi-select and advanced editing features
- **Week 4**: Polish, testing, and performance optimization
- **Week 5**: User testing and iteration

## Dependencies

- React DevTools API for element inspection
- AST parsing library (@babel/core)
- State management for selection (Zustand)
- Preview panel refactoring for interactivity

## Risks and Mitigations

1. **Performance**: Element tracking might slow preview
   - Mitigation: Use React Fiber for efficient updates
2. **Code sync complexity**: Keeping visual and code in sync
   - Mitigation: Single source of truth in AST
3. **Learning curve**: New UI paradigm for users
   - Mitigation: Progressive disclosure, good onboarding

## Related Features

- Timeline UI (visual scene management)
- Multi-scene selection (batch operations)
- Typography Agent (smart text editing)