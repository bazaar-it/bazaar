# Minimal Context Approach - Sprint 61

## Key Insight: Less is More

The system prompt already defines HOW to create motion graphics. The user prompt should just provide WHAT to create.

## Minimal Context Building

### 1. Text Only
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

FUNCTION NAME: ${input.functionName}`;
```

That's it. The system prompt handles everything else.

### 2. With Previous Scene
```typescript
const userPrompt = `PREVIOUS SCENE CODE:
\`\`\`tsx
${input.previousSceneCode}
\`\`\`

USER REQUEST: "${input.userPrompt}"

FUNCTION NAME: ${input.functionName}`;
```

The AI can analyze the previous scene itself and match the style.

### 3. With Images
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

[${input.imageUrls.length} image(s) provided below]

FUNCTION NAME: ${input.functionName}`;
```

Let the vision model and system prompt handle how to interpret images.

### 4. With Videos
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

VIDEO URLS:
${input.videoUrls.map((url, i) => `Video ${i + 1}: ${url}`).join('\n')}

FUNCTION NAME: ${input.functionName}`;
```

### 5. With Web Context
```typescript
const userPrompt = `USER REQUEST: "${input.userPrompt}"

WEBSITE CONTEXT:
- URL: ${input.webContext.originalUrl}
- Title: ${input.webContext.pageData.title}
[Screenshots provided below]

FUNCTION NAME: ${input.functionName}`;
```

## Why This Works Better

1. **No Redundancy**: System prompt already says to create motion graphics
2. **User Intent Clear**: Their request isn't buried in our instructions
3. **AI Intelligence**: Modern LLMs can figure out context without hand-holding
4. **Flexibility**: User can specify anything without our enhancements interfering

## What We're Removing

❌ "Create engaging motion graphics"
❌ "Use smooth animations"
❌ "Focus on ONE hero element"
❌ "Keep it fast - 60-90 frames"
❌ "Add ultra-fast animations"

All of these are either:
- Already in the system prompt
- Redundant/obvious
- Potentially conflicting with user intent

## The Only Enhancement That Matters

The FUNCTION_NAME - because that's technical requirement, not creative direction.

## Result

Cleaner, more direct prompts that let:
- System prompt handle the HOW
- User request drive the WHAT
- AI use its intelligence to connect them