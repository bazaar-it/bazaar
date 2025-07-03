# Feature 024: Loop Control

**Priority**: LOW  
**Complexity**: LOW  
**Effort**: 1 day (basic) + 2 days (scene loop)  
**Dependencies**: Code generation system, Scene metadata
**Status**: ✅ COMPLETED (basic loop) | ✅ COMPLETED (scene loop)

## Overview

Implemented simple loop toggle control for video playback in both preview panel and share page. The user clarified they wanted a simple on/off toggle for video looping, not animation loop counts as originally documented.

### Phase 2: Single Scene Loop (NEW FEATURE REQUEST)

**Status**: ✅ COMPLETED  
**Request**: "Option to have single scene loop after clip update rather than whole video"  
**Requested**: January 3, 2025  
**Completed**: January 3, 2025

Users want the ability to loop just the currently selected scene instead of the entire video composition. This is particularly useful when:
- Fine-tuning a specific scene's timing or animations
- Previewing changes to a single scene without watching the entire video
- Working on scene transitions or effects

## Implementation Details

### What Was Built

1. **LoopToggle Component** (`/src/components/ui/LoopToggle.tsx`)
   - Clean toggle button with RefreshCw icon
   - Shows blue when active, gray when inactive
   - Spinning animation when loop is enabled
   - Accessible with proper tooltips

2. **Preview Panel Integration** 
   - Added loop state management with localStorage persistence
   - Event-based communication between workspace header and preview panel
   - Default: loop enabled (true)
   - Toggle button in workspace header next to playback speed control

3. **Share Page Integration**
   - Added loop toggle overlay on share page video player
   - Positioned top-right with semi-transparent background
   - Default: loop disabled (false) for better sharing experience
   - Direct state management (no localStorage needed)

4. **Tailwind Config Update**
   - Added `animate-spin-slow` animation (3s rotation)
   - Provides subtle visual feedback when loop is active

### Technical Implementation

```typescript
// Event dispatch from header
const loopEvent = new CustomEvent('loop-toggle', {
  detail: { loop: !isLooping }
});
window.dispatchEvent(loopEvent);

// Remotion Player integration
<Player
  loop={isLooping}
  // ... other props
/>
```

### User Experience
- Toggle persists across page refreshes in workspace
- Visual feedback with spinning icon when active
- Consistent placement in both workspace and share views
- No impact on export functionality (loop is preview-only)

## Completed Tasks
- ✅ Created LoopToggle UI component
- ✅ Integrated with Remotion Player's native loop prop
- ✅ Added to preview panel with persistence
- ✅ Added to share page player
- ✅ Implemented proper event handling
- ✅ Added tailwind animation for visual feedback

## Result
Users can now easily toggle video looping on/off while previewing their creations, with the setting persisting across sessions in the workspace. The feature provides a clean, intuitive interface that aligns with modern video player controls.

## Phase 2: Single Scene Loop Implementation Plan

### Technical Approach

**Key Question: What defines the "current scene"?**

We need to establish how a scene becomes "current". Options:

1. **Option A: Scene Selection Based** (Recommended)
   - User clicks on a scene in the storyboard/scene list to select it
   - Selected scene becomes the "current scene" for looping
   - Clear visual indicator shows which scene is selected
   - If no scene selected, falls back to full video loop

2. **Option B: Playhead Position Based**
   - Current scene is determined by where the playhead is in the video
   - As video plays, current scene updates automatically
   - More complex but more intuitive for some workflows

3. **Option C: Last Edited Scene**
   - The most recently edited/added scene becomes current
   - Automatically focuses on what user is working on
   - Could be confusing if user edits multiple scenes

### Recommended Implementation (Option A)

1. **Scene Selection System** ✅ ALREADY EXISTS!
   - We already have `selectedSceneId` state in WorkspaceContentAreaG
   - Scene selection already works in storyboard and code panels
   - We just need to:
     - Pass `selectedSceneId` to PreviewPanelG
     - Show visual indicator in preview when scene is selected
     - Enable scene loop option when a scene is selected

