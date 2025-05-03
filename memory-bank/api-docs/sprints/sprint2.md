------------------------------------------------------------- Sprint 2 – In Progress -------------------------------------------------------------

**Status:** In Progress

**Note:** This sprint is not 100% complete. Some learning and implementation tasks remain ongoing.


Okay, Sprint 2 focused entirely on a Remotion Deep Dive sounds like a great plan! Before diving into the complex AI and props-driven architecture for the main app, getting comfortable with actually building video elements directly with Remotion code is essential.

Sprint 2 Goal: Gain a solid understanding of how to create video content using Remotion's core APIs by referencing the official documentation (remotion.dev/docs) and experimenting within the src/remotion/ folder of your project, using Remotion Studio for live feedback.

Focus Areas (Based on Remotion Docs & Your Needs):

Understanding Compositions (/docs/composition, /docs/the-fundamentals):

What is the <Composition> tag in src/remotion/Root.tsx?
What do id, component, durationInFrames, fps, width, height, defaultProps mean?
How to register multiple compositions?
Core Hooks (/docs/the-fundamentals, /docs/api):

useCurrentFrame(): How to get the current frame number and use it.
useVideoConfig(): How to get the fps, durationInFrames, width, height inside your component.
Basic Components & Layout (/docs/the-fundamentals, /docs/assets):

Returning standard HTML/JSX elements.
Using <AbsoluteFill> for layering and positioning.
Applying CSS style props for colors, sizes, positions, fonts.
Animation (/docs/animating-properties):

Using interpolate() to map frame numbers to style values (e.g., opacity, position, scale). Understanding input/output ranges and extrapolation.
Using spring() for physics-based animations. Understanding basic config (stiffness, damping).
Timing and Sequencing (/docs/sequence, /docs/series):

Using <Sequence> with from and durationInFrames props to control when elements appear and for how long.
Understanding how useCurrentFrame() behaves inside a <Sequence>.
(Optional) Exploring <Series> for arranging sequences one after another.
Using Assets (/docs/assets, /docs/audio, /docs/videos, /docs/img):

Placing assets in public/ (or remotion/assets/).
Using staticFile() to reference local assets.
Using <Img>, <Audio>, <OffthreadVideo> components.
Basic audio/video trimming (startFrom, endAt).
Transitions (/docs/transitions):

Installing @remotion/transitions.
Using <TransitionSeries> with <TransitionSeries.Sequence> and <TransitionSeries.Transition>.
Applying built-in transition presentations (fade(), slide(), wipe(), etc.).
Controlling transition timing (linearTiming, springTiming).
Componentization (/docs/reuse-components):

Breaking down complex scenes into smaller, reusable React components within the src/remotion/ directory.
Passing props to these components.
Suggested Workflow for this Sprint:

Read: Pick a topic (e.g., Fundamentals, Sequence, Animation) from the list above and read the relevant Remotion docs section.
Code: Open your src/remotion/Composition.tsx file (or create new component files like src/remotion/MyTestScene.tsx and use it in Root.tsx). Try implementing the concept you just read about.
Preview: Have Remotion Studio running (npm run remotion). Watch the preview update live as you code and save. Use the timeline scrubber extensively.
Experiment: Tweak values (durations, animation ranges, props), try different components, see what happens.
Iterate: Build up complexity gradually. Start with static elements -> add animation -> put them in sequences -> add assets -> try transitions.
Expected Outcome:

By the end of this sprint, you should feel comfortable:

Creating basic Remotion compositions.
Using core hooks like useCurrentFrame and useVideoConfig.
Animating properties over time using interpolate and spring.
Controlling timing using <Sequence>.
Adding images and audio.
Applying simple transitions between elements.
This practical experience will be invaluable when you later design the flexible <DynamicVideo> component and instruct the LLM on how to generate the inputProps JSON to control it.


1  What you should know before writing code

