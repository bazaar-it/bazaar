# Custom Component Image Handling

## Current Implementation (Shapes-Only Approach)

As of Sprint 15, we've implemented a temporary solution for handling images in custom components. This approach focuses on getting animations working reliably first, before tackling the more complex issue of asset management.

### Key Decision

We have **explicitly instructed the LLM to avoid generating components that reference external image or video files**. Instead, the LLM generates components that use:

- CSS-styled `<div>` elements (with colors, borders, gradients)
- SVG shapes created programmatically
- Text elements with animations
- Purely CSS-based visual effects

### Implementation Details

1. **Modified LLM Prompts**:
   - Updated the system prompt in `generateComponentCode.ts` with explicit restrictions against image usage
   - Added clear instructions to use shapes, gradients, and colors instead
   - Modified the element translation guide to replace image elements with colored divs

2. **Post-Processing Safeguards**:
   - Added sophisticated regex-based processing in `processGeneratedCode()` function that:
     - Properly removes Img component from import lists while preserving other imports
     - Also removes staticFile imports which are commonly used with assets
     - Cleans up potential syntax issues in imports like double commas or empty brackets
     - Handles multiline JSX tags with complex attributes
     - Catches both JSX expression syntax (`src={...}`) and string literals (`src="..."`)
     - Replaces any staticFile function calls with empty strings
     - Removes any string literals containing image file extensions (.png, .jpg, etc.)
   - Replaced any `<Img>` tags with simple colored rectangles as fallbacks
   - Added logging to track post-processing operations

3. **Animation Design Brief Updates**:
   - Added explicit guidance in the ADB prompt to discourage using image elements
   - Maintained text and shape elements as the primary visual building blocks

## Rationale

This approach was chosen for several reasons:

1. **Reliability**: External assets create a dependency that could break component rendering if the asset is not available
2. **Simplicity**: Focusing on animations first allows us to iron out the core functionality
3. **Performance**: Purely CSS/SVG components are more performant than those loading external assets
4. **Compatibility**: This approach works with our current system without requiring asset uploading functionality

## Future Implementation (Asset Management)

In future sprints, we plan to implement a complete asset management system that will:

1. Allow users to upload images to R2 storage
2. Provide secure URLs for those assets
3. Update the Animation Design Brief schema to properly handle asset references
4. Modify the LLM prompts to use the proper asset loading patterns
5. Extend the `CustomScene` component to preload required assets

## Testing Notes

When testing the current implementation:

- The LLM may occasionally still try to reference images despite our instructions
- The post-processing should catch these cases, but be aware of potential edge cases
- Components should use colored shapes, text, and animations exclusively
- Any image-like elements should be colored rectangles or SVG graphics

## Developer Guidelines

When reviewing generated components:

1. Verify no external asset references exist in the code
2. Check that any `content` fields in the ADB's elements are being used as text, not asset paths
3. Ensure animations work correctly with the shape-based visual elements
4. Report any cases where image references slip through our safeguards

This approach is temporary and will be replaced with proper asset handling once the animation pipeline is stable and reliable. 

## Bug Fix: ADB Generator External Asset References (Sprint 16)

### Issue Discovered

During Sprint 16 testing, we identified that while we had properly restricted the component generation phase from using external assets, the Animation Design Brief (ADB) generator was still creating references to external files:

1. The logs showed that the ADB generator was outputting elements with image references like:
   - `starfield.png` in Element 2
   - `orbit_ring.png` in Element 3
   - `ambient_space.mp3` as an audio track

2. This created a disconnect between stages:
   - The ADB would include image file references
   - The component generator would correctly replace them with shapes
   - But this inconsistency made debugging difficult and could lead to unexpected behavior

### Fix Implemented

We updated the `animationDesigner.service.ts` to include explicit instructions in the system prompt:

```typescript
// Added to system prompt in animationDesigner.service.ts
IMPORTANT RESTRICTION - NO EXTERNAL ASSETS:
- DO NOT reference or try to load any external images, videos, or audio files
- For visual elements that would typically use images, use:
  * Colored shapes (rectangles, circles) with appropriate backgroundColor properties
  * SVG-style elements that can be created programmatically
  * Text elements with descriptive content
- Never include file names or URLs (like example.png, image.jpg, sound.mp3) in any element's content field
- If you need to represent an image-like concept, use the 'shape' elementType instead of 'image'
- Do not include any audioTracks that reference external files
- This restriction ensures the animation will work reliably in all environments
```

This ensures that the restriction on external assets is applied at the earliest possible stage in the pipeline.

### Benefits

1. **Consistency**: Both the ADB and component generation phases now follow the same rules
2. **Early Prevention**: Catches potential issues at the source rather than relying on post-processing
3. **Cleaner Code**: Components don't need to handle translation between image references and shapes
4. **Better Debugging**: Easier to trace what's happening when all parts of the system have the same expectations

We'll continue monitoring the system to ensure this change fully resolves the issue. 