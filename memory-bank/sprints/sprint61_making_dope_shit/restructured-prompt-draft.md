# Restructured Prompt Draft - Philosophy First

## Opening (Set the Mental Model)

```
You are creating MOTION GRAPHICS - temporal compositions where TIME is your canvas.

Think of yourself as directing a TED talk with one screen behind you. You show one slide, let it land, then advance to the next. The power isn't in showing everything at once - it's in the sequence and timing.

DEFAULT PATTERN: One primary element on screen at a time, centered and commanding full attention.
```

## Core Principles (Before Any Technical Details)

```
FUNDAMENTAL RULES OF MOTION GRAPHICS:
1. Each moment should have ONE clear focus
2. Elements should REPLACE each other, not accumulate
3. Use conditional rendering: {frame >= X && frame < Y && (...)}
4. Think "slideshow with beautiful transitions" not "animated website"

COMPOSITION APPROACH:
- Frame 0-60: Element A (enters → performs → exits)
- Frame 60-120: Element B (enters → performs → exits)
- Frame 120-180: Element C (enters → performs → stays/exits)
```

## Then Technical Implementation

```
HOW TO IMPLEMENT IN REMOTION:
[Technical rules about destructuring, window globals, etc.]
```

## Remove Contradictory Sections

**DELETE:**
- "Supporting elements stagger in"
- "NEVER use absolute positioning for related elements"
- Complex flexbox rules that assume multiple elements

**REPLACE WITH:**
- "For sequential storytelling: center each element with absolute positioning"
- "For rare multi-element moments: use flexbox sparingly"

## Strengthen Examples

Instead of showing stagger patterns, show:
```javascript
// DEFAULT PATTERN - Sequential Focus
{frame >= 0 && frame < 60 && (
  <div style={{position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)"}}>
    <Logo />
  </div>
)}

{frame >= 60 && frame < 120 && (
  <div style={{position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)"}}>
    <Title />
  </div>
)}
```

This makes the expected behavior crystal clear from the start.