Concept	TL;DR
Composition	A video template (component + metadata). It’s registered in remotion/Root.tsx. At render-time the CLI / Studio picks one composition and turns it into pixels or audio samples.
Timeline unit	Frame (not milliseconds). fps (frames per second) + durationInFrames tell Remotion how long the clip is.
React runtime	Every frame is just React rendering. You can use hooks, state, context, TanStack Query, etc. 3rd-party libs that rely on the DOM won’t work in Rendering (Node) – but are OK inside <Player> or Studio.
Assets	<Img> <Video> <Audio> (or <OffthreadVideo>). URLs must be resolvable in both the browser (Studio / Player) and Node (render).
Sequencing	<Sequence from={…} durationInFrames={…}>…</Sequence> = layers clips on a timeline. <Series> is syntactic sugar for back-to-back sequences.
Motion	useCurrentFrame() returns the current frame. Feed it into interpolate() or spring() to drive CSS properties.
Data in / out	inputProps is a plain object you pass to <Player> or the Lambda render call (renderMediaOnLambda). Use Zod or z.infer to keep it typed.



⸻

2  Sprint goal

Produce a 5-second video that shows a title screen → image cross-fade → closing screen using:
	•	2 custom components (TitleCard, ImageSlide)
	•	1 transition (opacity cross-fade driven by interpolate)
	•	Input props (title, imageUrl, author)
	•	Rendered locally to out/demo.mp4

⸻

3  Step-by-step plan (agent ⇄ human)

#	Action	Who	Checks / Prompts
0	Read the docs pages Getting Started → Compositions, Sequence, interpolate, spring, Player	Human	Understand the code samples – can you explain useCurrentFrame() in one sentence?
1	Create src/remotion/components/TitleCard.tsx	Cursor	Component accepts { title, author }, centers text, fades in over 12 frames: opacity = interpolate(frame,[0,12],[0,1])
2	Create src/remotion/components/ImageSlide.tsx	Cursor	Accepts { src }, covers 100 %, scale-up from 0.95→1 using spring({ frame, fps, from: 0.95, to: 1 })
3	Register a new composition Demo in Root.tsx	Cursor	150 frames, 30 fps, 1280×720, defaultProps { title: 'Bazaar-Vid', author:'You', imageUrl:'/public/demo.jpg' }
4	Build timeline in src/remotion/compositions/DemoTimeline.tsx Structure: * Frames 0-60 → TitleCard * Frames 45-105 → ImageSlide (cross-over 15 frames) * Frames 105-150 → black outro with white text	Cursor	Use two <Sequence> components; for the cross-fade set style={{ opacity: interpolate(frame,[45,60],[0,1]) }}
5	Add <Player> demo page /src/app/remotion-demo/page.tsx (client component)	Cursor	Navigating to /remotion-demo shows the animation playing
6	Human test – run npm run remotion to open Studio; play the Demo composition, scrub timeline – no runtime errors?		
7	Render file locally: npx remotion render src/remotion/index.ts Demo out/demo.mp4	Cursor	File out/demo.mp4 exists, duration 5 s
8	Review code quality: Are prop types exported? Are absolute paths (~/…) used?	Human	Run npm run typecheck and npm run lint (should be clean)



⸻

4  Cheat-sheet (you’ll thank yourself later)

// Fade in over 20 frames
const opacity = interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: "clamp",
});

// Elastic pop
const scale = spring({
  fps,
  frame,
  config: { damping: 5, mass: 0.8, stiffness: 120 },
  from: 0.8,
  to: 1,
});

// Full-screen component wrapper
<AbsoluteFill className="items-center justify-center bg-black" />

Helper	When to use
AbsoluteFill	Full canvas; avoids manual positioning
Series	Simple “clip1 → clip2 → clip3” without calculating from
delayRender / continueRender	Async data fetch in Studio / render
prefetch()	Load heavy assets before first frame
Audio, Volume	same interpolate trick for volume envelopes



⸻

## What’s Left / Ongoing Tasks
- Continue hands-on experimentation with Remotion’s core APIs (especially transitions, audio, and reusable components).
- Document and solidify learnings from Remotion Studio experiments.
- Ensure all key Remotion concepts (assets, sequencing, transitions, etc.) are demoed in code.
- Prepare a knowledge base for LLM prompting and future onboarding.
- Only mark complete when all learning objectives and hands-on demos are done.

5  Next sprint preview ⏭️
	•	Wire JSON Patch events → update inputProps
	•	Start WebSocket plumbing (tRPC subscriptions)
	•	Replace placeholder chat with TanStack Query mutation calling GPT-4o

