# Sprint 61 Implementation Plan

## Step 1: Update Code Generator Prompt

Replace the current CODE_GENERATOR prompt in `/src/config/prompts/active/code-generator.ts` with the unified version that combines:
- Your coworker's specific timing (8-12 frames)
- One focal element principle
- Exact layout rules (flexbox for multiple, absolute for single)
- Icon policy (no emojis, use IconifyIcon)
- Fast exits and no idle time

## Step 2: Clean Up Code Generator

In `/src/tools/add/add_helpers/CodeGeneratorNEW.ts`:

1. Remove all references to `visionAnalysis` (lines 169, 255, 284-286)
2. Update the image generation prompt to be cleaner
3. Remove mention of Framer Motion (line 36)

## Step 3: Implement Scene Analysis

Add the scene analyzer utility to extract patterns from previous scenes:
- Animation timing patterns
- Color palette
- Font choices
- Layout style

This will help maintain consistency when users say "like the previous scene".

## Step 4: Optimize Context Building

For each scenario, update the user prompt enhancement:

### Text Only
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

SCENE TYPE: Standalone motion graphic
PACING: Ultra-fast (8-12 frame entrances, 60-120 total frames)
FOCUS: ONE hero element that commands attention

Generate scene with snappy animations and clear hierarchy.`;
```

### With Previous Scene
```typescript
const analysis = analyzePreviousScene(previousSceneCode);
const userPrompt = `USER REQUEST: "${input.userPrompt}"

STYLE REFERENCE:
${formatSceneAnalysis(analysis)}

Create NEW content matching this style and pacing.`;
```

### With Images
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

IMAGE ANALYSIS TASK:
1. Extract visual elements from ${input.imageUrls.length} image(s)
2. Recreate as dynamic Remotion components
3. Add ultra-fast animations (8-12 frames)
4. Focus on ONE hero element at a time`;
```

### With Web Context
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

BRAND EXTRACTION:
- Website: ${webContext.pageData.title}
- Use screenshots to extract brand colors and style
- Create motion graphics that feel on-brand
- Keep animations fast and modern (social media ready)`;
```

## Step 5: Test Cases

Create test prompts to validate improvements:

1. **Speed Test**: "Create a product announcement with quick animations"
   - Should use 8-12 frame animations
   - Total duration ~90 frames

2. **Focus Test**: "Show our three key features"
   - Should animate one feature at a time
   - Clear visual hierarchy

3. **Style Matching**: "Create another scene like the previous one"
   - Should analyze and match timing/colors
   - New content with same feel

4. **Image Test**: "Animate this design" (with uploaded image)
   - Should extract and animate elements
   - Not just recreate statically

## Step 6: Measure Success

Before/After metrics:
- Average animation duration: 60+ frames → 8-12 frames
- Elements animating simultaneously: 5+ → 1-2
- Scene duration: 150+ frames → 60-120 frames
- Transition quality: Basic fades → Dynamic exits

## Step 7: Rollout

1. Test unified prompt in development
2. Compare outputs with current version
3. Gather feedback on "dopeness factor"
4. Iterate based on results
5. Deploy to production

## Key Files to Update

1. `/src/config/prompts/active/code-generator.ts` - Replace with unified prompt
2. `/src/tools/add/add_helpers/CodeGeneratorNEW.ts` - Remove visionAnalysis, update prompts
3. `/src/tools/add/add.ts` - Update context building for each scenario
4. (New) `/src/lib/utils/sceneAnalyzer.ts` - Add scene analysis utility

## Expected Outcomes

- Animations that feel like TikTok/Instagram quality
- Clear focus with one hero element at a time
- Fast, snappy timing that grabs attention
- Smooth style matching between scenes
- Better brand extraction from web contexts