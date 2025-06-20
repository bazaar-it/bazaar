# Duration Hardcoding Analysis - Sprint 46

## Executive Summary

The Bazaar-Vid codebase has extensive hardcoded duration values throughout, creating inconsistency and inflexibility. This document provides exact file locations and line numbers for all duration-related issues.

## Problem 1: Multiple Inconsistent Defaults

### Different Default Values Found:
- **60 frames (2 seconds)**
- **90 frames (3 seconds)**
- **150 frames (5 seconds)**
- **180 frames (6 seconds)**
- **240 frames (8 seconds)**
- **300 frames (10 seconds)**

### Exact Locations:

#### 2-Second Defaults (60 frames):
- `/src/lib/types/video/remotion-constants.ts:577` - Default text scene
- `/src/templates/BlueGradientText.tsx:84` - `duration: 60`
- `/src/templates/GradientText.tsx:78` - `duration: 60`

#### 3-Second Defaults (90 frames):
- `/src/components/client/modals/InsertCustomComponentButton.tsx:86` - `duration: 90`

#### 4-Second Defaults (120 frames):
- `/src/templates/AppleSignIn.tsx:99` - `duration: 120`
- `/src/templates/GoogleSignIn.tsx:123` - `duration: 120`
- `/src/templates/GitHubSignIn.tsx:98` - `duration: 120`
- `/src/templates/LogoTemplate.tsx:135` - `duration: 120`

#### 5-Second Defaults (150 frames):
- `/src/lib/types/video/remotion-constants.ts:569` - Legacy default project props
- `/src/templates/PulsingCircles.tsx:69` - `duration: 150`
- `/src/config/prompts/active/code-generator.ts:35` - "Default duration: 150 frames"
- `/src/tools/add/add_helpers/CodeGeneratorNEW.ts:38` - "Default duration: 5 seconds (150 frames)"

#### 6-Second Defaults (180 frames):
- `/src/lib/utils/codeDurationExtractor.ts:46` - `DEFAULT_DURATION = 180`
- `/src/templates/AICoding.tsx:151` - `duration: 180`
- `/src/templates/AIDialogue.tsx:79` - `duration: 180`
- `/src/templates/Code.tsx:162` - `duration: 180`
- `/src/templates/DotRipple.tsx:74` - `duration: 180`
- `/src/templates/HeroTemplate.tsx:95` - `duration: 180`
- `/src/templates/KnowsCode.tsx:98` - `duration: 180`
- `/src/templates/PromptIntro.tsx:154` - `duration: 180`
- `/src/lib/evals/runner.ts:260` - `duration: scene.duration || 180`
- `/src/lib/evals/runner.ts:385` - `duration: context.duration || 180`

#### 6.7-Second Defaults (200 frames):
- `/src/templates/GlitchText.tsx:149` - `duration: 200`
- `/src/lib/types/video/remotion-constants.ts:649` - `DURATION_IN_FRAMES = 200`

#### 8-Second Defaults (240 frames):
- `/src/templates/Coding.tsx:162` - `duration: 240`
- `/src/templates/FintechUI.tsx:300` - `duration: 240`
- `/src/templates/FloatingElements.tsx:209` - `duration: 240`
- `/src/templates/GrowthGraph.tsx:181` - `duration: 240`
- `/src/templates/ParticleExplosion.tsx:115` - `duration: 240`

#### 10-Second Defaults (300 frames):
- `/src/lib/types/video/remotion-constants.ts:35` - Default project meta duration
- `/src/lib/types/video/remotion-constants.ts:44` - Welcome scene duration
- `/src/templates/FloatingParticles.tsx:106` - `duration: 300`
- `/src/templates/TypingTemplate.tsx:79` - `duration: 300`
- `/src/templates/WaveAnimation.tsx:163` - `duration: 300`
- `/src/lib/evals/runner.ts:233` - Test scene duration
- `/src/lib/evals/runner.ts:642` - Comment: "10 seconds default"

