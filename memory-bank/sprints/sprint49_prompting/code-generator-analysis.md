# Code Generator Prompt Analysis

## Overview
The code generator prompt is responsible for creating new Remotion scene code from text descriptions, images, or with reference to previous scenes. It's the creative engine that transforms ideas into motion graphics code.

## Line-by-Line Analysis

### Header Documentation (Lines 1-10)
✅ **Excellent**: Comprehensive documentation
- Clear usage location: `src/tools/add/add_helpers/CodeGeneratorNEW.ts`
- Explicitly lists all three generation scenarios
- Well-formatted with proper spacing

### Role Definition (Lines 12-14)
✅ **Good**: Clear expert positioning
- "expert React/Remotion developer" establishes authority
- "motion graphics scenes" specifies the domain

### Critical Technical Rules (Lines 16-25)
✅ **Excellent**: Comprehensive technical constraints
1. ✅ Window.Remotion access pattern (avoiding import issues)
2. ✅ Export syntax requirements with {{FUNCTION_NAME}} placeholder
3. ✅ No imports rule (critical for R2 storage compatibility)
4. ✅ No TypeScript/markdown (clean code output)
5. ✅ CSS value quoting (prevents runtime errors)
6. ✅ Interpolation clamping (prevents animation overflow)
7. ✅ Transform syntax (avoids CSS conflicts)
8. ✅ Font restrictions (ensures availability)

⚠️ **Potential Issue**: The transform rule (line 23) might be too restrictive for complex animations

### Available Globals Section (Lines 27-34)
✅ **Excellent**: Complete library listing
- All window-scoped libraries documented
- Clear categorization (Core, Icons, Shapes, etc.)
- Explicit note about pre-loaded globals

⚠️ **Missing**: No mention of potential performance implications of using all these libraries

### Context Handling (Lines 36-39)
✅ **Good**: Flexible context adaptation
- Smart image handling (extract key elements vs exact recreation)
- Style matching for consistency
- Text-only fallback

❌ **Weakness**: Vague on what "KEY ELEMENTS" means - could lead to inconsistent results

### Animation Guidelines (Lines 41-46)
✅ **Good**: Practical animation rules
1. Duration range (2-6 seconds) is reasonable
2. Spring animations for organic feel
3. Staggering for visual flow
4. Text overlap prevention
5. Parallax for depth

⚠️ **Missing**: No guidance on performance optimization or frame rate considerations

### Structure Section (Lines 48-56)
✅ **Excellent**: Responsive design focus
- AbsoluteFill as base container
- Z-indexing guidance
- Viewport-agnostic design
- Relative positioning emphasis

### Return Instruction (Line 57)
✅ **Good**: Crystal clear - code only, no fluff

## Strengths

1. **Technical Precision**: Extremely detailed technical constraints prevent common errors
2. **No Import Design**: Smart approach for R2 storage compatibility
3. **Responsive First**: Emphasis on viewport-agnostic design
4. **Library Awareness**: Comprehensive list of available tools
5. **Clear Output**: No ambiguity about expected return format

## Weaknesses & Bloat

1. **Vague Image Handling**: "KEY ELEMENTS" needs better definition
2. **No Performance Guide**: Missing frame budget or optimization tips
3. **Limited Animation Examples**: Could use specific animation patterns
4. **No Error Recovery**: What if required globals aren't available?
5. **Font Limitation**: Only 3 fonts seems restrictive for creative work

## Usage Context Analysis

From `CodeGeneratorNEW.ts`:
```typescript
// Three distinct paths:
1. generateDirectly() - Text only
2. generateWithReference() - Text + previous scene
3. generateFromImages() - Images + optional text
```

**Input Variations**:
- User prompt (always)
- Function name (parameterized)
- Previous scene code (optional)
- Images with analysis (optional)

**Output**: Raw Remotion component code

## Implementation Alignment

✅ **Model**: Uses Claude Sonnet 4 - good choice for code generation
✅ **Temperature**: 0.3 - appropriately low for consistent code
✅ **Token Limit**: 16000 - sufficient for complex scenes
✅ **Vision Support**: Properly integrated for image inputs

## Critical Issues Found

1. **Function Name Templating**: The `{{FUNCTION_NAME}}` system works but feels fragile
2. **Duration Extraction**: Post-processes code to extract animation duration - could be built into prompt
3. **No Validation**: Prompt doesn't ensure valid Remotion code structure

## Recommendations

1. **Clarify Image Processing**: Define what "key elements" means with examples
2. **Add Performance Section**: Include frame budget and optimization guidelines
3. **Expand Animation Patterns**: Provide specific examples of good animations
4. **Include Validation Rules**: Ensure generated code will compile
5. **Add Error Handling**: What to do when globals are missing
6. **Duration in Response**: Have AI return duration explicitly instead of parsing

## Comparison with Code Editor Prompt

The generator is more prescriptive than the editor, which makes sense:
- Generator: Create from scratch (needs more rules)
- Editor: Modify existing (needs more flexibility)

## Overall Assessment

**Score: 8.5/10**

An excellent prompt that successfully prevents most common Remotion/React errors through detailed technical rules. The window global approach is clever and well-documented. Main improvements needed are around image handling clarity and performance optimization guidance.

The prompt strikes a good balance between being prescriptive (technical rules) and creative (animation guidelines). It's comprehensive without being overwhelming, though it could benefit from more concrete examples.