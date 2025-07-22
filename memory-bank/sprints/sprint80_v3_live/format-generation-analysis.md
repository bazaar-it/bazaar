# Format-Specific Code Generation Analysis

## Overview
This analysis examines how the AI code generation system handles different video formats (landscape, portrait, square) and identifies specific issues with portrait format generation.

## Key Files Involved

### Prompts That Need Fixing:
1. **CODE_GENERATOR prompt**: `/src/config/prompts/active/code-generator.ts`
   - Has hardcoded "1920x1080" on line 129
   - Fixed text size "150px" on line 78
   - "80% of width" guidance on line 19

2. **TYPOGRAPHY_GENERATOR prompt**: `/src/config/prompts/active/typography-generator.ts`
   - Hardcoded "1840px width" check on line 17
   - Hardcoded "1000px height" check on line 17
   - No format awareness

3. **IMAGE_RECREATOR prompt**: `/src/config/prompts/active/image-recreator.ts`
   - Fixed "40px padding" on line 73
   - No format-specific adjustments

### Prompts That Are OK:
4. **CODE_EDITOR prompt**: `/src/config/prompts/active/code-editor.ts`
   - No format-specific content (✅ Good - edits preserve original format)

### Supporting Files:
5. **CodeGeneratorNEW service**: `/src/tools/add/add_helpers/CodeGeneratorNEW.ts`
   - Correctly passes format info via placeholders
6. **Generation helpers**: `/src/server/api/routers/generation/helpers.ts`
   - Correctly extracts format from project metadata

## Current Issues with Portrait Format Generation

### 1. Contradictory Instructions in Code Generator Prompt

**Problem**: The CODE_GENERATOR prompt (located at `/src/config/prompts/active/code-generator.ts`) has format-aware instructions but then hardcodes landscape values.

```
Line 18-21: Correctly identifies format:
- "You are creating content for a {{WIDTH}} by {{HEIGHT}} pixel {{FORMAT}} format video"
- Portrait (9:16): Stack elements vertically...

Line 129: Then contradicts itself:
- "Maintain full HD screen size: 1920x1080"
```

**Impact**: The AI gets confused - it's told to create portrait content but also to maintain landscape dimensions.

### 2. Text Size Not Responsive to Format

**Problem**: The CODE_GENERATOR prompt at `/src/config/prompts/active/code-generator.ts` specifies fixed text size that doesn't scale for different formats.

```
Line 78: "Use 20rem or 150px for primary text size"
```

**Impact**: 
- Portrait (1080px wide): 150px text = ~14% of width (too large)
- Landscape (1920px wide): 150px text = ~8% of width (reasonable)

### 3. Width Percentage Issues

**Problem**: The CODE_GENERATOR prompt at `/src/config/prompts/active/code-generator.ts` line 19 specifies "middle 80% of width" which doesn't work well for portrait.

```
Line 19: "Content should occupy middle 80% of width"
```

**Impact**:
- Portrait: 80% of 1080px = 864px (very narrow content area)
- Landscape: 80% of 1920px = 1536px (good content area)

### 4. Format Information Flow

The format is correctly passed through the system:
1. Stored in project: `project.props.meta.format`
2. Retrieved as: `projectFormat` object with width, height, format
3. Passed to prompts via placeholders: `{{WIDTH}}`, `{{HEIGHT}}`, `{{FORMAT}}`

## Specific Portrait Generation Problems

### Current Behavior:
1. **Layout Issues**: Content often appears too large or off-center
2. **Text Overflow**: Text frequently extends beyond frame boundaries
3. **Poor Vertical Stacking**: Elements overlap instead of stacking properly
4. **Incorrect Spacing**: Padding and margins optimized for landscape

### Root Causes:
1. Hardcoded landscape dimensions in prompt
2. Fixed text sizes not scaled for narrow width
3. Percentage-based layouts assuming landscape proportions
4. Lack of portrait-specific layout examples

## Format Support Status

| Format | Dimensions | Status | Issues |
|--------|------------|--------|--------|
| Landscape | 1920x1080 | ✅ Works Well | None - this is the default |
| Portrait | 1080x1920 | ⚠️ Partially Working | Text too large, layout issues |
| Square | 1080x1080 | ⚠️ Partially Working | Better than portrait, some centering issues |

## Recommended Fixes

### 1. Remove Hardcoded Landscape Reference in CODE_GENERATOR prompt
**File**: `/src/config/prompts/active/code-generator.ts`
```diff
- • Maintain full HD screen size: 1920x1080
+ • Maintain the specified format dimensions: {{WIDTH}}x{{HEIGHT}}
```

### 2. Dynamic Text Sizing in CODE_GENERATOR prompt
**File**: `/src/config/prompts/active/code-generator.ts`
```diff
- Size - Use 20rem or 150px for primary text size
+ Size - For LANDSCAPE: 8% of width (~150px). For PORTRAIT: 5% of width (~50px). For SQUARE: 6% of width (~65px).
```

### 3. Format-Specific Layout Guidelines in CODE_GENERATOR prompt
**File**: `/src/config/prompts/active/code-generator.ts`
Add more specific guidance:
- **Portrait**: Use vertical card layouts, smaller text, tighter spacing
- **Square**: Balanced center compositions, medium text
- **Landscape**: Current guidelines work well

### 4. Width Percentage Adjustments in CODE_GENERATOR prompt
**File**: `/src/config/prompts/active/code-generator.ts`
```diff
- Content should occupy middle 80% of width
+ PORTRAIT: Use middle 90% of width. LANDSCAPE: Use middle 80%. SQUARE: Use middle 85%.
```

### 5. Add Portrait-Specific Examples to CODE_GENERATOR prompt
**File**: `/src/config/prompts/active/code-generator.ts`
Include examples of good portrait layouts:
- Vertical timeline animations
- Stacked card reveals
- Mobile-first UI patterns

## Testing Recommendations

1. Generate test scenes for each format with:
   - Text-heavy content
   - Multiple elements
   - Image + text combinations

2. Check for:
   - Text staying within bounds
   - Proper centering
   - Appropriate spacing
   - No hardcoded landscape values in output

## Complete List of Required Fixes

### 1. CODE_GENERATOR (`/src/config/prompts/active/code-generator.ts`)
- Line 129: Remove hardcoded "1920x1080"
- Line 78: Make text size format-aware
- Line 19: Adjust width percentages per format

### 2. TYPOGRAPHY_GENERATOR (`/src/config/prompts/active/typography-generator.ts`)
- Line 17: Replace "1840px" with format-aware calculation
- Line 17: Replace "1000px" with format-aware calculation
- Add WIDTH/HEIGHT/FORMAT placeholders support

### 3. IMAGE_RECREATOR (`/src/config/prompts/active/image-recreator.ts`)
- Line 73: Make padding responsive (20px mobile, 40px desktop)
- Add format-specific guidelines

## Next Steps

1. Fix all three prompts listed above
2. Test generation for all 3 formats with each tool
3. Verify no hardcoded landscape values appear in generated code
4. Fine-tune based on results