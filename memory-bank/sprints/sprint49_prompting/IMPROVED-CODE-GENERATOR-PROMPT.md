# Improved Code Generator Prompt

## Key Changes Proposed

### 1. Motion Graphics Focus
Add emphasis that we're creating **motion graphics videos**, not static recreations. This helps the AI understand the context better.

### 2. Smart Image Interpretation
Replace the current "RECREATE... as accurately as possible" with intelligent interpretation based on user intent:
- If user says "recreate exactly" → recreate everything
- If user just provides an image → extract key elements for motion graphics
- Focus on the user's specific request

### 3. Duration Guidelines
Add clear guidance:
- Default: 2-6 seconds (60-180 frames at 30fps)
- Adjust based on content complexity
- Avoid unnecessarily long scenes

### 4. Spatial Hierarchy & Layout
Add explicit rules:
- No overlapping text elements
- Maintain clear visual hierarchy
- Use proper spacing between elements
- Group related content

### 5. Proposed New Context Handling Section

```
📋 CONTEXT HANDLING:
You are creating MOTION GRAPHICS VIDEOS, not static designs. Focus on movement and visual storytelling.

IMAGE INTERPRETATION:
- Pay attention to the USER'S SPECIFIC REQUEST above all else
- If user says "recreate exactly" or similar → faithfully recreate the image
- If user just provides an image without specific instructions → extract KEY ELEMENTS for an engaging motion graphic:
  * Main headline/title
  * Primary call-to-action
  * Brand colors and style
  * 1-2 key visual elements
  * Skip navigation bars, footers, and cluttered details
- If previous scene code provided: Match style, colors, and animation patterns
- If only text prompt: Create engaging motion graphics based on the description

🎬 ANIMATION & DURATION:
1. DURATION: Default to 2-6 seconds (60-180 frames at 30fps)
   - Simple text animations: 2-3 seconds
   - Complex multi-element scenes: 4-6 seconds
   - Only exceed 6 seconds if content truly requires it
2. Use spring() for smooth, organic animations
3. Stagger animations for visual flow
4. Include entrance animations (avoid exit animations that extend duration)

📐 LAYOUT & HIERARCHY:
- NEVER overlap text elements - maintain clear spacing
- Create visual hierarchy: primary > secondary > tertiary content
- Group related elements together
- Use consistent spacing (multiples of 8px or 16px)
- For multiple text elements at bottom, stack them or use side-by-side layout
- Z-index properly to prevent visual conflicts
```

## Benefits of These Changes

1. **Smarter Generation**: AI will understand when to simplify vs. recreate exactly
2. **Better Duration**: Most scenes will be 2-6 seconds instead of 11+
3. **No Overlaps**: Explicit rules prevent text overlap issues
4. **User Intent Focus**: Prioritizes what the user actually asked for
5. **Motion Graphics Context**: AI understands it's creating videos, not websites

## Implementation Notes

- These changes should go in `/src/config/prompts/active/code-generator.ts`
- Will affect all scene generation from images and text
- Should significantly improve the quality of generated scenes