# Sprint 99: UI Consistency Fix Guide

This document provides specific fixes for the UI consistency issues found across the workspace components.

## 🎨 Design System Implementation

### 1. Create Design Tokens

**File**: `/src/styles/design-tokens.ts` (NEW FILE)

```typescript
export const designTokens = {
  // Spacing system (use multiples of 4)
  spacing: {
    xs: '4px',    // 0.25rem
    sm: '8px',    // 0.5rem
    md: '12px',   // 0.75rem
    lg: '16px',   // 1rem
    xl: '20px',   // 1.25rem
    '2xl': '24px', // 1.5rem
    '3xl': '32px', // 2rem
    '4xl': '48px', // 3rem
  },
  
  // Border radius system
  borderRadius: {
    none: '0',
    sm: '4px',     // Small elements
    md: '8px',     // Buttons, inputs
    lg: '12px',    // Cards, panels
    xl: '16px',    // Modals
    full: '9999px', // Pills, avatars
  },
  
  // Consistent shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  
  // Animation durations
  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },
} as const;

// Tailwind config helper
export const tw = {
  panel: 'rounded-lg shadow-md', // 12px radius, medium shadow
  button: 'rounded-md px-4 py-2 transition-colors duration-250',
  input: 'rounded-md border border-gray-300 px-3 py-2',
  card: 'rounded-lg bg-white p-4 shadow-sm',
};
```

### 2. Fix Border Radius Inconsistencies

**Update all components to use consistent border radius:**

```typescript
// ❌ BEFORE - Inconsistent
<div className="rounded-[15px]">
<button className="rounded-lg">
<div style={{ borderRadius: '10px' }}>

// ✅ AFTER - Consistent
import { tw } from '@/styles/design-tokens';

<div className={tw.panel}>
<button className={tw.button}>
<div className="rounded-lg"> // 12px
```

### 3. Standardize Spacing

**Replace random padding/margin values:**

```typescript
// ❌ BEFORE - Random values
<div className="p-2.5 m-3">
<div style={{ padding: '14px', margin: '18px' }}>

// ✅ AFTER - System values
<div className="p-2 m-3"> // 8px padding, 12px margin
<div className="p-3 m-4"> // 12px padding, 16px margin
```

### 4. Component-Specific Fixes

**ChatPanelG.tsx** - Standardize message spacing:
```typescript
// Update message container
<div className="space-y-4"> {/* Changed from space-y-6 */}
  {messages.map((message) => (
    <ChatMessage
      className="p-4 rounded-lg" {/* Consistent padding and radius */}
    />
  ))}
</div>
```

**WorkspaceContentAreaG.tsx** - Fix panel borders:
```typescript
// Update panel wrapper
<div className="rounded-lg border border-gray-200 bg-white shadow-sm">
  {/* Panel content */}
</div>
```

**PreviewPanelG.tsx** - Consistent header:
```typescript
// Update header styling
<div className="flex items-center justify-between p-4 border-b border-gray-200">
  <h2 className="text-lg font-semibold">Preview</h2>
  {/* Controls */}
</div>
```

## 🎯 Accessibility Fixes

### 1. Add ARIA Labels

**Drag Handles**:
```typescript
<div
  className="drag-handle"
  role="button"
  aria-label="Drag to reorder panel"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Start drag with keyboard
    }
  }}
>
  <GripVertical />
</div>
```

**Panel Close Buttons**:
```typescript
<button
  onClick={onClose}
  aria-label="Close panel"
  className="p-1 rounded hover:bg-gray-100"
>
  <X className="w-4 h-4" aria-hidden="true" />
</button>
```

**Modal Dialogs**:
```typescript
<Dialog
  role="dialog"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
  aria-modal="true"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Modal content...</p>
</Dialog>
```

### 2. Fix Focus Management

**Add Focus Trap Hook**:
```typescript
// hooks/use-focus-trap.ts
export function useFocusTrap(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleTab);
    };
  }, [ref]);
}
```

### 3. Fix Contrast Issues

**Update Text Colors**:
```typescript
// ❌ BEFORE - Poor contrast
<p className="text-gray-400">Important text</p>
<span className="text-red-400">Error message</span>

// ✅ AFTER - WCAG AA compliant
<p className="text-gray-600">Important text</p>
<span className="text-red-600 font-medium">Error message</span>
```

**Update Hover States**:
```typescript
// ❌ BEFORE - Barely visible
<button className="hover:bg-gray-50">

// ✅ AFTER - Clear hover state
<button className="hover:bg-gray-100 hover:shadow-sm transition-all">
```

## 🔧 Component Refactoring

### Split WorkspaceContentAreaG

**Current**: 867 lines of mixed concerns  
**Target**: 4-5 focused components

**1. ExtractDragDropProvider.tsx**:
```typescript
export const DragDropProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Move all drag-drop logic here
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPanel, setDraggedPanel] = useState<string | null>(null);
  
  const value = {
    isDragging,
    setIsDragging,
    draggedPanel,
    setDraggedPanel,
    // ... other drag-drop state and methods
  };
  
  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
};
```

**2. PanelManager.tsx**:
```typescript
export const PanelManager: React.FC<PanelManagerProps> = ({ 
  openPanels,
  onPanelAdd,
  onPanelRemove,
  onPanelReorder 
}) => {
  // Panel management logic only
  return (
    <PanelGroup direction="horizontal">
      {openPanels.map((panel) => (
        <PanelContainer key={panel.id} panel={panel} />
      ))}
    </PanelGroup>
  );
};
```

**3. WorkspaceSidebar.tsx**:
```typescript
export const WorkspaceSidebar: React.FC = () => {
  // Sidebar logic only
  return (
    <div className="w-16 bg-gray-50 border-r border-gray-200">
      {/* Sidebar items */}
    </div>
  );
};
```

**4. WorkspaceLayout.tsx**:
```typescript
export const WorkspaceLayout: React.FC = ({ children }) => {
  // Layout structure only
  return (
    <div className="flex h-screen">
      <WorkspaceSidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};
```

## 📐 CSS Consolidation Strategy

### 1. Remove Inline Styles

```typescript
// ❌ BEFORE
<div style={{ 
  width: '100%', 
  padding: '10px',
  backgroundColor: '#f5f5f5' 
}}>

// ✅ AFTER
<div className="w-full p-2.5 bg-gray-100">
```

### 2. Create Utility Classes

```css
/* styles/utilities.css */
.panel-base {
  @apply rounded-lg bg-white shadow-sm border border-gray-200;
}

.button-base {
  @apply rounded-md px-4 py-2 font-medium transition-colors duration-250;
}

.input-base {
  @apply rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500;
}
```

### 3. Component-Specific Styles

```typescript
// Use CSS Modules for complex components
// styles/ChatPanel.module.css
.container {
  @apply flex flex-col h-full;
}

.messageList {
  @apply flex-1 overflow-y-auto p-4 space-y-4;
}

.inputArea {
  @apply border-t border-gray-200 p-4;
}
```

## ✅ Verification Checklist

After implementing fixes:

- [ ] All panels use 12px border radius
- [ ] All buttons use 8px border radius  
- [ ] Spacing uses 4px grid system
- [ ] All interactive elements have ARIA labels
- [ ] Focus indicators are visible
- [ ] Text contrast meets WCAG AA (4.5:1)
- [ ] Hover states are clearly visible
- [ ] No inline styles remain
- [ ] CSS is under 100KB total

---

**Note**: Implement these fixes incrementally. Start with design tokens, then standardize components one by one.