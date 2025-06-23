# UI Templates Registry

## Overview

The Bazaar-Vid system includes a comprehensive template registry system that centralizes all UI and animation templates for easy access, preview, and code generation. This document tracks the current status of template components and integration.

## Registry Location

The template registry is maintained in:
```
src/templates/registry.ts
```

## Current Status (Updated December 2024)

### ✅ Successfully Registered Templates

The following 24 templates have been successfully added to the registry system:

1. **AICoding** - AI code animation template
2. **AIDialogue** - AI conversation dialogue template
3. **AppleSignIn** - Apple sign-in button animation
4. **AudioAnimation** - Audio player with rotating square, soundwaves, and timer
5. **BlueGradientText** - Text with animated blue gradient effects
6. **BubbleZoom** - Animated zooming bubbles grid
7. **Code** - Code typing animation with syntax highlighting
8. **Coding** - Advanced coding interface animation
9. **CursorClickScene** - Interactive cursor animation with button click effects
10. **DotRipple** - Ripple animation effect with dots
11. **DualScreenApp** - Dual mobile screens showing profile and messages
12. **FintechUI** - Fintech interface with animated elements
13. **FloatingParticles** - Animated floating particle effects
14. **GitHubSignIn** - GitHub sign-in button animation
15. **GoogleSignIn** - Google sign-in button with pulsing and scaling
16. **GradientText** - Animated text with cycling gradient hues
17. **GrowthGraph** - Animated bar graph with spring animations
18. **KnowsCode** - Animated code braces with typewriter text effect
19. **MobileApp** - Mobile app interface with profile cards and services
20. **PromptIntro** - Introduction animation for prompts
21. **PromptUI** - Animated prompt search interface with quick actions
22. **Generating** - Text shimmer animation for loading states
23. **DotDotDot** - Animated bouncing dots for loading states
24. **Placeholders** - Search bar with cycling placeholder text
25. **TeslaStockGraph** - Animated stock price chart with smooth line drawing
26. **WordFlip** - Typewriter effect that cycles through different words

### Template Structure

Each template in the registry follows this pattern:

