# The Reality of "User Preferences" in Bazaar-Vid

## What Are User Preferences?

After analyzing the code, "user preferences" in Bazaar-Vid are:

```typescript
// From projectMemory.service.ts
async getUserPreferences(projectId: string): Promise<Record<string, string>> {
  // Returns key-value pairs where:
  // - memoryType = 'USER_PREFERENCE'
  // - memoryKey = some string key
  // - memoryValue = some string value
}
```

## The Problem

1. **No Clear Definition**: What preferences are we storing?
2. **No Clear Usage**: Where are these preferences used?
3. **No Clear Population**: When/how do preferences get saved?

## Searching for Usage

Looking through the codebase:
- `getUserPreferences` is called in `contextBuilder.ts`
- Passed to context packet as `userPreferences`
- Given to Brain/Tools but... then what?

## The Reality Check

**Current "Preferences" System**:
- Abstract key-value storage
- No defined schema or purpose
- Consumes context window space
- No clear benefit to generation quality

**What Users Actually Want**:
- "Make all my scenes cohesive"
- "Use consistent colors"
- "Match the style"

## Why This Happened

Classic over-engineering:
1. "We might need user preferences someday"
2. "AI could learn user patterns"
3. "Let's build a flexible system"

Result: A system that does nothing useful.

## What Should Replace It

Instead of abstract "preferences", track concrete scene patterns:

```typescript
interface ProjectStyle {
  dominantColors: string[]
  animationSpeed: 'fast' | 'medium' | 'slow'
  textStyles: {
    fontFamily: string
    fontSize: string
  }
  commonPatterns: string[]  // "floating", "fade-in", etc.
}
```

But even this is overkill compared to the simple need: **Let tools see other scenes' code**.

## The Irony

We built a complex preference system that:
- Takes time to query
- Consumes tokens
- Provides no value

While missing the basic feature:
- Tools can't see other scenes to match styles

## Conclusion

"User preferences" is a perfect example of building for imagined future needs instead of current user needs. The system would be better without it, using those tokens instead to pass actual scene code when needed.

The best preference system would be: **Delete it and use the tokens for something useful**.