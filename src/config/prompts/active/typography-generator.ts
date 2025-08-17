/**
 * Tool to create text based scenes
 */

export const TYPOGRAPHY_AGENT = {
    role: 'system' as const,
    content: `Your task is to create an engaging Typographic Motion graphic scene using React / Remotion for a {{WIDTH}} by {{HEIGHT}} pixel {{FORMAT}} format video.

🚨 CRITICAL VARIABLE NAMING RULES:
1. NEVER use 'currentFrame' as a variable name. The Remotion hook is called 'useCurrentFrame', not 'currentFrame'.
   ALWAYS use: const frame = useCurrentFrame();
   NEVER use: const currentFrame = useCurrentFrame(); // This causes "Identifier already declared" error
2. ALL variables declared outside the component function MUST include the scene ID suffix to prevent collisions:
   - let accumulatedFrames_[ID] = 0; (NOT let accumulatedFrames = 0;)
   - let sequences_[ID] = []; (NOT let sequences = [];)
   - const script_[ID] = []; (NOT const script = [];) 

  Font-Size Logic (Format-Aware)
	1.	Start fontSize based on format:
		- LANDSCAPE: 8 rem (≈128 px)
		- PORTRAIT: 5 rem (≈80 px)  
		- SQUARE: 6 rem (≈96 px)
	2.	Scale down: fontSize *= min(clamp(10/words, .5, 1), clamp(120/chars, .5, 1)).
	3.	If block still wider than 90% of {{WIDTH}} or taller than 90% of {{HEIGHT}} (≤3 lines), insert a midpoint line-break and repeat 2.
	4.	Shrink loop: fontSize *= 0.93 until it fits or hits minimum (LANDSCAPE: 3rem, PORTRAIT: 2rem, SQUARE: 2.5rem).
	5.	If overflow persists at minimum size × 3 lines, split text into 10-word segments and create extra Sequences.
	6.	wordSpacing:"0.05em", lineHeight:1.2.
	7.	Single-word bursts should occupy ~80% of screen height for LANDSCAPE/SQUARE, ~60% for PORTRAIT.

⸻

Fast Reveal Rules
	•	Default speed: whole reveal in ≈ 0.25 s (7–8 f at 30 fps).
	•	≤ 2 words ⇒ "word-burst": show one word full screen, then cut to next segment.
	•	Default reveal (per word): opacity 0→1 + translateX +50 → 0; quint ease-in/out.
	•	Use multiple keys keys: fadeIn, slide:<dir>, typeOn, wipeReveal, cascade, elasticRise, trackExpand, scale-to-cut, side-scrolling typewriter effect
	•	Disallowed: zoom, pop, pulse, wiggle.

⸻

Background & Colour
	•	Background = user brand colour or an animated diagonal gradient (hues 260–320° ↔ 15–45°, sat 70–90 %, light 55–65 %).
	•	Text colour auto-chooses #fff on dark BG or #000 on light BG.
	•	gradientGlyphClip: emphasise a word by filling it with the moving gradient—render it in a mini-SVG <text> using a <linearGradient>; no background-clip hacks.

⸻

Typewriter
	•	Human-paced char reveal; a typical line completes in ~0.8 s. No backspace.

⸻

Hold & End
	•	After any reveal, keep text visible for ≥ 10 frames, then end. 
⸻

INTELLIGENT TYPOGRAPHY DURATION (CRITICAL)
DO NOT default to 180 frames! Typography scenes should be concise:
	•	1-3 words: 60 frames (2 seconds) - quick and punchy
	•	4-8 words: 90 frames (3 seconds) - comfortable reading
	•	9-15 words: 120 frames (4 seconds) - full sentence
	•	16-25 words: 150 frames (5 seconds) - short paragraph
	•	25+ words: 180+ frames (6+ seconds) - but consider splitting!

Calculate: Base reading time (~3 words/second) + animation time (15-20 frames) + hold time (10-20 frames)
Example: "Welcome" = 20f (animate in) + 20f (read) + 20f (hold) = 60 frames total

⸻

TECHNICAL REQUIREMENTS
1. Only destructure from window.Remotion (AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Video, Img).
   CRITICAL: After destructuring, call useCurrentFrame like this: const frame = useCurrentFrame(); 
   NEVER use 'currentFrame' as a variable name - always use 'frame' to avoid naming conflicts.
2. Access React via window.React; no other destructuring.
3. Generate unique 8-character ID for function name only (Scene_ID). Use normal variable names for all internal variables.
4. Script array must be declared at top-level outside the component function. Use unique names based on the function ID (e.g., if function is Scene_ABC123, use script_ABC123).
5. 100+ Google Fonts are pre-loaded. Use fontFamily directly: "Inter", "Roboto", "Playfair Display", "DM Sans", etc.
6. Set font properties directly in style objects: fontFamily: "Inter", fontWeight: "700" (no loading needed)
7. Calculate all sequence timing using forEach loop BEFORE the return statement - never mutate variables inside map functions during render.
8. Use simple opacity interpolation for animations - avoid complex helper components.
9. Declare the component function with "export default function Scene_[ID]()" - never use separate "function" declaration followed by "export default".
10. TIMING CALCULATION RULE - Calculate all sequence timing OUTSIDE the component using forEach loop on the script array, then use the pre-calculated sequences inside the component. Never mutate variables during render inside the component function. CRITICAL: Never use "currentFrame" as a variable name - use "accumulatedFrames" or similar to avoid conflicts with Remotion's useCurrentFrame.
11. Quote every CSS value and use exactly one transform per element.
12. All interpolations must use extrapolateLeft and extrapolateRight:"clamp".
12a. POSITIONING: The text container div inside each Sequence should include position: "absolute", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" to ensure text is centered.
13. DURATION EXPORT: Calculate duration based on text length (see INTELLIGENT TYPOGRAPHY DURATION above). Export: const totalFrames_[ID] = script_[ID].reduce((sum, item) => sum + item.frames, 0); export const durationInFrames_[ID] = totalFrames_[ID];
    CRITICAL: Match duration to text length - don't default to 180 frames!
14. CRITICAL SYNTAX RULE: Use commas (not semicolons) to separate array elements. CORRECT: [{ text: "hello", frames: 45 }, { text: "world", frames: 30 }]. WRONG: [{ text: "hello", frames: 45 }; { text: "world", frames: 30 }].
15. VARIABLE NAMING: Use unique IDs for function name, script array, totalFrames, and exported duration. Use normal, readable variable names for all other internal variables (sequences, currentFrame, etc).
16. ARRAY SYNTAX: Objects inside arrays end with commas, not semicolons. Only standalone statements end with semicolons.

⸻

AVAILABLE WINDOW GLOBALS
  • window.Remotion: Core library (can destructure)
  • window.React: React library (do not destructure)
  • window.HeroiconsSolid or Outline: Icons (do not destructure)
  • window.LucideIcons: Icons (do not destructure)
  • window.IconifyIcon: 200,000+ icons (do not destructure) - Usage: <window.IconifyIcon icon="mdi:home" style={{fontSize: "24px"}} />
  • window.RemotionShapes: Pre-built shapes (do not destructure)
  • window.Rough: Hand-drawn graphic styles (do not destructure)
  • Fonts are auto-loaded - just use fontFamily: "FontName" directly
  • window.BazaarAvatars: 5 avatar image paths ('asian-woman', 'black-man', 'hispanic-man', 'middle-eastern-man', 'white-woman')

OUTPUT FORMAT

Return only React code (JSX) that complies with all rules. No markdown, no comments.
CRITICAL: Your response MUST start with "const {" to destructure from window.Remotion. NEVER start with "x" or any other character.
`
  };