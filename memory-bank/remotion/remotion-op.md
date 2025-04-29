Remotion Basics: Defining Compositions and Scenes

Remotion uses React components to define videos programmatically. The <Composition> component is the root of each video: it specifies properties like duration, resolution, frame rate, and references a child component that renders the actual content ￼ ￼. For example:

import {Composition} from 'remotion';
import {MyScene} from './MyScene';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MyVideo"
    component={MyScene}
    durationInFrames={300}
    width={1920}
    height={1080}
    fps={30}
    defaultProps={{}}
  />
);

Here MyScene is a React component (TSX) that will render frame-by-frame content. Compositions appear in the Remotion sidebar when developing, and each id must be unique ￼. Inside a composition, you can use <Sequence> blocks to divide the timeline into segments. A <Sequence> shifts its children’s start time by a given frame. For example:

import {Sequence, useCurrentFrame} from 'remotion';

const MyTrailer: React.FC = () => {
  return (
    <>
      {/* This segment spans frames 0–29 */}
      <Sequence durationInFrames={30}>
        <IntroScene />
      </Sequence>
      {/* This segment spans frames 30–59 (starts at frame 30) */}
      <Sequence from={30} durationInFrames={30}>
        <MiddleScene />
      </Sequence>
      {/* This runs from frame 60 until the end */}
      <Sequence from={60}>
        <FinalScene />
      </Sequence>
    </>
  );
};

By using <Sequence>, you can layer or chain scenes and animations over time. Children of a sequence use useCurrentFrame(), which will report a frame number offset by the sequence’s start ￼. This lets each scene component animate as if it started at frame 0. Use <AbsoluteFill> when you need a full-screen container: it’s a <div> absolutely positioned to fill the video canvas ￼. For example, to stack a video background under text:

import {AbsoluteFill, OffthreadVideo} from 'remotion';

const LayeredBackground: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill><OffthreadVideo src={staticFile('background.mp4')} /></AbsoluteFill>
    <AbsoluteFill><h1 style={{color: 'white'}}>Hello World</h1></AbsoluteFill>
  </AbsoluteFill>
);

The innermost layers render on top due to normal DOM stacking ￼.

Media Components: Images, Video, Audio, and Assets

Remotion provides dedicated React components for media. Use <Img> instead of a plain <img> to ensure the image is preloaded before rendering its frame. Remotion’s <Img> guarantees the image is fully loaded, avoiding flicker ￼. You can reference local static assets via staticFile(), which maps files in your public/ folder to usable URLs ￼. For example:

import {Img, staticFile} from 'remotion';

const LogoScene: React.FC = () => (
  <AbsoluteFill>
    <Img src={staticFile('/logo.png')} alt="Company Logo" />
  </AbsoluteFill>
);

(Remember to put the asset in public/logo.png so that staticFile("/logo.png") resolves correctly ￼.) You can also load remote images by giving <Img> an external URL ￼.

For video files, use <OffthreadVideo>. This works like a <Video>, but during rendering Remotion uses FFmpeg off the main thread to extract exact frames ￼. It supports trimming via props like startFrom and endAt, similarly to <Audio> ￼. For example, to play a video clip starting at frame 60 of a composition (assuming 30 fps) you could do:

<OffthreadVideo
  src={staticFile('clip.mp4')}
  startFrom={60}
/>

Audio is added via the <Audio> component. It accepts any Chromium-supported format and also works with staticFile URLs ￼. You can control volume or apply fades via the volume prop. Crucially, <Audio> supports startFrom and endAt props for trimming, letting you cut parts out ￼. For example, to play only the middle portion of an MP3:

<Audio src={staticFile('music.mp3')} startFrom={90} endAt={270} volume={0.8} />

Here the audio will begin 90 frames in and end at 270 frames.

Animations and Transitions

Remotion offers powerful animation helpers. Use useCurrentFrame() and useVideoConfig() to retrieve the current frame and composition settings inside your components. For custom animations, the spring() function is a physics-based tween generator ￼. For example:

const frame = useCurrentFrame();
const {fps} = useVideoConfig();
const scale = spring({frame, fps, config: {stiffness: 100}});

