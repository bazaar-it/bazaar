# Revolut Homepage Scroll Effect – Technical Breakdown

## Overview of the Effect

The current Revolut (financial super-app) home page uses an immersive hero section that reacts to scroll events instead of simply scrolling past. When a visitor begins to scroll, the dark hero section remains pinned on screen while several animations play:

- The large hero image (often showing a smartphone or a portrait) shrinks, moves and eventually settles into one of the panels in the next section
- A white background floods the dark hero area from the edges, replacing the dark colour
- New content (for example cards or pieces of UI) slides or fades in as the hero collapses
- Once the animation finishes, the page continues to scroll normally through the next sections

From a technical perspective this effect is not a single CSS property but a composition of scroll-driven animations, element re-layout and masking. Revolut's own engineering blog notes that the company's web products (including the main site) are built with React, use TypeScript and manage state/network requests with Redux and React Query. That means the scroll effect is implemented inside a React component and orchestrated with JavaScript rather than pure CSS.

## Libraries Used

### GSAP (GreenSock Animation Platform)

Many developers who have tried to reproduce Revolut's hero have found that the behaviour maps closely to features provided by the GSAP animation library.

1. **Observer plugin for scroll detection** – The Observer plugin gives a unified way to detect scroll-like interactions across mouse-wheel, touch and drag events. GSAP explains that `Observer.create()` watches wheel, touch or pointer events and calls callback functions like `onUp` or `onDown` when the user scrolls up or down. Revolut likely uses this plugin to intercept the first scroll wheel movement and trigger the hero animation while preventing the page from actually scrolling until the animation completes.

2. **ScrollTrigger (with pin)** – ScrollTrigger is often combined with Observer. It allows you to pin an element so it stays fixed within the viewport while animations play and then release it. During the pinned period, ScrollTrigger can scrub animations in sync with scroll progress.

3. **Flip plugin for morphing between layouts** – The Flip (First-Last-Invert-Play) plugin solves the problem of animating elements when they change position or size in the DOM. It records the current position/size of elements, then you perform DOM changes (for example, move the hero image into a new container), and finally it animates from the initial state to the new state. GSAP's documentation notes that Flip "records the current position/size/rotation of your elements … you make whatever changes you want, and then Flip applies offsets to make them look like they never moved". This allows Revolut's large hero image to shrink and animate smoothly into one of the three boxes in the next section instead of jumping.

4. **Masking / clip-path animations** – To achieve the "flood to white" effect, Revolut likely uses a second layer (div) with a white background that sits above the dark hero. The white layer's visibility is controlled by a mask or clip-path. Animating the mask (for example, expanding a circular clip path or sliding a rectangular mask) makes it appear as if the dark background is being washed away. This can be done with GSAP's CSS plugin or with native CSS transitions. GSAP forums mention that exploring masking is essential for recreating this effect.

## Underlying Tech Stack

Revolut's engineering blog outlines the technologies used across their web sites. The stack includes:

- **React** as the UI library. The article calls it the "fundamental library for building UI"
- **React Query** for network queries and **Redux** for application state management
- **TypeScript** and **Styled Components** for typed code and CSS-in-JS
- **TeamCity** for continuous integration and **Rush** for managing a monorepo

This stack facilitates building component-driven pages where animations can be encapsulated in React components and orchestrated using hooks and GSAP.

## How the Effect is Implemented

Although the exact source code of Revolut's site is proprietary, the effect can be recreated using the techniques above. The following steps show a likely implementation:

### 1. Set up the layout
Divide the hero section into layers: a dark background layer with the main hero content (phone image/woman photo) and a hidden white overlay layer.

### 2. Pin the hero while animating
Register GSAP's ScrollTrigger and Observer plugins. Create an Observer that listens for wheel and touch events. On the first downward scroll, prevent the default scroll behaviour and instead call a function that plays the hero animation. Use `ScrollTrigger.create({ trigger: heroRef, start: 'top top', end: '+=100%', pin: true, scrub: true })` to pin the hero while the animation runs.

### 3. Animate the background flood
Use a clip-path or mask-image on the white overlay. In GSAP, you can tween a CSS variable controlling the mask:

```javascript
gsap.to('.white-mask', {
  '--clipRadius': '150%',
  ease: 'power1.inOut',
  duration: 1.5,
});
```

With an initial `clip-path: circle(var(--clipRadius) at 50% 50%)`, expanding `--clipRadius` from a small value to 150% makes the white layer grow outward until it covers the hero.

### 4. Morph the hero image into the next section
Wrap the hero image in a container with a ref (e.g., `imageRef`). When the flood animation starts, call `const state = Flip.getState(imageRef.current);` Move the image element into the new layout (e.g., into one of the three content boxes further down the DOM). Then call `Flip.from(state, { duration: 1, ease: 'power1.inOut' });` to animate the transition. Flip calculates the difference in position, scale and rotation and animates accordingly.

### 5. Reveal additional panels/cards
After the hero image morphs, reveal the three content boxes or cards using GSAP timelines. These panels may slide up or fade in sequentially. Using GSAP timelines ensures the animations play in order.

### 6. Release the scroll
Once the hero animation completes, remove the scroll observer and unpin the hero. Normal scrolling resumes, allowing the user to continue down the page.

### 7. Make it responsive
Repeat the animation with responsive values for different viewports. Use GSAP's `matchMedia()` utility or React hooks to adjust timelines based on screen width.

## Why Revolut Uses This Effect

- **Storytelling and engagement**: A scroll-driven hero allows Revolut to control the first impression, guiding the user through an interactive narrative rather than simply showing a static hero.

- **Performance**: GSAP animations are hardware-accelerated and use transforms and opacity changes, which are efficient on modern browsers. The Observer and Flip plugins help by abstracting away cross-device scroll detection and complex layout transitions.

- **Component-driven development**: Because the site is built with React and TypeScript, complex animations can be encapsulated in components and reused across pages.

## Summary

The scrolling effect on Revolut's home page is a sophisticated combination of scroll-driven animations and layout transitions. When the user scrolls, the hero section is pinned; a white overlay is revealed via masking; and the hero image smoothly morphs into a new position using GSAP's Flip plugin. Scroll events are detected uniformly across devices using the Observer plugin, and the site's React-based tech stack supports encapsulation of these interactions. The result is an engaging hero that tells a story, demonstrates the brand's dynamism and provides a memorable first impression.