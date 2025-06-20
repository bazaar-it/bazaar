# Streamlined Prompt Improvement

## Minimal, Focused Changes

Instead of bloating the prompt, let's add just the essential fixes:

### 1. Change the Context Handling section:

```
📋 CONTEXT HANDLING:
- If images provided: Extract KEY ELEMENTS for motion graphics (unless user specifically requests exact recreation)
- If previous scene code provided: Match the style, colors, and animation patterns
- If only text prompt: Create engaging motion graphics based on the description
```

### 2. Update Animation Guidelines:

```
🎬 ANIMATION GUIDELINES:
1. Duration: 2-6 seconds (60-180 frames) is typical for motion graphics
2. Use spring() for smooth, organic animations
3. Stagger animations for visual flow
4. NEVER overlap text elements - maintain clear spacing
```

That's it! Just these two small changes:
- Clarifies we want key elements, not full recreation
- Adds duration guidance
- Adds the overlap prevention rule

## Benefits
- Fixes the main issues without bloat
- Maintains prompt clarity
- Easy to understand and follow