2. **UI Enhancement**
   ```typescript
   // Simple toggle approach when scene is selected
   {selectedSceneId ? (
     <Button
       variant="ghost"
       size="sm"
       onClick={() => setLoopMode(loopMode === 'scene' ? 'video' : 'scene')}
       title={loopMode === 'scene' ? 'Looping current scene' : 'Click to loop selected scene'}
     >
       {loopMode === 'scene' ? (
         <>
           <Repeat1 className="h-3.5 w-3.5 mr-1" />
           Scene
         </>
       ) : (
         <>
           <Repeat className="h-3.5 w-3.5 mr-1" />
           Video
         </>
       )}
     </Button>
   ) : (
     <Button variant="ghost" size="sm" onClick={() => setIsLooping(!isLooping)}>
       <Repeat className="h-3.5 w-3.5" />
     </Button>
   )}
   ```

3. **State Management**
   - Add `selectedSceneId` to track which scene is selected
   - Add `loopMode: 'video' | 'scene'` to preview state
   - Calculate selected scene's frame range from scene list
   - Store both in localStorage for persistence

4. **Player Integration**
   - When in scene loop mode, limit playback to selected scene's frame range
   - Use Remotion's seek functionality to jump back to scene start
   - Disable scene loop if selected scene is deleted

4. **Implementation Details**
   ```typescript
   // New state in PreviewPanelG
   const [loopMode, setLoopMode] = useState<'video' | 'scene'>('video');
   const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
   
   // Calculate scene boundaries
   const sceneRanges = useMemo(() => {
     let start = 0;
     return scenes.map(scene => {
       const range = { start, end: start + scene.duration };
       start += scene.duration;
       return range;
     });
   }, [scenes]);
   
   // Handle scene loop logic
   useEffect(() => {
     if (loopMode === 'scene' && currentFrame >= sceneRanges[currentSceneIndex].end) {
       playerRef.current?.seekTo(sceneRanges[currentSceneIndex].start);
     }
   }, [currentFrame, loopMode, currentSceneIndex, sceneRanges]);
   ```

5. **UI Component Update**
   ```typescript
   // Enhanced LoopToggle with dropdown
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <Button variant="ghost" size="sm">
         {loopMode === 'video' ? <Repeat /> : <Repeat1 />}
       </Button>
     </DropdownMenuTrigger>
     <DropdownMenuContent>
       <DropdownMenuItem onClick={() => setLoopMode('video')}>
         <Repeat className="mr-2 h-4 w-4" />
         Loop Entire Video
       </DropdownMenuItem>
       <DropdownMenuItem onClick={() => setLoopMode('scene')}>
         <Repeat1 className="mr-2 h-4 w-4" />
         Loop Current Scene
       </DropdownMenuItem>
     </DropdownMenuContent>
   </DropdownMenu>
   ```

### Benefits
- Faster iteration when working on specific scenes
- Better focus on individual scene timing
- Reduces cognitive load when perfecting animations
- Aligns with professional video editing workflows

### Integration Points

Since we already have scene selection infrastructure:

1. **WorkspaceContentAreaG** already maintains `selectedSceneId`
2. **StoryboardPanelG** already allows scene selection
3. **CodePanelG** already syncs with selected scene
4. **ChatPanelG** scene cards could also trigger selection

We just need to:
- Pass `selectedSceneId` to PreviewPanelG as a prop
- Add the loop mode toggle UI
- Implement the scene boundary calculation and loop logic

### User Flow

1. User clicks on a scene in storyboard/chat to select it
2. Loop toggle button shows "Scene" option when scene is selected
3. User clicks to enable scene loop
4. Preview plays only the selected scene in a loop
5. User can switch back to full video loop or select different scene

### Estimated Effort
- UI updates: 0.5 days (simpler since selection exists)
- State management and logic: 0.5 days
- Testing and edge cases: 0.5 days
- **Total**: 1.5 days (reduced from 2 days)