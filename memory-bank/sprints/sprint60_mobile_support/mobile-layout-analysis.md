# Mobile Layout Analysis for Generate Page

## Current State Analysis

The generate page currently uses a desktop-optimized layout with:
- **GenerateWorkspaceRoot**: Main container with header and workspace
- **WorkspaceContentAreaG**: Horizontal panel group with drag-and-drop
- **GenerateSidebar**: Collapsible sidebar (160px expanded, 48px collapsed)
- **Panels**: Chat, Preview, Code, Storyboard, Templates, MyProjects

### Key Issues for Mobile
1. Horizontal panel layout doesn't work on small screens
2. Sidebar takes valuable horizontal space
3. Drag-and-drop panel system is not mobile-friendly
4. Preview panel needs to be prominent on mobile

## Proposed Mobile Layout

### Layout Structure (Mobile First)
```
┌─────────────────────────┐
│      App Header         │ (fixed top)
├─────────────────────────┤
│                         │
│    Preview Panel        │ (50% height)
│    (Full Width)         │
│                         │
├─────────────────────────┤
│                         │
│    Chat Panel           │ (50% height)
│    (Full Width)         │
│                         │
├─────────────────────────┤
│  Bottom Tab Navigation  │ (fixed bottom)
└─────────────────────────┘
```

### Mobile-Specific Changes

#### 1. Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px  
- Desktop: > 1024px

#### 2. Mobile Navigation
Replace sidebar with bottom tab navigation:
- Chat (default)
- Templates
- My Projects
- Menu (hamburger for Code, Storyboard, etc.)

#### 3. Panel Layout Changes
- **Mobile**: Vertical stack (Preview top, active panel bottom)
- **Tablet**: Side-by-side with adjustable split
- **Desktop**: Current multi-panel system

#### 4. Touch Optimizations
- Remove drag-and-drop on mobile
- Use tabs/swipe for panel switching
- Larger touch targets (min 44px)
- Pull-to-refresh for preview

## Implementation Plan

### Phase 1: Layout Detection & Structure
1. Add responsive breakpoint detection hook
2. Create mobile-specific layout components
3. Implement conditional rendering based on screen size

### Phase 2: Mobile Components
1. **MobileWorkspaceLayout**: Vertical split container
2. **MobileBottomNav**: Tab navigation component  
3. **MobilePreviewPanel**: Full-width preview with touch controls
4. **MobilePanelContainer**: Swipeable panel container

### Phase 3: Responsive Styles
1. Update Tailwind classes for responsive behavior
2. Add mobile-specific animations
3. Optimize panel heights for mobile viewports

### Phase 4: Touch Interactions
1. Implement swipe gestures for panel switching
2. Add pull-to-refresh for preview
3. Optimize form inputs for mobile keyboards

## Technical Approach

### 1. useBreakpoint Hook
```typescript
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const checkBreakpoint = () => {
      if (window.innerWidth < 768) setBreakpoint('mobile');
      else if (window.innerWidth < 1024) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };
    
    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);
  
  return breakpoint;
}
```

### 2. Conditional Layout Rendering
In `GenerateWorkspaceRoot.tsx`:
```typescript
const breakpoint = useBreakpoint();

return breakpoint === 'mobile' ? (
  <MobileWorkspaceLayout {...props} />
) : (
  <DesktopWorkspaceLayout {...props} />
);
```

### 3. Mobile Panel Management
- Single active panel at a time
- Preview always visible on top
- Bottom nav for quick switching
- Slide-up modal for secondary panels

## Benefits
1. **Better UX**: Optimized for touch and small screens
2. **Performance**: Fewer panels rendered on mobile
3. **Maintainability**: Separate mobile/desktop layouts
4. **Progressive**: Works on all devices

## Next Steps
1. Create useBreakpoint hook
2. Build MobileWorkspaceLayout component
3. Implement bottom navigation
4. Add touch gestures
5. Test on various devices