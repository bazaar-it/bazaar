# Code Editor Prompt Analysis

## Overview
The code editor prompt handles modifications to existing Remotion scene code. It's designed to make surgical edits while preserving the original code structure and functionality.

## Line-by-Line Analysis

### Header Documentation (Lines 1-11)
✅ **Excellent**: Comprehensive usage documentation
- Clear location: `src/tools/edit/edit.ts`
- Well-defined purpose
- Lists all edit scenarios (properties, animations, structure, errors)

### Role Definition (Lines 13-15)
✅ **Good**: Clear expert positioning
- Emphasizes "modifying existing" vs creating new
- Maintains consistency with code-generator role

### Critical Rules (Lines 17-24)
✅ **Excellent**: Preservation-focused rules
1. ✅ Preserve technical patterns (critical for consistency)
2. ✅ Make ONLY requested changes (prevents scope creep)
3. ✅ Keep function name/export (maintains compatibility)
4. ✅ Maintain animation timings (unless asked)
5. ✅ Return COMPLETE code (not snippets)
6. ✅ No imports rule (consistent with generator)

### Available Globals (Lines 26-32)
✅ **Good**: Identical to generator prompt
- Ensures consistency between generation and editing
- Same window-scoped approach

⚠️ **Redundancy**: This section is copied verbatim from generator - could reference it

### Edit Approach (Lines 35-40)
✅ **Good**: Clear categorization of edit types
- Color changes: targeted updates
- Text changes: content only
- Animation changes: timing/easing
- Structural changes: preserve functionality
- Error fixes: minimal changes

⚠️ **Missing**: No guidance on performance implications of edits

### Response Format (Lines 42-49)
✅ **Excellent**: Structured JSON response
- Complete code (not diff)
- Reasoning for changes
- List of changes made
- List of preserved elements
- Optional duration adjustment

❌ **Issue**: The "preserved" field seems redundant - everything not in "changes" is preserved

### Important Section (Lines 51-55)
✅ **Good**: Reinforces key principles
- Don't change unmentioned items
- Preserve imports/exports (though none should exist)
- Keep coding style
- Explain error fixes

### Duration Handling (Lines 57-62)
✅ **Excellent**: Smart duration adjustment
- Only includes duration if needed
- Clear calculation method (highest frame + 30)
- Concrete example provided

### Viewport Rules (Lines 64-65)
✅ **Good**: Consistent with generator
- Responsive design emphasis
- useVideoConfig() pattern

## Strengths

1. **Preservation Focus**: Excellent emphasis on minimal changes
2. **Structured Output**: JSON response provides clear tracking
3. **Duration Intelligence**: Smart automatic duration adjustment
4. **Edit Categories**: Clear approach for different edit types
5. **Error Fix Support**: Explicit guidance for fixing broken code

## Weaknesses & Bloat

1. **Redundant Globals**: Duplicate of generator prompt section
2. **Preserved Field**: Unnecessary in response format
3. **No Diff Option**: Always returns complete code (inefficient for large files)
4. **Missing Examples**: No concrete edit examples provided
5. **No Rollback Guide**: What if edit breaks the scene?

## Usage Context Analysis

From `edit.ts`:
```typescript
// Input includes:
- Edit request (user prompt)
- Current scene code
- Optional: error details
- Optional: images for reference
- Optional: vision analysis
```

**Complex Input Handling**:
- Error context injection for auto-fix
- Image-based edits supported
- Vision API integration for visual references

**Output**: Complete modified code with metadata

## Implementation Alignment

✅ **Model**: Uses Claude Sonnet 4 - same as generator for consistency
✅ **Temperature**: 0.3 - appropriately low for precise edits
✅ **Vision Support**: Properly integrated for image-based edits
✅ **Error Handling**: Dedicated error fix mode

## Comparison with Generator Prompt

| Aspect | Generator | Editor |
|--------|-----------|---------|
| Focus | Create new | Modify existing |
| Output | Raw code | JSON with metadata |
| Rules | Technical constraints | Preservation rules |
| Context | Optional previous scene | Required current code |
| Duration | Post-processed | Built into response |

## Critical Issues Found

1. **Complete Code Return**: Always returns full code, even for tiny edits
2. **No Validation**: Doesn't ensure edits maintain valid Remotion structure
3. **Style Preservation**: "Keep coding style" is vague
4. **Import Preservation**: Mentions preserving imports that shouldn't exist

## Recommendations

1. **Add Edit Examples**: Show common edit patterns
2. **Implement Diff Mode**: Option to return only changes for large files
3. **Remove Redundancy**: Reference shared globals instead of duplicating
4. **Clarify Style Rules**: Define what "coding style" means
5. **Add Validation**: Ensure edits don't break Remotion requirements
6. **Optimize Response**: Remove "preserved" field, focus on changes
7. **Performance Notes**: Warn about expensive animation changes

## Special Features

1. **Error Fix Mode**: Prompt adapts when error context provided
2. **Vision Integration**: Can edit based on visual references
3. **Duration Intelligence**: Automatically adjusts scene length

## Overall Assessment

**Score: 7.5/10**

A solid prompt that effectively handles code modifications with good preservation principles. The structured response format is excellent for tracking changes. Main improvements needed are reducing redundancy, adding examples, and optimizing for large file edits.

The prompt successfully balances making requested changes while preserving existing functionality. The duration handling is particularly well thought out. However, it could be more efficient and include better examples of common edit patterns.