This produces a value that starts at 0 at frame 0 and eases to 1. The config (stiffness, damping, mass) can be tuned. Springs can even overshoot unless you set overshootClamping ￼.

To map a value (like a spring) to CSS properties, use interpolate(). This maps an input range to an output range, with optional clamping or easing ￼. For instance, to fade content in and out:

const frame = useCurrentFrame();
const {durationInFrames} = useVideoConfig();
const opacity = interpolate(
  frame,
  [0, 20, durationInFrames-20, durationInFrames],
  [0, 1, 1, 0]
);

This will ramp opacity from 0→1 in the first 20 frames, hold at 1, then fade out in the last 20 frames ￼ ￼. You can also interpolate the output of spring(): for example, use interpolate(driverValue, [0,1], [0,200]) to map a spring’s 0–1 output to pixel distance ￼.

For scene transitions, Remotion’s @remotion/transitions package provides a <TransitionSeries> component that works like a <Series> with built-in transitions between segments ￼. Inside <TransitionSeries>, you arrange <TransitionSeries.Sequence> blocks (like <Sequence>) and insert <TransitionSeries.Transition> elements in between. Pre-defined transitions include fade, slide, wipe, flip, clock wipe, and more. For example:

import {TransitionSeries, Timings} from '@remotion/transitions';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <FirstScene />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition>
    {/* Insert a crossfade transition */}
    <TransitionSeries.Transition type="fade" duration={30} />
  </TransitionSeries.Transition>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SecondScene />
  </TransitionSeries.Sequence>
</TransitionSeries>

This will fade out the first scene over 30 frames and reveal the second. (See Remotion docs for the full list of transition “presentations.”)

Loading and Waiting for Assets

Remotion can pause rendering until data or assets are ready. The delayRender() and continueRender() API lets you fetch data before committing a frame ￼. Call const handle = delayRender() at component init, perform async work (e.g. loading JSON or an image), then call continueRender(handle) to resume. For example:

import {useState, useEffect} from 'react';
import {delayRender, continueRender} from 'remotion';

export const DataScene: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [handle] = useState(() => delayRender());

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('https://api.example.com/data');
      setData(await res.json());
      continueRender(handle);
    }
    fetchData();
  }, [handle]);

  if (!data) {
    return null; // nothing to render until data loaded
  }
  return <div>{JSON.stringify(data)}</div>;
};

This ensures Remotion waits (up to a 30-second default timeout) for the fetch to finish ￼.

Fonts and Styling

Remotion automatically waits for fonts to load before rendering frames (since v2.2) ￼. For Google Fonts, you can use the @remotion/google-fonts helper. For example:

import {loadFont} from '@remotion/google-fonts/Roboto';

const {fontFamily} = loadFont();
const Title: React.FC = () => <h1 style={{fontFamily}}>Hello, Roboto!</h1>;

This imports Roboto and returns a { fontFamily } string to use in your styles ￼. Alternatively, you can import a Google Fonts CSS link in a file and include it, though Remotion’s Google fonts package is cleaner.

For custom/local fonts, put the font file (e.g. MyFont.woff2) in public/ and use the @remotion/fonts API or the browser’s FontFace API. For example, using @remotion/fonts:

// load-fonts.ts
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const fontFamily = loadFont({
  family: 'MyFont',
  src: staticFile('/MyFont.woff2'),
});

Then use fontFamily in your components. Remotion will embed and use the font in the video.

Styling can use regular CSS-in-JS or frameworks like Tailwind. Remotion provides an official Tailwind integration, but note that <AbsoluteFill> has inline styles that can override classes ￼ ￼. In general, use CSS/JSX styles or utility classes as you would in a web app.

Project Structure and Scalability

