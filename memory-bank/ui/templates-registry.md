# UI Templates Registry

## Overview

The Bazaar-Vid system includes a comprehensive template registry system that centralizes all UI and animation templates for easy access, preview, and code generation. This document tracks the current status of template components and integration.

## Registry Location

The template registry is maintained in:
```
src/templates/registry.ts
```

## Current Status (November 2023)

### ✅ Successfully Registered Templates

The following 15 templates have been successfully added to the registry system:

1. **AICoding** - AI code animation template
2. **AIDialogue** - AI conversation dialogue template
3. **AppleSignIn** - Apple sign-in button animation
4. **BlueGradientText** - Text with animated blue gradient effects
5. **BubbleZoom** - Animated zooming bubbles grid
6. **Code** - Code typing animation with syntax highlighting
7. **DotRipple** - Ripple animation effect with dots
8. **FintechUI** - Fintech interface with animated elements
9. **FloatingParticles** - Animated floating particle effects
10. **GitHubSignIn** - GitHub sign-in button animation
11. **GoogleSignIn** - Google sign-in button with pulsing and scaling
12. **GradientText** - Animated text with cycling gradient hues
13. **GrowthGraph** - Animated bar graph with spring animations
14. **KnowsCode** - Animated code braces with typewriter text effect
15. **PromptIntro** - Introduction animation for prompts

### Template Structure

Each template in the registry follows this pattern:

```typescript
{
  id: 'template-id',
  name: 'Display Name',
  duration: 180, // in frames
  component: TemplateComponent,
  getCode: () => `// Component source code as string`
}
```

## Implementation Status

| Template | Implementation | Animation | Registry |
|----------|----------------|-----------|----------|
| AICoding | Basic | Pending | ✅ |
| AIDialogue | Basic | Pending | ✅ |
| AppleSignIn | Full | ✅ | ✅ |
| BlueGradientText | Full | ✅ | ✅ |
| BubbleZoom | Full | ✅ | ✅ |
| Code | Full | ✅ | ✅ |
| DotRipple | Full | ✅ | ✅ |
| FintechUI | Full | ✅ | ✅ |
| FloatingParticles | Full | ✅ | ✅ |
| GitHubSignIn | Full | ✅ | ✅ |
| GoogleSignIn | Full | ✅ | ✅ |
| GradientText | Full | ✅ | ✅ |
| GrowthGraph | Full | ✅ | ✅ |
| KnowsCode | Full | ✅ | ✅ |
| PromptIntro | Basic | Pending | ✅ |

## Next Steps

1. Implement animation code for basic templates with pending animations
2. Create additional templates for UI variety
3. Integrate template registry with the template selection panel
4. Add preview thumbnails for each template
