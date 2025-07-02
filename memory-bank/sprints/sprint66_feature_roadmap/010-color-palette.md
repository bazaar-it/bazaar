# Feature Analysis: Color Palette System

**Feature ID**: 010  
**Priority**: MEDIUM  
**Complexity**: MEDIUM (2-3 days)  
**Created**: January 2, 2025

## Problem Statement

Users frequently have specific brand colors they want to use consistently across their videos. Currently:
- Colors are defined individually per scene
- No global color management system
- Difficult to maintain brand consistency
- Users must specify colors repeatedly in prompts

## User Requirements

Based on feedback:
- Need to define primary, secondary, and tertiary colors
- Want to use hex codes or color pickers
- Require easy application across all scenes
- Need visibility of current palette while working
- Want both global and per-scene color control

## Solution Constraints

- **No new panels**: Avoid adding more UI panels to maintain simplicity
- **Non-intrusive**: Should not complicate the existing workflow
- **Flexible**: Support both global themes and scene-specific overrides
- **Accessible**: Easy to discover and use for new users

## Proposed Solutions

### Option A: Chat-Based Color Commands (Recommended)

**Implementation**:
```typescript
// New chat commands
/palette #FF5733 #33FF57 #3357FF  // Set primary, secondary, tertiary
/colors show                       // Display current palette
/colors apply all                  // Apply to all existing scenes
/colors apply new                  // Apply to new scenes only
```

**UI Changes**:
- Persistent color chips above chat input showing current palette
- Click chip to copy hex code
- Right-click to change color

**Pros**:
- Fits existing chat-first workflow
- No new UI panels
- Clear command structure
- Easy to implement

**Cons**:
- Less visual than dedicated UI
- Commands need to be learned

### Option B: Project Settings Integration

**Implementation**:
- Add "Theme" tab to project settings modal
- Color pickers for primary/secondary/tertiary
- Preview of colors on sample elements
- Batch apply options

**Pros**:
- Visual and intuitive
- Centralized settings
- No chat commands needed

**Cons**:
- Hidden in settings modal
- Extra clicks to access

### Option C: Smart Color Detection

**Implementation**:
- Auto-detect colors in prompts: "Create a scene with my brand colors #FF5733 and #33FF57"
- AI suggests palette based on descriptions: "corporate blue theme"
- Learns from user's color choices over time

**Pros**:
- Zero new UI
- Natural language friendly
- Progressive enhancement

**Cons**:
- Less predictable
- May miss user intent

## Technical Architecture

### 1. Data Model
```typescript
// In project schema
interface ProjectTheme {
  primaryColor: string;      // Hex color
  secondaryColor?: string;   
  tertiaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  appliedToScenes: string[]; // Scene IDs using this theme
}
```

### 2. Brain Orchestrator Integration
```typescript
// Add to context building
const projectTheme = await getProjectTheme(projectId);
const context = {
  ...existingContext,
  theme: {
    colors: projectTheme,
    instruction: "Use these colors consistently unless user specifies otherwise"
  }
};
```

### 3. New Tool: UpdateSceneColors
```typescript
// Tool to batch update scene colors
interface UpdateSceneColorsInput {
  sceneIds: string[] | "all";
  colors: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };
  preserveCustomColors?: boolean;
}
```

### 4. UI Components
```typescript
// ColorPaletteChip component
<ColorPaletteChip 
  colors={projectTheme}
  onColorClick={(color) => copyToClipboard(color)}
  onColorChange={(type, newColor) => updateTheme(type, newColor)}
/>
```

## Implementation Plan

### Phase 1: Backend (Day 1)
1. Add theme fields to project schema
2. Create theme-related API endpoints
3. Integrate theme into Brain Orchestrator context
4. Update CODE_GENERATOR prompt to use theme

### Phase 2: Chat Commands (Day 2)
1. Implement /palette command parser
2. Add color validation (hex, rgb, color names)
3. Create color palette UI chip
4. Add theme to chat context

### Phase 3: Scene Updates (Day 3)
1. Create UpdateSceneColors tool
2. Add batch color update logic
3. Test with various scene types
4. Add color override preservation

## User Experience Flow

1. **Setting Colors**:
   - User types: `/palette #FF5733 #33FF57 #3357FF`
   - System confirms: "Theme updated! 🎨 Primary: #FF5733, Secondary: #33FF57, Tertiary: #3357FF"
   - Color chips appear above chat

2. **Using Colors**:
   - User types: "Create a button animation"
   - AI automatically uses theme colors
   - Generated code includes theme variables

3. **Updating Existing Scenes**:
   - User types: `/colors apply all`
   - System updates all scenes with new theme
   - Preview refreshes automatically

## Success Metrics

- Reduction in color-related prompts
- Increased brand consistency across videos
- User satisfaction with color management
- Time saved on color specifications

## Future Enhancements

1. **Color Presets**: Save and load color themes
2. **Brand Kits**: Complete brand packages (colors + fonts + logos)
3. **Color Harmony**: AI-suggested complementary colors
4. **Per-Scene Themes**: Different themes for different video sections
5. **Color Variables**: Use CSS variables in generated code

## Alternative Approach: Inline Color Widget

If chat commands prove too technical, consider:
- Inline color picker that appears when typing color-related keywords
- Smart suggestions based on context
- Visual preview of color being discussed

This maintains the chat-first approach while adding visual assistance.