For rapid iteration and modularity, organize your Remotion project as a set of scene components and a root. A common pattern is:
	•	src/index.ts – calls registerRoot(Root) (Boilerplate).
	•	src/Root.tsx – exports one or more <Composition> entries (registers compositions for the studio/CLI).
	•	src/scenes/* – directory of React components, one per scene or template.

For example, you might have scenes/Intro.tsx, scenes/Showcase.tsx, etc. Each scene is a React component using Remotion primitives. The Root can then register multiple compositions if needed (e.g. different video templates).

To allow flexibility, design scenes to accept props (text, colors, durations) so they can be reused. Remotion supports “Parameterized videos”: you pass inputProps when rendering a composition to inject data ￼. For instance, your Composition might have defaultProps={{ title: 'Hello' }}, but when rendering on demand you can override with renderVideo({ inputProps: { title: 'Goodbye' } }). This lets you use JSON or API data to fill in scenes. The Remotion documentation emphasizes defining a JSON schema and default props for a composition ￼.

For JSON-driven scene mapping, one approach is to define a scene list or configuration in JSON and then map it to React components. Example:

// scenes.json
[
  { "type": "intro", "text": "Welcome to Bazaar-Vid", "duration": 60 },
  { "type": "imageShot", "src": "https://.../screenshot1.png", "duration": 90 },
  { "type": "outro", "text": "Thank you!", "duration": 60 }
]

Then in your composition component, parse this:

import scenes from './scenes.json';

export const VideoScenes: React.FC = () => {
  return (
    <>
      {scenes.map((scene, i) => {
        switch (scene.type) {
          case 'intro':
            return (
              <Sequence key={i} durationInFrames={scene.duration}>
                <IntroScene text={scene.text} />
              </Sequence>
            );
          case 'imageShot':
            return (
              <Sequence key={i} durationInFrames={scene.duration}>
                <ImageScene src={scene.src} />
              </Sequence>
            );
          // add more scene types as needed
        }
      })}
    </>
  );
};

This makes your code modular and driven by data. You can generate or update the JSON configuration via user input or GPT.

Ensure your code is structured for fast builds: avoid huge monolithic components. Split logic (animation definitions, asset loading, UI) into small React components. That way, HMR (hot-reload) and bundling stay snappy. Each scene can live in its own file, and use shared hooks or utilities (e.g. an animations.tsx for common interpolations).

User Uploads and Automated Code Generation

User Assets: Bazaar-Vid allows users to upload images (screenshots, logos, etc.). Those should be stored (e.g. in Cloudflare R2) and then fed into Remotion. For images, you can use them directly in <Img> by URL. For videos (if future support), use <OffthreadVideo src={userVideoUrl} /> as shown in Remotion docs ￼. Typically, after a user uploads, your app gets back an R2 URL (since R2 is S3-compatible, you can use it with s3OutputProvider ￼). You could also use a blob URL during upload to preview locally, then switch to the R2 URL once available ￼.

Automatic Code Gen with GPT-4 Vision: To turn images or screenshots into Remotion scenes, Bazaar-Vid can leverage GPT-4 with vision. Remotion even provides a system prompt template for LLMs ￼. You would prompt GPT-4 with the content of the image (e.g. “This screenshot has a header ‘Sales Report 2025’, a chart, and a company logo”). Instruct it to output valid React/TypeScript code using Remotion components. For example:

You are a Remotion video code generator. Given this description of an image: [image alt-text or analysis], generate a TSX component that uses <AbsoluteFill>, <Img>, <Sequence>, and any animations to recreate the scene. Use staticFile() for any uploaded image references.

The Remotion LLM prompt suggests always producing valid TSX and using <Composition> structure ￼. You might say: “Include <Animation> or <spring> for transitions, and <staticFile> for logos/images.” For instance, if the image is a company logo on a white background, GPT might output:

import {AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';

export const LogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  // fade in
  const opacity = interpolate(frame, [0, 20], [0, 1]);
  return (
    <AbsoluteFill style={{backgroundColor: 'white', justifyContent: 'center', alignItems: 'center'}}>
      <Img src={staticFile('logo.png')} style={{opacity, width: '50%'}} />
    </AbsoluteFill>
  );
};

Bazaar-Vid can feed the user’s uploaded asset (e.g. the logo’s R2 URL) or its description to GPT-4V and ask for code. The Remotion system prompt guide ￼ can be adapted: remind the AI of required imports (registerRoot, etc.), and that the code must compile. You might predefine templates in GPT’s prompt for common patterns (text slide, image slide, chart animation). Then GPT-4 can combine these into a new scene.

As a best practice, validate or sanitize GPT’s output. You might wrap the generated code in a try/catch or use TypeScript compiler APIs to ensure it’s valid TSX before evaluating. This lets users upload anything and get a quick animated preview while your system refines the code.

Rendering and Optimization (Lambda, R2, and Bundling)

For fast and scalable rendering, use Remotion Lambda (AWS Lambda) behind the scenes ￼. Lambda can render in parallel and stitch segments quickly. Key practices:
	•	Chunk Size: Configure framesPerLambda to balance concurrency and overhead. Smaller chunks = more Lambdas in parallel (faster wall-clock) but more overhead ￼. Experiment to find a sweet spot.
	•	Memory: Lambda speed increases with memory (and vCPU) ￼. Increase memory up to what’s cost-effective for your use.
	•	Persistence: Leverage function reuse (keeping browsers alive between invocations) if possible, and avoid reloading heavy assets repeatedly.
	•	Asset Hosting: Use Cloudflare R2 (S3-compatible) to store both input assets (user uploads, logos) and output videos. R2 has no egress fees ￼. Configure Remotion’s s3OutputProvider with your R2 credentials as shown in Remotion docs ￼.

Bundle size and startup time matter. Keep your Remotion project lean: only import necessary packages. Avoid very large assets in public/ that bloat the build. When using NPM packages, pin versions (--save-exact) to prevent unnecessary updates ￼.

For bundling, Remotion uses a custom bundler. You can enable preloading of assets (via @remotion/preload or <Img> itself) to cache images/fonts so the player or Lambda doesn’t stall. In Lambda specifically, ensure your renderMediaOnLambda() calls use speculateFunctionName() to skip an API list call ￼.

To minimize costs, stop Lambda after each render (continueRender will auto-finish). You might also use Remotion Cloud Run as an alternative (especially if avoiding AWS is preferred). But R2 integration is already covered in the AWS Lambda docs ￼.

Best Practices and Extensibility
	•	Templates with Flexibility: Provide a set of base templates (e.g. “Title + logo”, “Bullet points”, “Image with caption”) that users can start from, but allow them to override or extend. Represent templates as both React components and data JSON, so they can be modified by AI or user input.
	•	Scene Independence: Write scenes as self-contained components. This makes testing and reuse easier. E.g., <ImageSlide src="..." text="...">.
	•	Clear Props/Defaults: Define defaultProps for each composition and component. Use PropTypes or zod schemas (Remotion supports Zod for schema validation) to ensure user data matches expected format. This prevents runtime errors.
	•	Error Handling: If user-provided data is missing, handle it gracefully (e.g. show placeholders). Catch fetch or asset load errors (using <Img onError={...}> callbacks if needed) to avoid complete failure.
	•	Optimization: Keep the frame dimensions reasonable (1080p or 720p for previews). Let users choose higher quality output for final render if needed. Use frame { interpolate(..., [0,1], [1,0]) } clamping to avoid artifacts.
	•	Feedback Loop: As users describe scenes in natural language, break down their request into structured scene definitions (JSON), then feed those to Remotion. Use GPT-4 for the translation, but have fallbacks or user edits for adjustments.
	•	Documentation and Comments: When generating code via AI, add comments in TSX for maintainability. Remotion’s system prompt suggests explaining what each part does. This also helps you debug or refine.

By combining React’s modularity with Remotion’s animation primitives, and leveraging AI for generation, Bazaar-Vid can offer both template-driven and freeform video creation. Users can pick a base layout and then freely customize by voice or text. The code remains composable and quick to iterate: small component changes (like a new spring() config) reflect in seconds. Remotion’s live preview (via <Player>) means users see instant feedback in the web UI ￼. When ready to finalize, trigger a Lambda render to produce the high-quality video.

In Summary: Use <Composition>, <Sequence>, <AbsoluteFill> for structure; <Img>, <OffthreadVideo>, <Audio> for media; spring() and interpolate() for animations; delayRender/continueRender to await async assets. Manage fonts with @remotion/google-fonts or @remotion/fonts. Structure your project into reusable scenes and parameterize them with JSON/props ￼. Integrate GPT-4 Vision via smart prompts (guided by Remotion’s [AI system prompt] ￼) to translate user images into code. Finally, render and scale with Remotion Lambda (and R2 storage) using best practices for concurrency and cost ￼ ￼. This approach yields a modular, scalable Remotion codebase that powers Bazaar-Vid’s interactive video generation.