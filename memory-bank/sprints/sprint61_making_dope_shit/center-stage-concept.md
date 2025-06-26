# Center Stage Concept - A Different Approach

## The Problem
The AI keeps creating layouts like a website:
- Logo at top
- Title below
- Description below that
- CTA at bottom
- Everything stays visible

## What We Actually Want
Think of it like a THEATER STAGE with a SINGLE SPOTLIGHT:

1. **Title appears** (center stage, big, typewriter effect)
2. **Title exits** → Stage goes dark
3. **Feature 1** (appears center, performs, exits)
4. **Feature 2** (appears center, performs, exits)
5. **Feature 3** (appears center, performs, exits)
6. **CTA** (final message, can stay)

## The Missing Concept: CENTER STAGE LAYOUT

Instead of:
```
[Logo]
[Title]
[Description]
[CTA]
```

We want:
```
Frame 0-30:    [     TITLE     ]
Frame 30-35:   [    fade out   ]
Frame 35-65:   [   FEATURE 1   ]
Frame 65-70:   [    fade out   ]
Frame 70-100:  [   FEATURE 2   ]
```

## Key Principles to Add

1. **Use the CENTER of the screen** - Not top-to-bottom layout
2. **One message at a time** - Clear the stage between acts
3. **Transition through darkness** - Fade to black/empty between major points
4. **Think TV commercial** - Not webpage

## Proposed Prompt Addition

```
LAYOUT PHILOSOPHY:
• Use CENTER STAGE approach - elements appear in the middle, not stacked vertically
• Think TV COMMERCIAL, not website - one message at a time
• Clear transitions: Element A fades out → brief pause → Element B fades in
• Position most elements at center: position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)"
• Each major point gets the WHOLE SCREEN to itself
```

This might be the missing piece - we need to explicitly say "don't stack vertically" and "use the center".