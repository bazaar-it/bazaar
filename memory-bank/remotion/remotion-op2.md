Below is a “documentation-on-the-documentation” for Remotion, tailored to the Bazaar-Vid stack you just shared.
Think of it as a road-map: it tells you where in the official docs to look, what is most relevant for your flow, and sprinkles in ready-to-paste TypeScript / React snippets plus AI-prompt templates.

⸻

1 How the Remotion docs are organised (and what you actually need)

Docs section (URL slug)	Why you care for Bazaar-Vid
/the-fundamentals	High-level concept of Composition vs Sequence. Start here.  [oai_citation:0‡Remotion
/composition	API for <Composition>; needed once in src/Root.tsx.  [oai_citation:1‡Remotion
/sequence	API for <Sequence>; critical for your Scene[] → React bridge.  [oai_citation:2‡Remotion
/player	All props/events for @remotion/player; mirrors your PlayerShell.tsx.  [oai_citation:3‡Remotion
/lambda	Deploy & render on AWS; covers concurrency, memory and pricing knobs.  [oai_citation:4‡Remotion
/ai & /ai/system-prompt	Reference system prompt to teach GPT how to emit Remotion code.  [oai_citation:5‡Remotion
/…/audio, /audio/trimming	<Audio> usage, trimming, visualisation helpers.  [oai_citation:6‡Remotion
/transitioning	<TransitionSeries> and the 40+ canned transitions.  [oai_citation:8‡Remotion
/gif, /videos, /img	Specialised asset tags: GIF, video, image.  [oai_citation:9‡Remotion
/fonts	Google-font helper & custom font strategies.  [oai_citation:12‡Remotion
/data-fetching, /delay-render	Fetch JSON before render; pair with Neon + Drizzle.  [oai_citation:13‡Remotion

Keep this table handy—when Cursor asks “where do I learn X?”, jump to the matching slug.

⸻

2 Core primitives (cheat-sheet)

Purpose	Hook / Component	Minimal snippet
Get frame & fps	useCurrentFrame() + useVideoConfig()	ts const f = useCurrentFrame(); const {fps} = useVideoConfig();  [oai_citation:15‡Remotion
Map numbers	interpolate()	const opacity = interpolate(f,[0,20],[0,1]);  [oai_citation:16‡Remotion
Physics easing	spring()	const scale = spring({frame:f,fps,config:{stiffness:100}});  [oai_citation:17‡Remotion
Group clips	<Sequence>	from (offset) + durationInFrames.  [oai_citation:18‡Remotion
Full-screen layers	<AbsoluteFill>	Great for backgrounds / overlays.  [oai_citation:19‡Remotion
Image	<Img>	Lazy-loads & waits for pixel-perfect frames.  [oai_citation:20‡Remotion
Video	<OffthreadVideo>	FFmpeg-backed, frame-accurate.  [oai_citation:21‡Remotion
Audio	<Audio startFrom endAt>	Trim by frame counts.  [oai_citation:22‡Remotion
GIF	<Gif> from @remotion/gif	Syncs with useCurrentFrame().  [oai_citation:23‡Remotion



⸻

3 Assets & data
	•	staticFile()/getStaticFiles() → resolve files from /public at build time.  ￼ ￼
	•	prefetch(url) → warm an image/video so the Player never stutters.  ￼
	•	delayRender()/continueRender() → gate rendering until Neon query / fetch completes.  ￼

Example – fetch headline copy before first frame

export const NewsIntro: React.FC = () => {
  const handle = delayRender();
  const [headline, setHeadline] = useState<string>("Loading…");

  useEffect(() => {
    fetch("/api/top-headline")
      .then(r => r.json())
      .then(d => setHeadline(d.title))
      .finally(() => continueRender(handle));
  }, []);

  return <AbsoluteFill className="flex items-center justify-center text-5xl">{headline}</AbsoluteFill>;
};



⸻

4 Transitions 101

Wrap consecutive <Sequence> blocks in a <TransitionSeries> and pick a preset (slide, fade, wipe, …). All presets expose a timing prop—pass linearTiming({durationInFrames:20}) to avoid easing.  ￼

import {TransitionSeries, linearTiming} from "@remotion/transitions";
import {slide} from "@remotion/transitions/slide";

const TwoSlides = ({first, second}: {first: JSX.Element; second: JSX.Element}) => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={60}>
      {first}
    </TransitionSeries.Sequence>

    <TransitionSeries.Sequence durationInFrames={60} transition={slide()} timing={linearTiming({durationInFrames:20})}>
      {second}
    </TransitionSeries.Sequence>
  </TransitionSeries>
);



⸻

5 Fonts & text

Use @remotion/google-fonts/<FontName> for Google fonts—no CSS needed. Returns {fontFamily} to drop into style.  ￼
For local fonts, add public/fonts/MyFont.woff2, then:

import {loadFont} from "@remotion/google-fonts/Inter"; // optional fallback
const {fontFamily} = loadFont();

<AbsoluteFill style={{fontFamily, fontWeight:700}}>Hello!</AbsoluteFill>



⸻

6 Player integration tips for Next 15 App Router
	1.	Mark PlayerShell.tsx with "use client".
	2.	Import as:

import {Player} from "@remotion/player";


	3.	Forward your validated InputProps:

<Player
  component={DynamicVideo}
  durationInFrames={props.meta.duration}
  fps={30}
  compositionWidth={1920}
  compositionHeight={1080}
  inputProps={props}
  controls
  autoPlay
/>


	4.	Use prefetch() for any remote asset once the user lands on the project page.  ￼

⸻

7 Lambda rendering flow (fits your Route Handler)

import {deploySite, renderMediaOnLambda} from "@remotion/lambda"; // v4+
import {getFunctions} from "@remotion/lambda/client";

export const POST = async (req: Request) => {
  const {projectId} = await req.json();
  const props = await db.select().from(projects).where(eq(projects.id, projectId));

  // 1. Upload bundle (cached per commit hash)
  const {bucketName, serveUrl} = await deploySite({createIfNotExists:true});

  // 2. Kick off render
  const {renderId, bucketName: outBucket} = await renderMediaOnLambda({
    serveUrl,
    composition: "DynamicVideo",
    inputProps: props,
    codec: "h264",
  });

  return NextResponse.json({renderId, outBucket});
};

Lambda will scale horizontally; you only pay during encoding.  ￼

⸻

8 Mapping InputProps → Remotion scenes

export const DynamicVideo: React.FC<InputProps> = ({scenes}) => (
  <>
    {scenes.map(sc => (
      <Sequence
        key={sc.id}
        from={sc.start}
        durationInFrames={sc.duration}
      >
        <SceneRenderer scene={sc} />
      </Sequence>
    ))}
  </>
);

SceneRenderer switches on scene.type (text, image, custom) and (for custom) dynamic-imports the user-generated TSX from R2.

⸻

9 GPT-Vision prompt templates

Template 1 – single image → panning “Ken Burns”
System prompt

You are a Remotion senior engineer.  
Generate a JSX component called PanZoomImage that does a slow 5-second Ken-Burns on the given image URL.  
Use spring() for the scale from 1 → 1.12 and translateY from 0 → -60 px.  
Export default component.  

User prompt (image attached) – GPT Vision parses width/height and gives you code:

export const PanZoomImage: React.FC<{src: string}> = ({src}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({frame, fps, durationInFrames:150});
  const scale = 1 + progress * 0.12;
  const y = -60 * progress;
  return (
    <AbsoluteFill style={{transform:`scale(${scale}) translateY(${y}px)`}}>
      <Img src={src}/>
    </AbsoluteFill>
  );
};



⸻

Template 2 – two images → cross-fade transition

System prompt

Create a 10-second Remotion component that shows image A for 4 s, cross-fades to
image B over 1 s, then shows B for 5 s. Use `interpolate()` for both opacity
channels and wrap in <TransitionSeries> if you need.

Template 3 – audio-driven text beat

System prompt

Build a component that renders lines of lyrics timed from the
attached subtitle JSON. Use <Audio> with startFrom / endAt and animate opacity.
At the very end, slide the title in from the bottom using slideTransition().

Leverage the official System-Prompt page as a starting-point; copy its boilerplate and append your functional spec.  ￼

⸻

10 Common gotchas & best practices
	•	Always use React hooks inside the component – never calculate frame outside.  ￼
	•	Avoid fetching binary blobs in calculateMetadata – stick to JSON; videos/images belong in R2 or public/.  ￼
	•	Stall renders explicitly with delayRender() if you await Neon; otherwise Lambda errors out on timeout.  ￼
	•	Prefer <OffthreadVideo> over <Video> during renders for deterministic frames, but swap to <Video> inside the Player if you need ref access (docs snippet shows how).  ￼
	•	Minify bundle size: tree-shake unused transitions, avoid lodash-es, turn on esbuildMetafile in Lambda to inspect.
	•	Fonts: host .woff2 in R2 and load via FontFace if it’s not on Google Fonts.  ￼

⸻

🛠  Next steps for Bazaar-Vid
	1.	Scene → Sequence bridge above → drop into DynamicVideo.tsx.
	2.	PlayerShell: wire tRPC WS to patch state & call player.seekTo(time) if the LLM sets a currentTime patch.
	3.	Lambda Route: add R2 presigned URL upload step; store the returned URL in projects.outputUrl.
	4.	Cursor agent: feed Template 1/2/3 as few-shot examples so GPT-4o keeps structural fidelity.

Happy shipping! 🎬