```typescript
{
  id: 'template-id',
  name: 'Display Name',
  duration: 180, // in frames
  previewFrame: 90, // frame for thumbnail preview
  component: TemplateComponent,
  getCode: () => `// Component source code as string with global imports`
}
```

## Implementation Status

| Template | Implementation | Animation | Registry |
|----------|----------------|-----------|----------|
| AICoding | Basic | Pending | ✅ |
| AIDialogue | Basic | Pending | ✅ |
| AppleSignIn | Full | ✅ | ✅ |
| AudioAnimation | Full | ✅ | ✅ |
| BlueGradientText | Full | ✅ | ✅ |
| BubbleZoom | Full | ✅ | ✅ |
| Code | Full | ✅ | ✅ |
| Coding | Full | ✅ | ✅ |
| CursorClickScene | Full | ✅ | ✅ |
| DotRipple | Full | ✅ | ✅ |
| DualScreenApp | Full | ✅ | ✅ |
| FintechUI | Full | ✅ | ✅ |
| FloatingParticles | Full | ✅ | ✅ |
| GitHubSignIn | Full | ✅ | ✅ |
| GoogleSignIn | Full | ✅ | ✅ |
| GradientText | Full | ✅ | ✅ |
| GrowthGraph | Full | ✅ | ✅ |
| KnowsCode | Full | ✅ | ✅ |
| MobileApp | Full | ✅ | ✅ |
| PromptIntro | Basic | Pending | ✅ |
| PromptUI | Full | ✅ | ✅ |
| Generating | Full | ✅ | ✅ |
| DotDotDot | Full | ✅ | ✅ |
| Placeholders | Full | ✅ | ✅ |
| TeslaStockGraph | Full | ✅ | ✅ |
| WordFlip | Full | ✅ | ✅ |

## Recent Fixes and Updates

### Mobile App Template (Fixed)
- **Duration**: Reduced to 3 seconds (90 frames) for optimal timing
- **Phone Frame**: Adjusted to 320x650px to prevent cropping issues
- **Layout**: Optimized spacing and sizing for better fit
- **Animation**: All animations complete within the 3-second timeframe

### Text Animation Templates (Optimized)
- **SlideIn, FadeIn, ScaleIn, WipeIn, DrawOn**: All reduced to 2 seconds (60 frames)
- **Animation**: Spring-based animations that complete quickly without trailing static frames
- **Background**: Consistent gradient backgrounds for better visual appeal
- **Performance**: Eliminated unnecessary static trailing seconds

### PromptUI Template (Fixed)
- **Background**: Changed from black to gradient for better thumbnail capture
- **Preview Frame**: Adjusted to 60 for better visual content capture
- **Thumbnail**: Now properly displays visual content instead of black screen

### Dual Screen App Template (Fixed)
- **Phone Frame**: Adjusted to 320x650px to prevent cropping issues
- **Gradient Circle**: Fixed duplicate variable declaration error
- **Layout**: Optimized for better screen fit and visual balance

### Removed Templates
- **OrbitingIcons**: Removed due to redundancy and maintenance complexity
- **NodeConnections**: Removed due to complexity and visual issues

## Recent Additions

### Tesla Stock Graph Template
- **Features**: Animated stock price chart with smooth line drawing
- **Chart**: Tesla stock data with grid lines and price labels
- **Animation**: Smooth line drawing with animated cursor following the path
- **Theme**: Dark theme with Tesla red accent color
- **Duration**: 6 seconds (180 frames)

### Cursor Click Scene Template
- **Features**: Interactive cursor animation with button click effects
- **Cursor**: Moves in a smooth arc from off-screen to button
- **Button**: "New" button with hover and click animations
- **Animation**: Cursor scaling and button press effects
- **Duration**: 3 seconds (90 frames)

### Mobile App Template
- **Features**: Mobile app interface with profile cards and services
- **Phone Frame**: Realistic phone frame with status bar (320x650px)
- **Profile Card**: User profile with wallet balance and card info
- **Worker Cards**: Grid of worker cards with SVG icons
- **Service Cards**: Service options with relevant SVG icons
- **Animation**: Staggered spring animations with gradient backgrounds
- **Duration**: 3 seconds (90 frames) - optimized timing

### Dual Screen App Template
- **Features**: Two mobile phone frames side by side
- **Left Screen**: Profile interface with user avatar and settings
- **Right Screen**: Messages interface with search and conversations
- **Animation**: Staggered spring animations with drifting background circles
- **Layout**: Optimized phone frame size (320x650px) to prevent cropping
- **Duration**: 6 seconds (180 frames)

## Next Steps

1. Implement animation code for basic templates with pending animations
2. Create additional templates for UI variety
3. Integrate template registry with the template selection panel
4. Add preview thumbnails for each template
5. Consider adding more specialized templates for different use cases

## Template List

### 1. KnowsCode
- **ID**: `knows-code`
- **Name**: "Knows Code"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Typewriter effect with code syntax highlighting

### 2. PromptIntro
- **ID**: `prompt-intro`
- **Name**: "Prompt Intro"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Animated prompt introduction with typing effect

### 3. FintechUI
- **ID**: `fintech-ui`
- **Name**: "Fintech UI"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Financial technology user interface animation

### 4. GrowthGraph
- **ID**: `growth-graph`
- **Name**: "Growth Graph"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Animated growth chart with data visualization

### 5. AppleSignIn
- **ID**: `apple-sign-in`
- **Name**: "Apple Sign In"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Apple sign-in button animation

### 6. GitHubSignIn
- **ID**: `github-sign-in`
- **Name**: "GitHub Sign In"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: GitHub sign-in button animation

### 7. GoogleSignIn
- **ID**: `google-sign-in`
- **Name**: "Google Sign In"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Google sign-in button animation

### 8. Coding
- **ID**: `coding`
- **Name**: "Coding"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Coding animation with syntax highlighting

### 9. BlueGradientText
- **ID**: `blue-gradient-text`
- **Name**: "Blue Gradient Text"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Text with blue gradient animation

### 10. GradientText
- **ID**: `gradient-text`
- **Name**: "Gradient Text"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Text with animated gradient effect

### 11. DualScreenApp
- **ID**: `dual-screen-app`
- **Name**: "Dual Screen App"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Dual screen application interface animation

### 12. AudioAnimation
- **ID**: `audio-animation`
- **Name**: "Audio Animation"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Audio visualization animation

### 13. PromptUI
- **ID**: `prompt-ui`
- **Name**: "Prompt UI"
- **Duration**: 180 frames
- **Preview Frame**: 100
- **Description**: User interface for prompt interactions with typewriter effect

### 14. Generating
- **ID**: `generating`
- **Name**: "Generating"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Loading animation with shimmer effect

### 15. DotDotDot
- **ID**: `dot-dot-dot`
- **Name**: "Dot Dot Dot"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Animated dots with smooth looping

### 16. Placeholders
- **ID**: `placeholders`
- **Name**: "Placeholders"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Placeholder content animation

### 17. WordFlip
- **ID**: `word-flip`
- **Name**: "Word Flip"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Typewriter effect with word transitions

### 18. NodeConnections
- **ID**: `node-connections`
- **Name**: "Node Connections"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Network visualization with animated connections between nodes

### 19. MorphingText
- **ID**: `morphing-text`
- **Name**: "Morphing Text"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Text with wave distortion animation and character-by-character fade-in

### 20. HighlightSweep
- **ID**: `highlight-sweep`
- **Name**: "Highlight Sweep"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Text with animated gradient highlight that sweeps across the text

### 21. CarouselText
- **ID**: `carousel-text`
- **Name**: "Carousel Text"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Horizontal scrolling text carousel with seamless looping animation

### 22. DrawOn
- **ID**: `draw-on`
- **Name**: "Draw On"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Text with gradient fill that draws on from left to right with stroke outline

### 23. WipeIn
- **ID**: `wipe-in`
- **Name**: "Wipe In"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Text that wipes in from left to right using clip-path animation

### 24. ScaleIn
- **ID**: `scale-in`
- **Name**: "Scale In"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Text that scales in with spring animation and opacity fade

### 25. SlideIn
- **ID**: `slide-in`
- **Name**: "Slide In"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Text that slides in from left with spring-based motion

### 26. FadeIn
- **ID**: `fade-in`
- **Name**: "Fade In"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Simple text fade-in animation with smooth opacity transition

### 27. OrbitingIcons
- **ID**: `orbiting-icons`
- **Name**: "Orbiting Icons"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Circular orbiting icons with floating animation and center text

### 28. TeslaStockGraph
- **ID**: `tesla-stock-graph`
- **Name**: "Tesla Stock Graph"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Animated stock price chart with smooth line drawing and cursor

### 29. CursorClickScene
- **ID**: `cursor-click-scene`
- **Name**: "Cursor Click Scene"
- **Duration**: 90 frames
- **Preview Frame**: 45
- **Description**: Interactive cursor animation with button click effects

### 30. MobileApp
- **ID**: `mobile-app`
- **Name**: "Mobile App"
- **Duration**: 180 frames
- **Preview Frame**: 90
- **Description**: Mobile app interface with profile cards, worker grid, and services

## Template Structure

Each template follows this structure:

```typescript
export const templateConfig = {
  id: 'unique-id',
  name: 'Display Name',
  duration: 180, // frames
  previewFrame: 90, // frame to show in preview
  getCode: () => `...`, // Code string for database storage
};
```

## Usage

Templates are imported and used through the `TEMPLATES` array in `src/templates/registry.ts`. Each template includes:

- **Component**: The actual React component for Remotion Player
- **Configuration**: Metadata and code generation function
- **Integration**: Proper TypeScript types and exports

## Adding New Templates

To add a new template:

1. Create the template file in `src/templates/`
2. Export the component and `templateConfig`
3. Import and add to `TEMPLATES` array in registry
4. Update this documentation
