//memory-bank/remotion/scene-types-reference.md

# Bazaar-Vid Scene Types Reference

This document lists all scene types currently supported in Bazaar-Vid, their props, and supported animations/transitions. Keep this in sync with your codebase and LLM prompt.

---

## Scene Types

### text
- **Props:**
  - `text`: string
  - `color`: string
  - `fontSize`: number
  - `backgroundColor`: string

### image
- **Props:**
  - `src`: string (URL or relative path)
  - `fit`: "cover" | "contain"
  - `backgroundColor`: string

### background-color
- **Props:**
  - `color`: string
  - `toColor` (optional): string
  - `animation`: "fade" | "spring" | "pulse"

### shape
- **Props:**
  - `shapeType`: "circle" | "square" | "triangle"
  - `color`: string
  - `backgroundColor`: string
  - `size`: number
  - `animation`: "pulse" | "rotate" | "bounce" | "scale"

### gradient
- **Props:**
  - `colors`: string[]
  - `direction`: "linear" | "radial" | "conic"
  - `angle` (optional): number
  - `animationSpeed` (optional): number

### particles
- **Props:**
  - `count`: number
  - `type`: "circle" | "square" | "dot" | "star"
  - `colors`: string[]
  - `backgroundColor`: string

### text-animation
- **Props:**
  - `text`: string
  - `color`: string
  - `backgroundColor`: string
  - `fontSize`: number
  - `fontFamily`: string
  - `animation`: "typewriter" | "fadeLetters" | "slideUp" | "bounce" | "wavy"
  - `delay` (optional): number
  - `textAlign` (optional): "left" | "center" | "right"

### split-screen
- **Props:**
  - `direction`: "horizontal" | "vertical"
  - `ratio`: number (0-1)
  - `backgroundColor1`: string
  - `backgroundColor2`: string
  - `animationEffect`: "slide" | "reveal" | "split" | "none"

### zoom-pan
- **Props:**
  - `src`: string
  - `startScale`: number
  - `endScale`: number
  - `startX`: number
  - `endX`: number

### svg-animation
- **Props:**
  - `icon`: "circle" | "square" | "triangle" | "star" | "heart" | "checkmark" | "cross" | "arrow"
  - `color`: string
  - `animation`: "draw" | "scale" | "rotate" | "fade" | "moveIn"

### custom
- **Props:**
  - `componentId`: string
  - (other props as needed)

---

## Scene Transitions
- `type`: "fade" | "slide" | "wipe"
- `duration` (optional): int (frames)
- `direction` (optional): "from-left" | "from-right" | "from-top" | "from-bottom"
- `useSpring` (optional): boolean

---

## Notes
- Only the above scene types and props are supported.
- For details, see the Zod schemas in `/src/types/input-props.ts`.
- Update this file and the LLM prompt whenever scene types or props change in code.