## Problem 2: Hardcoded Values in Templates

### All 23 Template Files with Hardcoded Durations:

1. `/src/templates/AICoding.tsx:151` - `duration: 180`
2. `/src/templates/AIDialogue.tsx:79` - `duration: 180`
3. `/src/templates/AppleSignIn.tsx:99` - `duration: 120`
4. `/src/templates/BlueGradientText.tsx:84` - `duration: 60`
5. `/src/templates/Code.tsx:162` - `duration: 180`
6. `/src/templates/Coding.tsx:162` - `duration: 240`
7. `/src/templates/DotRipple.tsx:74` - `duration: 180`
8. `/src/templates/FintechUI.tsx:300` - `duration: 240`
9. `/src/templates/FloatingElements.tsx:209` - `duration: 240`
10. `/src/templates/FloatingParticles.tsx:106` - `duration: 300`
11. `/src/templates/GitHubSignIn.tsx:98` - `duration: 120`
12. `/src/templates/GlitchText.tsx:149` - `duration: 200`
13. `/src/templates/GoogleSignIn.tsx:123` - `duration: 120`
14. `/src/templates/GradientText.tsx:78` - `duration: 60`
15. `/src/templates/GrowthGraph.tsx:181` - `duration: 240`
16. `/src/templates/HeroTemplate.tsx:95` - `duration: 180`
17. `/src/templates/KnowsCode.tsx:98` - `duration: 180`
18. `/src/templates/LogoTemplate.tsx:135` - `duration: 120`
19. `/src/templates/ParticleExplosion.tsx:115` - `duration: 240`
20. `/src/templates/PromptIntro.tsx:154` - `duration: 180`
21. `/src/templates/PulsingCircles.tsx:69` - `duration: 150`
22. `/src/templates/TypingTemplate.tsx:79` - `duration: 300`
23. `/src/templates/WaveAnimation.tsx:163` - `duration: 300`

## Problem 3: Frame vs Second Confusion

### Files Using Frames:
- All template files use frames (30fps assumed)
- `/src/lib/types/video/input-props.ts:32` - `duration: z.number().int().min(1).describe("Duration in frames")`
- `/src/lib/types/video/remotion-constants.ts` - All durations in frames
- `/src/lib/utils/codeDurationExtractor.ts` - Returns frames

### Files Using Seconds:
- `/src/lib/types/video/storyboard.ts:187` - `duration: z.number().min(0.1).default(5)` - Uses SECONDS
- `/src/brain/orchestratorNEW.ts:70` - `requestedDurationSeconds` field
- Prompts mention "5 seconds (150 frames)" showing dual units

### Mixed Usage Examples:
- `/src/config/prompts/active/code-generator.ts:35` - "Default duration: 150 frames (5 seconds at 30fps)"
- `/src/tools/add/add_helpers/CodeGeneratorNEW.ts:38` - "Default duration: 5 seconds (150 frames at 30fps)"

## Additional Duration Constants

### Minimum/Maximum Constraints:
- `/src/lib/utils/codeDurationExtractor.ts:19` - `MIN_PRACTICAL_DURATION = 60` (2 seconds)
- `/src/lib/utils/codeDurationExtractor.ts:20` - `BUFFER_FRAMES = 30` (1 second)
- `/src/lib/utils/codeDurationExtractor.ts:47` - `MIN_ANIMATION_DURATION = 30` (1 second)
- `/src/lib/utils/codeDurationExtractor.ts:49` - `MAX_DURATION = 900` (30 seconds)

## Impact Analysis

1. **User Experience**: Users cannot specify custom durations for scenes
2. **Template Flexibility**: All templates have fixed durations, limiting reusability
3. **Consistency**: Different defaults across the system create unpredictable behavior
4. **Maintenance**: Changing durations requires modifying multiple hardcoded values

## Recommended Solution

See `strategy.md` for the comprehensive solution approach including:
- Centralized duration configuration
- Template parameterization
- User-specified duration support
- Consistent frame/second conversion utilities