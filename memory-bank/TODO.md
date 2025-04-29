

HIGH
Font loading inside render function (TextAnimationScene)
loadFont() runs every render in the browser. Call it once at module top-level outside the component or move font import to _app / root layout.
MEDIUM
Color interpolation manual hex split
Works, but use @remotion/media-utils/rgba or tinycolor to avoid edge-cases (#abc, rgb strings).
MEDIUM
ZoomPanScene Ken-Burns logic
transformTransition string uses transition CSS—irrelevant in video render context. Remove the transition: rule; browser doesn’t animate between frames in Remotion.
MEDIUM
Scene data typing
You down-cast Record<string,unknown> each time.  Consider declaring per-scene Zod schemas (e.g. backgroundColorSceneSchema) so the LLM patch can be validated before hitting the player.  Saves runtime guards.
LOW
ParticlesScene opacity calc
Math.sin((frame / fps) * 2 + index) means amplitude depends on FPS; use constant: Math.sin(frame * 0.2 + index).
LOW
svgIcons registry
Good, but keep SVGs tiny (<100×100); Remotion rasterizes them.  Large path counts will slow renders.


