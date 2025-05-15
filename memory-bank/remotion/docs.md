TITLE: Installing Remotion Dependencies using npm (Bash)
DESCRIPTION: Installs Remotion core, player, CLI, React, ReactDOM as main dependencies, and associated TypeScript types and the Vite React plugin as development dependencies using the npm package manager. This is the first step in setting up Remotion within a Vue project.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/vue.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npm i remotion @remotion/player @remotion/cli react react-dom
npm i --save-dev @types/react @types/react-dom @vitejs/plugin-react
```

----------------------------------------

TITLE: Registering the Remotion Root Component as the Entry Point in TypeScript
DESCRIPTION: Creates the `remotion/index.ts` file, which serves as the Remotion entry point. It imports `registerRoot` from Remotion and the previously defined `RemotionRoot` component. Calling `registerRoot(RemotionRoot)` makes this file the designated entry point for Remotion tools like the Studio and renderer, connecting the defined compositions to the framework. Depends on the `remotion` package.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/brownfield-installation.mdx#_snippet_2

LANGUAGE: ts
CODE:
```
```ts twoslash title="remotion/index.ts"
// @filename: Composition.tsx
export const MyComposition: React.FC = () => {
  return null;
};
// @filename: Root.tsx
import React from "react";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
// @filename: index.ts
// ---cut---
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```
```

----------------------------------------

TITLE: Scaffolding a Remotion Project using pnpm
DESCRIPTION: This command uses pnpm's `create` command to scaffold a new Remotion project, specifically requesting the 'video' template (equivalent to Remotion's scaffolder). It prompts the user for further configuration. This is the command to use with the pnpm package manager.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/getting-started.mdx#_snippet_1

LANGUAGE: bash
CODE:
```
```bash title="Use pnpm as the package manager"
pnpm create video
```
```

----------------------------------------

TITLE: Defining a Video Composition in Remotion (TypeScript/React)
DESCRIPTION: This snippet demonstrates the structure of the `Root.tsx` file. It defines a React functional component (`Root`) that uses the `Composition` component from 'remotion' to define a video render. Key props include `id`, `component` (the React component to render), `durationInFrames`, `width`, `height`, `fps`, and `defaultProps` for the rendered component.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_1

LANGUAGE: tsx
CODE:
```
import {Composition} from 'remotion';
import {MyComp} from './MyComp';

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id="MyComp"
				component={MyComp}
				durationInFrames={120}
				width={1920}
				height={1080}
				fps={30}
				defaultProps={{}}
			/>
		</>
	);
};
```

----------------------------------------

TITLE: Registering Root Component in Remotion (TypeScript)
DESCRIPTION: This snippet shows the typical entry file (`src/index.ts`) for a Remotion project. It imports the `registerRoot` function from 'remotion' and the main `Root` component from './Root', then calls `registerRoot` to register the `Root` component as the application's entry point.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_0

LANGUAGE: ts
CODE:
```
import {registerRoot} from 'remotion';
import {Root} from './Root';

registerRoot(Root);
```

----------------------------------------

TITLE: Initializing a New Remotion Project via npx (Shell)
DESCRIPTION: This shell command uses `npx` to execute the latest version of the `create-video` package. This is the recommended method for scaffolding a new Remotion project, setting up the basic structure and dependencies. Requires Node.js and npm (including npx) to be installed.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/success-stories/2025-04-02-a-million-dollars.mdx#_snippet_0

LANGUAGE: shell
CODE:
```
npx create-video@latest
```

----------------------------------------

TITLE: Starting Dev Server and Studio (Regular Templates)
DESCRIPTION: After scaffolding a Remotion project using a regular template (like 'Hello World'), this command starts the development server and the Remotion Studio. It assumes the project uses standard npm scripts.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/getting-started.mdx#_snippet_4

LANGUAGE: bash
CODE:
```
```bash
npm run dev
```
```

----------------------------------------

TITLE: Defining Video Composition in Remotion - TypeScript/TSX
DESCRIPTION: Configures the Remotion video root, declaring a composition with defined width, height, duration, and frames-per-second settings. Requires the Remotion library and React. The Composition component references MyComposition, which should implement the video logic. Inputs: explicit frame count, dimensions, and component. Outputs a composition registration for Remotion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/learn/2022-12-22-apple-wow.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
import {Composition} from 'remotion';
export const MyComposition: React.FC = () => null;
// ---cut---
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComp"
        component={MyComposition}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
```

----------------------------------------

TITLE: Implementing Variable Speed Video Segments in Remotion (TypeScript)
DESCRIPTION: This TSX snippet defines a configuration array `segments` where each object specifies the original duration and desired playback speed for a part of the video. The `accumulateSegments` function calculates the actual start frame, end frame, playback speed, and the point in the source video time for each segment based on the variable speeds. The `SpeedSegments` component uses the `useCurrentFrame` hook to determine the current segment, then utilizes Remotion's `Sequence` and `OffthreadVideo` components to render only the active segment. It dynamically sets the `startFrom` property (time in the source video) and `playbackRate` for the `OffthreadVideo` based on the current segment's calculated data. It requires the `remotion` library and a video file (e.g., 'bigbuckbunny.mp4' accessed via `staticFile`). Note the specific handling of the `src` prop with `#t=0,` to opt-out of Remotion's automatic media fragment addition.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/different-segments-at-different-speeds.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';

const segments = [
  {
    duration: 100,
    speed: 0.5,
  },
  {
    duration: 100,
    speed: 1,
  },
  {
    duration: 200,
    speed: 2,
  },
  {
    duration: 400,
    speed: 4,
  },
];

type AccumulatedSegment = {
  start: number;
  passedVideoTime: number;
  end: number;
  speed: number;
};

export const accumulateSegments = () => {
  const accumulatedSegments: AccumulatedSegment[] = [];
  let accumulatedDuration = 0;
  let accumulatedPassedVideoTime = 0;

  for (const segment of segments) {
    const duration = segment.duration / segment.speed;
    accumulatedSegments.push({
      end: accumulatedDuration + duration,
      speed: segment.speed,
      start: accumulatedDuration,
      passedVideoTime: accumulatedPassedVideoTime,
    });

    accumulatedPassedVideoTime += segment.duration;
    accumulatedDuration += duration;
  }

  return accumulatedSegments;
};

export const SpeedSegments = () => {
  const frame = useCurrentFrame();
  const accumulated = accumulateSegments();

  const currentSegment = accumulated.find(
    (segment) => frame > segment.start && frame <= segment.end,
  );

  if (!currentSegment) {
    return;
  }

  return (
    <Sequence from={currentSegment.start}>
      <OffthreadVideo
        pauseWhenBuffering
        startFrom={currentSegment.passedVideoTime}
        // Remotion will automatically add a time fragment to the end of the video URL
        // based on `startFrom`. Opt out of this by adding one yourself.
        // https://www.remotion.dev/docs/media-fragments
        src={`${staticFile('bigbuckbunny.mp4')}#t=0,`}
        playbackRate={currentSegment.speed}
      />
    </Sequence>
  );
};
```

----------------------------------------

TITLE: Calculating Fade-in Opacity using interpolate() in TypeScript
DESCRIPTION: Demonstrates calculating opacity for a simple fade-in effect. The `interpolate` function maps the current frame number (input, from 0 to 20) to an opacity value (output, from 0 to 1). It requires the `interpolate` and `useCurrentFrame` hooks from the 'remotion' library.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate.mdx#_snippet_0

LANGUAGE: ts
CODE:
```
import { interpolate, useCurrentFrame } from "remotion";

const frame = useCurrentFrame(); // 10
const opacity = interpolate(frame, [0, 20], [0, 1]); // 0.5
```

----------------------------------------

TITLE: Defining <AbsoluteFill> Styles in TypeScript
DESCRIPTION: Defines the `React.CSSProperties` object representing the default inline styles applied by the `<AbsoluteFill>` component. These styles make the element cover its parent completely using absolute positioning (top, left, right, bottom set to 0, width and height to 100%) and use flexbox (display: flex, flexDirection: column) for layout within the fill.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/absolute-fill.mdx#_snippet_0

LANGUAGE: ts
CODE:
```
import React from 'react';
// ---cut---
const style: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};
```

----------------------------------------

TITLE: Using the interpolate Helper for Animations in Remotion (React TSX)
DESCRIPTION: This snippet demonstrates using Remotion's `interpolate` function as a more readable alternative for creating animations. It maps the current frame number (input range `[0, 60]`) to an opacity value (output range `[0, 1]`). The `extrapolateRight: "clamp"` option prevents the opacity from exceeding 1 after frame 60. This achieves the same fade-in effect as the previous example but in a more declarative way. It depends on the `frame` variable obtained via `useCurrentFrame`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/animating-properties.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
```tsx twoslash
import { useCurrentFrame } from "remotion";
const frame = useCurrentFrame();
// ---cut---
import { interpolate } from "remotion";

const opacity = interpolate(frame, [0, 60], [0, 1], {
  /*                        ^^^^^   ^^^^^    ^^^^
  Variable to interpolate ----|       |       |
  Input range ------------------------|       |
  Output range -------------------------------|  */
  extrapolateRight: "clamp",
});
```
```

----------------------------------------

TITLE: Installing Project Dependencies using npm
DESCRIPTION: This command uses npm (Node Package Manager) to download and install all the dependencies listed in the project's `package.json` file. This step is necessary to set up the project environment before development or rendering.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-javascript/README.md#_snippet_0

LANGUAGE: console
CODE:
```
npm install
```

----------------------------------------

TITLE: Installing Remotion Project Dependencies using NPM
DESCRIPTION: This command uses the Node Package Manager (NPM) to install all the necessary dependencies defined in the project's `package.json` file. Running this command is typically the first step required after cloning or creating a new Remotion project to ensure all required libraries are downloaded.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-helloworld/README.md#_snippet_0

LANGUAGE: console
CODE:
```
npm install
```

----------------------------------------

TITLE: Initializing a New Remotion Project (Shell)
DESCRIPTION: These commands are used to create a new Remotion video project. `npm init video` uses npm, while `yarn create video` uses yarn. They set up the basic file structure and dependencies for a new project. The context explains that a new 'empty' template is now available via these commands, offering a minimal starting point for users familiar with Remotion. Requires Node.js and either npm or yarn to be installed.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-10-26-remotion-2-5.mdx#_snippet_1

LANGUAGE: shell
CODE:
```
npm init video
```

LANGUAGE: shell
CODE:
```
yarn create video
```

----------------------------------------

TITLE: Initializing a New Remotion Project using Yarn
DESCRIPTION: This command uses Yarn's `create` utility to scaffold a new Remotion video project. It assumes that Yarn is already installed on the system. Running this command sets up the basic file structure and dependencies needed to start developing a video with Remotion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-02-08-introducing-remotion.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
yarn create video
```

----------------------------------------

TITLE: Using the `component` Prop for Remotion Composition (TSX)
DESCRIPTION: This example illustrates how to use the `component` prop of the `<Composition>` component. It defines a simple root component `MyVideo` which renders a composition identified by `"my-comp"`. The visual content of the composition is provided by the `MyComp` component, which is directly imported and passed to the `component` prop. Essential metadata like dimensions, FPS, and duration are also specified.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/composition.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
```tsx twoslash
// @allowUmdGlobalAccess
// @filename: ./MyComp.tsx
export const MyComp = () => <></>;

// @filename: index.tsx
// ---cut---
import { Composition } from "remotion";
import { MyComp } from "./MyComp";

export const MyVideo = () => {
  return (
    <>
      <Composition
        id="my-comp"
        component={MyComp}
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={3 * 30}
      />
    </>
  );
};
```
```

----------------------------------------

TITLE: Initializing a Blank Remotion Project (npm)
DESCRIPTION: Uses npm to initialize a new, blank Remotion video project in the current directory. This command sets up the basic file structure and dependencies required for a Remotion project.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dataset-render.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npm init video --blank
```

----------------------------------------

TITLE: Defining a Reusable Title Component in Remotion (TypeScript)
DESCRIPTION: This snippet defines a basic React functional component named `Title` for use in Remotion. It accepts a `title` string as a prop. Inside the component, it uses the `useCurrentFrame` hook to get the current frame number and `interpolate` to create a fade-in effect over the first 20 frames by animating the opacity style. The component renders a `div` element displaying the title text.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/sequences.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import {interpolate, useCurrentFrame, AbsoluteFill} from 'remotion'

const Title: React.FC<{title: string}> = ({title}) => {
    const frame = useCurrentFrame()
    const opacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'})

    return (
      <div style={{opacity, textAlign: "center", fontSize: "7em"}}>{title}</div>
    );
}
```

----------------------------------------

TITLE: Rendering Current Frame Using Remotion and React (TypeScript)
DESCRIPTION: Defines a functional React component that displays the current frame using the useCurrentFrame hook from Remotion. Requires 'remotion' package installed. The AbsoluteFill component is used for centering the text and filling the background. Expects Remotion runtime to provide the current frame context. Inputs are determined by Remotion's internal timing, and the output is a styled component showing the frame number. Should be included in a registered composition for video rendering.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/the-fundamentals.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import { AbsoluteFill, useCurrentFrame } from \"remotion\";

export const MyComposition = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        justifyContent: \"center\",
        alignItems: \"center\",
        fontSize: 100,
        backgroundColor: \"white\",
      }}
    >
      The current frame is {frame}.
    </AbsoluteFill>
  );
};
// - MyComposition
```

----------------------------------------

TITLE: Accessing Current Frame in Remotion Component (TypeScript/React)
DESCRIPTION: This snippet illustrates a basic React functional component (`MyComp`) within a Remotion project. It uses the `useCurrentFrame` hook imported from 'remotion' to get the current frame number (starting from 0) being rendered and displays it within a div element.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_2

LANGUAGE: tsx
CODE:
```
import {useCurrentFrame} from 'remotion'; // Added import based on description

export const MyComp: React.FC = () => {
	const frame = useCurrentFrame();
	return <div>Frame {frame}</div>;
};
```

----------------------------------------

TITLE: Scaffolding a Next.js Remotion Video App (Node.js, Bash)
DESCRIPTION: Bootstraps a new Remotion-powered video app using the Next.js Pages directory through the interactive npx create-video command. This command downloads and runs the latest create-video npm package, initializing the specified template structure. It can be run in any directory and guides the user through setup prompts. Requires Node.js and internet access. Resulting files include the example app structure and dependencies.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-next-pages/README.md#_snippet_1

LANGUAGE: bash
CODE:
```
npx create-video@latest --next-pages-dir
```

----------------------------------------

TITLE: Registering a Basic Remotion Composition (TSX)
DESCRIPTION: This snippet demonstrates the fundamental usage of the `<Composition>` component within a Remotion root component (`RemotionRoot`). It shows how to register a video by providing essential properties like the component to render (`component`), duration (`durationInFrames`), dimensions (`width`, `height`), frame rate (`fps`), and a unique identifier (`id`). `defaultProps` is shown as an empty object.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/composition.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="src/Root.tsx"
const Component: React.FC = () => null;
// ---cut---

import { Composition } from "remotion";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        component={Component}
        durationInFrames={300}
        width={1080}
        height={1080}
        fps={30}
        id="test-render"
        defaultProps={{}}
      />
      {/* Additional compositions can be rendered */}
    </>
  );
};
```
```

----------------------------------------

TITLE: Rendering Video with Remotion and Input Props in GitHub Actions - YAML
DESCRIPTION: This YAML snippet sets up a GitHub Actions workflow that renders a Remotion video, allowing user-defined input properties for dynamic rendering. The workflow adds input fields for 'titleText' and 'titleColor', captures user input, serializes it to a JSON file, and passes it as props to the Remotion CLI during rendering. Key dependencies include the Remotion project, Node.js, and the Remotion CLI. Parameters 'titleText' and 'titleColor' control video customization. The main output is a rendered MP4 artifact, enabling flexible, parameterized video generation from a CI/CD environment.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ssr.mdx#_snippet_1

LANGUAGE: yaml
CODE:
```
name: Render video\non:\n  workflow_dispatch:\n    inputs:\n      titleText:\n        description: 'Which text should it say?'\n        required: true\n        default: 'Welcome to Remotion'\n      titleColor:\n        description: 'Which color should it be in?'\n        required: true\n        default: 'black'\njobs:\n  render:\n    name: Render video\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@main\n      - uses: actions/setup-node@main\n      - run: npm i\n      - run: echo $WORKFLOW_INPUT > input-props.json\n        env:\n          WORKFLOW_INPUT: ${{ toJson(github.event.inputs) }}\n      - run: npx remotion render MyComp out/video.mp4 --props="./input-props.json"\n      - uses: actions/upload-artifact@v4\n        with:\n          name: out.mp4\n          path: out/video.mp4\n
```

----------------------------------------

TITLE: Implementing Animation with Remotion Hooks in TSX
DESCRIPTION: This snippet demonstrates creating an animation in Remotion using React functional components and hooks. It shows a circle changing color and moving horizontally. The animation logic relies on `useCurrentFrame` to get the current time, `interpolate` and `interpolateColors` for smooth transitions between values based on the frame, and `spring` for physics-based animation. The component renders a `div` styled dynamically based on these calculated values.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/compare/motion-canvas.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {
  AbsoluteFill,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const MyComp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colorChange = interpolate(frame, [0, 60], [0, 1], {
    extrapolateRight: "clamp",
  });

  const spr = spring({
    fps,
    frame: frame - 60,
  });
  const translateX = interpolate(spr, [0, 1], [0, 300]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: interpolateColors(
            colorChange,
            [0, 1],
            ["#e6a700", "#e13238"],
          ),
          transform: `translateX(${translateX}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Rendering a Video with Remotion CLI - Console
DESCRIPTION: Initiates the video rendering process from the terminal by executing \"npx remotion render\". This command compiles the Remotion video project with current parameters and exports it as a final video file (typically MP4 or similar format). Dependencies must be installed before running. Output is the rendered video saved to disk.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-music-visualization/README.md#_snippet_2

LANGUAGE: console
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Controlling Remotion Player Imperatively with PlayerRef (TypeScript/React)
DESCRIPTION: Demonstrates initializing a React ref to the PlayerRef, accessing imperative methods like getCurrentFrame(), and rendering the Player component with props such as durationInFrames, compositionWidth, and component. Requires '@remotion/player', React, and a defined composition. The ref enables calls to player API functions from component contexts, with inputs/outputs as typed PlayerRef methods. Limitations: Assumes the Remotion Player runtime is available and the ref is properly set.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/api.mdx#_snippet_7

LANGUAGE: TSX
CODE:
```
export const MyComposition: React.FC = () => null;

import {Player, PlayerRef} from '@remotion/player';
import {useEffect, useRef} from 'react';
import {MyComposition} from './MyComposition';

const MyComp: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    if (playerRef.current) {
      console.log(playerRef.current.getCurrentFrame());
    }
  }, []);

  return (
    <Player
      ref={playerRef}
      durationInFrames={30}
      compositionWidth={1080}
      compositionHeight={1080}
      fps={30}
      component={MyComposition}
      // Many other optional props are available.
    />
  );
};
```

----------------------------------------

TITLE: Registering the Remotion Root - React (TSX)
DESCRIPTION: Demonstrates how to register the root of Remotion compositions. Uses registerRoot from remotion to register the main video composition component, making it discoverable by Remotion Studio and CLI tools. Assumes MyVideo is imported from './Video' and that both remotion and correct composition bindings exist.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/player-integration.mdx#_snippet_6

LANGUAGE: tsx
CODE:
```
// @filename: ./Root.tsx
export const MyVideo: React.FC<{text: string}> = () => <><\/>;

// ---cut---
import {registerRoot} from 'remotion';
import {MyVideo} from './Video';

registerRoot(MyVideo);
```

----------------------------------------

TITLE: Example: Using useDelayRender to Control Rendering in a Remotion React Component (TypeScript)
DESCRIPTION: This example demonstrates how to use the useDelayRender hook in a functional React component to delay rendering until asynchronous data fetching has completed. Dependencies include React (useCallback, useEffect, useState), Remotion's API, and a network endpoint. The component initializes the delayed render, fetches API data, and resumes rendering by calling continueRender once data is loaded. The most significant parameters are the API endpoint and the continueRender callback. Output is a rendered React element with fetched data, and improper handling of the callback can lead to indefinite rendering delays.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/use-delay-render.mdx#_snippet_1

LANGUAGE: TypeScript
CODE:
```
import { continueRender, delayRender } from \"remotion\";

type ContinueRenderFnBound = () => void;

export const useDelayRender = (label?: string): ContinueRenderFnBound => {
  const [handle] = useState(() => delayRender(label));

  return useCallback(() => {
    continueRender(handle);
  }, [handle]);
};

// ---cut---

import { useCallback, useEffect, useState } from \"react\";

export const MyVideo = () => {
  const [data, setData] = useState(null);
  const continueRender = useDelayRender();

  const fetchData = useCallback(async () => {
    const response = await fetch(\"http://example.com/api\");
    const json = await response.json();
    setData(json);

    continueRender();
  }, [continueRender]);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      {data ? (
        <div>This video has data from an API! {JSON.stringify(data)}</div>
      ) : null}
    </div>
  );
};
```

----------------------------------------

TITLE: Illustrating Anti-Pattern for Randomness in Remotion TSX Components
DESCRIPTION: Demonstrates an incorrect way to generate random values within a Remotion component using `Math.random()` inside `useState`. This approach causes inconsistent values during multi-threaded rendering because each rendering instance will produce different random numbers, leading to visual discrepancies. This snippet serves as a warning against this common mistake.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-02-26-remotion-1-4.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx {5-6}
export const MyComp = () => {
  // ⚠️ Bug! Random values will change during render
  const [particles] = useState(() => {
    return new Array(100).fill(true).map(() => ({
      x: Math.random(),
      y: Math.random(),
    }));
  });
};
```
```

----------------------------------------

TITLE: Rendering a Video Locally using Remotion (Node.js, Bash)
DESCRIPTION: Uses the Remotion CLI to programmatically render a video composition locally based on project code. This command is executed in the root of a Remotion-integrated project. Requires all dependencies to be installed and the composition to be properly configured. Outputs media files to a target directory.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-next-pages/README.md#_snippet_4

LANGUAGE: bash
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Installing Dependencies with npm - Console
DESCRIPTION: Installs all required Node.js packages defined in the project\'s package.json by running \"npm install\". This prepares the development environment for using Remotion and associated tools. It should be run prior to using the Remotion CLI commands for previewing or rendering videos. The output of this command is a node_modules folder populated with necessary dependencies.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-music-visualization/README.md#_snippet_0

LANGUAGE: console
CODE:
```
npm install
```

----------------------------------------

TITLE: Initializing a Remotion Project using Yarn
DESCRIPTION: Shell command to bootstrap a new Remotion video project using the Yarn package manager. It sets up the necessary file structure and installs initial dependencies.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-03-03-remotion-1-5.mdx#_snippet_0

LANGUAGE: sh
CODE:
```
yarn create video
```

----------------------------------------

TITLE: Sequencing Multiple Title Components in Remotion (TypeScript)
DESCRIPTION: This snippet illustrates how to use the Remotion `<Sequence>` component to control the timing of multiple instances of the `Title` component. It renders two titles sequentially: the first (`"Hello"`) appears for the first 40 frames (`durationInFrames={40}`), and the second (`"World"`) appears starting from frame 40 (`from={40}`). The `useCurrentFrame` hook within the second `Title` instance will return values relative to its sequence's start time (frame 40). This requires the `Title` component (implicitly included via `// @include: example-Title`) and the `remotion` library.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/sequences.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
// @include: example-Title
// ---cut---
import {Sequence, AbsoluteFill} from 'remotion'; // Added AbsoluteFill based on context

export const MyVideo = () => {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={40}>
        <Title title="Hello" />
      </Sequence>
      <Sequence from={40}>
        <Title title="World" />
      </Sequence>
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Layering Elements with AbsoluteFill in Remotion (TypeScript)
DESCRIPTION: This snippet demonstrates how to use the AbsoluteFill component from Remotion to layer elements in a React video composition. It imports AbsoluteFill, Img, and staticFile, then layers an image and text by stacking AbsoluteFill containers. The lowest AbsoluteFill renders the background image, while a higher AbsoluteFill renders an overlaying text. No external dependencies are needed beyond the Remotion library. All props and JSX elements are shown unmodified; the overlay text appears above the image, and the output is a video frame with the image background and overlaid heading.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/layers.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import React from 'react';\nimport {AbsoluteFill, Img, staticFile} from 'remotion';\n\nexport const MyComp: React.FC = () => {\n  return (\n    <AbsoluteFill>\n      <AbsoluteFill>\n        <Img src={staticFile('bg.png')} />\n      </AbsoluteFill>\n      <AbsoluteFill>\n        <h1>This text appears on top of the video!</h1>\n      </AbsoluteFill>\n    </AbsoluteFill>\n  );\n};
```

----------------------------------------

TITLE: Installing Node.js v20 via NodeSource (Bash)
DESCRIPTION: Adds the NodeSource repository GPG key and APT repository for Node.js version 20, updates the package list, and installs Node.js. This provides the necessary JavaScript runtime for Remotion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/cloud-gpu.mdx#_snippet_5

LANGUAGE: bash
CODE:
```
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

sudo apt-get update
sudo apt-get install nodejs -y
```

----------------------------------------

TITLE: Installing Project Dependencies using npm - Console
DESCRIPTION: This command installs all npm dependencies listed in the project's package.json, ensuring the environment is ready for Remotion development. Run in the project root directory before using any other scripts. Requires Node.js and npm to be pre-installed on your system.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-tts-azure/README.md#_snippet_2

LANGUAGE: console
CODE:
```
npm install
```

----------------------------------------

TITLE: Timing Element Visibility with Sequence in Remotion (TypeScript/React)
DESCRIPTION: This snippet demonstrates the `Sequence` component from 'remotion', used to control the timing of child elements. The `from` prop specifies the frame number when the children should start appearing, and `durationInFrames` specifies how long they should remain visible. The `from` prop can be negative.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_9

LANGUAGE: tsx
CODE:
```
import {Sequence} from 'remotion';

export const MyComp: React.FC = () => {
	return (
		<Sequence from={10} durationInFrames={20}>
			<div>This only appears after 10 frames</div>
		</Sequence>
	);
};
```

----------------------------------------

TITLE: Composing Sequential Timed Children with Remotion Sequence (React/TypeScript)
DESCRIPTION: Demonstrates how to use the Remotion <Sequence> API to time-shift and display different React components as segments of a video timeline. Components Intro, Clip, and Outro are displayed at different frame intervals by adjusting the 'from' and 'durationInFrames' props. Requires the 'remotion' library and TypeScript/React; input is composition of child components, and output is sequenced rendering over specified frame ranges.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/sequence.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import {Sequence} from 'remotion';

export const Intro = () => <></>;
export const Clip = () => <></>;
export const Outro = () => <></>;

// ---cut---

const MyTrailer = () => {
  return (
    <>
      <Sequence durationInFrames={30}>
        <Intro />
      </Sequence>
      <Sequence from={30} durationInFrames={30}>
        <Clip />
      </Sequence>
      <Sequence from={60}>
        <Outro />
      </Sequence>
    </>
  );
};
```

----------------------------------------

TITLE: Animating Values with interpolate in Remotion (TypeScript/React)
DESCRIPTION: Demonstrates the `interpolate()` helper function from 'remotion' for mapping a changing value (like the current frame) from an input range (e.g., `[0, 100]`) to an output range (e.g., `[0, 1]`). This is useful for creating linear animations. The optional fourth argument with `extrapolateLeft: 'clamp'` and `extrapolateRight: 'clamp'` prevents the output value from exceeding the defined output range.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_14

LANGUAGE: tsx
CODE:
```
import {interpolate, useCurrentFrame} from 'remotion'; // Added useCurrentFrame import

export const MyComp: React.FC = () => {
	const frame = useCurrentFrame();
	const value = interpolate(frame, [0, 100], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return (
		<div>
			Frame {frame}: {value}
		</div>
	);
};
```

----------------------------------------

TITLE: Creating a Simple Fade-In Animation in Remotion (React TSX)
DESCRIPTION: This React component (`FadeIn`) uses the `useCurrentFrame` hook from Remotion to get the current frame number. It calculates the `opacity` style property to gradually increase from 0 to 1 over the first 60 frames by dividing the frame number by 60 and clamping the result at 1 using `Math.min`. This creates a fade-in effect for the displayed text.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/animating-properties.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash {4, 15} title="FadeIn.tsx"
import { AbsoluteFill, useCurrentFrame } from "remotion";
// ---cut---
export const FadeIn = () => {
  const frame = useCurrentFrame();

  const opacity = Math.min(1, frame / 60);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
        fontSize: 80,
      }}
    >
      <div style={{ opacity: opacity }}>Hello World!</div>
    </AbsoluteFill>
  );
};
```
```

----------------------------------------

TITLE: Wrapping Components with Font Readiness in Remotion (TypeScript/React)
DESCRIPTION: This example demonstrates how to wrap a component that uses text-measuring utilities inside a WaitForFonts higher-order component. It exports and imports fontFamily and the WaitForFonts HOC from helpers, ensuring the dependent MyCompInner safely invokes measureText only after fonts are loaded. This encapsulation prevents premature computation and ensures consistency between the measured and displayed text in composition trees.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/layout-utils/best-practices.mdx#_snippet_3

LANGUAGE: TSX
CODE:
```
// @filename: fonts.ts\nexport const regular = 'Inter';\n\n// @filename: WaitForFonts.tsx\nexport const WaitForFonts: React.FC<{\n  children: React.ReactNode;\n}> = ({children}) => {\n  // ...\n  return children;\n};\n\n// @filename: MyComp.tsx\n// ---cut---\nimport React from 'react';\nimport {regular} from './fonts';\nimport {WaitForFonts} from './WaitForFonts';\nimport {measureText} from '@remotion/layout-utils';\n\nconst MyCompInner: React.FC = () => {\n  // Safe to call measureText() here\n  const measurement = measureText({\n    fontFamily: regular,\n    fontSize: 14,\n    fontWeight: '400',\n    text: 'Hello world',\n  });\n\n  return null;\n};\n\nexport const MyComp: React.FC = () => {\n  return (\n    <WaitForFonts>\n      <MyCompInner />\n    </WaitForFonts>\n  );\n};
```

----------------------------------------

TITLE: Rendering a Sample Video with Remotion CLI - Shell
DESCRIPTION: Utilizes the Remotion CLI to render an example video composition locally. Requires the remotion package and expects the user to have defined at least one composition. Outputs a video file upon successful completion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-render-server/README.md#_snippet_4

LANGUAGE: shell
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Frame-Rate-Independent Animation in Remotion (TypeScript)
DESCRIPTION: Shows how to animate over time using the actual fps value from useVideoConfig for robust, frame-rate-independent motion. This ensures identical timing regardless of fps. Dependencies include Remotion with useCurrentFrame, useVideoConfig, and interpolate. Key parameters: frame (current frame), fps (frames per second from config). Input: frame, output: animationProgress within [0, 1] for one second. Strongly recommended for stable timing.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/multiple-fps.mdx#_snippet_1

LANGUAGE: TypeScript
CODE:
```
import {useVideoConfig, interpolate, useCurrentFrame} from 'remotion';\nconst frame = useCurrentFrame();\n// ---cut---\n// Animate from second 1 to second 2\nconst {fps} = useVideoConfig();\nconst animationProgress = interpolate(frame, [1 * fps, 2 * fps], [0, 1], {\n  extrapolateLeft: 'clamp',\n  extrapolateRight: 'clamp',\n});
```

----------------------------------------

TITLE: Loading and Rendering After Effects JSON Animation in Remotion with TypeScript
DESCRIPTION: This React functional component demonstrates how to load and render an After Effects animation exported as JSON using the Bodymovin plugin. It utilizes React hooks (`useState`, `useEffect`) to manage the animation data state and fetch the JSON file (expected as `animation.json` within the `public/` directory) via Remotion's `staticFile` helper and the `fetch` API. Remotion's `delayRender`, `continueRender`, and `cancelRender` functions are used to handle the asynchronous loading process and potential errors. The fetched animation data is then passed to the `<Lottie>` component from `@remotion/lottie` for rendering.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/after-effects.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { Lottie, LottieAnimationData } from "@remotion/lottie";
import { useEffect, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";

const Balloons = () => {
  const [handle] = useState(() => delayRender("Loading Lottie animation"));

  const [animationData, setAnimationData] =
    useState<LottieAnimationData | null>(null);

  useEffect(() => {
    fetch(staticFile("animation.json"))
      .then((data) => data.json())
      .then((json) => {
        setAnimationData(json);
        continueRender(handle);
      })
      .catch((err) => {
        cancelRender(err);
        console.log("Animation failed to load", err);
      });
  }, [handle]);

  if (!animationData) {
    return null;
  }

  return <Lottie animationData={animationData} />;
};
```

----------------------------------------

TITLE: Correctly Importing Assets for Remotion <Img> Component in TSX
DESCRIPTION: Contrasts the correct and incorrect ways to provide the `src` prop to the Remotion `<Img>` component. The correct method involves importing the asset (e.g., `import hi from './hi.png'`) and passing the imported variable to `src`. Providing a direct string path (`src="./hi.png"`) is discouraged and flagged by a new ESLint rule introduced in version 1.4, as Remotion relies on the import mechanism for asset bundling and management.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-02-26-remotion-1-4.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
```tsx
import {Img} from 'remotion';
import hi from './hi.png';

// ✅ Correct: Using an import statement
<Img src={hi} />

// ⚠️ Warning since 1.4: Import the asset instead
<Img src="./hi.png"/>
```
```

----------------------------------------

TITLE: Scaffolding a Remotion Project using npm
DESCRIPTION: This command uses npx (part of npm) to execute the `create-video` package, scaffolding a new Remotion project. It prompts the user to select a template. This is the recommended command when using npm as the package manager.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/getting-started.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
```bash title="Use npm as the package manager"
npx create-video@latest
```
```

----------------------------------------

TITLE: Resolving and Preloading Videos with @remotion/preload in TypeScript
DESCRIPTION: This snippet integrates both resolveRedirect and preloadVideo from @remotion/preload to best-effort preload a remote video. It attempts to resolve the final media URL, updating the urlToLoad variable, and preloads either the resolved or original URL. The example also shows how the resolved URL is used as a source for the Remotion <Video> component in a React functional component. Dependencies are @remotion/preload and remotion, and key parameters are the external video URL and the updated urlToLoad variable. The snippet accounts for the timing of resolution and mounting and expects Promises for asynchronous control.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/preload/resolve-redirect.mdx#_snippet_1

LANGUAGE: TypeScript
CODE:
```
import { preloadVideo, resolveRedirect } from "@remotion/preload";
import { Video } from "remotion";

// This code gets executed immediately once the page loads
let urlToLoad =
  "https://player.vimeo.com/external/291648067.hd.mp4?s=94998971682c6a3267e4cbd19d16a7b6c720f345&profile_id=175&oauth2_token_id=57447761";

resolveRedirect(urlToLoad)
  .then((resolved) => {
    // Was able to resolve a redirect, setting this as the video to load
    urlToLoad = resolved;
  })
  .catch((err) => {
    // Was unable to resolve redirect e.g. due to no CORS support
    console.log("Could not resolve redirect", err);
  })
  .finally(() => {
    // In either case, we try to preload the original or resolved URL
    preloadVideo(urlToLoad);
  });

// This code only executes once the component gets mounted
const MyComp: React.FC = () => {
  // If the component did not mount immediately, this will be the resolved URL.

  // If the component mounted immediately, this will be the original URL.
  // In that case preloading is ineffective anyway.
  return <Video src={urlToLoad}></Video>;
};
```

----------------------------------------

TITLE: Recommended: Using Remotion Img Tag for Reliable Rendering - TypeScript/React
DESCRIPTION: This snippet illustrates the preferred method of rendering images in Remotion by using the <Img> component from 'remotion'. This ensures Remotion can accurately detect when the image is loaded before continuing rendering, preventing flickering in the final output. Dependencies include the 'remotion' package for the <Img> and <AbsoluteFill> components. The key parameter, 'src', defines the image URL. This approach provides seamless integration with Remotion's rendering pipeline and should replace any usage of Next.js's <Image> component for video generation.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/troubleshooting/nextjs-image.mdx#_snippet_1

LANGUAGE: TypeScript
CODE:
```
const src = "abc";
// ---cut---
import { AbsoluteFill, Img } from "remotion";

const myMarkup = <Img src="https://picsum.photos/200/300" />;
```

----------------------------------------

TITLE: Getting Relative Frame using useCurrentFrame in Remotion (TSX)
DESCRIPTION: This snippet demonstrates the basic usage of the `useCurrentFrame` hook from Remotion. It shows how the hook returns the current frame number. Inside a `<Sequence>` component (like `Subtitle`), the returned frame is relative to the `from` prop of the Sequence (25 - 10 = 15). Outside a Sequence (like `Title` or `MyVideo`), it returns the absolute frame on the timeline (25).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/use-current-frame.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash
import { Sequence, useCurrentFrame } from "remotion";

const Title = () => {
  const frame = useCurrentFrame(); // 25
  return <div>{frame}</div>;
};

const Subtitle = () => {
  const frame = useCurrentFrame(); // 15
  return <div>{frame}</div>;
};

const MyVideo = () => {
  const frame = useCurrentFrame(); // 25

  return (
    <div>
      <Title />
      <Sequence from={10}>
        <Subtitle />
      </Sequence>
    </div>
  );
};
```
```

----------------------------------------

TITLE: Implementing Fade-in and Fade-out using interpolate() in TypeScript
DESCRIPTION: Shows how to create a fade-in and fade-out effect by providing multiple points in the input and output ranges to `interpolate`. It uses the current frame and the total duration of the video (obtained via `useVideoConfig`) to define the timing. Dependencies include `interpolate`, `useCurrentFrame`, and `useVideoConfig` from 'remotion'.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate.mdx#_snippet_1

LANGUAGE: ts
CODE:
```
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { durationInFrames } = useVideoConfig();
const opacity = interpolate(
  frame,
  [0, 20, durationInFrames - 20, durationInFrames],
  // v--v---v----------------------v
  [0, 1, 1, 0],
);
```

----------------------------------------

TITLE: Fetching Data Inside Remotion Composition Components - TypeScript/React
DESCRIPTION: This snippet shows the recommended approach of passing only a URL string as defaultProps to a Remotion `<Composition>`, and fetching the actual audio data inside the consuming component. It uses `getAudioData` alongside React hooks and Remotion functions (`delayRender`, `continueRender`, `cancelRender`, `staticFile`). The main input is the audio asset URL provided via defaultProps, and the output is performing fetch within the component to remain within serialization limits. This prevents the serialization error by ensuring large objects are not passed via defaultProps.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/troubleshooting/defaultprops-too-big.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import { getAudioData } from "@remotion/media-utils";
import { useEffect, useState } from "react";
import {
  cancelRender,
  Composition,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";

// MyComp.tsx
const MyComp: React.FC<{ src: string }> = ({ src }) => {
  const [audioData, setAudioData] = useState<any>(undefined);
  const [handle] = useState(() => delayRender());

  useEffect(() => {
    getAudioData(src)
      .then((data) => {
        setAudioData(data);
        continueRender(handle);
      })
      .catch((e) => {
        cancelRender(e);
      });
  }, [handle]);

  return null;
};

// src/Root.tsx
const RemotionRoot = () => {
  return (
    <Composition
      id="my-comp"
      durationInFrames={90}
      width={1080}
      height={1080}
      fps={1080}
      component={MyComp}
      defaultProps={{
        src: staticFile("audio.mp3"),
      }}
    />
  );
};
```

----------------------------------------

TITLE: Starting Remotion Development Preview using npm
DESCRIPTION: Runs the 'dev' script defined in the project's `package.json` file using the npm script runner. For standard Remotion projects, this command launches the Remotion Studio, which provides a development server and a browser-based interface for live previewing, editing properties, and debugging the video composition.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-overlay/README.md#_snippet_1

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Running Remotion Development Server in Node.js (Console)
DESCRIPTION: Runs Remotion in development mode for React-based still image design. Requires Node.js and all remotion dependencies to be installed. "npm run dev" starts the local development server so you can interactively design images and preview changes. Input: none. Output: launches a dev server on a default local port. Limitations: must be run inside the correct project directory.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-still/README.md#_snippet_0

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Starting the Remotion Development Preview - Console
DESCRIPTION: Launches the Remotion development server in preview mode, enabling real-time editing and hot-reloading for rapid development. The command builds and serves previews locally through npm scripts, typically on http://localhost:3000. Assumes dependencies are installed and a script named 'dev' exists in package.json.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-code-hike/README.md#_snippet_1

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Registering a Remotion Composition Component (JSX)
DESCRIPTION: Refers to the React component used to register a renderable Composition within the Remotion Studio. It bundles the visual component with metadata like dimensions, duration, and FPS.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/terminology/composition.mdx#_snippet_1

LANGUAGE: jsx
CODE:
```
<Composition>
```

----------------------------------------

TITLE: Retrieving Composition Metadata with useVideoConfig - Remotion - TypeScript/React
DESCRIPTION: This snippet demonstrates how to use the useVideoConfig hook from Remotion within a functional React component to access details about the current video composition, such as width, height, fps, and durationInFrames. It requires the remotion package and a valid Remotion project setup. The key properties (width, height, fps, durationInFrames) are destructured from the hook and logged to the console, and the component renders a simple message. Inputs consist of the React component context, and outputs are both console logs for property values and the rendered component content. There are no special limitations beyond requiring Remotion context.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/use-video-config.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import React from "react";
import { useVideoConfig } from "remotion";

export const MyComp: React.FC = () => {
  const { width, height, fps, durationInFrames } = useVideoConfig();
  console.log(width); // 1920
  console.log(height); // 1080
  console.log(fps); // 30;
  console.log(durationInFrames); // 300

  return <div>Hello World!</div>;
};
```

----------------------------------------

TITLE: Defining a Simple Square Component in TypeScript/React
DESCRIPTION: Defines a stateless functional component named `Square` that accepts a single prop `color` of type string. This snippet is intended as a building block for use inside Remotion's `<Series.Sequence>` components, with output as an empty `div`. No external dependencies are needed apart from React. Key input parameter: `color` (string), but not yet utilized in the rendered output; outputs a React element.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/series.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
const Square: React.FC<{color: string}> = () => <div></div>
// - Square
```

----------------------------------------

TITLE: Layering Elements with AbsoluteFill in Remotion (TypeScript/React)
DESCRIPTION: This snippet illustrates how to stack elements visually using the `AbsoluteFill` component from 'remotion'. `AbsoluteFill` makes its children occupy the full dimensions of their parent, positioned absolutely. Nesting `AbsoluteFill` components allows creating layers, where later elements in the code appear on top.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_8

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill} from 'remotion';

export const MyComp: React.FC = () => {
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{background: 'blue'}}> // Added missing style prop based on context
				<div>This is in the back</div>
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'red'}}> // Changed background for clarity, added missing style prop
				<div>This is in front</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
```

----------------------------------------

TITLE: Starting Remotion Development Preview using npm
DESCRIPTION: Executes the 'dev' script defined in `package.json`, which typically starts the Remotion development server. This enables a live preview of the video composition in a web browser, often with hot-reloading for immediate feedback during development.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-javascript/README.md#_snippet_1

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Starting Remotion Development Preview Server using NPM
DESCRIPTION: Runs the 'dev' script defined in the project's `package.json` file using NPM. This typically starts the Remotion development server, enabling a live preview with hot-reloading for video development.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-blank/README.md#_snippet_1

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Defining a Simple Remotion Composition - React (TSX)
DESCRIPTION: Defines a React functional component 'MyComp' that renders a 'Hello {text}!' message, used as a Remotion composition. Requires React and proper typing for props. Input is an object with a 'text' string; output is a rendered div element. Useful as a minimal template for new video compositions.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/player-integration.mdx#_snippet_4

LANGUAGE: tsx
CODE:
```
export const MyComp: React.FC<{text: string}> = ({text}) => {
  return <div>Hello {text}!<\/div>;
};
```

----------------------------------------

TITLE: Creating a Dynamic Remotion Component (TSX)
DESCRIPTION: A React functional component (`MyComposition`) using TypeScript and Remotion APIs. It accepts `name`, `repo`, and `logo` as props and uses Remotion hooks (`useCurrentFrame`, `useVideoConfig`) and animation functions (`spring`, `interpolate`) to create an animated presentation of the data within an `AbsoluteFill` container. This component serves as the template for the videos.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dataset-render.mdx#_snippet_5

LANGUAGE: tsx
CODE:
```
import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

type Props = {
  name: string;
  logo: string;
  repo: string;
};

export const MyComposition: React.FC<Props> = ({name, repo, logo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const scale = spring({
    fps,
    frame: frame - 10,
    config: {
      damping: 100,
    },
  });

  const opacity = interpolate(frame, [30, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const moveY = interpolate(frame, [20, 30], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        scale: String(scale),
        backgroundColor: 'white',
        fontWeight: 'bold',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <Img
          src={logo}
          style={{
            height: 80,
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontSize: 40,
              transform: `translateY(${moveY}px)`,
              lineHeight: 1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 20,
              opacity,
              lineHeight: 1.25,
            }}
          >
            {repo}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Initiating a Remotion Lambda Render in TypeScript
DESCRIPTION: Example demonstrating how to import `renderMediaOnLambda` from `@remotion/lambda/client` and call it with necessary parameters like AWS region, Lambda function name, Remotion composition ID, Serve URL, and desired codec to start a rendering job. The function returns a promise resolving to an object containing the S3 bucket name (`bucketName`) and the unique render ID (`renderId`).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/rendermediaonlambda.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
// ---cut---
import {renderMediaOnLambda} from '@remotion/lambda/client';

const {bucketName, renderId} = await renderMediaOnLambda({
  region: 'us-east-1',
  functionName: 'remotion-render-bds9aab',
  composition: 'MyVideo',
  serveUrl: 'https://remotionlambda-qg35eyp1s1.s3.eu-central-1.amazonaws.com/sites/bf2jrbfkw',
  codec: 'h264',
});
```

----------------------------------------

TITLE: Rendering Video with Remotion via GitHub Actions - YAML
DESCRIPTION: This YAML snippet configures a GitHub Actions workflow to render a video using the Remotion CLI within a CI/CD environment. The job checks out the repository, sets up Node.js, installs dependencies, renders the composition named "MyComp" to an MP4 file, and uploads the resulting artifact. Dependencies include a Remotion project with a defined composition ID. Inputs are static in this variant. Outputs are an MP4 file stored in GitHub Actions artifacts. The workflow supports Ubuntu runners and requires access to the repository and Remotion CLI.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ssr.mdx#_snippet_0

LANGUAGE: yaml
CODE:
```
name: Render video\non:\n  workflow_dispatch:\njobs:\n  render:\n    name: Render video\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@main\n      - uses: actions/setup-node@main\n      - run: npm i\n      - run: npx remotion render MyComp out/video.mp4\n      - uses: actions/upload-artifact@v4\n        with:\n          name: out.mp4\n          path: out/video.mp4\n
```

----------------------------------------

TITLE: Basic Usage of renderMedia in TypeScript
DESCRIPTION: This snippet demonstrates how to import and use the `renderMedia` function from `@remotion/renderer` to render a video composition. It shows setting up input properties, selecting a composition using `selectComposition`, and then initiating the rendering process with specified options like codec and output location.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/renderer/render-media.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
const serveUrl = '/path/to/bundle';
const outputLocation = '/path/to/frames';

import {renderMedia, selectComposition} from '@remotion/renderer';

const inputProps = {
  titleText: 'Hello World',
};

const composition = await selectComposition({
  serveUrl,
  id: 'my-video',
  inputProps,
});

// ---cut---

await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation,
  inputProps,
});
```

----------------------------------------

TITLE: Starting the Remotion Studio Interface
DESCRIPTION: Executes the 'remotion:studio' script from `package.json`. This launches the Remotion Studio, providing a web-based environment to preview, edit, and debug Remotion video compositions.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-react-router/README.md#_snippet_2

LANGUAGE: shell
CODE:
```
npm run remotion:studio
```

----------------------------------------

TITLE: Starting Remotion Development Preview - Shell
DESCRIPTION: Runs the development preview server using Remotion by executing the npm run dev command. This allows users to view and interact with the video composition in a browser, making adjustments before rendering. Requires all dependencies to be installed beforehand. Input: None. Output: Starts a local server accessible via browser.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-stargazer/README.md#_snippet_2

LANGUAGE: Shell
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Full Rendering Script (TypeScript/MJS)
DESCRIPTION: A complete script (`render.mjs`) that combines project bundling and dataset rendering. It imports necessary functions from `@remotion/bundler` and `@remotion/renderer`, the dataset, and webpack configuration. It first bundles the project, then iterates through the dataset, selecting the composition and rendering a video for each data entry.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dataset-render.mdx#_snippet_8

LANGUAGE: ts
CODE:
```
// @filename: dataset.ts
export const data = [
  {
    name: 'React',
    repo: 'facebook/react',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
  },
  {
    name: 'Remotion',
    repo: 'remotion-dev/remotion',
    logo: 'https://github.com/remotion-dev/logo/raw/main/withouttitle/element-0.png',
  },
];

// @filename: webpack-override.ts
import type {WebpackOverrideFn} from '@remotion/bundler';
export const webpackOverride: WebpackOverrideFn = (f) => f;

// @filename: render.ts
// ---cut---
import {selectComposition, renderMedia} from '@remotion/renderer';
import {webpackOverride} from './webpack-override';
import {bundle} from '@remotion/bundler';
import {data} from './dataset';

const compositionId = 'MyComp';

const bundleLocation = await bundle({
  entryPoint: './src/index.ts',
  // If you have a webpack override in remotion.config.ts, pass it here as well.
  webpackOverride: webpackOverride,
});

for (const entry of data) {
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: entry,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: `out/${entry.name}.mp4`,
    inputProps: entry,
  });
}
```

----------------------------------------

TITLE: Defining the Remotion Root Component and Registering a Composition in TSX
DESCRIPTION: Defines the `RemotionRoot` component in `remotion/Root.tsx`. This component imports React, the `Composition` component from Remotion, and the `MyComposition` component. It uses the `<Composition>` tag to register `MyComposition`, specifying properties like `id`, `durationInFrames`, `fps`, `width`, and `height`, configuring it within the Remotion environment. Dependencies include `react` and `remotion`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/brownfield-installation.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="remotion/Root.tsx"
// @filename: Composition.tsx
export const MyComposition: React.FC = () => {
  return null;
};
// @filename: Root.tsx
// ---cut---
import React from 'react';
import {Composition} from 'remotion';
import {MyComposition} from './Composition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Empty"
        component={MyComposition}
        durationInFrames={60}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
```
```

----------------------------------------

TITLE: Colocating Schema, Component, and Fetcher for Remotion Metadata in TypeScript
DESCRIPTION: This sample colocates schema definition (with Zod), component typing, and async metadata fetcher in a TypeScript file. Props are validated/typed with Zod, while calculateMetadata makes a real API call and injects the result into props. Prerequisites are Remotion, Zod, and TypeScript. Inputs are props (including id), outputs are transformed props with fetched API response. Throws if data is null inside component.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/data-fetching.mdx#_snippet_3

LANGUAGE: TSX
CODE:
```
import { CalculateMetadataFunction } from "remotion";
import { z } from "zod";

const apiResponse = z.object({ title: z.string(), description: z.string() });

export const myCompSchema = z.object({
  id: z.string(),
  data: z.nullable(apiResponse),
});

type Props = z.infer<typeof myCompSchema>;

export const calcMyCompMetadata: CalculateMetadataFunction<Props> = async ({
  props,
}) => {
  const data = await fetch(`https://example.com/api/${props.id}`);
  const json = await data.json();

  return {
    props: {
      ...props,
      data: json,
    },
  };
};

export const MyComp: React.FC<Props> = ({ data }) => {
  if (data === null) {
    throw new Error("Data was not fetched");
  }

  return <div>{data.title}</div>;
};
```

----------------------------------------

TITLE: Defining Remotion Compositions in TypeScript Root Component
DESCRIPTION: Shows how to define and export a Remotion root component that includes multiple Composition components, each with distinct parameters, wrapped in a React Fragment. Each composition specifies properties like id, fps, height, width, durationInFrames, and the associated component. Dependencies are 'remotion', 'React', and the individual composition components. Intended inputs are composition configuration props; the output is aggregated composition registration. Constraints include ensuring correct composition props and React component structure.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/register-root.mdx#_snippet_1

LANGUAGE: TSX
CODE:
```
// @allowUmdGlobalAccess\n// @filename: MyComponent.tsx\nexport default () => <></>;
```

LANGUAGE: TSX
CODE:
```
// @filename: MyOtherComponent.tsx\nexport default () => <></>;
```

LANGUAGE: TSX
CODE:
```
// @filename: index.tsx\nimport { Composition } from \"remotion\";\n// ---cut---\nimport MyComponent from \"./MyComponent\";\nimport MyOtherComponent from \"./MyOtherComponent\";\n\nexport const RemotionRoot = () => {\n  return (\n    <>\n      <Composition\n        id=\"comp\"\n        fps={30}\n        height={1080}\n        width={1920}\n        durationInFrames={90}\n        component={MyComponent}\n      />\n      <Composition\n        id=\"anothercomp\"\n        fps={30}\n        height={1080}\n        width={1920}\n        durationInFrames={90}\n        component={MyOtherComponent}\n      />\n    </>\n  );\n};
```

----------------------------------------

TITLE: Rendering with Input Props using Remotion CLI - Bash
DESCRIPTION: This code snippet demonstrates how to pass a JSON object as input props to a Remotion project using the --props flag with the npx remotion render command. It allows users to specify dynamic input values which the Remotion project can consume at runtime. The --props flag expects a valid JSON string, and the render command performs video rendering using these provided properties. No additional dependencies are required beyond having Remotion installed and accessible via npx.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/get-input-props.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion render --props='{"hello": "world"}'
```

----------------------------------------

TITLE: Implementing a Basic Slide Transition with TransitionSeries in Remotion (TSX)
DESCRIPTION: This TSX snippet demonstrates creating a simple transition between two `Letter` components using Remotion's `<TransitionSeries>`. It defines a `Letter` component for display and then uses `TransitionSeries.Sequence` to define the content segments and `TransitionSeries.Transition` with a `slide` presentation and `linearTiming` to animate between them. It requires `AbsoluteFill`, `TransitionSeries`, `linearTiming` from Remotion and `slide` from `@remotion/transitions/slide`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transitions.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { AbsoluteFill } from "remotion";

const Letter: React.FC<{
  children: React.ReactNode;
  color: string;
}> = ({ children, color }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: 0.9,
        justifyContent: "center",
        alignItems: "center",
        fontSize: 200,
        color: "white",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
// ---cut---
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";

const BasicTransition = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={40}>
        <Letter color="#0b84f3">A</Letter>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide()}
        timing={linearTiming({ durationInFrames: 30 })}
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <Letter color="pink">B</Letter>
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

```

----------------------------------------

TITLE: Displaying a Basic Player with @remotion/player in TypeScript React
DESCRIPTION: Demonstrates usage of the @remotion/player component within a React app, using a minimal MyVideo component. Requires @remotion/player to be installed and a valid composition component (MyVideo). Key parameters are durationInFrames, compositionWidth, compositionHeight, and fps. No controls or interactivity are present; the Player renders the video as per props. Inputs: video component and playback properties. Outputs: a rendered player with the specified video and settings.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/player-examples.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
// @allowUmdGlobalAccess\n// @filename: ./remotion/MyVideo.tsx\nexport const MyVideo = () => <></>;\n\n// @filename: index.tsx\n// ---cut---\nimport { Player } from "@remotion/player";\nimport { MyVideo } from "./remotion/MyVideo";\n\nexport const App: React.FC = () => {\n  return (\n    <Player\n      component={MyVideo}\n      durationInFrames={120}\n      compositionWidth={1920}\n      compositionHeight={1080}\n      fps={30}\n    />\n  );\n};
```

----------------------------------------

TITLE: Complete Dockerfile for Remotion Application
DESCRIPTION: Defines a multi-stage Docker build process for a Remotion application. It starts from a Node.js base image, installs necessary system dependencies for Chrome, copies project files, installs dependencies using a package manager (defaulting to npm), installs Chrome via Remotion's browser command, and sets up the entry point to run a render script.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/docker.mdx#_snippet_0

LANGUAGE: docker
CODE:
```
FROM node:22-bookworm-slim

# Install Chrome dependencies
RUN apt-get update
RUN apt install -y \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libcups2

# Copy everything from your project to the Docker image. Adjust if needed.
COPY package.json package*.json yarn.lock* pnpm-lock.yaml* bun.lockb* bun.lock* tsconfig.json* remotion.config.* ./
COPY src ./src

# If you have a public folder:
COPY public ./public

# Install the right package manager and dependencies - see below for Yarn/PNPM
RUN npm i

# Install Chrome
RUN npx remotion browser ensure

# Run your application
COPY render.mjs render.mjs
CMD ["node", "render.mjs"]
```

----------------------------------------

TITLE: Starting Remotion Development Preview using NPM
DESCRIPTION: This command executes the 'dev' script defined in the project's `package.json` file, which typically starts the Remotion development server and player. This allows developers to preview their video compositions and changes live in a web browser during the development process.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-helloworld/README.md#_snippet_1

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Installing Dependencies with npm (Node.js, Bash)
DESCRIPTION: Installs all dependencies listed in the package.json file using npm, ensuring that the Next.js and Remotion video app template is ready to use. This step is required immediately after cloning the repo or scaffolding a new project. It must be run in the root directory containing the project's package.json. No additional parameters are required, and the command will output logs to the terminal.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-next-pages/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
npm i
```

----------------------------------------

TITLE: Defining a Remotion Composition Component in TypeScript
DESCRIPTION: This TypeScript (TSX) snippet demonstrates how to set up a Remotion Composition using React components, specifying exact video parameters such as width, height, frame rate (fps), and duration in frames. It defines a function component MyComponent and registers it for rendering by the Remotion Composition. Make sure to have "react" and "remotion" installed, and use a TypeScript environment capable of handling JSX syntax. The key props—width, height, fps, durationInFrames, component, and id—determine the output video’s dimensions and playback properties. Output is a registered video composition visible to Remotion’s rendering pipeline, with customization constraints dependent on codec and output format.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/quality.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import { Composition } from "remotion";

const MyComponent = () => {
  return <div>Hello World</div>;
};

const Root: React.FC = () => {
  return (
    <Composition
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={100}
      component={MyComponent}
      id="MyComp"
    />
  );
};
```

----------------------------------------

TITLE: Installing Remotion CLI using yarn
DESCRIPTION: Adds the Remotion Command Line Interface (`@remotion/cli`) package as a project dependency using the yarn package manager. This is a prerequisite for launching the Remotion Studio.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/studio/studio.mdx#_snippet_2

LANGUAGE: bash
CODE:
```
yarn add @remotion/cli
```

----------------------------------------

TITLE: Embedding Video with OffthreadVideo in Remotion (TypeScript/React)
DESCRIPTION: This snippet shows how to embed a video into a Remotion component using the `OffthreadVideo` component. It requires importing `OffthreadVideo` from 'remotion'. The `src` prop specifies the video source (URL or local file via `staticFile`). Standard CSS styles can be applied via the `style` prop. Optional props like `startFrom`, `endAt`, and `volume` control playback.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_3

LANGUAGE: tsx
CODE:
```
import {OffthreadVideo} from 'remotion';

export const MyComp: React.FC = () => {
	return (
		<div>
			<OffthreadVideo
				src="https://remotion.dev/bbb.mp4"
				style={{width: '100%'}}
			/>
		</div>
	);
};
```

----------------------------------------

TITLE: Using the Remotion `<Freeze>` Component in TSX
DESCRIPTION: Demonstrates how to use the `<Freeze>` component in Remotion to pause rendering of its children at a specific frame. This example shows freezing a `<Video>` component at frame 30 to display a still image from the video source.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-07-09-remotion-2-2.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="MyVideo.tsx"
import {Freeze, Video} from 'remotion';
import myVid from './vid.mp4';

export const MyVideo = () => {
  return (
    <Freeze frame={30}>
      <Video src={myVid} />
    </Freeze>
  );
};
```
```

----------------------------------------

TITLE: Rendering Video using Remotion CLI (Shell)
DESCRIPTION: Shows the command-line interface command to render a Remotion composition into a video file. Use `npx remotion render` followed by the composition ID (defined in `Root.tsx`, e.g., `MyComp`). This initiates the rendering process.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_17

LANGUAGE: sh
CODE:
```
$ npx remotion render MyComp
```

----------------------------------------

TITLE: Calculating and Applying Metadata with Remotion calculateMetadata - TypeScript/React
DESCRIPTION: This snippet demonstrates how to configure a Remotion <Composition> to dynamically determine its duration based on properties retrieved from the source video using the calculateMetadata callback. Dependencies include the remotion library and @remotion/media-parser package. The calculateMetadata function asynchronously fetches the video's duration and calculates durationInFrames according to the project's frame rate. Props may be overridden via input parameters during rendering. Input properties include the video src URL. The output is a React composition rendered with a duration that matches the source media. This approach is recommended for Remotion v4.0.0 and later to avoid redundant network calls and ensure deterministic metadata resolution.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dynamic-metadata.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import {parseMedia} from '@remotion/media-parser';
import {Composition, Video} from 'remotion';

type MyCompProps = {
  src: string;
};

const MyComp: React.FC<MyCompProps> = ({src}) => {
  return <Video src={src} />;
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComp}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      }}
      calculateMetadata={async ({props}) => {
        const {slowDurationInSeconds} = await parseMedia({
          src: props.src,
          fields: {slowDurationInSeconds: true},
        });

        return {
          durationInFrames: Math.floor(slowDurationInSeconds * 30),
        };
      }}
    />
  );
};
```

----------------------------------------

TITLE: Using a Reusable Title Component in a Remotion Video (TypeScript)
DESCRIPTION: This snippet demonstrates how to use the previously defined `Title` component within a main Remotion video component called `MyVideo`. It imports necessary functions and components from `remotion`, defines the `Title` component, and then renders a single instance of `<Title>` with the text "Hello World" inside an `<AbsoluteFill>` container, which makes the title cover the entire video area.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/sequences.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

const Title: React.FC<{title: string}> = ({title}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{opacity, textAlign: 'center', fontSize: '7em'}}>{title}</div>
  );
};

export const MyVideo = () => {
  return (
    <AbsoluteFill>
      <Title title="Hello World" />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Rendering a Remotion Video using SSR APIs in TypeScript
DESCRIPTION: This example TypeScript script demonstrates how to bundle a Remotion project, select a composition, and render a video file using the @remotion/renderer and @remotion/bundler packages. It assumes you have the necessary dependencies installed (including @remotion/renderer, @remotion/bundler, and path), and that a valid Remotion composition exists (e.g., 'HelloWorld' in ./src/index.ts). Key parameters include compositionId (for selecting the composition), inputProps (for parametrizing render properties), and outputLocation (destination for the rendered .mp4 file). The script outputs a video in H264 codec, can be customized for audio or images, and logs when rendering completes. Limitations: intended for Node.js or Bun, not for direct use in Next.js environments.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/ssr-node.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'path';

// The composition you want to render
const compositionId = 'HelloWorld';

// You only have to create a bundle once, and you may reuse it
// for multiple renders that you can parametrize using input props.
const bundleLocation = await bundle({
  entryPoint: path.resolve('./src/index.ts'),
  // If you have a webpack override in remotion.config.ts, pass it here as well.
  webpackOverride: (config) => config,
});

// Parametrize the video by passing props to your component.
const inputProps = {
  foo: 'bar',
};

// Get the composition you want to render. Pass `inputProps` if you
// want to customize the duration or other metadata.
const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: compositionId,
  inputProps,
});

// Render the video. Pass the same `inputProps` again
// if your video is parametrized with data.
await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: 'h264',
  outputLocation: `out/${compositionId}.mp4`,
  inputProps,
});

console.log('Render done!');
```

----------------------------------------

TITLE: Launching Remotion Studio in Next.js/React Router Templates
DESCRIPTION: Starts the Remotion Studio development server using the `npm run remotion` script, commonly used in Next.js and React Router 7 based Remotion templates. This command is configured in the project's `package.json`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/studio/studio.mdx#_snippet_5

LANGUAGE: bash
CODE:
```
npm run remotion
```

----------------------------------------

TITLE: Rendering a Remotion Composition to MP4 via CLI
DESCRIPTION: This command uses `npx` to execute the Remotion CLI render command (`remotion render`). It specifies the entry point (`remotion/index.ts`), the ID of the composition to render (`MyComp`), and the output file name (`out.mp4`). This command initiates the video rendering process based on the composition's definition and settings. Requires `@remotion/cli` and potentially `@remotion/renderer`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/brownfield-installation.mdx#_snippet_4

LANGUAGE: bash
CODE:
```
```bash
npx remotion render remotion/index.ts MyComp out.mp4
```
```

----------------------------------------

TITLE: Demonstrating Extrapolation Options in interpolate() using TSX
DESCRIPTION: Provides concrete examples of how different `extrapolateRight` options (`extend`, `clamp`, `identity`, `wrap`) affect the output of `interpolate` when the input value (1.5) falls outside the defined input range (`[0, 1]`). This helps understand how to control behavior at the boundaries of the interpolation.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate.mdx#_snippet_7

LANGUAGE: tsx
CODE:
```
import { interpolate } from "remotion";
// ---cut---
interpolate(1.5, [0, 1], [0, 2], { extrapolateRight: "extend" }); // 3
interpolate(1.5, [0, 1], [0, 2], { extrapolateRight: "clamp" }); // 2
interpolate(1.5, [0, 1], [0, 2], { extrapolateRight: "identity" }); // 1.5
interpolate(1.5, [0, 1], [0, 2], { extrapolateRight: "wrap" }); // 1
```

----------------------------------------

TITLE: Trimming Audio Playback with startFrom and endAt in Remotion (TSX)
DESCRIPTION: Explains how to play only a specific segment of an audio file using the `startFrom` and `endAt` props, which define the start and end points in frames. This example trims the first 60 frames (2 seconds at 30fps) and stops playback after frame 120 (4 seconds at 30fps), effectively playing the audio from the 2-second mark to the 4-second mark.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/audio.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, Audio, staticFile} from 'remotion';

export const MyVideo = () => {
  return (
    <AbsoluteFill>
      <Audio src={staticFile('audio.mp3')} startFrom={60} endAt={120} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Combining delayRender and delayPlayback for Buffering and Rendering (TypeScript/React)
DESCRIPTION: Combines delayRender with useBufferState.delayPlayback() to coordinate both render delays and UI buffering in the Remotion Player or Studio. This pattern blocks both screenshotting (render) and gauge (player) until async work is complete, handling cleanup on unmount. Requires Remotion, React, and useBufferState. Inputs: timeout triggers, Outputs: component readiness upon completion of delays.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/delay-render.mdx#_snippet_7

LANGUAGE: tsx
CODE:
```
import React from "react";
import { useBufferState, delayRender, continueRender } from "remotion";

const MyComp: React.FC = () => {
  const buffer = useBufferState();
  const [handle] = React.useState(() => delayRender());

  React.useEffect(() => {
    const delayHandle = buffer.delayPlayback();

    setTimeout(() => {
      delayHandle.unblock();
      continueRender(handle);
    }, 5000);

    return () => {
      delayHandle.unblock();
    };
  }, []);

  return <></>;
};
```

----------------------------------------

TITLE: Setting GIF Codec via Remotion API (JavaScript)
DESCRIPTION: Sets the output codec to GIF within the options object when using Remotion's programmatic rendering functions like `renderMedia()`, `stitchFramesToVideo()`, or `renderMediaOnLambda()`. This ensures the output file is an animated GIF.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/render-as-gif.mdx#_snippet_1

LANGUAGE: javascript
CODE:
```
codec: "gif"
```

----------------------------------------

TITLE: Setting GIF Codec via Remotion CLI
DESCRIPTION: Specifies the output codec as GIF when rendering a Remotion video using the command-line interface. This flag instructs the rendering process to generate an animated GIF file instead of a standard video format.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/render-as-gif.mdx#_snippet_0

LANGUAGE: shell
CODE:
```
--codec=gif
```

----------------------------------------

TITLE: Implementing a Volume Slider for Remotion Player in React (tsx)
DESCRIPTION: Defines a `VolumeSlider` React component (tsx) that interacts with a Remotion player instance via a `playerRef`. It uses `useState` to manage the `volume` and `muted` state locally. `useEffect` sets up event listeners ('volumechange', 'mutechange') on the player to synchronize the component's state with the actual player state. The slider's `onChange` handler updates the player's volume using `playerRef.current.setVolume()` and handles unmuting the player if the volume is adjusted above zero while muted. The slider visually represents the volume, showing 0 when muted.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/custom-controls.mdx#_snippet_6

LANGUAGE: tsx
CODE:
```
import type {PlayerRef} from '@remotion/player';
import React, {useEffect, useState} from 'react';

export const VolumeSlider: React.FC<{ // tsx(React)
  playerRef: React.RefObject<PlayerRef | null>;
}> = ({playerRef}) => {
  const [volume, setVolume] = useState(playerRef.current?.getVolume() ?? 1);
  const [muted, setMuted] = useState(playerRef.current?.isMuted() ?? false);

  useEffect(() => {
    const {current} = playerRef;
    if (!current) {
      return;
    }

    const onVolumeChange = () => {
      setVolume(current.getVolume());
    };

    const onMuteChange = () => {
      setMuted(current.isMuted());
    };

    current.addEventListener('volumechange', onVolumeChange);
    current.addEventListener('mutechange', onMuteChange);

    return () => {
      current.removeEventListener('volumechange', onVolumeChange);
      current.removeEventListener('mutechange', onMuteChange);
    };
  }, [playerRef]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> =
    React.useCallback(
      (evt) => {
        if (!playerRef.current) {
          return;
        }

        const newVolume = Number(evt.target.value);
        if (newVolume > 0 && playerRef.current.isMuted()) {
          playerRef.current.unmute();
        }

        playerRef.current.setVolume(newVolume);
      },
      [playerRef],
    );

  return (
    <input
      value={muted ? 0 : volume}
      type="range"
      min={0}
      max={1}
      step={0.01}
      onChange={onChange}
    />
  );
};
```

----------------------------------------

TITLE: Loading Local Images with <Img> and staticFile() in Remotion (TSX)
DESCRIPTION: Demonstrates using the Remotion `<Img>` component to display a local image. The image file (`hi.png`) should be placed in the `public/` folder, and the `staticFile()` helper function is used to generate the correct path for the `src` prop. This ensures Remotion preloads the image before rendering the frame.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/img.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash
import { AbsoluteFill, Img, staticFile } from "remotion";

export const MyComp: React.FC = () => {
  return (
    <AbsoluteFill>
      <Img src={staticFile("hi.png")} />
    </AbsoluteFill>
  );
};
```
```

----------------------------------------

TITLE: Opening the Remotion Studio (Shell)
DESCRIPTION: Executes the `remotion` script defined in `package.json`, which starts the Remotion Studio. The Studio provides a development environment for previewing and debugging Remotion video compositions.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-next-app/README.md#_snippet_3

LANGUAGE: shell
CODE:
```
npm run remotion
```

----------------------------------------

TITLE: Using <Video> with a Remote URL in Remotion (TSX)
DESCRIPTION: This code shows how to use the Remotion `<Video>` component to load and display a video from a remote URL. It imports `AbsoluteFill` and `Video` from 'remotion'. The `<Video>` component's `src` prop is directly assigned the URL string of the video file.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/video.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, Video} from 'remotion';
// ---cut---
export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <Video src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Rendering the Example Video Locally with Remotion CLI
DESCRIPTION: Uses the Remotion CLI (via `npx`) to render the default video composition defined in the project locally. This generates the video file based on the React components without needing AWS.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-react-router/README.md#_snippet_8

LANGUAGE: shell
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Rendering Video with Remotion CLI - Console
DESCRIPTION: Triggers Remotion's CLI command to compile and render the video compositions according to project configuration. It outputs the final video files after processing all assets and scripts. Ensure project files and compositions are correct before running; dependent on Remotion being installed and set up.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-code-hike/README.md#_snippet_2

LANGUAGE: console
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Starting Remotion Studio Development Server
DESCRIPTION: This console command executes the `dev` script defined in the project's `package.json`, which typically starts the Remotion Studio development environment. This allows for live preview and editing of the video composition. The accompanying text notes that the separate TTS server included in the template also starts during development.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-tts-google/README.md#_snippet_2

LANGUAGE: console
CODE:
```
```console
npm run dev
```
```

----------------------------------------

TITLE: Rendering Sequential Videos with Remotion Series - TypeScript
DESCRIPTION: Defines a React component that renders an array of videos in sequence using <Series> and <OffthreadVideo> from the Remotion library. Expects a list of video sources and pre-determined durations; throws if any duration is missing. Each <Series.Sequence> displays one video sequentially. Requires Remotion as a dependency and expects each video object to have 'src' and 'durationInFrames'. The output is a seamless video composition with exact video switching where each video ends.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/videos/sequence.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import React from 'react';
import {OffthreadVideo, Series} from 'remotion';

type VideoToEmbed = {
  src: string;
  durationInFrames: number | null;
};

type Props = {
  videos: VideoToEmbed[];
};

export const VideosInSequence: React.FC<Props> = ({videos}) => {
  return (
    <Series>
      {videos.map((vid) => {
        if (vid.durationInFrames === null) {
          throw new Error('Could not get video duration');
        }

        return (
          <Series.Sequence key={vid.src} durationInFrames={vid.durationInFrames}>
            <OffthreadVideo src={vid.src} />
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
```

----------------------------------------

TITLE: Registering a Composition in Remotion Root (TypeScript)
DESCRIPTION: Illustrates how to register a React component as a composition using Remotion's <Composition> within the application's root. Depends on the 'remotion' package and expects that MyComposition is defined in the local context. The composition's video properties (durationInFrames, fps, width, height) are statically provided. Output is the registration of a composition that will appear in Remotion's sidebar. Multiple compositions can be registered by wrapping them in a React Fragment.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/the-fundamentals.mdx#_snippet_1

LANGUAGE: typescript
CODE:
```
import {Composition} from 'remotion';
// @include: example-MyComposition
// ---cut---

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id=\"MyComposition\"
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      component={MyComposition}
    />
  );
};
```

----------------------------------------

TITLE: Layering Content with <AbsoluteFill> in React/TSX
DESCRIPTION: Demonstrates using nested `<AbsoluteFill>` components to layer elements within a Remotion composition. An `<OffthreadVideo>` component is placed in the lower layer, serving as a full-screen background, and an `<h1>` tag containing text is placed in an overlaying `<AbsoluteFill>` component, appearing on top. Requires the `remotion` package.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/absolute-fill.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, OffthreadVideo} from 'remotion';

const MyComp = () => {
  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <OffthreadVideo src="https://example.com/video.mp4" />
      </AbsoluteFill>
      <AbsoluteFill>
        <h1>This text is written on top!</h1>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Accessing Video Configuration with useVideoConfig (TypeScript/React)
DESCRIPTION: Shows how to retrieve the current composition's configuration properties (like `fps`, `durationInFrames`, `height`, `width`) within a React component using the `useVideoConfig` hook imported from 'remotion'. This allows components to adapt to the video's settings.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_15

LANGUAGE: tsx
CODE:
```
import {useVideoConfig} from 'remotion';

export const MyComp: React.FC = () => {
	const {fps, durationInFrames, height, width} = useVideoConfig();
	return (
		<div>
			fps: {fps}
			durationInFrames: {durationInFrames}
			height: {height}
			width: {width}
		</div>
	);
};
```

----------------------------------------

TITLE: Initializing a New Remotion Project using NPX
DESCRIPTION: This shell command utilizes `npx` to run the latest version of the `create-video` package. It bootstraps a new Remotion project directory with the necessary files and configurations, allowing users to start creating videos with React immediately. Node.js and npm (which includes npx) must be installed beforehand.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/README.md#_snippet_0

LANGUAGE: console
CODE:
```
npx create-video@latest
```

----------------------------------------

TITLE: Installing Remotion CLI using pnpm
DESCRIPTION: Installs the Remotion Command Line Interface (`@remotion/cli`) package as a project dependency using the pnpm package manager. This is a prerequisite for launching the Remotion Studio.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/studio/studio.mdx#_snippet_1

LANGUAGE: bash
CODE:
```
pnpm i @remotion/cli
```

----------------------------------------

TITLE: Interpolating HSL and HSLA Colors with Remotion interpolateColors() in TypeScript
DESCRIPTION: Shows how to use `interpolateColors` in TypeScript to map the current frame number over the range [0, 20] to a color between specified `hsl` and `hsla` values. Imports necessary functions (`interpolateColors`, `useCurrentFrame`) from 'remotion'. The output color is always returned in `rgba` format.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate-colors.mdx#_snippet_2

LANGUAGE: ts
CODE:
```
```ts twoslash
import { useCurrentFrame, interpolateColors } from "remotion";

const frame = useCurrentFrame(); // 10
//hsl example
const color = interpolateColors(
  frame,
  [0, 20],
  ["hsl(0, 100%, 50%)", "hsl(60, 100%, 50%)"]
); // rgba(255, 128, 0, 1)

//hsla example
const color2 = interpolateColors(
  frame,
  [0, 20],
  ["hsla(0, 100%, 50%, 1)", "hsla(60, 100%, 50%, 1)"]
); // rgba(255, 128, 0, 1)
```
```

----------------------------------------

TITLE: Timing Element Display with Sequence in Remotion (TypeScript)
DESCRIPTION: This code snippet illustrates how to use the Sequence component along with AbsoluteFill in Remotion to control element timing and layering. It arranges an image to be displayed for the entire sequence, while a heading is shown only for a specified duration using the Sequence from and durationInFrames props. Dependencies include React and Remotion's AbsoluteFill, Img, staticFile, and Sequence components. Key parameters are Sequence's from (start frame) and durationInFrames (life span in frames). The output is a video in which the background is always visible, but the text appears starting from frame 60 for 40 frames.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/layers.mdx#_snippet_1

LANGUAGE: TypeScript
CODE:
```
import React from 'react';\nimport {AbsoluteFill, Img, staticFile, Sequence} from 'remotion';\n\nexport const MyComp: React.FC = () => {\n  return (\n    <AbsoluteFill>\n      <Sequence>\n        <Img src={staticFile('bg.png')} />\n      </Sequence>\n      <Sequence from={60} durationInFrames={40}>\n        <h1>This text appears after 60 frames!</h1>\n      </Sequence>\n    </AbsoluteFill>\n  );\n};
```

----------------------------------------

TITLE: Installing Remotion Project Dependencies - Console
DESCRIPTION: This command installs all Node.js project dependencies defined in the project's package.json using npm. Required dependency: Node.js with npm. Run this command before performing any development, build, or render actions to ensure all packages are correctly installed. This command does not accept parameters, and successful execution is necessary for further actions to work as expected.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-skia/README.md#_snippet_0

LANGUAGE: console
CODE:
```
npm install
```

----------------------------------------

TITLE: Initiating a Video Render with Remotion Lambda API (TypeScript)
DESCRIPTION: This code triggers a video render job on Remotion Lambda using the Node.JS client library. It calls `renderMediaOnLambda` with necessary parameters like AWS region, the previously retrieved function name, the serve URL, composition ID ('HelloWorld'), input props, codec settings, and privacy level. It returns the `renderId` and `bucketName` needed for tracking progress.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/setup.mdx#_snippet_12

LANGUAGE: typescript
CODE:
```
import {getFunctions, renderMediaOnLambda, getRenderProgress} from '@remotion/lambda/client';

const url = 'string';
const functions = await getFunctions({
  region: 'us-east-1',
  compatibleOnly: true,
});

const functionName = functions[0].functionName;
// ---cut---

const {renderId, bucketName} = await renderMediaOnLambda({
  region: 'us-east-1',
  functionName,
  serveUrl: url,
  composition: 'HelloWorld',
  inputProps: {},
  codec: 'h264',
  imageFormat: 'jpeg',
  maxRetries: 1,
  framesPerLambda: 20,
  privacy: 'public',
});
```

----------------------------------------

TITLE: Creating Remotion Lambda Site Using CLI - Shell Command
DESCRIPTION: Executes the Remotion Lambda CLI command to bundle a project and upload it to S3, optionally specifying an entry point. This command is used to deploy Remotion video projects for Lambda-based and local rendering workflows. The entry point argument controls which component or file is used; if omitted, a default is auto-detected. Outputs a serve URL for video rendering. Requires Remotion Lambda CLI and AWS credentials configured.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/cli/sites/create.mdx#_snippet_0

LANGUAGE: shell
CODE:
```
npx remotion lambda sites create <entry-point>?
```

----------------------------------------

TITLE: Animating a Moving Dot with Delay using Remotion in TypeScript
DESCRIPTION: This snippet defines a Move React component which animates its children vertically using Remotion's spring and interpolate functions. The animation start is delayed by the delay prop (number), and the move is applied along the Y axis using a spring curve. Dependencies are remotion, react, and the component expects children and a numeric delay. The spring config creates a bounce effect with configurable damping, causing the children to move upwards when rendered.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/learn/2022-12-22-apple-wow.mdx#_snippet_12

LANGUAGE: TypeScript
CODE:
```
import React from 'react';\nimport {\n  AbsoluteFill,\n  interpolate,\n  spring,\n  useCurrentFrame,\n  useVideoConfig,\n} from 'remotion';\n\nexport const Move: React.FC<{\n  children: React.ReactNode;\n  delay: number;\n}> = ({children, delay}) => {\n  const {fps} = useVideoConfig();\n  const frame = useCurrentFrame();\n\n  const down = spring({\n    fps,\n    frame: frame - delay,\n    config: {\n      damping: 200,\n    },\n    durationInFrames: 120,\n  });\n\n  const y = interpolate(down, [0, 1], [0, -400]);\n\n  return (\n    <AbsoluteFill\n      style={{\n        translate: `0 ${y}px`,\n      }}\n    >\n      {children}\n    </AbsoluteFill>\n  );\n};
```

----------------------------------------

TITLE: Rendering a Remotion Video via Command Line
DESCRIPTION: This console command uses the Remotion CLI (executed via `npx`) to initiate the server-side rendering process for the video composition defined in the project. This command generates the final video output file(s).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-tts-google/README.md#_snippet_4

LANGUAGE: console
CODE:
```
```console
npx remotion render
```
```

----------------------------------------

TITLE: Initializing a New Remotion Project (Console)
DESCRIPTION: This command utilizes 'npx' (Node Package Execute) to download and run the latest version of the 'create-video' package. This package scaffolds a new Remotion project directory, providing a starting point for development. Requires Node.js and npm (which includes npx) to be installed on the system.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/core/README.md#_snippet_0

LANGUAGE: console
CODE:
```
npx create-video@latest
```

----------------------------------------

TITLE: Registering Remotion Root Component in TypeScript with registerRoot
DESCRIPTION: This snippet demonstrates how to define and register a Remotion root component in a TypeScript project. It starts by exporting a functional component (RemotionRoot) from Root.tsx, then imports and registers this component as the root in index.ts using registerRoot from Remotion. Dependencies include 'remotion' and React. The main parameter is the root component itself. Input is the exported component, and the output is a registered application root; improper structure or duplicate registration may cause runtime errors.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/register-root.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
// @filename: ./Root.tsx\nexport const RemotionRoot = () => <></>;
```

LANGUAGE: TSX
CODE:
```
// @filename: index.ts\n// ---cut---\nimport { registerRoot } from \"remotion\";\nimport { RemotionRoot } from \"./Root\";\n\nregisterRoot(RemotionRoot);
```

----------------------------------------

TITLE: Rendering a Composition using Remotion CLI - Bash
DESCRIPTION: This Bash code snippet presents the primary usage pattern for the Remotion CLI's render command. It shows how to render a video or audio file from a specified entry point or serve URL, composition ID, and output location. Dependencies include Node.js, a Remotion project setup, and any referenced assets or configuration files. The command accepts various command-line flags, and supports positional arguments (<entry-point|serve-url>, <composition-id>, <output-location>), with fallback defaults for omitted parameters. The output is a rendered media file in the specified or default directory, and the operation can be customized using numerous CLI switches for encoding, image sequence export, audio processing, and more.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cli/render.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion render <entry-point|serve-url>? <composition-id> <output-location>
```

----------------------------------------

TITLE: Rendering Video with Remotion CLI - Bash
DESCRIPTION: This snippet demonstrates how to render a video using the Remotion CLI by specifying the composition name (e.g., 'HelloWorld'). It requires Remotion to be installed (locally or globally via npm), and the command will execute the rendering process for the given composition. Replace 'HelloWorld' with the desired composition ID as needed. Input: composition name; Output: video render in output directory.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/render.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion render HelloWorld
```

----------------------------------------

TITLE: Setting Output Scale in Remotion Config File - TypeScript
DESCRIPTION: This snippet demonstrates how to configure the output scaling factor in Remotion via the config file using the TypeScript API. It imports the Config object from the '@remotion/cli/config' package and uses the setScale function to set a scaling factor (in this case, 2x). This configuration affects all subsequent renders that use this config file, adjusting the width and height of output videos or stills accordingly. Ensure that the '@remotion/cli/config' dependency is available in your project.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/scaling.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import { Config } from "@remotion/cli/config";
// ---cut---
Config.setScale(2);
```

----------------------------------------

TITLE: Accessing Frame and Video Config in Remotion Component (TypeScript)
DESCRIPTION: This snippet demonstrates using the `useCurrentFrame` and `useVideoConfig` hooks from Remotion within the `Torus` component. `useCurrentFrame` provides the current frame number of the animation timeline, while `useVideoConfig` supplies essential video properties like frames per second (fps) and the total duration in frames. These values are fundamental for calculating animation progress.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/spline.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
import {useCurrentFrame, useVideoConfig} from 'remotion';

// ---cut---
const frame = useCurrentFrame();
const {fps, durationInFrames} = useVideoConfig();
```

----------------------------------------

TITLE: Rendering Videos from Dataset (TypeScript)
DESCRIPTION: Shows the core rendering logic using `@remotion/renderer`. It imports the dataset, iterates through each entry, uses `selectComposition` to get composition metadata (passing the entry as `inputProps`), and then calls `renderMedia` to render an MP4 video for that entry, specifying the output location and codec.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dataset-render.mdx#_snippet_7

LANGUAGE: ts
CODE:
```
// @filename: dataset.ts
export const data = [
  {
    name: 'React',
    repo: 'facebook/react',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
  },
  {
    name: 'Remotion',
    repo: 'remotion-dev/remotion',
    logo: 'https://github.com/remotion-dev/logo/raw/main/withouttitle/element-0.png',
  },
];

// @filename: render.ts
const compositionId = 'MyComp';
const bundleLocation = 'xxx';
// ---cut---
import {renderMedia, selectComposition} from '@remotion/renderer';
import {data} from './dataset';

for (const entry of data) {
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: entry,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: `out/${entry.name}.mp4`,
    inputProps: entry,
  });
}
```

----------------------------------------

TITLE: Installing Project Dependencies using npm
DESCRIPTION: This command uses Node Package Manager (npm) to install all the necessary dependencies defined in the project's `package.json` file. This is typically the first step after cloning or setting up a new Node.js project like Remotion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-tiktok/README.md#_snippet_0

LANGUAGE: console
CODE:
```
npm i
```

----------------------------------------

TITLE: Identifying a Remotion Composition Prop (Text)
DESCRIPTION: Represents the unique identifier prop required for a Remotion Composition. This `id` is used to reference the specific composition, notably when initiating renders via the command line.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/terminology/composition.mdx#_snippet_0

LANGUAGE: text
CODE:
```
id
```

----------------------------------------

TITLE: Finding and Rendering <Player> Component in Remotion App (TypeScript/JSX)
DESCRIPTION: This code identifies the appropriate entry point for rendering the <Player> component based on the template used (Next.js App Dir, Next.js Pages Dir, or React Router), then configures it to use the target composition and associated metadata. The relevant component and metadata are imported, typically from the remotion folder, to maintain consistency between Studio and the deployed app. Required dependencies include React, the @remotion/player package, and proper imports/exports. Modify component, duration, and FPS constants as needed; update the entry point file as specified.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/studio-app.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
// In pages/index.tsx, app/page.tsx, or app/home.tsx:
import { Player } from "@remotion/player";
import { MyComposition } from "../remotion/MyComposition";
import { DURATION_IN_FRAMES, FPS } from "../remotion/constants";

export default function Home() {
  return (
    <Player
      component={MyComposition}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      // ...other Player props
    />
  );
}

```

----------------------------------------

TITLE: Using useCurrentFrame in Remotion Sequences (React/TypeScript)
DESCRIPTION: Shows how children of <Sequence> components can receive a shifted frame count using Remotion's useCurrentFrame hook. Demonstrates both direct and Sequence-offset frame values as props cascade to the Intro component. Requires 'remotion' library and React; outputs div elements displaying the current logical frame.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/sequence.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
import {Sequence, useCurrentFrame} from 'remotion';

const Intro = () => <div>{useCurrentFrame()}</div>;

const MyTrailer = () => {
  return (
    <>
      <Intro />
      <Sequence from={30}>
        <Intro />
      </Sequence>
    </>
  );
};
```

----------------------------------------

TITLE: Creating a React Hook for Current Player Frame - Remotion Player - TypeScript
DESCRIPTION: Defines a custom React hook ('useCurrentPlayerFrame') that subscribes to frame update events from a Remotion Player using a ref and leverages React's useSyncExternalStore for efficient state synchronization. This hook keeps a component in sync with the current frame of the player without re-rendering the entire app. Dependencies include '@remotion/player', 'react', and an external PlayerRef; the 'ref' parameter expects a React mutable ref pointing to a Remotion Player instance. Returns the current frame as a number. Requires the Player component to support 'frameupdate' events.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/current-time.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import {CallbackListener, PlayerRef} from '@remotion/player';\nimport {useCallback, useSyncExternalStore} from 'react';\n\nexport const useCurrentPlayerFrame = (\n  ref: React.RefObject<PlayerRef | null>,\n) => {\n  const subscribe = useCallback(\n    (onStoreChange: () => void) => {\n      const {current} = ref;\n      if (!current) {\n        return () => undefined;\n      }\n      const updater: CallbackListener<'frameupdate'> = ({detail}) => {\n        onStoreChange();\n      };\n      current.addEventListener('frameupdate', updater);\n      return () => {\n        current.removeEventListener('frameupdate', updater);\n      };\n    },\n    [ref],\n  );\n\n  const data = useSyncExternalStore<number>(\n    subscribe,\n    () => ref.current?.getCurrentFrame() ?? 0,\n    () => 0,\n  );\n\n  return data;\n};
```

----------------------------------------

TITLE: Starting Remotion Development Preview using npm
DESCRIPTION: Executes the 'dev' script defined in the `package.json` file, usually starting the Remotion development server. This allows for live previewing and debugging of the video composition during development.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-tiktok/README.md#_snippet_1

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Sequencing Remotion Components with Series in TSX
DESCRIPTION: This snippet introduces a new React component `Main` that uses Remotion's `<Series>` component to combine `One` and `Two` sequentially. Each component is wrapped in a `<Series.Sequence>` specifying its duration. This creates a single, longer animation composed of the individual parts.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/combine-compositions.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
// @filename: One.tsx
import React from "react";
export const One: React.FC = () => {
  return <div>One</div>;
};

// @filename: Two.tsx
import React from "react";
export const Two: React.FC = () => {
  return <div>Two</div>;
};

// @filename: Main.tsx
// ---cut---
import React from "react";
import { Series } from "remotion";
import { One } from "./One";
import { Two } from "./Two";

export const Main: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={120}>
        <One />
      </Series.Sequence>
      <Series.Sequence durationInFrames={120}>
        <Two />
      </Series.Sequence>
    </Series>
  );
};
```

----------------------------------------

TITLE: Importing and Playing Audio Assets with Remotion Audio (TypeScript)
DESCRIPTION: Demonstrates audio playback using Remotion's Audio component and staticFile(). The staticFile helper is used for the tune.mp3 in the public/ directory, ensuring audio is loaded and played in sync with the timeline. Requires remotion and tune.mp3 in public/.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/importing-assets.mdx#_snippet_8

LANGUAGE: typescript
CODE:
```
import { Audio, staticFile } from \"remotion\";\n\nexport const MyComp: React.FC = () => {\n  return <Audio src={staticFile(\"tune.mp3\")} />;\n};\n
```

----------------------------------------

TITLE: Accelerated Video Playback with Frame Accumulation in Remotion (TypeScript/React)
DESCRIPTION: This snippet correctly implements accelerated video playback in Remotion by accumulating the elapsed time for each frame, ensuring the video advances smoothly as playback speed changes dynamically. It uses a remapSpeed helper to sum up the playback rates for all frames up to the current, calculates the correct starting video frame (startFrom), and adjusts playbackRate accordingly. Required dependencies are React and Remotion; the key parameters include frame (from useCurrentFrame), a custom speedFunction, and video source URL. The rendered output is a Sequence containing an OffthreadVideo that reflects the desired speed profile, with limitations about timeline jumps in Remotion Studio if the frame is not calculated idempotently.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/accelerated-video.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import React from 'react';\nimport {interpolate, Sequence, useCurrentFrame, OffthreadVideo} from 'remotion';\n\nconst remapSpeed = (frame: number, speed: (fr: number) => number) => {\n  let framesPassed = 0;\n  for (let i = 0; i <= frame; i++) {\n    framesPassed += speed(i);\n  }\n\n  return framesPassed;\n};\n\nexport const AcceleratedVideo: React.FC = () => {\n  const frame = useCurrentFrame();\n\n  const speedFunction = (f: number) => interpolate(f, [0, 500], [1, 5]);\n\n  const remappedFrame = remapSpeed(frame, speedFunction);\n\n  return (\n    <Sequence from={frame}>\n      <OffthreadVideo\n        startFrom={Math.round(remappedFrame)}\n        playbackRate={speedFunction(frame)}\n        src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4#disable"\n      />\n    </Sequence>\n  );\n};
```

----------------------------------------

TITLE: Conditionally Rendering OffthreadVideo or Video with Ref Forwarding in Remotion (TypeScript)
DESCRIPTION: This snippet defines a React component that checks the Remotion environment to decide whether to render <OffthreadVideo /> (when rendering for export) or a <Video /> component (when in Player preview), allowing a ref to be attached to the underlying <Video />. It requires React, Remotion components, and correct import/setup of environment utilities. The component expects properties conforming to RemotionOffthreadVideoProps, properly handles the imageFormat prop only for the appropriate component, and utilizes React.forwardRef for ref transparency. Input props include typical video attributes; output is a React element for composable video rendering. Only one video component type will be rendered at a time, according to the current environment.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/offthread-video-while-rendering.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {forwardRef} from 'react';\nimport {getRemotionEnvironment, OffthreadVideo, RemotionOffthreadVideoProps, Video} from 'remotion';\n\nfunction OffthreadWhileRenderingRefForwardingFunction(props: RemotionOffthreadVideoProps, ref: React.Ref<HTMLVideoElement>) {\n  const isPreview = !getRemotionEnvironment().isRendering;\n\n  if (isPreview) {\n    const {imageFormat, ...otherProps} = props;\n    return <Video ref={ref} {...otherProps} />;\n  }\n\n  return <OffthreadVideo {...props} />;\n}\n\nexport const OffthreadVideoWhileRendering = forwardRef(OffthreadWhileRenderingRefForwardingFunction);
```

----------------------------------------

TITLE: Scaffolding a Remotion Project with Tailwind Support using CLI
DESCRIPTION: Demonstrates how to use the Remotion CLI (`create-video`) with different package managers (npm, pnpm, bun, yarn) to initialize a new video project. Selecting a template that supports Tailwind is required during the CLI prompts.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/tailwind.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx create-video@latest
```

LANGUAGE: bash
CODE:
```
pnpm create video
```

LANGUAGE: bash
CODE:
```
bun create video
```

LANGUAGE: bash
CODE:
```
yarn create video
```

----------------------------------------

TITLE: Defining a Basic Remotion Composition Component in TSX
DESCRIPTION: Creates a simple functional component `MyComposition` in a file named `remotion/Composition.tsx`. This component serves as a placeholder for a Remotion video composition and initially returns `null`. It's the first step in setting up the necessary file structure for Remotion integration.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/brownfield-installation.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="remotion/Composition.tsx"
export const MyComposition = () => {
  return null;
};
```
```

----------------------------------------

TITLE: Ensuring No Remotion Version Mismatch When Consuming Libraries - JSON
DESCRIPTION: This example demonstrates a package.json for a consumer project. When using a Remotion-based library (my-remotion-library), Remotion should be declared only at the root project level while the library omits Remotion as a direct dependency. This ensures there is no inadvertent version duplication or mismatch. The code also contains a descriptive comment highlighting that this pattern avoids conflicts.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/version-mismatch.mdx#_snippet_3

LANGUAGE: json
CODE:
```
{\n  \"dependencies\": {\n    // No version mismatch will be introduced because `remotion`\n    // is not a direct dependency of `my-remotion-library`\n    \"remotion\": \"2.7.0\",\n    \"my-remotion-library\": \"1.0.0\"\n  }\n}
```

----------------------------------------

TITLE: Importing Local Audio File in Remotion (TSX)
DESCRIPTION: This snippet demonstrates how to import and play a local audio file within a Remotion composition. It uses the `staticFile()` function to reference an audio file located in the project's `public/` directory and embeds it using the `<Audio/>` component inside an `<AbsoluteFill/>` container. The audio will play from the start by default.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/audio/importing.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="MyComp.tsx"
import {AbsoluteFill, Audio, staticFile} from 'remotion';

export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <Audio src={staticFile('audio.mp3')} />
    </AbsoluteFill>
  );
};
```
```

----------------------------------------

TITLE: Measuring Text after Font Load with useEffect in React TypeScript
DESCRIPTION: This React functional component demonstrates how to use the useEffect hook to ensure a font is loaded (using @remotion/google-fonts/Inter) before performing a text measurement with measureText from @remotion/layout-utils. It leverages the waitUntilDone promise to block measurement until the font is ready, and manages state with useState for storing resulting dimensions. This approach prevents inaccurate measurements due to font fallback and avoids the need for additional delayRender calls because @remotion/google-fonts handles it internally.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/layout-utils/best-practices.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import {useState, useEffect} from 'react';\nimport {Dimensions, measureText} from '@remotion/layout-utils';\nimport {loadFont, fontFamily} from '@remotion/google-fonts/Inter';\n\nconst {waitUntilDone} = loadFont('normal');\n\nconst MyComp: React.FC = () => {\n  const [dimensions, setDimensions] = useState<Dimensions | null>(null);\n\n  useEffect(() => {\n    // Wait until the font is loaded before measuring text\n    waitUntilDone().then(() => {\n      const measurement = measureText({\n        fontFamily: fontFamily,\n        fontSize: 14,\n        fontWeight: '400',\n        text: 'Hello world',\n      });\n\n      // We don't need to use delayRender() here, because\n      // font loading from @remotion/google-fonts is already wrapped in it\n      setDimensions(measurement);\n    });\n  }, []);\n\n  return null;\n};
```

----------------------------------------

TITLE: Starting Development Preview Server - Console
DESCRIPTION: This command launches the preview (development) server for the Remotion and React Three Fiber project, usually running on localhost. It requires prior installation of dependencies and expects a valid npm script named "dev" in package.json. Successful execution allows previewing and developing the project interactively in a local browser.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-three/README.md#_snippet_1

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Upgrading Remotion Package Version - Console
DESCRIPTION: Updates the Remotion framework to the latest available version via the \"npx remotion upgrade\" command. This retrieves and installs updates, bug fixes, and improvements into the project. Should be run periodically to ensure compatibility and get the latest features or patches. Requires active internet connection and may modify package.json and lockfiles.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-music-visualization/README.md#_snippet_3

LANGUAGE: console
CODE:
```
npx remotion upgrade
```

----------------------------------------

TITLE: Combining Multiple CSS Transforms in TSX
DESCRIPTION: Shows how to combine multiple CSS transformations like `translateX` and `scale` within a single `transform` style property in TSX. Transformations are space-separated and applied sequentially; the order matters.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transforms.mdx#_snippet_5

LANGUAGE: tsx
CODE:
```
```tsx twoslash {6} title="MyComponent.tsx"
<div
  style={{
    height: 100,
    width: 100,
    backgroundColor: "red",
    transform: `translateX(100px) scale(2)`,
  }}
/>
```
```

----------------------------------------

TITLE: Rendering a Remotion Video using NPX
DESCRIPTION: This command utilizes NPX (Node Package Execute) to run the Remotion Command Line Interface (CLI) 'render' command without needing a global installation. It initiates the process of rendering the defined Remotion composition into a video file according to the project's configuration.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-helloworld/README.md#_snippet_2

LANGUAGE: console
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Rendering a Remotion Composition with Explicit Output (Bash)
DESCRIPTION: This command shows the standard way to render a specific Remotion composition ('my-comp') located in 'src/index.tsx' to a defined output file 'output.mp4' using the Remotion CLI. This represents the command structure prior to the introduction of shorter command options in version 3.3.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2022-11-17-remotion-3-3.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion render src/index.tsx my-comp output.mp4
```

----------------------------------------

TITLE: Uploading and Displaying User Videos Using Remotion Player (TypeScript/React)
DESCRIPTION: Implements a user interface allowing file uploads, then renders the video in a Remotion Player component. On file selection, uploads asynchronously with a custom 'upload' function, sets the returned URL in state, and passes it to the composition as inputProps. This snippet demonstrates asynchronous state management, input handling, and Remotion player integration. Requires React, useState, useCallback, and Remotion's Player.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/video-uploads.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import {useCallback} from 'react';
const MyComposition: React.FC<{videoUrl: string | null}> = (URL) => {
  return null;
};
const upload = async (file: File) => {
  return 'https://exampleName.s3.examplesRegion.amazonaws.com';
};

// ---cut---
import {Player} from '@remotion/player';
import {useState} from 'react';

export const RemotionPlayer: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files === null) {
      return;
    }

    const file = event.target.files[0];
    //upload is an example function  & returns a URL when a file is uploaded on the cloud.
    const cloudURL = await upload(file);
    // E.g., cloudURL = https://exampleBucketName.s3.ExampleAwsRegion.amazonaws.com
    setVideoUrl(cloudURL);
  }, []);

  return (
    <div>
      {videoUrl === null ? null : <Player component={MyComposition} durationInFrames={120} compositionWidth={1920} compositionHeight={1080} fps={30} inputProps={{videoUrl}} />}

      <input type="file" onChange={handleChange} />
    </div>
  );
};
```

----------------------------------------

TITLE: Triggering Playback with User Interaction in Remotion Player using TypeScript/React
DESCRIPTION: Demonstrates how to trigger Remotion Player's playback only in response to a user gesture, passing a browser event to the PlayerRef.play() method from a React button's onClickCapture handler. This is crucial for passing browser autoplay policies, especially on Safari. Dependencies include React and @remotion/player. Key parameters are the PlayerRef reference and the user event, and it must be called inside a user-initiated event handler. Input: Mouse event; Output: Playback started if browser policy allows.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/autoplay.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
// @allowUmdGlobalAccess\n// @filename: ./remotion/MyComp.tsx\nexport const MyComp = () => <></>;
```

LANGUAGE: typescript
CODE:
```
// @filename: index.tsx\n// ---cut---\nimport {PlayerRef} from '@remotion/player';\nimport {useRef} from 'react';\n\nexport const App: React.FC = () => {\n  const ref = useRef<PlayerRef>(null);\n\n  return (\n    <button\n      onClickCapture={(e) => {\n        const {current} = ref;\n        // Pass the event to .play() or .toggle()\n        current?.play(e);\n      }}\n    >\n      Play\n    </button>\n  );\n};
```

----------------------------------------

TITLE: Defining and Using Animated Slide Transitions in Remotion with springTiming (TypeScript/TSX)
DESCRIPTION: This snippet presents a full React component leveraging Remotion's TransitionSeries alongside the springTiming timing function to create a smooth, customizable sliding transition between sequences. It defines a Letter component for styled content and demonstrates usage of both TransitionSeries.Sequence and TransitionSeries.Transition, configuring the latter with a slide presentation and a springTiming object that allows fine-grained control via config (damping), durationInFrames, and durationRestThreshold. Dependencies include remotion, @remotion/transitions, and React. Key props such as color, durationInFrames, and timing parameters enable tuning the look and timing of the animation. The expected input is a set of child elements and animation parameters; the output is a composed video sequence with animated transitions between content frames. Best suited for advanced Remotion users who require smooth, physical-based motion in their video editing pipelines.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transitions/timings/springtiming.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import { AbsoluteFill } from "remotion";

const Letter: React.FC<{
  children: React.ReactNode;
  color: string;
}> = ({ children, color }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: 0.9,
        justifyContent: "center",
        alignItems: "center",
        fontSize: 200,
        color: "white",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
// ---cut---
import { springTiming, TransitionSeries } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";

const BasicTransition = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={40}>
        <Letter color="#0b84f3">A</Letter>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide()}
        timing={springTiming({
          config: {
            damping: 200,
          },
          durationInFrames: 30,
          durationRestThreshold: 0.001,
        })}
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <Letter color="pink">B</Letter>
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

----------------------------------------

TITLE: Using createTikTokStyleCaptions in TSX
DESCRIPTION: This snippet demonstrates how to use the createTikTokStyleCaptions function. It initializes an array of Caption objects and then calls the function with the captions and a specified combineTokensWithinMilliseconds value to generate an array of TikTokPage objects. The example also shows the expected structure of the output 'pages' array.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/captions/create-tiktok-style-captions.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {createTikTokStyleCaptions, Caption} from '@remotion/captions';

const captions: Caption[] = [
  {
    text: 'Using',
    startMs: 40,
    endMs: 300,
    timestampMs: 200,
    confidence: null,
  },
  {
    text: " Remotion's",
    startMs: 300,
    endMs: 900,
    timestampMs: 440,
    confidence: null,
  },
  {
    text: ' TikTok',
    startMs: 900,
    endMs: 1260,
    timestampMs: 1080,
    confidence: null,
  },
  {
    text: ' template,',
    startMs: 1260,
    endMs: 1950,
    timestampMs: 1600,
    confidence: null,
  },
];

const {pages} = createTikTokStyleCaptions({
  captions,
  combineTokensWithinMilliseconds: 1200,
});

/* pages: [
  {
    text: "Using Remotion's",
    startMs: 40,
    durationMs: 860,
    tokens: [
      {
        text: 'Using',
        fromMs: 40,
        toMs: 300,
      },
      {
        text: " Remotion's",
        fromMs: 300,
        toMs: 900,
      },
    ],
  },
  {
    text: 'TikTok template,',
    startMs: 900,
    durationMs: 1050,
    tokens: [
      {
        text: 'TikTok',
        fromMs: 900,
        toMs: 1260,
      },
      {
        text: ' template,',
        fromMs: 1260,
        toMs: 1950,
      },
    ],
  }
] */
```

----------------------------------------

TITLE: Accessing Input Props in Remotion Root Component - TypeScript/React
DESCRIPTION: This TypeScript/React snippet demonstrates how to retrieve input props within the root component of a Remotion project using the getInputProps() function. It defines a composition and uses getInputProps to extract dynamic values (e.g., {hello}) at the top level, which can then be passed to compositions as props. The snippet assumes remotion is installed and that getInputProps and Composition are imported from 'remotion'. The function returns a non-typesafe object, so for stricter typing it is recommended to use type annotations or alternative APIs. Inputs are expected to be provided via the Remotion CLI or programmatic API. The Root component renders a composition with specified configuration.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/get-input-props.mdx#_snippet_3

LANGUAGE: typescript
CODE:
```
import {Composition} from 'remotion';
const getInputProps = () => ({hello: 'world'}) as const;
const MyComp: React.FC = () => null;
const config = {
  component: MyComp,
  durationInFrames: 100,
  fps: 30,
  width: 1000,
  height: 1000,
  id: 'MyComp',
} as const;
// ---cut---

export const Root: React.FC = () => {
  const {hello} = getInputProps(); // "world"

  return <Composition {...config} />;
};
```

----------------------------------------

TITLE: Enabling TailwindCSS in Remotion via Webpack Configuration - TypeScript
DESCRIPTION: This code snippet demonstrates how to use the enableTailwind utility from the @remotion/tailwind package to augment Remotion's Webpack setup for TailwindCSS compatibility. It shows the recommended approach by leveraging Config.overrideWebpackConfig and passing the generated configuration from enableTailwind. Dependencies include the @remotion/cli/config and @remotion/tailwind packages, as well as TailwindCSS installed in the project. The function receives the current Webpack configuration as input and returns a modified configuration, allowing Tailwind styles to be used within Remotion components.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/tailwind/overview.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import {Config} from '@remotion/cli/config';
import {enableTailwind} from '@remotion/tailwind';

Config.overrideWebpackConfig((currentConfiguration) => {
  return enableTailwind(currentConfiguration);
});
```

----------------------------------------

TITLE: Server-Side Bundling of Remotion Projects using bundle() - TypeScript
DESCRIPTION: Shows how to use Remotion's bundle() function to generate a bundled version of a video composition for server-side rendering. Imports path and bundle, then asynchronously runs bundle pointing at the project's Remotion entry index file. Requires @remotion/bundler and Node.js environment. Input is a file path, output is a bundle result. Useful for SSR or Lambda deployments.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/player-integration.mdx#_snippet_10

LANGUAGE: ts
CODE:
```
import path from 'path';
import {bundle} from '@remotion/bundler';

const bundled = await bundle(path.join(process.cwd(), 'src', 'remotion', 'index.ts'));
```

----------------------------------------

TITLE: Integrating Dynamic Metadata Calculation in Remotion Composition in TypeScript
DESCRIPTION: Demonstrates how to integrate the `calculateMetadata` function into the `Root` component. The `Composition` component is configured with `MyComp`, a default `src` prop for the video, and the imported `calculateMetadata` function. This allows the composition's duration and dimensions to be determined dynamically based on the video source specified in `defaultProps`. The example includes stubs for `MyComp` and an alternative `calculateMetadata` using `getVideoMetadata` from `@remotion/media-utils`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/align-duration.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
// @filename: MyComp.tsx
import React from 'react';
import {CalculateMetadataFunction} from 'remotion';
import {getVideoMetadata} from '@remotion/media-utils';

export const MyComp: React.FC<MyCompProps> = () => {
  return null;
};
type MyCompProps = {
  src: string;
};

export const calculateMetadata: CalculateMetadataFunction<MyCompProps> = async ({props}) => {
  const data = await getVideoMetadata(props.src);
  const fps = 30;

  return {
    durationInFrames: Math.floor(data.durationInSeconds * fps),
    fps,
  };
};

// @filename: Root.tsx
// ---cut---

import React from 'react';
import {Composition} from 'remotion';
import {MyComp, calculateMetadata} from './MyComp';

export const Root: React.FC = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComp}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      }}
      calculateMetadata={calculateMetadata}
    />
  );
};
```

----------------------------------------

TITLE: Sequencing Elements with Series in Remotion (TypeScript/React)
DESCRIPTION: This snippet demonstrates the `Series` component for displaying multiple elements sequentially. Each child element is wrapped in a `Series.Sequence` which takes a `durationInFrames` prop. Sequences play one after another. An optional `offset` prop on `Series.Sequence` can shift its start time relative to the end of the previous sequence (positive offset delays, negative overlaps).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_11

LANGUAGE: tsx
CODE:
```
import {Series} from 'remotion';

export const MyComp: React.FC = () => {
	return (
		<Series>
			<Series.Sequence durationInFrames={20}>
				<div>This only appears immediately</div>
			</Series.Sequence>
			<Series.Sequence durationInFrames={30}>
				<div>This only appears after 20 frames</div>
			</Series.Sequence>
			<Series.Sequence durationInFrames={30} offset={-8}>
				<div>This only appears after 42 frames</div> 
			</Series.Sequence>
		</Series>
	);
};
```

----------------------------------------

TITLE: Selecting a Specific Remotion Composition (TypeScript)
DESCRIPTION: This TypeScript example demonstrates how to use the `selectComposition()` function from `@remotion/renderer` to retrieve metadata for a specific Remotion composition. It first bundles a Remotion project using `bundle()` from `@remotion/bundler`, then calls `selectComposition()` with the bundle URL (`serveUrl`), the target composition's `id`, and any necessary `inputProps`. The resulting composition object contains metadata like width, height, fps, and durationInFrames, which are then logged to the console. Requires `@remotion/bundler` and `@remotion/renderer` packages, and a valid Remotion project entry point.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/renderer/select-composition.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
// ---cut---
import {bundle} from '@remotion/bundler';
import {selectComposition} from '@remotion/renderer';

const bundled = await bundle({entryPoint: require.resolve('./src/index.ts')});
const composition = await selectComposition({
  serveUrl: bundled,
  id: 'MyComposition',
  inputProps: {},
});

console.log(composition.id); // "MyComposition"
console.log(composition.width, composition.height);
console.log(composition.fps, composition.durationInFrames);
```

----------------------------------------

TITLE: Creating Transitions between Sequences with TransitionSeries (TypeScript/React)
DESCRIPTION: Shows how to use `TransitionSeries` from `@remotion/transitions` for sequential elements with transitions. Requires alternating `TransitionSeries.Sequence` (specifying content and duration) and `TransitionSeries.Transition` (specifying timing and presentation like `fade` or `wipe`). The order is crucial. Requires `@remotion/transitions` package.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_12

LANGUAGE: tsx
CODE:
```
import React from 'react'; // Added React import
import {
	linearTiming,
	springTiming,
	TransitionSeries,
} from '@remotion/transitions';
import {Fill} from 'remotion'; // Added Fill import based on usage
import {fade} from '@remotion/transitions/fade';
import {wipe} from '@remotion/transitions/wipe';

export const MyComp: React.FC = () => {
	return (
		<TransitionSeries>
			<TransitionSeries.Sequence durationInFrames={60}>
				<Fill color="blue" />
			</TransitionSeries.Sequence>
			<TransitionSeries.Transition
				timing={springTiming({config: {damping: 200}})}
				presentation={fade()}
			/>
			<TransitionSeries.Sequence durationInFrames={60}>
				<Fill color="black" />
			</TransitionSeries.Sequence>
			<TransitionSeries.Transition
				timing={linearTiming({durationInFrames: 30})}
				presentation={wipe()}
			/>
			<TransitionSeries.Sequence durationInFrames={60}>
				<Fill color="white" />
			</TransitionSeries.Sequence>
		</TransitionSeries>
	);
};
```

----------------------------------------

TITLE: Adding Basic Audio with <Audio> and staticFile in Remotion (TSX)
DESCRIPTION: Demonstrates the fundamental usage of the `<Audio>` component to include an audio file in a Remotion composition. The `src` prop takes the path to the audio file, typically obtained using the `staticFile()` helper function which references files placed in the `public/` directory.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/audio.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, Audio, staticFile} from 'remotion';

export const MyVideo = () => {
  return (
    <AbsoluteFill>
      <Audio src={staticFile('audio.mp3')} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Dynamically Importing Image Sequences with Remotion (TypeScript)
DESCRIPTION: Shows dynamic image loading based on the current frame number, using Remotion hooks and helpers. useCurrentFrame() retrieves the frame, which is interpolated into the staticFile path for sequential image rendering via Img. Requires remotion, useCurrentFrame(), and sequentially named image files in the public/ folder.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/importing-assets.mdx#_snippet_5

LANGUAGE: typescript
CODE:
```
import { Img, staticFile, useCurrentFrame } from \"remotion\";\n\nconst MyComp: React.FC = () => {\n  const frame = useCurrentFrame();\n\n  return <Img src={staticFile(`/frame${frame}.png`)} />;\n};\n
```

----------------------------------------

TITLE: Coordinating Asynchronous Data Fetch with Remotion Render Lifecycle in React (TypeScript)
DESCRIPTION: This TypeScript/TSX snippet demonstrates how to use Remotion's delayRender, continueRender, and cancelRender functions inside a React functional component to pause video rendering while asynchronously fetching data. The code uses useState and useCallback to coordinate the lifecycle and useEffect to trigger the fetch. Dependencies include the 'remotion' package and typical React hooks. Inputs: None (the fetch URL is hardcoded). Outputs: The rendered component with fetched data, or no content if data hasn't loaded. If data fetching fails, the render is cancelled to avoid timeouts. Ensure handles from delayRender are cleared within the Remotion time limit.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/data-fetching.mdx#_snippet_9

LANGUAGE: TSX
CODE:
```
import { useCallback, useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";

export const MyComp = () => {
  const [data, setData] = useState(null);
  const [handle] = useState(() => delayRender());

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("http://example.com/api");
      const json = await response.json();
      setData(json);

      continueRender(handle);
    } catch (err) {
      cancelRender(err);
    }
  }, [handle]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      {data ? (
        <div>This video has data from an API! {JSON.stringify(data)}</div>
      ) : null}
    </div>
  );
};
```

----------------------------------------

TITLE: Launching Remotion Studio for Audiogram Editing - Shell
DESCRIPTION: Starts Remotion Studio in development mode using npx. This launches an interactive UI for editing and previewing audiogram parameters. Requires prior installation of all dependencies. No arguments needed; defaults to development configuration and opens Remotion Studio in the browser.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-audiogram/README.md#_snippet_1

LANGUAGE: shell
CODE:
```
npx remotion studio

```

----------------------------------------

TITLE: Creating Spring Animations with spring in Remotion (TypeScript/React)
DESCRIPTION: Illustrates using the `spring()` helper function from 'remotion' to create physics-based spring animations. It typically requires the current `frame` (from `useCurrentFrame`), the composition's `fps` (from `useVideoConfig`), and an optional `config` object to customize the spring's behavior (e.g., `damping`). The function returns the animated value for the given frame.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_16

LANGUAGE: tsx
CODE:
```
import {spring, useCurrentFrame, useVideoConfig} from 'remotion'; // Added imports

export const MyComp: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const value = spring({
		fps,
		frame,
		config: {
			damping: 200,
		},
	});
	return (
		<div>
			Frame {frame}: {value}
		</div>
	);
};
```

----------------------------------------

TITLE: Creating a Remotion Project with Tailwind Template via npm - Bash
DESCRIPTION: This CLI command uses npx to initialize a new Remotion video project with TailwindCSS integration. The '--tailwind' flag configures the starter project to use Tailwind out of the box. Requires Node.js and npm. Run this command in the terminal to scaffold a new project that comes preconfigured for Tailwind utility classes. The output will be a new directory set up for Remotion video development with Tailwind styling ready to use.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2022-07-14-remotion-3-1.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx create-video --tailwind
```

----------------------------------------

TITLE: Conditionally Muting Remotion <Audio> Component in TypeScript
DESCRIPTION: This React component utilizes Remotion's `useCurrentFrame` and `useVideoConfig` hooks to retrieve the current frame number and frames per second (FPS). It renders an `<Audio>` component, dynamically setting its `muted` prop to true when the current frame falls between the 2-second and 4-second marks (inclusive), calculated using `frame` and `fps`. This effectively silences the audio during that specific time interval. Requires the `remotion` library and an audio file (e.g., 'audio.mp3') accessible via `staticFile`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/audio/muting.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash {9}
import {AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export const MyComposition = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill>
      <Audio src={staticFile('audio.mp3')} muted={frame >= 2 * fps && frame <= 4 * fps} />
    </AbsoluteFill>
  );
};
```
```

----------------------------------------

TITLE: Implementing a Seek Bar Component in React with TypeScript
DESCRIPTION: This React component (`SeekBar.tsx`) provides a visual seek bar for a Remotion player. It uses the `useElementSize` hook to dynamically track its dimensions and the `useHoverState` hook to manage hover effects. The component listens to player events like `frameupdate`, `play`, and `pause` via the provided `playerRef`. It handles pointer interactions (`pointerdown`, `pointermove`, `pointerup`) allowing users to click or drag to seek to different frames in the video. Key props include `durationInFrames` and `playerRef`. Optional `inFrame` and `outFrame` props can specify an active playback range. Dependencies include React, `@remotion/player`, and `remotion`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/custom-controls.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
import type {PlayerRef} from '@remotion/player';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {interpolate} from 'remotion';

type Size = {
  width: number;
  height: number;
  left: number;
  top: number;
};

// If a pane has been moved, it will cause a layout shift without
// the window having been resized. Those UI elements can call this API to
// force an update

export const useElementSize = (
  ref: React.RefObject<HTMLElement | null>,
): Size | null => {
  const [size, setSize] = useState<Size | null>(() => {
    if (!ref.current) {
      return null;
    }

    const rect = ref.current.getClientRects();
    if (!rect[0]) {
      return null;
    }

    return {
      width: rect[0].width as number,
      height: rect[0].height as number,
      left: rect[0].x as number,
      top: rect[0].y as number,
    };
  });

  const observer = useMemo(() => {
    if (typeof ResizeObserver === 'undefined') {
      return null;
    }

    return new ResizeObserver((entries) => {
      const {target} = entries[0];
      const newSize = target.getClientRects();

      if (!newSize?.[0]) {
        setSize(null);
        return;
      }

      const {width} = newSize[0];

      const {height} = newSize[0];

      setSize({
        width,
        height,
        left: newSize[0].x,
        top: newSize[0].y,
      });
    });
  }, []);

  const updateSize = useCallback(() => {
    if (!ref.current) {
      return;
    }

    const rect = ref.current.getClientRects();
    if (!rect[0]) {
      setSize(null);
      return;
    }

    setSize((prevState) => {
      const isSame =
        prevState &&
        prevState.width === rect[0].width &&
        prevState.height === rect[0].height &&
        prevState.left === rect[0].x &&
        prevState.top === rect[0].y;
      if (isSame) {
        return prevState;
      }

      return {
        width: rect[0].width as number,
        height: rect[0].height as number,
        left: rect[0].x as number,
        top: rect[0].y as number,
        windowSize: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      };
    });
  }, [ref]);

  useEffect(() => {
    if (!observer) {
      return;
    }

    const {current} = ref;
    if (current) {
      observer.observe(current);
    }

    return (): void => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [observer, ref, updateSize]);

  useEffect(() => {
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, [updateSize]);

  return useMemo(() => {
    if (!size) {
      return null;
    }

    return {...size, refresh: updateSize};
  }, [size, updateSize]);
};

const getFrameFromX = (
  clientX: number,
  durationInFrames: number,
  width: number,
) => {
  const pos = clientX;
  const frame = Math.round(
    interpolate(pos, [0, width], [0, Math.max(durationInFrames - 1, 0)], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  return frame;
};

const BAR_HEIGHT = 5;
const KNOB_SIZE = 12;
const VERTICAL_PADDING = 4;

const containerStyle: React.CSSProperties = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  paddingTop: VERTICAL_PADDING,
  paddingBottom: VERTICAL_PADDING,
  boxSizing: 'border-box',
  cursor: 'pointer',
  position: 'relative',
  touchAction: 'none',
  flex: 1,
};

const barBackground: React.CSSProperties = {
  height: BAR_HEIGHT,
  backgroundColor: 'rgba(0, 0, 0, 0.25)',
  width: '100%',
  borderRadius: BAR_HEIGHT / 2,
};

const findBodyInWhichDivIsLocated = (div: HTMLElement) => {
  let current = div;

  while (current.parentElement) {
    current = current.parentElement;
  }

  return current;
};

export const useHoverState = (ref: React.RefObject<HTMLDivElement | null>) => {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const {current} = ref;
    if (!current) {
      return;
    }

    const onHover = () => {
      setHovered(true);
    };

    const onLeave = () => {
      setHovered(false);
    };

    const onMove = () => {
      setHovered(true);
    };

    current.addEventListener('mouseenter', onHover);
    current.addEventListener('mouseleave', onLeave);
    current.addEventListener('mousemove', onMove);

    return () => {
      current.removeEventListener('mouseenter', onHover);
      current.removeEventListener('mouseleave', onLeave);
      current.removeEventListener('mousemove', onMove);
    };
  }, [ref]);
  return hovered;
};

export const SeekBar: React.FC<{
  durationInFrames: number;
  inFrame?: number | null;
  outFrame?: number | null;
  playerRef: React.RefObject<PlayerRef | null>;
}> = ({durationInFrames, inFrame, outFrame, playerRef}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const barHovered = useHoverState(containerRef);
  const size = useElementSize(containerRef);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const {current} = playerRef;
    if (!current) {
      return;
    }

    const onFrameUpdate = () => {
      setFrame(current.getCurrentFrame());
    };

    current.addEventListener('frameupdate', onFrameUpdate);

    return () => {
      current.removeEventListener('frameupdate', onFrameUpdate);
    };
  }, [playerRef]);

  useEffect(() => {
    const {current} = playerRef;
    if (!current) {
      return;
    }

    const onPlay = () => {
      setPlaying(true);
    };

    const onPause = () => {
      setPlaying(false);
    };

    current.addEventListener('play', onPlay);
    current.addEventListener('pause', onPause);

    return () => {
      current.removeEventListener('play', onPlay);
      current.removeEventListener('pause', onPause);
    };
  }, [playerRef]);

  const [dragging, setDragging] = useState<
    |
      {
        dragging: false;
      }
    | {
        dragging: true;
        wasPlaying: boolean;
      }
  >({
    dragging: false,
  });

  const width = size?.width ?? 0;

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) {
        return;
      }

      if (!playerRef.current) {
        return;
      }

      const posLeft = containerRef.current?.getBoundingClientRect()
        .left as number;

      const _frame = getFrameFromX(
        e.clientX - posLeft,
        durationInFrames,
        width,
      );
      playerRef.current.pause();
      playerRef.current.seekTo(_frame);
      setDragging({
        dragging: true,
        wasPlaying: playing,
      });
    },
    [durationInFrames, width, playerRef, playing],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!size) {
        throw new Error('Player has no size');
      }

      if (!dragging.dragging) {
        return;
      }

      if (!playerRef.current) {
        return;
      }

      const posLeft = containerRef.current?.getBoundingClientRect()
        .left as number;

      const _frame = getFrameFromX(
        e.clientX - posLeft,
        durationInFrames,
        size.width,
      );
      playerRef.current.seekTo(_frame);
    },
    [dragging.dragging, durationInFrames, playerRef, size],
  );

  const onPointerUp = useCallback(() => {
    setDragging({
      dragging: false,
    });
    if (!dragging.dragging) {
      return;
    }

    if (!playerRef.current) {
      return;
    }

    if (dragging.wasPlaying) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [dragging, playerRef]);

  useEffect(() => {
    if (!dragging.dragging) {
      return;
    }

    const body = findBodyInWhichDivIsLocated(
      containerRef.current as HTMLElement,
    );

    body.addEventListener('pointermove', onPointerMove);
    body.addEventListener('pointerup', onPointerUp);
    return () => {
      body.removeEventListener('pointermove', onPointerMove);
      body.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragging.dragging, onPointerMove, onPointerUp]);

  const knobStyle: React.CSSProperties = useMemo(() => {
    return {
      height: KNOB_SIZE,
      width: KNOB_SIZE,
      borderRadius: KNOB_SIZE / 2,
      position: 'absolute',
      top: VERTICAL_PADDING - KNOB_SIZE / 2 + 5 / 2,
      backgroundColor: '#000',
      left: Math.max(
        0,
        (frame / Math.max(1, durationInFrames - 1)) * width - KNOB_SIZE / 2,
      ),
      boxShadow: '0 0 2px black',
      opacity: Number(barHovered),
      transition: 'opacity 0.1s ease',
    };
  }, [barHovered, durationInFrames, frame, width]);

  const fillStyle: React.CSSProperties = useMemo(() => {
    return {
      height: BAR_HEIGHT,
      backgroundColor: '#000',
      width: ((frame - (inFrame ?? 0)) / (durationInFrames - 1)) * 100 + '%',
      marginLeft: ((inFrame ?? 0) / (durationInFrames - 1)) * 100 + '%',
      borderRadius: BAR_HEIGHT / 2,
    };
  }, [durationInFrames, frame, inFrame]);

  const active: React.CSSProperties = useMemo(() => {
    return {
      height: BAR_HEIGHT,
      backgroundColor: '#000',
      opacity: 0.6,
      width:
        (((outFrame ?? durationInFrames - 1) - (inFrame ?? 0)) /
          (durationInFrames - 1)) *
          100 +
        '%',
      marginLeft: ((inFrame ?? 0) / (durationInFrames - 1)) * 100 + '%',
      borderRadius: BAR_HEIGHT / 2,
      position: 'absolute',
    };
  }, [durationInFrames, inFrame, outFrame]);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      style={containerStyle}
    >
      <div style={barBackground}>
        <div style={active} />
        <div style={fillStyle} />
      </div>
      <div style={knobStyle} />
    </div>
  );
};

```

----------------------------------------

TITLE: Initializing a Blank Remotion Project (yarn)
DESCRIPTION: Uses yarn to initialize a new, blank Remotion video project in the current directory. This command sets up the basic file structure and dependencies required for a Remotion project.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dataset-render.mdx#_snippet_3

LANGUAGE: bash
CODE:
```
yarn create video --blank
```

----------------------------------------

TITLE: Passing Remote URLs Directly to Img in Remotion - TypeScript
DESCRIPTION: This snippet shows the correct pattern for using a remote image URL in the Remotion Img component: the remote URL is supplied directly to the 'src' prop, without involving the staticFile() utility. This approach ensures compatibility with Remotion’s image handling system and avoids runtime errors. Dependencies: Remotion library. Key parameter: 'src' specifies the direct remote URL string to the image resource. Outputs the Img component rendering the external image as intended, with no need for staticFile imports.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/static-file-remote-urls.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import { Img } from \"remotion\";

const MyComp = () => {
  return <Img src={\"https://example.com/image.png\"} />;
};
```

----------------------------------------

TITLE: Generating Deterministic Random Numbers in Remotion (TypeScript/React)
DESCRIPTION: Explains the use of Remotion's `random()` function for generating deterministic pseudo-random numbers between 0 and 1. It requires a static seed (a string) as an argument to ensure the same sequence of numbers is produced on every render, which is crucial for Remotion's deterministic rendering requirement. `Math.random()` is forbidden.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_13

LANGUAGE: tsx
CODE:
```
import {random} from 'remotion';

export const MyComp: React.FC = () => {
	return <div>Random number: {random('my-seed')}</div>;
};
```

----------------------------------------

TITLE: Playing Remote Audio URL in Remotion (TSX)
DESCRIPTION: This snippet shows how to play an audio file hosted remotely by providing its URL directly to the `src` prop of the `<Audio/>` component. The component is placed within an `<AbsoluteFill/>` container in a Remotion composition. This allows embedding audio from external sources without needing to store the file locally.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/audio/importing.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="MyComp.tsx"
import {AbsoluteFill, Audio} from 'remotion';

export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <Audio src="https://example.com/audio.mp3" />
    </AbsoluteFill>
  );
};
```
```

----------------------------------------

TITLE: Defining and Rendering Still and Video Compositions with Remotion in TypeScript/React
DESCRIPTION: This example demonstrates how to define both a video and a still image composition using the Remotion library in a TypeScript/React project. The MyComp component is created as a stub, and Composition and Still are rendered in MyVideo with the same component but different properties. Dependencies include React and Remotion, and the code requires importing the relevant components and ensuring that Remotion is set up in the project. The parameters width and height control the output size, fps and durationInFrames control the video length for Composition, while Still omits these for a single frame. The output produces either a video or a still image depending on the component used.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/still.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
// @allowUmdGlobalAccess\n// @filename: ./MyComp.tsx\nexport const MyComp = () => <></>;
```

LANGUAGE: TypeScript
CODE:
```
// @filename: index.tsx\n// ---cut---\nimport { Composition, Still } from \"remotion\";\nimport { MyComp } from \"./MyComp\";\n\nexport const MyVideo = () => {\n  return (\n    <>\n      <Composition\n        id=\"my-video\"\n        component={MyComp}\n        width={1080}\n        height={1080}\n        fps={30}\n        durationInFrames={3 * 30}\n      />\n      <Still id=\"my-image\" component={MyComp} width={1080} height={1080} />\n    </>\n  );\n};
```

----------------------------------------

TITLE: Programmatic Control of @remotion/player via React Ref in TypeScript
DESCRIPTION: Demonstrates programmatic control by obtaining the Player's ref and exposing imperative methods like seekTo. Utilizes useRef and useCallback React hooks; requires PlayerRef type from @remotion/player. The seekToMiddle function moves playback to the 60th frame. Inputs: playerRef, user-triggered callback. Outputs: player seeks as instructed. Limitation: example assumes the consumer wires the callback (e.g., button) for actual use.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/player-examples.mdx#_snippet_5

LANGUAGE: tsx
CODE:
```
// @allowUmdGlobalAccess\n// @filename: ./remotion/MyVideo.tsx\nexport const MyVideo = () => <></>;\n\n// @filename: index.tsx\n// ---cut---\nimport { Player, PlayerRef } from "@remotion/player";\nimport { useCallback, useRef } from "react";\nimport { MyVideo } from "./remotion/MyVideo";\n\nexport const App: React.FC = () => {\n  const playerRef = useRef<PlayerRef>(null);\n\n  const seekToMiddle = useCallback(() => {\n    const { current } = playerRef;\n    if (!current) {\n      return;\n    }\n    current.seekTo(60);\n  }, []);\n\n  return (\n    <Player\n      ref={playerRef}\n      component={MyVideo}\n      durationInFrames={120}\n      compositionWidth={1920}\n      compositionHeight={1080}\n      fps={30}\n    />\n  );\n};
```

----------------------------------------

TITLE: Invoking Remotion Lambda Render via API (JavaScript/TypeScript)
DESCRIPTION: Initiates the Remotion Lambda rendering process. This function, `renderMediaOnLambda()`, is the primary entry point, invoked either directly through its API or indirectly via the Remotion CLI. It triggers the main Lambda function.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/how-lambda-works.mdx#_snippet_0

LANGUAGE: javascript
CODE:
```
renderMediaOnLambda()
```

----------------------------------------

TITLE: Adjusting Playback Speed of <OffthreadVideo> in Remotion (tsx)
DESCRIPTION: Shows how to control the playback speed of an `<OffthreadVideo>` using the `playbackRate` prop. Setting `playbackRate={2}` makes the video play twice as fast. Requires `AbsoluteFill`, `OffthreadVideo`, and `staticFile` imports.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/offthreadvideo.mdx#_snippet_6

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';

// ---cut---
export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <OffthreadVideo playbackRate={2} src={staticFile('video.webm')} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Installing @remotion/studio via npm
DESCRIPTION: This command uses the Node Package Manager (npm) to install the `@remotion/studio` package. The `--save-exact` flag ensures that the exact version specified is added to the project's dependencies in the `package.json` file, rather than a version range using `^` or `~`. This is recommended to ensure all Remotion packages used in a project share the exact same version, avoiding potential compatibility issues.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/studio/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
npm install @remotion/studio --save-exact
```

----------------------------------------

TITLE: Using flip() with TransitionSeries (SlideTransition.tsx)
DESCRIPTION: This example demonstrates how to apply the `flip()` presentation transition between two sequences within a `TransitionSeries`. It defines a simple `Letter` component for slide content and shows how to configure the transition duration using `linearTiming`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transitions/presentations/flip.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { AbsoluteFill } from "remotion";

const Letter: React.FC<{
  children: React.ReactNode;
  color: string;
}> = ({ children, color }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: 0.9,
        justifyContent: "center",
        alignItems: "center",
        fontSize: 200,
        color: "white",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
// ---cut---
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { flip } from "@remotion/transitions/flip";

const BasicTransition = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={40}>
        <Letter color="#0b84f3">A</Letter>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={flip()}
        timing={linearTiming({ durationInFrames: 30 })}
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <Letter color="pink">B</Letter>
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

```

----------------------------------------

TITLE: Example Remotion Render Script (Node.js/TypeScript)
DESCRIPTION: A Node.js script using ES Modules (`.mjs`) that demonstrates how to bundle a Remotion project, select a specific composition, and render it to an MP4 video file using `@remotion/bundler` and `@remotion/renderer`. It includes recommended Chromium options for Linux environments.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/docker.mdx#_snippet_9

LANGUAGE: tsx
CODE:
```
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

const bundled = await bundle({
  entryPoint: require.resolve('./src/index.ts'),
  // If you have a webpack override in remotion.config.ts, pass it here as well.
  webpackOverride: (config) => config,
});

const inputProps = {};

const composition = await selectComposition({
  serveUrl: bundled,
  id: 'MyComp',
  inputProps,
});

console.log('Starting to render composition');

await renderMedia({
  codec: 'h264',
  composition,
  serveUrl: bundled,
  outputLocation: `out/${composition.id}.mp4`,
  chromiumOptions: {
    enableMultiProcessOnLinux: true,
  },
  inputProps,
});

console.log(`Rendered composition ${composition.id}.`);
```

----------------------------------------

TITLE: Implementing Spring Animations for Scale in Remotion (React TSX)
DESCRIPTION: This React component (`MyVideo`) demonstrates using Remotion's `spring` function to create a natural spring animation. It uses the current frame (`useCurrentFrame`) and the video's frames per second (`useVideoConfig`) as inputs to the `spring` function. The resulting value animates from 0 to 1 by default and is used here to drive the `scale` transform property, making the text element scale in with a characteristic bounce.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/animating-properties.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
```tsx twoslash {7-12, 20}
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const MyVideo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    fps,
    frame,
  });

  return (
    <div
      style={{
        flex: 1,
        textAlign: "center",
        fontSize: "7em",
      }}
    >
      <div style={{ transform: `scale(${scale})` }}>Hello World!</div>
    </div>
  );
};
```
```

----------------------------------------

TITLE: Rendering Media Programmatically via Remotion Cloud Run (TypeScript/TSX)
DESCRIPTION: Provides a Node.js/Bun script using TypeScript/TSX to initiate a render on Google Cloud Run. It imports `renderMediaOnCloudrun` from `@remotion/cloudrun/client` and calls it with configuration such as Cloud Run region, service name, composition ID, serve URL, codec, and input props. It also shows how to handle the successful result. Requires the `@remotion/cloudrun/client` package and a configured Cloud Run service.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/studio/deploy-static.mdx#_snippet_8

LANGUAGE: tsx
CODE:
```
// ---cut---
import {renderMediaOnCloudrun} from '@remotion/cloudrun/client';

const result = await renderMediaOnCloudrun({
  region: 'us-east1',
  serviceName: 'remotion-render-bds9aab',
  composition: 'HelloWorld',
  serveUrl: 'https://remotion-helloworld.vercel.app',
  codec: 'h264',
  inputProps: {
    titleText: 'Hello World!',
  },
});

if (result.type === 'success') {
  console.log(result.bucketName);
  console.log(result.renderId);
}
```

----------------------------------------

TITLE: Using Tailwind CSS Classes with <AbsoluteFill> in TSX
DESCRIPTION: Shows an example of applying Tailwind CSS utility classes directly to an `<AbsoluteFill>` component using the `className` prop. Specifically, it demonstrates using `flex flex-row` to override the default `flex-direction: column`. Since Remotion v4.0.249, the component automatically detects conflicting Tailwind classes and disables the corresponding default inline styles to ensure the utility classes take precedence as expected. Requires `remotion` and `tailwindcss`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/absolute-fill.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
<AbsoluteFill className="flex flex-row" />
```

----------------------------------------

TITLE: Overriding Default Props via Remotion CLI (Bash)
DESCRIPTION: Provides command-line invocations to override default composition props during a render using the Remotion CLI. Props can be provided inline as valid JSON or as a file path to a JSON file. Requires Remotion to be installed and supports any valid compositional inputs. 'propOne' and 'propTwo' are passed as runtime overrides. Limitations: JSON must be properly formatted and serializable.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/passing-props.mdx#_snippet_2

LANGUAGE: bash
CODE:
```
npx remotion render HelloWorld out/helloworld.mp4 --props='{"propOne": "Hi", "propTwo": 10}'
```

LANGUAGE: bash
CODE:
```
npx remotion render HelloWorld out/helloworld.mp4 --props=./path/to/props.json
```

----------------------------------------

TITLE: Handling Render Errors with Remotion Player Event Listener in TypeScript/React
DESCRIPTION: Demonstrates attaching an event listener for the 'error' event on a Remotion Player using `PlayerRef`. This allows capturing and logging uncaught exceptions (`e.detail.error`) that occur during the rendering of the Remotion composition. Depends on React and `@remotion/player`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/api.mdx#_snippet_15

LANGUAGE: tsx
CODE:
```
import {PlayerRef} from '@remotion/player';
import {useRef} from 'react';
const ref = useRef<PlayerRef>(null);
// ---cut---
ref.current?.addEventListener('error', (e) => {
  console.log('error ', e.detail.error); // error [Error: undefined is not a function]
});
```

----------------------------------------

TITLE: Querying Render Progress via API (JavaScript/TypeScript)
DESCRIPTION: Retrieves the current progress of a Remotion Lambda render. The `getRenderProgress()` function queries an S3 bucket for a `progress.json` file, which is periodically updated by the main Lambda function, and returns the status.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/how-lambda-works.mdx#_snippet_1

LANGUAGE: javascript
CODE:
```
getRenderProgress()
```

----------------------------------------

TITLE: Rendering Video Media via Remotion Cloud Run CLI with Service Name (Bash)
DESCRIPTION: This command renders a video (media) using Remotion Cloud Run with a service name and region instead of a direct Cloud Run URL. The service name and region must be determined from prior deployment steps. It prints progress and saves rendered video to the configured cloud storage.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cloudrun/setup.mdx#_snippet_10

LANGUAGE: bash
CODE:
```
npx remotion cloudrun render <serve-url | site-name> <composition-id> --service-name=<service-name> --region=<region>
```

----------------------------------------

TITLE: Installing and Using Whisper.cpp via @remotion/install-whisper-cpp in TypeScript
DESCRIPTION: This TypeScript code demonstrates the complete workflow to set up Whisper.cpp for local audio transcription using the @remotion/install-whisper-cpp package. It installs the Whisper.cpp binary to a specified directory, downloads the required "medium.en" model, and runs transcription to process 16KHz wav audio files, returning token-level timestamps. The snippet also shows an optional post-processing step to convert raw transcriptions into grouped captions, and includes commented instructions for audio preprocessing with ffmpeg. The key inputs are the installation path, Whisper.cpp version, model name, and audio file path. Main dependencies are the @remotion/install-whisper-cpp package (with Whisper.cpp >= 1.5.5 binary and compatible model) and node APIs (path, child_process for optional conversion). The primary output consists of structured transcription tokens and formatted captions, ready to use for subtitle generation or display. Limitations: audio must be pre-converted to 16KHz wav format; the example assumes an environment supporting ES Modules and top-level await.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/install-whisper-cpp/index.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import path from 'path';
import {downloadWhisperModel, installWhisperCpp, transcribe, convertToCaptions} from '@remotion/install-whisper-cpp';

const to = path.join(process.cwd(), 'whisper.cpp');

await installWhisperCpp({
  to,
  version: '1.5.5',
});

await downloadWhisperModel({
  model: 'medium.en',
  folder: to,
});

// Convert the audio to a 16KHz wav file first if needed:
// import {execSync} from 'child_process';
// execSync('ffmpeg -i /path/to/audio.mp4 -ar 16000 /path/to/audio.wav -y');

const {transcription} = await transcribe({
  model: 'medium.en',
  whisperPath: to,
  whisperCppVersion: '1.5.5',
  inputPath: '/path/to/audio.wav',
  tokenLevelTimestamps: true,
});

for (const token of transcription) {
  console.log(token.timestamps.from, token.timestamps.to, token.text);
}

// Optional: Apply our recommended postprocessing
const {captions} = convertToCaptions({
  transcription,
  combineTokensWithinMilliseconds: 200,
});

for (const line of captions) {
  console.log(line.text, line.startInSeconds);
}

```

----------------------------------------

TITLE: Defining Zod Schema for Remotion Props (TSX)
DESCRIPTION: This snippet demonstrates how to define a basic Zod schema for component props using `z.object()`. It imports the `z` object from the `zod` library and creates a schema named `myCompSchema` with two string properties, `propOne` and `propTwo`. This schema can then be used to validate and type component props.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/schemas.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {z} from 'zod';

export const myCompSchema = z.object({
  propOne: z.string(),
  propTwo: z.string(),
});
```

----------------------------------------

TITLE: Sequencing by Seconds Using FPS in Remotion (TSX/React)
DESCRIPTION: Illustrates using useVideoConfig's fps to create a Sequence that lasts exactly three seconds, regardless of project fps. Dependencies include Remotion (interpolate, useCurrentFrame, Sequence, useVideoConfig). Shows proper usage of durationInFrames={3 * fps} to specify sequence duration in a time-independent way. Inputs: fps, outputs: a React component rendering a Sequence. Limitation: requires Remotion >= 2.5 and functional React setup.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/multiple-fps.mdx#_snippet_2

LANGUAGE: TSX
CODE:
```
import React from 'react';\nimport {interpolate, useCurrentFrame, Sequence, useVideoConfig} from 'remotion';\nconst frame = useCurrentFrame();\nconst {fps, durationInFrames} = useVideoConfig();\n// ---cut---\n// Show for 3 seconds\n<Sequence durationInFrames={3 * fps}>\n  <div />\n</Sequence>;
```

----------------------------------------

TITLE: Executing the Remotion Bundle Command (Bash)
DESCRIPTION: Demonstrates the basic syntax for using the `npx remotion bundle` command. This command creates a Remotion Bundle, which is a self-contained package of your Remotion project. It optionally accepts a Serve URL or an entry point file path as an argument. If no argument is provided, Remotion attempts to determine the entry point automatically. Various flags can be used to customize the bundling process.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cli/bundle.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion bundle <serve-url|entry-file>?
```

----------------------------------------

TITLE: Fitting Remotion Player to Fullscreen Container in React (TypeScript/TSX)
DESCRIPTION: This TypeScript/React code snippet demonstrates how to make the Remotion Player component fill a fullscreen container while maintaining the aspect ratio of the video. Dependencies include React and Remotion libraries ('@remotion/player', 'remotion'). The key technique uses a wrapping div with CSS absolute positioning and the aspectRatio CSS property based on composition dimensions. Key parameters are compositionWidth, compositionHeight, and Player props like fps, durationInFrames, and style. This approach outputs a Player that centers and scales responsively in any viewport without distorting its aspect ratio.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/scaling.mdx#_snippet_1

LANGUAGE: TSX
CODE:
```
import {Player} from '@remotion/player';
import React from 'react';
import {AbsoluteFill} from 'remotion';

const MyComp: React.FC = () => {
  return <AbsoluteFill style={{backgroundColor: 'black'}} />;
};

export const FullscreenPlayer = () => {
  const compositionWidth = 300;
  const compositionHeight = 200;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'gray',
        // Any container with "position: relative" will work
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 'auto',
          aspectRatio: `${compositionWidth} / ${compositionHeight}`,
          maxHeight: '100%',
          maxWidth: '100%',
        }}
      >
        <Player
          controls
          component={MyComp}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          durationInFrames={200}
          fps={30}
          style={{
            width: '100%',
          }}
        />
      </div>
    </div>
  );
};
```

----------------------------------------

TITLE: Setting Static Volume for <Video> in Remotion (TSX)
DESCRIPTION: This example shows how to set a fixed volume level for the Remotion `<Video>` component. The `volume` prop is set to a static number (0.5 in this case), which represents 50% of the original volume.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/video.mdx#_snippet_4

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, staticFile, Video} from 'remotion';

// ---cut---
export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <Video volume={0.5} src={staticFile('video.webm')} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Applying Translate Transform using Style Prop in TSX
DESCRIPTION: Demonstrates how to move a `div` element along the X-axis using the `transform: translateX()` CSS property within the `style` prop in TSX. Translation moves an element (here 100px to the right) without affecting the layout of surrounding elements.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transforms.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
```tsx twoslash {6} title="MyComponent.tsx"
<div
  style={{
    height: 100,
    width: 100,
    backgroundColor: "red",
    transform: `translateX(100px)`,
  }}
/>
```
```

----------------------------------------

TITLE: Delaying Mount with Remotion Sequence (React/TypeScript)
DESCRIPTION: Wraps BlueSquare in a Remotion <Sequence> component with 'from' set to 30, causing the component to mount only after 30 frames. This pattern allows timed entry effects in animations. Depends on 'remotion' and React, and expects a BlueSquare component as a child.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/sequence.mdx#_snippet_4

LANGUAGE: tsx
CODE:
```
// @include: example-BlueSquare
import {Sequence} from 'remotion';
// ---cut---
const MyVideo = () => {
  return (
    <Sequence from={30}>
      <BlueSquare />
    </Sequence>
  );
};
```

----------------------------------------

TITLE: Correct Usage of staticFile() with Filename (TypeScript)
DESCRIPTION: Shows the correct way to use Remotion's `staticFile()` function. Pass only the name of the file (e.g., `image.png`) that resides directly within the project's `public/` folder. Remotion resolves the full path automatically.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/static-file-relative-paths.mdx#_snippet_4

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="✅ Filename"
import { staticFile } from "remotion";
staticFile("image.png");
```
```

----------------------------------------

TITLE: Starting Dev Server (Next.js + React Router 7 Template)
DESCRIPTION: For Remotion projects scaffolded with the 'Next.js + React Router 7' template, this command starts the Next.js development server. It assumes the project uses standard npm scripts.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/getting-started.mdx#_snippet_5

LANGUAGE: bash
CODE:
```
```bash
npm run dev
```
```

----------------------------------------

TITLE: Defining Remotion Dependencies with Fixed Versions in package.json - JSON
DESCRIPTION: This JSON manifest explicitly pins Remotion and related packages to exact version numbers in a package.json. Pinning each package to the same version ensures consistency across dependencies, preventing subtle bugs or breakages resulting from mismatched package versions. Only the 'dependencies' object is shown, which should be part of the root package.json structure; no additional context or dependencies are needed for interpretation.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/version-mismatch.mdx#_snippet_1

LANGUAGE: json
CODE:
```
{\n  \"dependencies\": {\n    \"remotion\": \"2.6.12\",\n    \"@remotion/player\": \"2.6.12\",\n    \"@remotion/gif\": \"2.6.12\"\n  }\n}
```

----------------------------------------

TITLE: Measuring and Correcting DOM Node Dimensions with useCurrentScale Hook in React (TypeScript)
DESCRIPTION: This snippet demonstrates measuring a DOM node's dimensions in a Remotion project while accounting for the scale transform applied to the rendering container. It uses the `useCurrentScale()` hook to obtain the current scale factor, dividing the measured width and height values to get corrected dimensions. The snippet relies on React hooks (`useRef`, `useEffect`, and `useState`) and the `remotion` package for the scale hook. Dependencies include React 17+ and Remotion v4.0.111 or later. The `ref` prop is used to get the target DOM node, and the main output is an object containing `correctedHeight` and `correctedWidth`. The approach assumes that the measured node is visible and mounted when the effect runs.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/measuring.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import { useCallback, useEffect, useState, useRef } from "react";
import { useCurrentScale } from "remotion";

export const MyComponent = () => {
  const ref = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState<{
    correctedHeight: number;
    correctedWidth: number;
  } | null>(null);

  const scale = useCurrentScale();

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const rect = ref.current.getBoundingClientRect();

    setDimensions({
      correctedHeight: rect.height / scale,
      correctedWidth: rect.width / scale,
    });
  }, [scale]);

  return (
    <div>
      <div ref={ref}>Hello World!</div>
    </div>
  );
};
```

----------------------------------------

TITLE: Defining Rotation and Spring Animations in Remotion (TypeScript)
DESCRIPTION: This snippet calculates animation values using Remotion's utility functions. `interpolate` maps the current `frame` to a rotation angle (`constantRotation`), creating continuous rotation over the `durationInFrames`. `spring` creates a physics-based transition (`entranceAnimation`) from 0 to 1, driven by the `frame` and `fps`, useful for smooth entrances or effects.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/spline.mdx#_snippet_5

LANGUAGE: tsx
CODE:
```
import {interpolate, spring} from 'remotion';
const durationInFrames = 300;
const frame = 0;
const fps = 30;
// ---cut---

const constantRotation = interpolate(
  frame,
  [0, durationInFrames],
  [0, Math.PI * 6],
);

const entranceAnimation = spring({
  frame,
  fps,
  config: {
    damping: 200,
  },
});
```

----------------------------------------

TITLE: Implementing TransitionSeries with linearTiming (TSX)
DESCRIPTION: This snippet demonstrates how to use the `linearTiming` function within a `<TransitionSeries>` component to control the timing of a transition. It defines a simple `Letter` component and then shows a `BasicTransition` component that sequences two `Letter` components with a `slide()` transition using `linearTiming` for its duration and easing.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transitions/timings/lineartiming.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { AbsoluteFill } from "remotion";

const Letter: React.FC<{
  children: React.ReactNode;
  color: string;
}> = ({ children, color }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: 0.9,
        justifyContent: "center",
        alignItems: "center",
        fontSize: 200,
        color: "white",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
// ---cut---
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { Easing } from "remotion";

const BasicTransition = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={40}>
        <Letter color="#0b84f3">A</Letter>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide()}
        timing={linearTiming({
          durationInFrames: 30,
          easing: Easing.in(Easing.ease),
        })}
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <Letter color="pink">B</Letter>
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

```

----------------------------------------

TITLE: Cancelling a Remotion Render with makeCancelSignal (TypeScript)
DESCRIPTION: Demonstrates using `makeCancelSignal()` from `@remotion/renderer` to obtain a `cancelSignal` and a `cancel` function. The `cancelSignal` is passed to `renderMedia()`, and the `cancel()` function is called via `setTimeout` after 10 seconds to potentially abort the rendering process. The example highlights that `renderMedia()` returns a promise that resolves upon successful completion or rejects with an error if cancelled before completion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/renderer/make-cancel-signal.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {VideoConfig} from 'remotion';
const composition: VideoConfig = {
  durationInFrames: 1000000,
  fps: 30,
  height: 720,
  id: 'react-svg',
  width: 1280,
  defaultProps: {},
  props: {},
  defaultCodec: null,
  defaultOutName: null,
};
// ---cut---
import {makeCancelSignal, renderMedia} from '@remotion/renderer';

const {cancelSignal, cancel} = makeCancelSignal();

// Note that no `await` is used yet
const render = renderMedia({
  composition,
  codec: 'h264',
  serveUrl: 'https://silly-crostata-c4c336.netlify.app/',
  outputLocation: 'out/render.mp4',
  cancelSignal,
});

// Cancel render after 10 seconds
setTimeout(() => {
  cancel();
}, 10000);

// If the render completed within 10 seconds, renderMedia() will resolve
await render;

// If the render did not complete, renderMedia() will reject
// ==> "[Error: renderMedia() got cancelled]"
```

----------------------------------------

TITLE: Calculating Remotion Composition Metadata from Video Duration using media-parser in TypeScript
DESCRIPTION: Implements the `calculateMetadata` function using `parseMedia` from `@remotion/media-parser`. This function asynchronously retrieves the video's duration (`slowDurationInSeconds`) and dimensions based on the `src` prop, then calculates the required `durationInFrames`, `fps`, `width`, and `height` for the Remotion composition. It requires `@remotion/media-parser` to be installed and throws an error if the source is not a valid video file.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/align-duration.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
type MyCompProps = {
  src: string;
};

// ---cut---

import {CalculateMetadataFunction} from 'remotion';
import {parseMedia} from '@remotion/media-parser';

export const calculateMetadata: CalculateMetadataFunction<MyCompProps> = async ({props}) => {
  const {slowDurationInSeconds, dimensions} = await parseMedia({
    src: props.src,
    fields: {
      slowDurationInSeconds: true,
      dimensions: true,
    },
  });

  if (dimensions === null) {
    // For example when passing an MP3 file:
    throw new Error('Not a video file');
  }

  const fps = 30;

  return {
    durationInFrames: Math.floor(slowDurationInSeconds * fps),
    fps,
    width: dimensions.width,
    height: dimensions.height,
  };
};
```

----------------------------------------

TITLE: Preloading Media Assets with Remotion Utilities in TypeScript/React
DESCRIPTION: This snippet demonstrates how to use Remotion's \'prefetch\' and \'staticFile\' utilities to preload audio files in a React component before updating the audio source. Dependencies include Remotion (providing \'prefetch\' and \'staticFile\') and React. The \'setAudioUrl\' function updates the current audio, triggered by a select dropdown. By awaiting \'prefetch().waitUntilDone()\', the asset is loaded before the audio source is changed, preventing non-seekable errors. The input is a change event from the dropdown, and the output is an updated audio source. Preloading assets requires CORS support from the static assets' server.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/non-seekable-media.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
const setAudioUrl = (url: string) => {};
// ---cut---

import { prefetch, staticFile } from "remotion";

const MyComp = () => {
  return (
    <select
      onChange={(e) => {
        prefetch(e.target.value)
          .waitUntilDone()
          .then(() => {
            setAudioUrl(e.target.value);
          });
      }}
    >
      <option value={staticFile("sample.mp3")}>Audio 0</option>
      <option value={staticFile("sample2.mp3")}>Audio 1</option>
      <option value={staticFile("sample3.mp3")}>Audio 2</option>
    </select>
  );
};
```

----------------------------------------

TITLE: Defining Sample Dataset in TypeScript
DESCRIPTION: Defines a sample dataset as a TypeScript array of objects. Each object represents the data for one video and contains properties like `name`, `repo`, and `logo`. This data will be passed as props to the Remotion component.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dataset-render.mdx#_snippet_4

LANGUAGE: ts
CODE:
```
export const data = [
  {
    name: 'React',
    repo: 'facebook/react',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
  },
  {
    name: 'Remotion',
    repo: 'remotion-dev/remotion',
    logo: 'https://github.com/remotion-dev/logo/raw/main/withouttitle/element-0.png',
  },
];
```

----------------------------------------

TITLE: Changing Video Playback Speed in Remotion with OffthreadVideo (TypeScript)
DESCRIPTION: This example sets the playbackRate prop to 2, doubling the speed at which the video is played. Dependencies are React and remotion, and the source video is accessed with staticFile. The playbackRate parameter must be a positive number; this technique only supports constant speeds.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/videos/index.mdx#_snippet_8

LANGUAGE: tsx
CODE:
```
import React from 'react';\nimport {OffthreadVideo, staticFile} from 'remotion';\n\nexport const MyComp: React.FC = () => {\n  return <OffthreadVideo src={staticFile('video.mp4')} playbackRate={2} />;\n};
```

----------------------------------------

TITLE: Computing and Passing Composition Metadata Programmatically for Player - TypeScript/React
DESCRIPTION: This code sample illustrates calling a reusable calculateMetadata function—compatible with Remotion's CalculateMetadataFunction signature—in a browser context to assemble the necessary metadata before passing it to the <Player> component. It uses useEffect to trigger metadata calculation and useState to store the result. Props and static metadata values are set in calculateMetadataFunction; the output is passed as a single object to Player, ensuring full synchronization between browser and server composition definitions. Dependencies include React, Remotion types/interfaces, and '@remotion/player'. Type definitions for Props and Metadata are explicitly included.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dynamic-metadata.mdx#_snippet_4

LANGUAGE: TSX
CODE:
```
import {useEffect, useState} from 'react';
import {CalculateMetadataFunction} from 'remotion';

const VideoTesting: React.FC = () => null;

// ---cut---
import {Player} from '@remotion/player';

type Props = {};

const calculateMetadataFunction: CalculateMetadataFunction<Props> = () => {
  return {
    props: {},
    durationInFrames: 1,
    width: 100,
    height: 100,
    fps: 30,
  };
};

type Metadata = {
  durationInFrames: number;
  compositionWidth: number;
  compositionHeight: number;
  fps: number;
  props: Props;
};

export const Index: React.FC = () => {
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  useEffect(() => {
    Promise.resolve(
      calculateMetadataFunction({
        defaultProps: {},
        props: {},
        abortSignal: new AbortController().signal,
        compositionId: 'MyComp',
      }),
    )
      .then(({durationInFrames, props, width, height, fps}) => {
        setMetadata({
          durationInFrames: durationInFrames as number,
          compositionWidth: width as number,
          compositionHeight: height as number,
          fps: fps as number,
          props: props as Props,
        });
      })
      .catch((err) => {
        console.log(`Error fetching metadata: ${err}`);
      });
  }, []);

  if (!metadata) {
    return null;
  }

  return <Player component={VideoTesting} {...metadata} />;
};
```

----------------------------------------

TITLE: Implementing Greenscreen Effect on Canvas using Remotion and TSX
DESCRIPTION: This React component (`Greenscreen`) demonstrates a chroma key (greenscreen) effect using `<OffthreadVideo>` and Canvas. It receives video frames via the `onVideoFrame` callback, draws them to a canvas, and then retrieves the pixel data using `context.getImageData`. The code iterates through the pixel data array, identifying pixels with high green values and low red/blue values, and sets their alpha channel (`imageFrame.data[i + 3]`) based on the `opacity` prop to make them transparent. The modified image data is then drawn back onto the canvas using `context.putImageData`. Requires `React`, `remotion`, a video source URL, and includes necessary global type declarations for video frame callbacks.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/video-manipulation.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
```tsx twoslash
declare global {
  interface VideoFrameMetadata {
    presentationTime: DOMHighResTimeStamp;
    expectedDisplayTime: DOMHighResTimeStamp;
    width: number;
    height: number;
    mediaTime: number;
    presentedFrames: number;
    processingDuration?: number;
    captureTime?: DOMHighResTimeStamp;
    receiveTime?: DOMHighResTimeStamp;
    rtpTimestamp?: number;
  }
  type VideoFrameRequestCallbackId = number;
  interface HTMLVideoElement extends HTMLMediaElement {
    requestVideoFrameCallback(
      callback: (now: DOMHighResTimeStamp, metadata: VideoFrameMetadata) => any,
    ): VideoFrameRequestCallbackId;
    cancelVideoFrameCallback(handle: VideoFrameRequestCallbackId): void;
  }
}
import React, {useCallback, useEffect, useRef} from 'react';
import {AbsoluteFill, useVideoConfig, OffthreadVideo} from 'remotion';

// ---cut---
export const Greenscreen: React.FC<{
  opacity: number;
}> = ({opacity}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const {width, height} = useVideoConfig();

  // Process a frame
  const onVideoFrame = useCallback(
    (frame: CanvasImageSource) => {
      if (!canvas.current) {
        return;
      }
      const context = canvas.current.getContext('2d');

      if (!context) {
        return;
      }

      context.drawImage(frame, 0, 0, width, height);
      const imageFrame = context.getImageData(0, 0, width, height);
      const {length} = imageFrame.data;

      // If the pixel is very green, reduce the alpha channel
      for (let i = 0; i < length; i += 4) {
        const red = imageFrame.data[i + 0];
        const green = imageFrame.data[i + 1];
        const blue = imageFrame.data[i + 2];
        if (green > 100 && red < 100 && blue < 100) {
          imageFrame.data[i + 3] = opacity * 255;
        }
      }
      context.putImageData(imageFrame, 0, 0);
    },
    [height, width],
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <OffthreadVideo
          style={{opacity: 0}}
          onVideoFrame={onVideoFrame}
          src="https://remotion-assets.s3.eu-central-1.amazonaws.com/just-do-it-short.mp4"
        />
      </AbsoluteFill>
      <AbsoluteFill>
        <canvas ref={canvas} width={width} height={height} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```
```

----------------------------------------

TITLE: Embedding Remote Video with OffthreadVideo in Remotion (TypeScript)
DESCRIPTION: This React functional component demonstrates how to embed a video from a remote URL in a Remotion project using the OffthreadVideo component. The code requires the remotion package and React. It accepts no parameters and outputs the video player rendering the specified remote video; no special configuration is needed. Limitations include the requirement for video URLs to be accessible and supported by the browser.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/videos/index.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import React from 'react';\nimport {OffthreadVideo, staticFile} from 'remotion';\n\nexport const MyComp: React.FC = () => {\n  return (\n    <OffthreadVideo src=\"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\" />\n  );\n};
```

----------------------------------------

TITLE: Trimming End with Remotion Sequence durationInFrames (React/TypeScript)
DESCRIPTION: Wraps the BlueSquare component in a Remotion <Sequence> and sets 'durationInFrames' to 45, unmounting the child after 45 frames. Useful for defining the visibility window of child components within a video sequence. Depends on 'remotion' and React.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/sequence.mdx#_snippet_5

LANGUAGE: tsx
CODE:
```
// @include: example-BlueSquare
import {Sequence} from 'remotion';
// ---cut---
const ClipExample: React.FC = () => {
  return (
    <Sequence durationInFrames={45}>
      <BlueSquare />
    </Sequence>
  );
};
```

----------------------------------------

TITLE: Interpolating CSS Color Names with Remotion interpolateColors() in TypeScript
DESCRIPTION: Provides a basic example of using `interpolateColors` in TypeScript to interpolate between two CSS color names ('red' and 'yellow') based on the current frame number over the range [0, 20]. Imports `interpolateColors` and `useCurrentFrame` from 'remotion'. The result is an `rgba` color string.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate-colors.mdx#_snippet_3

LANGUAGE: ts
CODE:
```
```ts twoslash
import { useCurrentFrame, interpolateColors } from "remotion";

const frame = useCurrentFrame(); // 10

const color = interpolateColors(frame, [0, 20], ["red", "yellow"]); // rgba(255, 128, 0, 1)
```
```

----------------------------------------

TITLE: Transcribing Audio with Whisper.cpp in TypeScript
DESCRIPTION: Demonstrates how to use the transcribe() function from @remotion/install-whisper-cpp to convert a local .wav audio file to text, specifying custom parameters such as the Whisper.cpp installation path, model, and options for token-level timestamps. The example expects Whisper.cpp (v1.5.5 or later) to be installed, and the model referenced to be available locally. This code requires Node.js, TypeScript, and the appropriate dependencies installed via npm. The resulting transcription array contains word-level timestamp data, which is then logged. Inputs include paths to audio and model; output is a structured transcription object.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/install-whisper-cpp/transcribe.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import path from 'path';\nimport {transcribe} from '@remotion/install-whisper-cpp';\n\nconst {transcription} = await transcribe({\n  inputPath: '/path/to/audio.wav',\n  whisperPath: path.join(process.cwd(), 'whisper.cpp'),\n  whisperCppVersion: '1.5.5',\n  model: 'medium.en',\n  tokenLevelTimestamps: true,\n});\n\nfor (const token of transcription) {\n  console.log(token.timestamps.from, token.timestamps.to, token.text);\n}
```

----------------------------------------

TITLE: Centralized Font Loading in Remotion with waitForFonts (React TypeScript)
DESCRIPTION: This snippet defines a shared asynchronous function for preloading multiple font families (from @remotion/google-fonts/Inter and @remotion/google-fonts/RobotoMono) within a Remotion project. It uses delayRender and continueRender from remotion to block playback until fonts are ready, and cancelRender on errors, preventing premature rendering. This pattern enables a robust font loading experience across component trees by exporting the waitForFonts utility.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/layout-utils/best-practices.mdx#_snippet_1

LANGUAGE: TSX
CODE:
```
import {fontFamily as regularFont, loadFont as loadRegular} from '@remotion/google-fonts/Inter';\n\nimport {fontFamily as monospaceFont, loadFont as loadMonospace} from '@remotion/google-fonts/RobotoMono';\n\nimport {cancelRender, continueRender, delayRender} from 'remotion';\n\nconst regular = loadRegular();\nconst monospace = loadMonospace();\n\nexport const waitForFonts = async () => {\n  await regular.waitUntilDone();\n  await monospace.waitUntilDone();\n};\n\nconst delay = delayRender('Loading fonts');\n\nwaitForFonts()\n  .then(() => continueRender(delay))\n  .catch((err) => cancelRender(err));
```

----------------------------------------

TITLE: Embedding the Remotion <Player /> in a React App - React (TSX)
DESCRIPTION: Defines an App component demonstrating how to embed the Remotion <Player /> in a React application. Passes the composition component, input props, video parameters (duration, dimensions, fps), and styling to the player instance for in-app video preview. Requires @remotion/player installed and the referenced MyComp component.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/player-integration.mdx#_snippet_9

LANGUAGE: tsx
CODE:
```
// @allowUmdGlobalAccess
// @filename: ./remotion/MyComp.tsx
export const MyComp = () => <><\/>;

// @filename: index.tsx
// ---cut---
import {Player} from '@remotion/player';
import {MyComp} from './remotion/MyComp';

export const App: React.FC = () => {
  return (
    <Player
      component={MyComp}
      inputProps={{text: 'World'}}
      durationInFrames={120}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={30}
      style={{
        width: 1280,
        height: 720,
      }}
      controls
    />
  );
};
```

----------------------------------------

TITLE: Rendering Selection Outlines With Resizing Handles in React (TypeScript)
DESCRIPTION: These snippets define React components to render outlines and resize controls for items when selected, hovered, or being manipulated. The outline visually differentiates the selected item, and uses pointer events to handle interactions (e.g., pointerdown, disabling native selection, conditionally rendering hover/drag state). It accounts for Remotion's Player scale via useCurrentScale to translate pointer coordinates and border thickness. Handles are layered via z-index, and browser default behaviors are suppressed for seamless drag-and-drop UX.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/drag-and-drop/index.mdx#_snippet_11

LANGUAGE: tsx
CODE:
```
// @filename: ResizeHandle.tsx\n// @include: ResizeHandle\n// @filename: item.ts\n// @include: item\n// @filename: SelectionOutline.tsx\n// ---cut---\n// @include: SelectionOutline
```

LANGUAGE: tsx
CODE:
```
// @filename: item.ts\n// @include: item\n// @filename: ResizeHandle.tsx\n// ---cut---\n// @include: ResizeHandle
```

----------------------------------------

TITLE: Controlling Video Audio Playback in Remotion (TypeScript)
DESCRIPTION: This TypeScript example demonstrates rendering an <OffthreadVideo /> component within a Remotion composition using AbsoluteFill. It utilizes the staticFile helper to reference a local video file ('video.mp4'). The snippet specifically showcases how to adjust the audio properties of the video by setting the playbackRate to 2 (double speed) and volume to 0.5 (half volume). It requires the `remotion` package.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/audio/from-video.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';

export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile('video.mp4')} playbackRate={2} volume={0.5} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Higher-Order React Component for Font Readiness in Remotion (TypeScript)
DESCRIPTION: This React component, WaitForFonts, renders its children only after required fonts are loaded by invoking the waitForFonts utility, which preloads multiple fonts asynchronously. It uses delayRender, continueRender, and cancelRender from remotion to synchronize font load with rendering, and manages its loaded state internally with a boolean. This design pattern ensures any wrapped component dependent on font metrics executes at the correct time, preventing layout glitches due to late font loads.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/layout-utils/best-practices.mdx#_snippet_2

LANGUAGE: TSX
CODE:
```
// @filename: fonts.ts\nimport {fontFamily as regularFont, loadFont as loadRegular} from '@remotion/google-fonts/Inter';\n\nimport {fontFamily as monospaceFont, loadFont as loadMonospace} from '@remotion/google-fonts/RobotoMono';\n\nimport {cancelRender, continueRender, delayRender} from 'remotion';\n\nexport const regular = loadRegular();\nconst monospace = loadMonospace();\n\nexport const waitForFonts = async () => {\n  await regular.waitUntilDone();\n  await monospace.waitUntilDone();\n};\n\nconst delay = delayRender('Loading fonts');\n\nwaitForFonts()\n  .then(() => continueRender(delay))\n  .catch((err) => cancelRender(err));\n\n// @filename: WaitForFonts.tsx\n// ---cut---\nimport React, {useEffect, useState} from 'react';\nimport {cancelRender, continueRender, delayRender} from 'remotion';\nimport {waitForFonts} from './fonts';\n\nexport const WaitForFonts: React.FC<{\n  children: React.ReactNode;\n}> = ({children}) => {\n  const [fontsLoaded, setFontsLoaded] = useState(false);\n  const [handle] = useState(() => delayRender('<WaitForFonts> component'));\n\n  useEffect(() => {\n    return () => {\n      continueRender(handle);\n    };\n  }, [handle]);\n\n  useEffect(() => {\n    const delay = delayRender('Waiting for fonts to be loaded');\n\n    waitForFonts()\n      .then(() => {\n        continueRender(handle);\n        continueRender(delay);\n        setFontsLoaded(true);\n      })\n      .catch((err) => {\n        cancelRender(err);\n      });\n  }, [fontsLoaded, handle]);\n\n  if (!fontsLoaded) {\n    return null;\n  }\n\n  return <>{children}</>;\n};
```

----------------------------------------

TITLE: Calculating Font Size with fitText() in TSX
DESCRIPTION: Demonstrates the basic usage of the `fitText` function to calculate the required `fontSize` for a given text string, width, font family, and font weight. The calculated `fontSize` is then intended to be used in the `style` prop of a React element. It requires the `@remotion/layout-utils` package. The example also shows optional parameters like `textTransform`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/layout-utils/fit-text.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="FitText.tsx"
import { fitText } from "@remotion/layout-utils";

const text = "Hello World";
const width = 100;
const fontFamily = "Arial";
const fontWeight = "bold";

const { fontSize } = fitText({
  text,
  withinWidth: width,
  fontFamily: fontFamily,
  fontWeight: fontWeight,
  textTransform: "uppercase",
});

// Example markup:
<div
  style={{
    fontSize,
    width,
    fontFamily,
    fontWeight,
    textTransform: "uppercase",
  }}
>
  {text}
</div>;
```
```

----------------------------------------

TITLE: Fetching and Passing API Data with Remotion Compositions in TypeScript
DESCRIPTION: This snippet shows how to asynchronously fetch data from an API within the calculateMetadata prop of a Remotion Composition and inject the resulting data as a prop to a React component before rendering. It utilizes async/await syntax and fetch, requiring Remotion and React as dependencies, and expects the API response to be JSON serializable. Inputs are default or input props, and outputs are new props (with fetched data merged in) passed to the Composition component. The component expects id and data (API response or null) as props.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/data-fetching.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import { Composition } from "remotion";

type ApiResponse = {
  title: string;
  description: string;
};
type MyCompProps = {
  id: string;
  data: ApiResponse | null;
};

const MyComp: React.FC<MyCompProps> = () => null;

export const Root: React.FC = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComp}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        id: "1",
        data: null,
      }}
      calculateMetadata={async ({ props }) => {
        const data = await fetch(`https://example.com/api/${props.id}`);
        const json = await data.json();

        return {
          props: {
            ...props,
            data: json,
          },
        };
      }}
    />
  );
};
```

----------------------------------------

TITLE: Upgrading Remotion Framework using NPX
DESCRIPTION: This command uses NPX to execute the Remotion CLI's 'upgrade' command. This utility checks for newer versions of the Remotion framework and its associated packages, and guides the user through the process of updating the project's dependencies to the latest compatible versions.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-helloworld/README.md#_snippet_3

LANGUAGE: console
CODE:
```
npx remotion upgrade
```

----------------------------------------

TITLE: Registering the Remotion Root and Composition Entry Point - TypeScript
DESCRIPTION: This TypeScript snippet illustrates registering the Remotion root component using registerRoot from the remotion library. It organizes code into three parts: a dummy composition, a root component to include one or more compositions, and finally, registering that root as the project entry point in index.ts. Dependencies are react and remotion. Core parameters include composition ID, component, duration, fps, size, and the designated root. Input components must be defined under the remotion directory. Output is a Remotion project ready for studio and rendering commands. Ensure all root registration is set up in the index.ts file as the entry point.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player-into-remotion-project.mdx#_snippet_1

LANGUAGE: ts
CODE:
```
// @filename: Composition.tsx\nexport const MyComposition: React.FC = () => {\n  return null;\n};\n// @filename: Root.tsx\nimport React from \"react\";\nimport { Composition } from \"remotion\";\nimport { MyComposition } from \"./Composition\";\n\nexport const RemotionRoot: React.FC = () => {\n  return (\n    <>\n      <Composition\n        id=\"MyComp\"\n        component={MyComposition}\n        durationInFrames={60}\n        fps={30}\n        width={1280}\n        height={720}\n      />\n    </>\n  );\n};\n// @filename: index.ts\n// ---cut---\nimport { registerRoot } from \"remotion\";\nimport { RemotionRoot } from \"./Root\";\n\nregisterRoot(RemotionRoot);
```

----------------------------------------

TITLE: Rendering with JSON Props File in Remotion CLI - Bash
DESCRIPTION: This example shows how to reference a file containing JSON input properties when rendering a Remotion composition using the --props flag. Instead of an inline JSON string, the path to a JSON file is provided. Remotion parses the file and injects its contents as props for the project's runtime. The JSON file must be valid and accessible at the specified path, and Remotion must be set up in the environment.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/get-input-props.mdx#_snippet_2

LANGUAGE: bash
CODE:
```
npx remotion render --props=./path/to/props.json
```

----------------------------------------

TITLE: Using useTransitionProgress Hook in Remotion Components (TypeScript)
DESCRIPTION: This example demonstrates how to use the `useTransitionProgress` hook within functional React components (A, B, C) rendered by a Remotion `TransitionSeries`. Component A is the exiting scene, Component B is the entering scene, and Component C is outside the series. The hook returns an object with `entering` progress (0 to 1 for entering, 1 otherwise), `exiting` progress (0 to 1 for exiting, 0 otherwise), and `isInTransitionSeries` boolean. The example logs these values to the console, illustrating how they change based on the component's role in the transition defined by `<TransitionSeries>`, `<TransitionSeries.Sequence>`, and `<TransitionSeries.Transition>`. It utilizes the `none()` presentation and `linearTiming` for the transition.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transitions/use-transition-progress.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { useTransitionProgress } from "@remotion/transitions";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { none } from "@remotion/transitions/none";

const A: React.FC = () => {
  const progress = useTransitionProgress();
  console.log(progress.entering); // Always `1`
  console.log(progress.exiting); // Going from 0 to 1
  console.log(progress.isInTransitionSeries); //  `true`

  return <div>A</div>;
};

const B: React.FC = () => {
  const progress = useTransitionProgress();
  console.log(progress.entering); // Going from 0 to 1
  console.log(progress.exiting); // Always `0`
  console.log(progress.isInTransitionSeries); //  `true`

  return <div>B</div>;
};

const C: React.FC = () => {
  const progress = useTransitionProgress();
  console.log(progress.entering); // Always `1`
  console.log(progress.exiting); // Always `0`
  console.log(progress.isInTransitionSeries); //  `false`

  return <div>C</div>;
};

const Transition: React.FC = () => {
  return (
    <>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={40}>
          <A />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={none()}
          timing={linearTiming({ durationInFrames: 30 })}
        />
        <TransitionSeries.Sequence durationInFrames={60}>
          <B />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <C />
    </>
  );
};
```

----------------------------------------

TITLE: Installing Remotion Renderer via npm - Bash
DESCRIPTION: This bash snippet demonstrates the installation of the @remotion/renderer package using npm with the --save-exact flag to ensure version locking. Users should ensure all Remotion-related packages are on matching versions, removing the ^ character to prevent version range mismatches. This approach avoids dependency issues across Remotion components and ensures consistent behavior.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/renderer/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
npm install @remotion/renderer --save-exact
```

----------------------------------------

TITLE: Querying Remotion Cloud Run Services Using getServices() in TypeScript
DESCRIPTION: This snippet demonstrates how to import and use the getServices function from the @remotion/cloudrun/client package to retrieve a list of Remotion services deployed on GCP Cloud Run for a specific region, filtering to only those compatible with the installed version. It awaits the asynchronous API call, then iterates through the returned array to log key properties for each service such as serviceName, timeouts, memory, version, and URLs. Requires installation of the @remotion/cloudrun/client package, and proper configuration of Google Cloud credentials. The primary input is an object specifying the 'region' and the 'compatibleOnly' flag; output is an array of service detail objects. The snippet relies on ES2020+ syntax with async/await, and must be run in a Node.js environment that can handle ECMAScript modules.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cloudrun/getservices.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import {getServices} from '@remotion/cloudrun/client';\n\nconst info = await getServices({\n  region: 'us-east1',\n  compatibleOnly: true,\n});\n\nfor (const service of info) {\n  console.log(service.serviceName); // "remotion--3-3-82--mem512mi--cpu1-0"\n  console.log(service.timeoutInSeconds); // 300\n  console.log(service.memoryLimit); // 512Mi\n  console.log(service.cpuLimit); // 1.0\n  console.log(service.remotionVersion); // "4.0.1"\n  console.log(service.uri); // "https://remotion--3-3-82--mem512mi--cpu1-0--t-300-1a2b3c4d5e-ue.a.run.app"\n  console.log(service.region); // "us-east1"\n  console.log(service.consoleUrl); // "https://console.cloud.google.com/run/detail/us-east1/remotion--3-3-82--mem512mi--cpu1-0--t-300/logs"\n}
```

----------------------------------------

TITLE: Interpolating Named and Hex Colors with Remotion interpolateColors() in TSX
DESCRIPTION: Demonstrates using `interpolateColors` in a TSX context to map the current frame number (divided by 10) over the range [0, 20] to a color between 'red' and 'yellow', and between '#ff0000' and '#ffff00'. It imports `interpolateColors` and `useCurrentFrame` from 'remotion'. The resulting color is in `rgba` format.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate-colors.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash
import { interpolateColors, useCurrentFrame } from "remotion";

const frame = useCurrentFrame() / 10;

const color = interpolateColors(frame, [0, 20], ["red", "yellow"]); // rgba(255, 128, 0, 1)

const color2 = interpolateColors(frame, [0, 20], ["#ff0000", "#ffff00"]); // rgba(255, 128, 0, 1)
```
```

----------------------------------------

TITLE: Installing Remotion Dependencies with npm
DESCRIPTION: Installs Remotion core, the Remotion Player, the Remotion CLI, React, and ReactDOM as production dependencies, along with their TypeScript types as development dependencies, using the npm package manager.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/svelte.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npm i remotion @remotion/player @remotion/cli react react-dom
npm i --save-dev @types/react @types/react-dom
```

----------------------------------------

TITLE: Implementing IframePlayer Component with React and Remotion (TypeScript)
DESCRIPTION: This React TypeScript snippet defines the IframePlayer component, which wraps the Remotion <Player> inside an iframe to isolate global styles. The component uses hooks to manage iframe content, attach a resize observer for responsive sizing, and leverages React portals to render the player in the iframe. Key dependencies include React, ReactDOM, @remotion/player, and zod. Props are passed through generically and care is taken to synchronize player container size with the iframe. Inputs are standard PlayerProps, and outputs are a fully functional Remotion player sandwiched in its own window context. The snippet expects a valid DOM, forwardRef usage, and React 17+ compatibility.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/player-in-iframe.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import { Player, PlayerProps, PlayerRef } from "@remotion/player";\nimport React, { forwardRef, useEffect, useRef, useState } from "react";\nimport ReactDOM from "react-dom";\nimport { AnyZodObject } from "zod";\n\nconst className = "__player";\nconst borderNone: React.CSSProperties = {\n  border: "none",\n};\n\nconst IframePlayerWithoutRef = <T extends Record<string, unknown>>(\n  props: PlayerProps<AnyZodObject, T>,\n  ref: React.Ref<PlayerRef>\n) => {\n  const [contentRef, setContentRef] = useState<HTMLIFrameElement | null>(null);\n  const resizeObserverRef = useRef<ResizeObserver | null>(null);\n  const mountNode = contentRef?.contentDocument?.body;\n  useEffect(() => {\n    if (!contentRef || !contentRef.contentDocument) return;\n    // Remove margin and padding so player fits snugly\n    contentRef.contentDocument.body.style.margin = "0";\n    contentRef.contentDocument.body.style.padding = "0";\n    // When player div is resized also resize iframe\n    resizeObserverRef.current = new ResizeObserver(([playerEntry]) => {\n      const playerRect = playerEntry.contentRect;\n      contentRef.width = String(playerRect.width);\n      contentRef.height = String(playerRect.height);\n    });\n    // The remotion player element\n    const playerElement = contentRef.contentDocument.querySelector(\n      "." + className\n    );\n    if (!playerElement) {\n      throw new Error(\n        'Player element not found. Add a "' +\n          className +\n          '" class to the <Player>.'\n      );\n    }\n    // Watch the player element for size changes\n    resizeObserverRef.current.observe(playerElement as Element);\n    return () => {\n      // ContentRef changed: unobserve!\n      (resizeObserverRef.current as ResizeObserver).unobserve(\n        playerElement as Element\n      );\n    };\n  }, [contentRef]);\n  const combinedClassName = `${className} ${props.className ?? ""}`.trim();\n  return (\n    // eslint-disable-next-line @remotion/warn-native-media-tag\n    <iframe ref={setContentRef} style={borderNone}>\n      {mountNode &&\n        ReactDOM.createPortal(\n          // @ts-expect-error PlayerProps are incorrectly typed\n          <Player<AnyZodObject, T>\n            {...props}\n            ref={ref}\n            className={combinedClassName}\n          />,\n          mountNode\n        )}\n    </iframe>\n  );\n};\nexport const IframePlayer = forwardRef(IframePlayerWithoutRef);
```

----------------------------------------

TITLE: Attaching and Removing PlayerRef Event Listeners (TypeScript/React)
DESCRIPTION: Illustrates the process of registering and cleaning up multiple typed event listeners on the Remotion PlayerRef. Event handlers respond to play, ratechange, volumechange, pause, ended, error, fullscreenchange, scalechange, mutechange, seeked, and timeupdate. Uses CallbackListener types for event safety. Dependencies: '@remotion/player', React, CallbackListener types. Be sure to remove all event listeners during cleanup to prevent leaks.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/api.mdx#_snippet_9

LANGUAGE: TSX
CODE:
```
import {PlayerRef} from '@remotion/player';
import {useEffect, useRef} from 'react';
// ---cut---
import {CallbackListener} from '@remotion/player';
const playerRef = useRef<PlayerRef>(null);

useEffect(() => {
  if (!playerRef.current) {
    return;
  }
  const onPlay: CallbackListener<'play'> = () => {
    console.log('play');
  };
  const onRateChange: CallbackListener<'ratechange'> = (e) => {
    console.log('ratechange', e.detail.playbackRate);
  };
  const onVolumeChange: CallbackListener<'volumechange'> = (e) => {
    console.log('new volume', e.detail.volume);
  };

  const onPause: CallbackListener<'pause'> = () => {
    console.log('pausing');
  };

  const onSeeked: CallbackListener<'seeked'> = (e) => {
    console.log('seeked to ' + e.detail.frame);
  };

  const onTimeupdate: CallbackListener<'timeupdate'> = (e) => {
    console.log('time has updated to ' + e.detail.frame);
  };

  const onEnded: CallbackListener<'ended'> = () => {
    console.log('ended');
  };

  const onError: CallbackListener<'error'> = (e) => {
    console.log('error', e.detail.error);
  };

  const onFullscreenChange: CallbackListener<'fullscreenchange'> = (e) => {
    console.log('fullscreenchange', e.detail.isFullscreen);
  };

  const onScaleChange: CallbackListener<'scalechange'> = (e) => {
    console.log('scalechange', e.detail.scale);
  };

  const onMuteChange: CallbackListener<'mutechange'> = (e) => {
    console.log('mutechange', e.detail.isMuted);
  };

  playerRef.current.addEventListener('play', onPlay);
  playerRef.current.addEventListener('ratechange', onRateChange);
  playerRef.current.addEventListener('volumechange', onVolumeChange);
  playerRef.current.addEventListener('pause', onPause);
  playerRef.current.addEventListener('ended', onEnded);
  playerRef.current.addEventListener('error', onError);
  playerRef.current.addEventListener('fullscreenchange', onFullscreenChange);
  playerRef.current.addEventListener('scalechange', onScaleChange);
  playerRef.current.addEventListener('mutechange', onMuteChange);

  // See below for difference between `seeked` and `timeupdate`
  playerRef.current.addEventListener('seeked', onSeeked);
  playerRef.current.addEventListener('timeupdate', onTimeupdate);

  return () => {
    // Make sure to clean up event listeners
    if (playerRef.current) {
      playerRef.current.removeEventListener('play', onPlay);
      playerRef.current.removeEventListener('ratechange', onRateChange);
      playerRef.current.removeEventListener('volumechange', onVolumeChange);
      playerRef.current.removeEventListener('pause', onPause);
      playerRef.current.removeEventListener('ended', onEnded);
      playerRef.current.removeEventListener('error', onError);
      playerRef.current.removeEventListener('fullscreenchange', onFullscreenChange);
      playerRef.current.removeEventListener('scalechange', onScaleChange);
      playerRef.current.removeEventListener('mutechange', onMuteChange);
      playerRef.current.removeEventListener('seeked', onSeeked);
      playerRef.current.removeEventListener('timeupdate', onTimeupdate);
    }
  };
}, []);
```

----------------------------------------

TITLE: Registering a Remotion Video Composition List - React (TSX)
DESCRIPTION: Shows how to define a Remotion video compositions list component. It imports Composition and MyComp, then registers 'MyVideo' with parameters such as duration, width, height, fps, ID, and default props. Ensures the composition is available in Remotion Studio and rendering pipelines. Requires remotion package and valid MyComp component.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/player-integration.mdx#_snippet_5

LANGUAGE: tsx
CODE:
```
// @allowUmdGlobalAccess
// @filename: ./MyComp.tsx
export const MyComp = () => <><\/>;

// @filename: index.tsx
// ---cut---
import {Composition} from 'remotion';
import {MyComp} from './MyComp';

export const MyVideo = () => {
  return (
    <>
      <Composition component={MyComp} durationInFrames={120} width={1920} height={1080} fps={30} id="my-comp" defaultProps={{text: 'World'}} <\/>)
    <\/>
  );
};
```

----------------------------------------

TITLE: Adjusting Playback Speed of <Video> in Remotion (TSX)
DESCRIPTION: This example demonstrates how to change the playback speed of a video using the `playbackRate` prop in the Remotion `<Video>` component. Setting `playbackRate={2}` makes the video play twice as fast as its original speed.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/video.mdx#_snippet_6

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, staticFile, Video} from 'remotion';

// ---cut---
export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <Video playbackRate={2} src={staticFile('video.webm')} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Disabling Chromium Headless Mode via Remotion Config using TypeScript
DESCRIPTION: This snippet illustrates how to run Chromium in non-headless mode (showing the browser window) by setting the `headlessMode` option to `false` in the Remotion configuration file using `Config.setChromiumHeadlessMode()`. This option cannot be set for Lambda renders. Requires importing `Config` from `@remotion/cli/config`. Prior to v3.3.39, the method was `Config.Puppeteer.setChromiumHeadlessMode()`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/chromium-flags.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
import {Config} from '@remotion/cli/config';

// ---cut---

Config.setChromiumHeadlessMode(false);
```

----------------------------------------

TITLE: Defining and Using calculateMetadata with Remotion Composition in TypeScript
DESCRIPTION: This snippet demonstrates how to define and use a calculateMetadata function with Remotion's Composition component in TypeScript. It imports needed types and components, defines a TypeScript type for component props, declares a reusable React component, and then shows a calculateMetadata function that dynamically assigns duration, transforms props, and sets a default codec. The example requires React and remotion libraries and expects props including 'text' and 'duration'. The calculateMetadata function is passed into the Composition component, allowing dynamic, prop-driven configuration of composition metadata. Outputs include a customized metadata object, and the pattern depends on JSON-serializable return values, async support, and integration with Remotion render processes.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/calculate-metadata.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import React from 'react';
export type MyComponentProps = {
  text: string;
  duration: number;
};

export const MyComponent: React.FC<MyComponentProps> = ({text}) => {
  return <div>{text}</div>;
};

// @filename: Vid.tsx
// ---cut---
import React from 'react';
import {CalculateMetadataFunction, Composition} from 'remotion';
import {MyComponent, MyComponentProps} from './MyComp';

const calculateMetadata: CalculateMetadataFunction<MyComponentProps> = ({props, defaultProps, abortSignal}) => {
  return {
    // Change the metadata
    durationInFrames: props.duration,
    // or transform some props
    props,
    // or add per-composition default codec
    defaultCodec: 'h264',
  };
};

export const Root: React.FC = () => {
  return (
    <Composition
      id="MyComp"
      component={MyComponent}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        text: 'Hello World',
        duration: 1,
      }}
      calculateMetadata={calculateMetadata}
    />
  );
};
```

----------------------------------------

TITLE: Bundling the Remotion Project (TypeScript)
DESCRIPTION: Demonstrates how to programmatically bundle a Remotion project using the `bundle` function from `@remotion/bundler`. It specifies the entry point and optionally includes a Webpack override configuration. The function returns the location of the generated bundle, which is needed for rendering.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dataset-render.mdx#_snippet_6

LANGUAGE: ts
CODE:
```
// @filename: webpack-override.ts
import type {WebpackOverrideFn} from '@remotion/bundler';
export const webpackOverride: WebpackOverrideFn = (f) => f;
// @filename: script.ts
// ---cut---
import {bundle} from '@remotion/bundler';
import {webpackOverride} from './webpack-override';

const bundleLocation = await bundle({
  entryPoint: './src/index.ts',
  // If you have a webpack override, don't forget to add it
  webpackOverride: webpackOverride,
});
```

----------------------------------------

TITLE: Enabling Hardware Acceleration in Remotion SSR `renderMedia` (TSX)
DESCRIPTION: Demonstrates how to enable hardware-accelerated encoding when using the Remotion SSR API (`@remotion/renderer`). The `hardwareAcceleration` option within the `renderMedia` function is set to `'if-possible'`, instructing Remotion to use hardware acceleration if available for the specified codec (ProRes in this example) and platform.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/hardware-acceleration.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
const serveUrl = '/path/to/bundle';
const outputLocation = '/path/to/frames';

import {renderMedia, selectComposition} from '@remotion/renderer';

const inputProps = {
  titleText: 'Hello World',
};

const composition = await selectComposition({
  serveUrl,
  id: 'my-video',
  inputProps,
});

// ---cut---

await renderMedia({
  composition,
  serveUrl,
  codec: 'prores',
  outputLocation,
  inputProps,
  hardwareAcceleration: 'if-possible',
});
```

----------------------------------------

TITLE: Project Structure Changes for Remotion Integration - Diff
DESCRIPTION: This diff snippet illustrates how to create a project folder structure that includes a dedicated Remotion directory within your source tree. This ensures separation of Remotion compositions and registration logic from your main application files. File additions (index.ts, MyComp.tsx, Root.tsx) are shown as new content under src/remotion/.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/player-integration.mdx#_snippet_3

LANGUAGE: diff
CODE:
```
 └── src/
+  ├── remotion/
+  │   ├── index.ts
+  │   ├── MyComp.tsx
+  │   └── Root.tsx
   └── app/
       └── App.tsx
```

----------------------------------------

TITLE: Rendering Remotion Video using NPX
DESCRIPTION: Uses NPX (Node Package Execute) to run the Remotion CLI's render command. This command initiates the video rendering process according to the project's composition and configuration, producing the final video output file(s).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-blank/README.md#_snippet_2

LANGUAGE: console
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Scaffolding a New Remotion Project with Next.js (Shell)
DESCRIPTION: Uses `npx` to run the `create-video` package, scaffolding a new Remotion project using the latest version and specifically choosing the Next.js template. This is an alternative to cloning the template manually.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-next-app/README.md#_snippet_1

LANGUAGE: shell
CODE:
```
npx create-video@latest --next
```

----------------------------------------

TITLE: Resolving Bun Dependency Issues with Shell Commands - Shell
DESCRIPTION: This snippet instructs users to remove the existing node_modules directory and reinstall dependencies using Bun. These commands resolve compatibility issues that arise after upgrading Remotion, specifically addressing the 'Cannot read properties of undefined (reading \u0027decode\u0027)' error. Prerequisites include having Bun installed on your system. The commands should be run in the project root.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/recorder/troubleshooting/cannot-read-properties-of-undefined.mdx#_snippet_0

LANGUAGE: shell
CODE:
```
rm -rf node_modules
bun i
```

----------------------------------------

TITLE: Upgrading Remotion Version using NPX
DESCRIPTION: Uses NPX to execute the Remotion CLI's upgrade command. This command checks for newer versions of Remotion and its associated packages, automatically updating dependencies and guiding the user through any necessary code modifications.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-blank/README.md#_snippet_3

LANGUAGE: console
CODE:
```
npx remotion upgrade
```

----------------------------------------

TITLE: Ensuring ffprobe Binary with Remotion Renderer (TypeScript)
DESCRIPTION: This snippet demonstrates how to use the ensureFfprobe() function from @remotion/renderer to verify that the ffprobe binary is available in your Node.js project. It performs an asynchronous operation to check for or download ffprobe into node_modules as needed. The function accepts an optional configuration object (e.g., remotionRoot) and returns a promise that resolves to an object indicating installation status and binary location. Key dependencies: @remotion/renderer and a compatible Node.js environment. This API throws if platform support or download fails.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/renderer/ensure-ffprobe.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import { ensureFfprobe } from "@remotion/renderer";

await ensureFfprobe();
```

----------------------------------------

TITLE: Dynamic Volume Control (Ramp Up) for <Video> in Remotion (TSX)
DESCRIPTION: This snippet demonstrates dynamic volume control for the Remotion `<Video>` component using a function passed to the `volume` prop. It utilizes the `interpolate` function from Remotion to create a volume ramp-up effect over the first 100 frames, increasing the volume linearly from 0 to 1. The `extrapolateLeft: 'clamp'` option ensures the volume stays at 0 before frame 0.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/video.mdx#_snippet_5

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, interpolate, staticFile, Video} from 'remotion';

// ---cut---
export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <Video volume={(f) => interpolate(f, [0, 100], [0, 1], {extrapolateLeft: 'clamp'})} src={staticFile('video.webm')} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Rendering Remotion Video Composition - Console
DESCRIPTION: The command triggers Remotion's CLI to render video compositions to output files, typically MP4 or webm, as defined by the project's Remotion configuration. Use this after setting up all project dependencies and configurations. The render process can be customized with additional flags and options as documented in the Remotion CLI.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-tts-azure/README.md#_snippet_4

LANGUAGE: console
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Rendering a Remotion Video using npx
DESCRIPTION: Uses npx (Node Package Execute) to run the Remotion Command Line Interface (CLI) `render` command without needing a global installation. This command initiates the rendering process, taking the defined Remotion composition(s) and outputting them as video files based on the project's configuration (e.g., specified in `remotion.config.ts` or via command-line arguments).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-overlay/README.md#_snippet_2

LANGUAGE: console
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Loading Remote Video URL with <OffthreadVideo> in Remotion (tsx)
DESCRIPTION: Shows how to use the `<OffthreadVideo>` component to display a video directly from a remote HTTP URL. It imports `AbsoluteFill` and `OffthreadVideo` from Remotion and sets the `src` prop to the URL of the 'Big Buck Bunny' sample video.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/offthreadvideo.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, OffthreadVideo} from 'remotion';
// ---cut---
export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <OffthreadVideo src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Composing Sequential Scenes with Remotion Series in TypeScript/React
DESCRIPTION: Demonstrates how to utilize the Remotion `<Series>` component to sequence multiple `<Series.Sequence>` subcomponents, each displaying a `Square` with a different color for a specified duration. Requires `remotion` and a pre-defined `Square` component as dependencies. Accepts no external input; each `Series.Sequence` is shown for its assigned `durationInFrames`. The main output is a composed React component rendering the timed sequence.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/series.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
// @include: example-Square
// ---cut---
import { Series } from "remotion";

export const Example: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={40}>
        <Square color={"#3498db"} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={20}>
        <Square color={"#5ff332"} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={70}>
        <Square color={"#fdc321"} />
      </Series.Sequence>
    </Series>
  );
};
```

----------------------------------------

TITLE: Asynchronously Setting Composition Metadata in Remotion TSX
DESCRIPTION: Illustrates how to asynchronously fetch data (like video duration) and use it to set composition props (like `durationInFrames`). It uses `useState`, `useEffect`, `delayRender`, and `continueRender` to manage the asynchronous operation and prevent Remotion from rendering until the necessary data is available. This allows dynamic determination of composition properties based on external data sources, which became possible due to changes in how `delayRender` works in version 1.4.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-02-26-remotion-1-4.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
```tsx
export const RemotionVideo: React.FC = () => {
  const [videoLength, setVideoLength] = useState(null)

  useEffect(() => {
    const handle = delayRender();

    determineVideoLength()
    .then((duration) => {
      setVideoLength(duration)
      continueRender(handle)
    })
    .catch(err => /**/)
  }, [])

  if (videoLength === null) {
    return null;
  }

  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={videoLength}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
```
```

----------------------------------------

TITLE: Using useCurrentFrame within a Sequence in Remotion (TypeScript/React)
DESCRIPTION: This example shows how `useCurrentFrame` behaves inside a component rendered by `Sequence`. The frame number obtained via the hook is relative to the `Sequence`'s start time (`from` prop), starting at 0 when the sequence begins, not the global composition frame number.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_10

LANGUAGE: tsx
CODE:
```
import {Sequence, useCurrentFrame} from 'remotion'; // Added useCurrentFrame import

export const Child: React.FC = () => {
	const frame = useCurrentFrame();

	return <div>At frame 10, this should be 0: {frame}</div>;
};

export const MyComp: React.FC = () => {
	return (
		<Sequence from={10} durationInFrames={20}>
			<Child />
		</Sequence>
	);
};
```

----------------------------------------

TITLE: Setting Fixed Audio Volume in Remotion (TypeScript/React)
DESCRIPTION: This snippet demonstrates how to statically control audio playback volume in a Remotion composition by passing a numeric value between 0 and 1 to the volume prop of the Audio component. It requires the remotion package and assumes a local or static file asset is available through staticFile. The key parameter is volume, where values less than 0 or more than 1 are not accepted for standard range; the example uses 0.5 for 50% volume, with expected input/output being local composition renders with reduced audio loudness.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/audio/volume.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {Audio, staticFile, AbsoluteFill} from 'remotion';\n\nexport const MyComposition = () => {\n  return (\n    <AbsoluteFill>\n      <div>Hello World!</div>\n      <Audio src={staticFile('audio.mp3')} volume={0.5} />\n    </AbsoluteFill>\n  );\n};
```

----------------------------------------

TITLE: Basic <Video> Usage with Local File in Remotion (TSX)
DESCRIPTION: This snippet demonstrates the basic usage of the Remotion `<Video>` component. It imports `AbsoluteFill`, `staticFile`, and `Video` from 'remotion'. Inside a component `MyComposition`, it uses `<AbsoluteFill>` to position the video and renders a `<Video>` element. The `src` prop is set using `staticFile('video.webm')` to reference a video file located in the `public/` folder.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/video.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, staticFile, Video} from 'remotion';

export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <Video src={staticFile('video.webm')} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Initializing a Remotion Project via NPM - Bash
DESCRIPTION: Initializes a new Remotion video project using npm with the blank template. Requires Node.js and npm to be installed. The command scaffolds the project structure in the current directory. No input parameters other than the command itself. Output is a new Remotion-compatible workspace ready for code.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/learn/2022-12-22-apple-wow.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npm init video --blank
```

----------------------------------------

TITLE: Handling Redirects and Preloading Videos with Remotion Preload in TypeScript/React
DESCRIPTION: This snippet illustrates how to reliably preload a video asset that may experience HTTP redirects, using both the preloadVideo and resolveRedirect functions from @remotion/preload. The resolveRedirect function attempts to fetch the final resolved URL prior to preloading, with CORS limitations potentially impacting redirect resolution. Preloading proceeds with either the resolved or original URL. The @remotion/preload and remotion packages are required as dependencies, and the code expects a valid video URL. The logic executes preload logic outside of React components, ensuring the asset is available for immediate use inside a React component using the Video tag.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/preload/preload-video.mdx#_snippet_1

LANGUAGE: TSX
CODE:
```
import { preloadVideo, resolveRedirect } from "@remotion/preload";
import { Video } from "remotion";

// This code gets executed immediately once the page loads
let urlToLoad =
  "https://player.vimeo.com/external/291648067.hd.mp4?s=94998971682c6a3267e4cbd19d16a7b6c720f345&profile_id=175&oauth2_token_id=57447761";

resolveRedirect(urlToLoad)
  .then((resolved) => {
    // Was able to resolve a redirect, setting this as the video to load
    urlToLoad = resolved;
  })
  .catch((err) => {
    // Was unable to resolve redirect e.g. due to no CORS support
    console.log("Could not resolve redirect", err);
  })
  .finally(() => {
    // In either case, we try to preload the original or resolved URL
    preloadVideo(urlToLoad);
  });

// This code only executes once the component gets mounted
const MyComp: React.FC = () => {
  // If the component did not mount immediately, this will be the resolved URL.

  // If the component mounted immediately, this will be the original URL.
  // In that case preloading is ineffective anyway.
  return <Video src={urlToLoad}></Video>;
};
```

----------------------------------------

TITLE: Basic Usage of renderStillOnLambda in TypeScript
DESCRIPTION: This example demonstrates how to import and call the `renderStillOnLambda` function from `@remotion/lambda/client`. It shows invoking the function with necessary parameters like AWS region, Lambda function name, deployment serve URL, composition ID, image format, and target frame to render a still image on AWS Lambda. The returned promise resolves to an object containing the output URL, estimated cost, and image size.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/renderstillonlambda.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
// @module: esnext
// @target: es2017
import {renderStillOnLambda} from '@remotion/lambda/client';

const {estimatedPrice, url, sizeInBytes} = await renderStillOnLambda({
  region: 'us-east-1',
  functionName: 'remotion-render-bds9aab',
  serveUrl: 'https://remotionlambda-qg35eyp1s1.s3.eu-central-1.amazonaws.com/sites/bf2jrbfkw',
  composition: 'MyVideo',
  inputProps: {},
  imageFormat: 'png',
  maxRetries: 1,
  privacy: 'public',
  envVariables: {},
  frame: 10,
});
```

----------------------------------------

TITLE: Looping a <Video> Component in Remotion (TSX)
DESCRIPTION: This example illustrates how to make a video loop indefinitely using the `loop` prop in the Remotion `<Video>` component. Adding the `loop` prop (set implicitly to true) causes the video to restart from the beginning once it reaches the end.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/video.mdx#_snippet_8

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, Video} from 'remotion';
// ---cut---
export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <Video loop src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Implementing Presigned URL API Endpoint in Next.js App Router - TypeScript/TSX
DESCRIPTION: A complete Next.js API endpoint using the App Router for generating presigned S3 upload URLs. Handles request validation, user settings checks, constraints, and invokes the URL generation function. Relies on environment variables for bucket and region configuration. Expects POST requests with JSON including size and contentType, returns presignedUrl and readUrl in JSON.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/presigned-urls.mdx#_snippet_4

LANGUAGE: TypeScript
CODE:
```
import {NextResponse} from 'next/server';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {AwsRegion, getAwsClient} from '@remotion/lambda/client';

const generatePresignedUrl = async ({contentType, contentLength, expiresIn, bucketName, region}: {contentType: string; contentLength: number; expiresIn: number; bucketName: string; region: AwsRegion}): Promise<{presignedUrl: string; readUrl: string}> => {
  if (contentLength > 1024 * 1024 * 200) {
    throw new Error(`File may not be over 200MB. Yours is ${contentLength} bytes.`);
  }

  const {client, sdk} = getAwsClient({
    region: process.env.REMOTION_AWS_REGION as AwsRegion,
    service: 's3',
  });

  const key = crypto.randomUUID();

  const command = new sdk.PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ACL: 'public-read',
    ContentLength: contentLength,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(client, command, {
    expiresIn,
  });

  // The location of the asset after the upload
  const readUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

  return {presignedUrl, readUrl};
};

export const POST = async (request: Request) => {
  if (!process.env.REMOTION_AWS_BUCKET_NAME) {
    throw new Error('REMOTION_AWS_BUCKET_NAME is not set');
  }

  if (!process.env.REMOTION_AWS_REGION) {
    throw new Error('REMOTION_AWS_REGION is not set');
  }

  const json = await request.json();
  if (!Number.isFinite(json.size)) {
    throw new Error('size is not a number');
  }
  if (typeof json.contentType !== 'string') {
    throw new Error('contentType is not a string');
  }

  const {presignedUrl, readUrl} = await generatePresignedUrl({
    contentType: json.contentType,
    contentLength: json.size,
    expiresIn: 60 * 60 * 24 * 7,
    bucketName: process.env.REMOTION_AWS_BUCKET_NAME as string,
    region: process.env.REMOTION_AWS_REGION as AwsRegion,
  });

  return NextResponse.json({presignedUrl, readUrl});
};
```

----------------------------------------

TITLE: Starting Remotion Studio via CLI - Bash
DESCRIPTION: Initializes Remotion Studio using the CLI command 'npx remotion studio' with an optional entry point argument. No external dependencies beyond Node.js and Remotion are required. The entry point specifies which video composition file to load, or it can be omitted to auto-detect. Outputs a running Remotion Studio instance in the browser. Arguments passed after 'studio' will be interpreted as the entry point for the application.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cli/studio.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion studio <entry-point>?
```

----------------------------------------

TITLE: Deploying Remotion Lambda Functions Using CLI - Bash
DESCRIPTION: This snippet demonstrates how to deploy Remotion Lambda functions with the x86_64 architecture using the CLI. The command requires the Remotion Lambda CLI to be installed (typically via npx), and it targets an environment where AWS credentials are configured. The --architecture flag explicitly sets the target infrastructure. The primary parameter is the architecture, which enables compatibility due to the recent AWS Lambda changes.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/feb-2022-outage.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion lambda functions deploy --architecture=x86_64
```

----------------------------------------

TITLE: Batch Rendering with Remotion Node.js API - TypeScript Script
DESCRIPTION: This TypeScript Node.js script demonstrates direct usage of the Remotion API to render all project compositions to separate MP4 files in the 'out' directory. Dependencies include '@remotion/bundler', '@remotion/renderer', and Node.js's 'module' package. It uses dynamic import resolution, optional webpack overrides, and sequentially calls 'renderMedia' for each composition. Inputs: entry point file and composition list; outputs: MP4s named after each composition ID. Requires Node.js >=14.8.0 with ES modules enabled, and all dependencies installed.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/render-all.mdx#_snippet_2

LANGUAGE: ts
CODE:
```
// ---cut---

import {bundle} from '@remotion/bundler';
import {getCompositions, renderMedia} from '@remotion/renderer';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);

const bundled = await bundle({
  entryPoint: require.resolve('./src/index.ts'),
  // If you have a Webpack override, make sure to add it here
  webpackOverride: (config) => config,
});

const compositions = await getCompositions(bundled);

for (const composition of compositions) {
  console.log(`Rendering ${composition.id}...`);
  await renderMedia({
    codec: 'h264',
    composition,
    serveUrl: bundled,
    outputLocation: `out/${composition.id}.mp4`,
  });
}
```

----------------------------------------

TITLE: Setting up a Spring Animation Driver with spring() in TypeScript
DESCRIPTION: Initializes a spring animation using the `spring()` function from Remotion. This function takes the current `frame` and the video's `fps` (frames per second, obtained from `useVideoConfig`) to generate a `driver` value, which typically animates from 0 to 1 based on spring physics. This driver value can then be used as input for interpolation.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate.mdx#_snippet_2

LANGUAGE: ts
CODE:
```
import {useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';

const frame = useCurrentFrame();
const {fps} = useVideoConfig();
const driver = spring({
  frame,
  fps
});
// - spring
```

----------------------------------------

TITLE: Using useAudioData Hook in a React Component (TypeScript)
DESCRIPTION: This React functional component demonstrates how to use the `useAudioData` hook to fetch audio metadata. It imports the necessary functions, calls `useAudioData` with a source path obtained via `staticFile`, checks if the data has loaded, and renders a message displaying the audio's sample rate. If the data is not yet loaded, it returns `null` to wait.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/use-audio-data.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
// ---cut---
import {useAudioData} from '@remotion/media-utils';
import {staticFile} from 'remotion';

export const MyComponent: React.FC = () => {
  const audioData = useAudioData(staticFile('music.mp3'));

  if (!audioData) {
    return null;
  }

  return <div>This file has a {audioData.sampleRate} sampleRate.</div>;
};
```

----------------------------------------

TITLE: Loading Video via Remote URL Using OffthreadVideo (TypeScript)
DESCRIPTION: Loads a remote video URL using Remotion's OffthreadVideo component. <OffthreadVideo /> wraps the external MP4 source, allowing video playback physics to stay synchronized with Remotion's timeline. No static asset required; only the remotion package.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/importing-assets.mdx#_snippet_7

LANGUAGE: typescript
CODE:
```
import { OffthreadVideo } from \"remotion\";\n\nexport const MyComp: React.FC = () => {\n  return (\n    <OffthreadVideo src=\"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4\" />\n  );\n};\n
```

----------------------------------------

TITLE: Registering a Remotion Composition with Default Props (TypeScript)
DESCRIPTION: Registers a React component as a Remotion composition, specifying explicit default props. Assumes the presence of imported components and types. Uses 'Composition' from Remotion, passing size, fps, and a defaultProps object, which must match the props schema of 'MyComponent'. This prevents issues with previews missing required props and ensures predictable rendering. Dependencies: React, Remotion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/passing-props.mdx#_snippet_1

LANGUAGE: typescript
CODE:
```
// organize-imports-ignore

// @filename: MyComponent.tsx
import React from 'react';
export const MyComponent: React.FC<{
  propOne: string;
  propTwo: number;
}> = () => null;

// @filename: Root.tsx

// ---cut---
import React from 'react';
import {Composition} from 'remotion';
import {MyComponent} from './MyComponent';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="my-video"
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={30}
        component={MyComponent}
        defaultProps={{
          propOne: 'Hi',
          propTwo: 10,
        }}
      />
    </>
  );
};
```

----------------------------------------

TITLE: Using Spring Animation in Remotion (TypeScript/React)
DESCRIPTION: This TypeScript/TSX snippet demonstrates how to use the spring() function from Remotion to animate a value based on the current video frame and fps using default configuration for spring stiffness. It requires the Remotion package and assumes usage inside a React component where both useCurrentFrame and useVideoConfig hooks are available. The primary parameters are 'frame' and 'fps', with a custom 'config' object allowing you to tune the physical properties of the animation; output is a smoothly animated value progressing with the video timeline.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/spring.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
// ---cut---
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const value = spring({
  frame,
  fps,
  config: {
    stiffness: 100,
  },
});
```

----------------------------------------

TITLE: Composing Sequential Scene Transitions with <TransitionSeries> in Remotion (TypeScript/React)
DESCRIPTION: This snippet defines a React component that organizes three colored scenes using <TransitionSeries>, with transitions between each scene specifying timing and presentation effects (fade and wipe). It requires @remotion/transitions, @remotion/transitions/fade, and @remotion/transitions/wipe as dependencies. The <Fill> helper component accepts a color and fills the background. Duration and animation parameters (e.g., frames for each scene and transition type/timing) are key props, controlling the sequence and nature of transitions rendered in a video project.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transitions/transitionseries.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { AbsoluteFill } from \"remotion\";
const Fill = ({ color }: { color: string }) => (
  <AbsoluteFill style={{ backgroundColor: color }} />
);

// ---cut---
import {
  linearTiming,
  springTiming,
  TransitionSeries,
} from \"@remotion/transitions\";

import { fade } from \"@remotion/transitions/fade\";
import { wipe } from \"@remotion/transitions/wipe\";

export const MyComp: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={60}>
        <Fill color=\"blue\" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        timing={springTiming({ config: { damping: 200 } })}
        presentation={fade()}
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <Fill color=\"black\" />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        timing={linearTiming({ durationInFrames: 30 })}
        presentation={wipe()}
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <Fill color=\"white\" />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

----------------------------------------

TITLE: Managing Multiple delayRender Handles in Remotion (TypeScript/React)
DESCRIPTION: Illustrates how to call delayRender multiple times and resolve them all before allowing rendering to continue. Two independent handles are created and both must be resolved via continueRender. Uses useEffect and useState hooks; each delayRender creates a blocking handle. All handles must be cleared for rendering to proceed. Requires remotion and React.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/delay-render.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";

const MyComp: React.FC = () => {
  const [handle1] = useState(() => delayRender());
  const [handle2] = useState(() => delayRender());

  useEffect(() => {
    // You need to clear all handles before the render continues
    continueRender(handle1);
    continueRender(handle2);
  }, []);

  return null;
};
```

----------------------------------------

TITLE: Retrieving Input Props at Render-Time with getInputProps - TypeScript/React
DESCRIPTION: This snippet illustrates how to access dynamically provided input props during a Remotion render using getInputProps from the remotion library. No React component structure is shown here; only extraction of prop values like src from inputProps. This is useful for parameterizing assets at runtime by retrieving props passed to the renderer. No asynchronous logic or external dependencies are required beyond remotion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/dynamic-metadata.mdx#_snippet_2

LANGUAGE: TSX
CODE:
```
import {getInputProps} from 'remotion';

const inputProps = getInputProps();
const src = inputProps.src;
```

----------------------------------------

TITLE: Configuring Remotion Render Script in package.json (JSON)
DESCRIPTION: This snippet demonstrates how to set up a Remotion render command in the scripts section of a package.json file. This allows running `npm run render` (or the equivalent for your package manager) to execute the CLI. No other dependencies than Remotion CLI are required, and 'render' is the custom script name invoking 'remotion render'. Input: none directly; Output: triggers CLI renders when invoked.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cli/cli.mdx#_snippet_0

LANGUAGE: json
CODE:
```
{\n  \"scripts\": {\n    \"render\": \"remotion render\"\n  }\n}
```

----------------------------------------

TITLE: Rendering a Still Image with Remotion Renderer in TypeScript
DESCRIPTION: This TypeScript code snippet demonstrates how to render a single frame from a Remotion composition to an image file using the renderStill() function from @remotion/renderer. It covers composition selection, error handling if the desired composition is not found, and the actual rendering call with essential parameters like output path and inputProps. Dependencies include the @remotion/bundler and @remotion/renderer packages, and the snippet assumes that project bundling and composition fetching are done beforehand. The function expects a composition configuration object, a serve URL (bundle path), and output details; it produces an image at the specified location.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/renderer/render-still.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import {bundle} from '@remotion/bundler';\nimport {getCompositions, renderStill} from '@remotion/renderer';\n\n// The composition you want to render\nconst compositionId = 'HelloWorld';\n\nconst bundleLocation = await bundle({\n  entryPoint: require.resolve('./src/index.ts'),\n});\n\nconst comps = await getCompositions(bundleLocation, {\n  inputProps: {\n    custom: 'data',\n  },\n});\nconst composition = comps.find((c) => c.id === compositionId);\n\nif (!composition) {\n  throw new Error(`No composition with the ID ${compositionId} found`);\n}\n\n// ---cut---\n\nawait renderStill({\n  composition,\n  serveUrl: bundleLocation,\n  output: '/tmp/still.png',\n  inputProps: {\n    custom: 'data',\n  },\n});
```

----------------------------------------

TITLE: Separating Player and Controls for Optimal Updates - Remotion in TypeScript
DESCRIPTION: This improved example separates the Player rendering from time-tracking UI, each as sibling components sharing a ref, leading to significantly less re-rendering of the Player. PlayerOnly is responsible purely for rendering the Player, while ControlsOnly handles updating and displaying current time using event listeners. Dependencies include React, @remotion/player, and a MyVideo component. All player props are passed via a constant, and refs are shared for control synchronization. The approach helps maintain smooth playback under rapid state changes.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/best-practices.mdx#_snippet_1

LANGUAGE: TSX
CODE:
```
```tsx twoslash title=\"\u2705 Better\"\n// @allowUmdGlobalAccess\n// @filename: ./remotion/MyVideo.tsx\nexport const MyVideo = () => <></>;// @filename: index.tsx\nconst otherProps = {\n  durationInFrames: 120,\n  compositionWidth: 1920,\n  compositionHeight: 1080,\n  fps: 30,\n} as const;\nimport {Player, PlayerRef} from '@remotion/player';\nimport {useEffect, useRef, useState} from 'react';\nimport {MyVideo} from './remotion/MyVideo';\n// ---cut---\nconst PlayerOnly: React.FC<{\n  playerRef: React.RefObject<PlayerRef | null>;\n}> = ({playerRef}) => {\n  return <Player ref={playerRef} component={MyVideo} {...otherProps} />;\n};\n\nconst ControlsOnly: React.FC<{\n  playerRef: React.RefObject<PlayerRef | null>;\n}> = ({playerRef}) => {\n  const [currentTime, setCurrentTime] = useState(0);\n\n  useEffect(() => {\n    playerRef.current?.addEventListener('timeupdate', (e) => {\n      setCurrentTime(e.detail.frame);\n    });\n  }, []);\n\n  return <div>Current time: {currentTime}</div>;\n};\n\nexport const App: React.FC = () => {\n  const playerRef = useRef<PlayerRef>(null);\n\n  return (\n    <>\n      <PlayerOnly playerRef={playerRef} />\n      <ControlsOnly playerRef={playerRef} />\n    </>\n  );\n};\n```
```

----------------------------------------

TITLE: Retrying delayRender with Retries Option in Remotion (TypeScript/React)
DESCRIPTION: Demonstrates passing a retries option to delayRender, instructing Remotion to retry rendering if a delay is not resolved within the timeout. Useful for flaky async operations (e.g., remote asset fetches). The retries option is an integer number of attempts. Supported directly in delayRender and via eligible media component props. Requires Remotion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/delay-render.mdx#_snippet_5

LANGUAGE: tsx
CODE:
```
import { delayRender } from "remotion";

delayRender("Loading asset...", {
  retries: 1, // default: 0
});
```

----------------------------------------

TITLE: Handling Autoplay Failure in OffthreadVideo with Remotion in TypeScript/React
DESCRIPTION: Provides a pattern for handling browser autoplay failures by utilizing the onAutoPlayError prop on the OffthreadVideo component. If autoplay with sound is prevented, the component executes a custom handler—in this example, pausing the PlayerRef. Required dependencies are remotion and @remotion/player. Input: user interaction and a PlayerRef; Output: video is paused on error, informing or prompting the user for further action.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/autoplay.mdx#_snippet_2

LANGUAGE: typescript
CODE:
```
import {OffthreadVideo, staticFile} from 'remotion';\nimport type {PlayerRef} from '@remotion/player';\n\nexport const MyComp: React.FC<{\n  playerRef: React.RefObject<PlayerRef>;\n}> = ({playerRef}) => {\n  return (\n    <OffthreadVideo\n      src={staticFile('video.mp4')}\n      onAutoPlayError={() => {\n        playerRef.current?.pause();\n      }}\n    />\n  );\n};
```

----------------------------------------

TITLE: Setting Opacity using Style Prop in TSX
DESCRIPTION: Shows how to set the `opacity` style property on a `div` element in a TSX component to make it semi-transparent. Opacity values range from 0 (invisible) to 1 (fully visible), controlling the element's visibility.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transforms.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash {6} title="MyComponent.tsx"
<div
  style={{
    height: 100,
    width: 100,
    backgroundColor: "red",
    opacity: 0.5,
  }}
/>
```
```

----------------------------------------

TITLE: Drawing Video Frames to Canvas with Grayscale Filter using Remotion and TSX
DESCRIPTION: This React component (`VideoOnCanvas`) renders an `<OffthreadVideo>` component but hides it visually (`opacity: 0`). It uses the `onVideoFrame` callback, triggered for each new video frame, to draw the frame onto a `<canvas>` element using `context.drawImage`. A CSS grayscale filter (`grayscale(100%)`) is applied to the canvas context before drawing, effectively rendering the video in grayscale. Requires `React`, `remotion`, and a video source URL.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/video-manipulation.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash
import React, {useCallback, useEffect, useRef} from 'react';
import {AbsoluteFill, useVideoConfig, OffthreadVideo} from 'remotion';
// ---cut---
export const VideoOnCanvas: React.FC = () => {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const {width, height} = useVideoConfig();

  // Process a frame
  const onVideoFrame = useCallback(
    (frame: CanvasImageSource) => {
      if (!canvas.current) {
        return;
      }
      const context = canvas.current.getContext('2d');

      if (!context) {
        return;
      }

      context.filter = 'grayscale(100%)';
      context.drawImage(frame, 0, 0, width, height);
    },
    [height, width],
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <OffthreadVideo
          // Hide the original video tag
          style={{opacity: 0}}
          onVideoFrame={onVideoFrame}
          src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        />
      </AbsoluteFill>
      <AbsoluteFill>
        <canvas ref={canvas} width={width} height={height} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```
```

----------------------------------------

TITLE: Rendering Remotion Video using npx
DESCRIPTION: Uses npx to execute the Remotion Command Line Interface (CLI) `render` command without needing a global installation. This command processes the defined Remotion composition and generates the final video output file according to the project's configuration.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-javascript/README.md#_snippet_2

LANGUAGE: console
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Starting the Remotion Studio Server using NPX
DESCRIPTION: This command uses NPX (Node Package Execute) to run the `remotion studio` command, which initiates the Remotion development server and opens the Studio interface. Fast Refresh relies on this server process remaining active; quitting it (e.g., via Ctrl+C) will cause Fast Refresh to stop working. Requires Node.js and npm/npx to be installed, along with a Remotion project setup.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/troubleshooting/broken-fast-refresh.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion studio
```

----------------------------------------

TITLE: Rendering Video with Remotion Lambda and Custom S3 Output - TypeScript
DESCRIPTION: This TypeScript snippet demonstrates how to call the Remotion Lambda SDK\'s renderMediaOnLambda() function to render a video through a Lambda execution role. It specifies a custom S3 output bucket (using the outName property) for the rendered video. Dependencies: @remotion/lambda/client must be installed, and the Lambda function must have appropriate IAM permissions for both rendering and S3 bucket access. The function expects configuration for AWS region, Lambda function name, video composition, serve URL, codec, and an outName object specifying the output bucket and key. It returns an object containing the target bucket name and render ID. Ensure the Lambda role has permissions to write to the destination bucket.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/without-iam/index.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import {renderMediaOnLambda} from '@remotion/lambda/client';\n\nconst {bucketName, renderId} = await renderMediaOnLambda({\n  region: 'us-east-1',\n  functionName: 'remotion-render-bds9aab',\n  composition: 'MyVideo',\n  serveUrl: 'https://remotionlambda-qg35eyp1s1.s3.eu-central-1.amazonaws.com/sites/bf2jrbfkw',\n  codec: 'h264',\n  outName: {\n    key: 'my-output',\n    bucketName: 'output-bucket',\n  },\n});
```

----------------------------------------

TITLE: Interpolating RGB and RGBA Colors with Remotion interpolateColors() in TSX
DESCRIPTION: Illustrates using `interpolateColors` in TSX to interpolate between `rgb` color strings and `rgba` color strings based on the current frame number within the range [0, 20]. It imports `interpolateColors` and `useCurrentFrame` from 'remotion' and shows how opacity is interpolated when using RGBA. The output is an `rgba` color string.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate-colors.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
```tsx twoslash
import { interpolateColors, useCurrentFrame } from "remotion";

const frame = useCurrentFrame(); // 10

// RGB colors
const color = interpolateColors(
  frame,
  [0, 20],
  ["rgb(255, 0, 0)", "rgb(255, 255, 0)"]
); // rgba(255, 128, 0, 1)

// RGBA colors
const color2 = interpolateColors(
  frame,
  [0, 20],
  ["rgba(255, 0, 0, 1)", "rgba(255, 255, 0, 0)"]
); // rgba(255, 128, 0, 0.5)
```
```

----------------------------------------

TITLE: Chaining Scenes with Series in Remotion (TypeScript)
DESCRIPTION: Demonstrates sequencing multiple React components in a Remotion video using the Series component. Both 'MyComponent' and 'AnotherComponent' are rendered one after another by wrapping them in Series.Sequence elements. Dependencies: React, Remotion. Limitations: Each child must specify durationInFrames, and the props structure of child components must be respected.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/passing-props.mdx#_snippet_6

LANGUAGE: typescript
CODE:
```
// @include: example-MyComponent
const AnotherComponent: React.FC = () => {
  return null;
};
// ---cut---
import {Series} from 'remotion';

const ChainedScenes = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={90}>
        <MyComponent propOne="hi" propTwo={10} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={90}>
        <AnotherComponent />
      </Series.Sequence>
    </Series>
  );
};
```

----------------------------------------

TITLE: Upgrading Remotion Framework using npx
DESCRIPTION: Executes the Remotion CLI `upgrade` command via npx. This command automatically checks for the latest compatible versions of Remotion packages (`remotion`, `@remotion/cli`, etc.) and updates the project's `package.json` file and `package-lock.json` (or `yarn.lock`) accordingly. It simplifies the process of keeping the project dependencies up-to-date with the framework.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-overlay/README.md#_snippet_3

LANGUAGE: console
CODE:
```
npx remotion upgrade
```

----------------------------------------

TITLE: Upgrading Remotion to the Latest Version (Node.js, Bash)
DESCRIPTION: Runs the Remotion upgrade routine, ensuring all Remotion packages are updated to their latest versions according to official recommendations. Can be necessary after major framework updates or to receive bug fixes. Requires project repository access and may trigger dependency installation afterward. Outputs upgrade logs to the terminal.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-next-pages/README.md#_snippet_5

LANGUAGE: bash
CODE:
```
npx remotion upgrade
```

----------------------------------------

TITLE: Applying Bezier Easing with interpolate() in TypeScript
DESCRIPTION: Shows how to use the `easing` option in `interpolate` to apply a non-linear transition, specifically using a Bezier curve defined by `Easing.bezier()`. It also combines easing with clamping (`extrapolateLeft: 'clamp'`, `extrapolateRight: 'clamp'`) for controlled animation behavior. Examples cover both simple and multi-point interpolation.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate.mdx#_snippet_8

LANGUAGE: ts
CODE:
```
import { useCurrentFrame } from "remotion";
const frame = useCurrentFrame();
// ---cut---
import { interpolate, Easing } from "remotion";

interpolate(frame, [0, 100], [0, 1], {
  easing: Easing.bezier(0.8, 0.22, 0.96, 0.65),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

//this is Remotion2.0 feature
interpolate(frame, [0, 10, 40, 100], [0, 0.2, 0.6, 1], {
  easing: Easing.bezier(0.8, 0.22, 0.96, 0.65),
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

----------------------------------------

TITLE: Implementing a Fixed Count Loop in Remotion (TSX)
DESCRIPTION: Illustrates creating a loop that repeats a fixed number of times. The <Loop> component is configured with durationInFrames={50} and times={2}, causing the enclosed BlueSquare component to render for two iterations, each lasting 50 frames.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/loop.mdx#_snippet_4

LANGUAGE: tsx
CODE:
```
```tsx twoslash
// @include: example-BlueSquare
import { Loop } from "remotion";
// ---cut---
const MyComp = () => {
  return (
    <Loop durationInFrames={50} times={2}>
      <BlueSquare />
    </Loop>
  );
};
```
```

----------------------------------------

TITLE: Adding Controls to @remotion/player in TypeScript React
DESCRIPTION: Extends the basic Player example to include playback controls by specifying the controls prop. Dependencies are the same as before, now with the Player showing play/pause and scrubber controls. The controls prop enables user interaction for media playback inside the Player. Inputs: same as the basic example plus the controls option. Outputs: a player UI equipped with user controls.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/player-examples.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
// @allowUmdGlobalAccess\n// @filename: ./remotion/MyVideo.tsx\nexport const MyVideo = () => <></>;\n\n// @filename: index.tsx\n// ---cut---\nimport { Player } from "@remotion/player";\nimport { MyVideo } from "./remotion/MyVideo";\n\nexport const App: React.FC = () => {\n  return (\n    <Player\n      component={MyVideo}\n      durationInFrames={120}\n      compositionWidth={1920}\n      compositionHeight={1080}\n      fps={30}\n      controls\n    />\n  );\n};
```

----------------------------------------

TITLE: Starting Remotion Video Preview Server - Console
DESCRIPTION: This command starts the development preview server for the Remotion project using npm scripts. Prerequisite: All dependencies should be installed. Executes the 'dev' script defined in package.json, typically launching a local server (usually at http://localhost:3000) to preview video compositions live. No input parameters are required, and the output is an interactive browser-based preview environment.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-skia/README.md#_snippet_1

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Creating a Basic Skia Video Component in Remotion (TSX)
DESCRIPTION: This TypeScript React component (`MySkiaVideo`) demonstrates using the `<SkiaCanvas />` component from `@remotion/skia`. It fetches the video dimensions (`width`, `height`) using the `useVideoConfig` hook from `remotion` and uses them to set the canvas size. Inside the canvas, a `<Fill>` element from `@shopify/react-native-skia` is rendered to create a black background. This illustrates the basic setup for incorporating Skia graphics into a Remotion video.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/skia/skia-canvas.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { SkiaCanvas } from "@remotion/skia";
import { Fill } from "@shopify/react-native-skia";
import React from "react";
import { useVideoConfig } from "remotion";

const MySkiaVideo: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <SkiaCanvas width={width} height={height}>
      <Fill color="black" />
    </SkiaCanvas>
  );
};
```

----------------------------------------

TITLE: Calling the Presigned URL API from the Frontend - TypeScript/TSX
DESCRIPTION: Demonstrates how a frontend component can request a presigned upload URL from the Next.js API by sending the file\'s size and contentType in the body of a POST request. Suitable for React and Next.js projects. On success, receives a JSON object with presignedUrl and readUrl to proceed with the actual file upload.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/presigned-urls.mdx#_snippet_5

LANGUAGE: TypeScript
CODE:
```
const file: File = {} as unknown as File;
// ---cut---
const presignedResponse = await fetch('/api/upload', {
  method: 'POST',
  body: JSON.stringify({
    size: file.size,
    contentType: file.type,
    //             ^?
  }),
});

const json = (await presignedResponse.json()) as {
  presignedUrl: string;
  readUrl: string;
};
```

----------------------------------------

TITLE: Implementing a Slide Transition in Remotion (TSX)
DESCRIPTION: This TSX code snippet shows how to implement a basic slide transition effect between two scenes ('A' and 'B') using Remotion's `TransitionSeries` component. It defines a reusable `Letter` component for the scenes and configures the transition using the `slide()` presentation factory and `linearTiming` from `@remotion/transitions`. The `slide()` presentation causes the incoming scene to push the outgoing scene off-screen.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transitions/presentations/slide.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { AbsoluteFill } from "remotion";

const Letter: React.FC<{
  children: React.ReactNode;
  color: string;
}> = ({ children, color }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: 0.9,
        justifyContent: "center",
        alignItems: "center",
        fontSize: 200,
        color: "white",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
// ---cut---
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";

const BasicTransition = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={40}>
        <Letter color="#0b84f3">A</Letter>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide()}
        timing={linearTiming({ durationInFrames: 30 })}
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <Letter color="pink">B</Letter>
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

----------------------------------------

TITLE: Importing Images as Modules Using ES Module Imports (TypeScript)
DESCRIPTION: Shows the alternative method for importing image assets directly into TypeScript using ES module imports. The image logo.png is imported as a module, and its reference is provided to the <Img /> component as the src. Only certain extensions are supported (.png, .svg, etc.), and dynamic imports are discouraged.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/importing-assets.mdx#_snippet_12

LANGUAGE: typescript
CODE:
```
import { Img } from \"remotion\";\nimport logo from \"./logo.png\";\n\nexport const MyComp: React.FC = () => {\n  return <Img src={logo} />;\n};\n
```

----------------------------------------

TITLE: Setting Remotion Render Flags for Transparent WebM Export (Bash)
DESCRIPTION: A command-line snippet using Remotion's CLI flags to output a video with alpha channel by specifying image format (PNG), pixel format (yuva420p), and codec (VP8). No JavaScript or TypeScript context required; can be appended to any Remotion CLI render call for a one-time override. No dependencies except having Remotion CLI installed. These options ensure the rendered video is transparent.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transparent-videos.mdx#_snippet_2

LANGUAGE: bash
CODE:
```
--image-format=png --pixel-format=yuva420p --codec=vp8
```

----------------------------------------

TITLE: Implementing a Wipe Transition in Remotion (TypeScript/TSX)
DESCRIPTION: This example demonstrates how to use the `wipe()` presentation transition within a `TransitionSeries` component in Remotion. It defines a simple `Letter` component and transitions between two instances ('A' and 'B') using the `wipe` effect with linear timing. The `Letter` component uses `AbsoluteFill` for layout.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/transitions/presentations/wipe.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { AbsoluteFill } from "remotion";

const Letter: React.FC<{ 
  children: React.ReactNode;
  color: string;
}> = ({ children, color }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: color,
        opacity: 0.9,
        justifyContent: "center",
        alignItems: "center",
        fontSize: 200,
        color: "white",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
// ---cut---
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";

const BasicTransition = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={40}>
        <Letter color="#0b84f3">A</Letter>
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={wipe()}
        timing={linearTiming({ durationInFrames: 30 })}
      />
      <TransitionSeries.Sequence durationInFrames={60}>
        <Letter color="pink">B</Letter>
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

----------------------------------------

TITLE: Starting Remotion Project Preview Server - Console
DESCRIPTION: This script starts the Remotion development server, enabling live preview of video compositions. It should be executed from the project root after dependencies are installed. The preview server supports hot reload and live editing, and listens on a local port as configured in your project.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-tts-azure/README.md#_snippet_3

LANGUAGE: console
CODE:
```
npm run dev
```

----------------------------------------

TITLE: Error Handling for Unfetched Data in React Remotion Component (TypeScript)
DESCRIPTION: This snippet demonstrates error handling for cases where required data has not been fetched by throwing an error if a prop is null. It is designed for components typed with nullable fields and encourages use of runtime error reporting when expected data is missing. Requires TypeScript with React, and the prop data can be null or of type ApiResponse.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/data-fetching.mdx#_snippet_1

LANGUAGE: TSX
CODE:
```
type ApiResponse = {
  title: string;
  description: string;
};
// ---cut---
type MyCompProps = {
  id: string;
  data: ApiResponse | null;
};

const MyComp: React.FC<MyCompProps> = ({ data }) => {
  if (data === null) {
    throw new Error("Data was not fetched");
  }

  return <div>{data.title}</div>;
};
```

----------------------------------------

TITLE: Controlling Remotion Lambda via CLI (Bash)
DESCRIPTION: This command demonstrates how to interact with and control Remotion Lambda functionalities using the command-line interface (CLI). It requires `npx` (Node Package Runner) and access to the `@remotion/lambda` package. Further details on specific CLI commands and options can be found in the linked CLI documentation.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion lambda
```

----------------------------------------

TITLE: Trimming and Delaying Sequence Content (Remotion Nested Sequences, React/TypeScript)
DESCRIPTION: Demonstrates advanced timing logic by nesting Remotion Sequences: an outer Sequence delays content by 30 frames, while the inner Sequence trims 15 frames from its start. Child BlueSquare will thus appear 30 frames in, with its animation advanced by 15 frames at mount. Requires 'remotion' and React.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/sequence.mdx#_snippet_7

LANGUAGE: tsx
CODE:
```
// @include: example-BlueSquare
import {Sequence} from 'remotion';
// ---cut---
const TrimAndDelayExample: React.FC = () => {
  return (
    <Sequence from={30}>
      <Sequence from={-15}>
        <BlueSquare />
      </Sequence>
    </Sequence>
  );
};
```

----------------------------------------

TITLE: Preloading Audio with @remotion/preload in TypeScript/React
DESCRIPTION: This TypeScript/React snippet demonstrates how to preload an audio resource using the preloadAudio() function from the @remotion/preload package. It shows how to call preloadAudio() with an audio URL, and how to un-preload the audio by invoking the returned function. Required dependencies include @remotion/preload, and the key parameter is the audio file URL. The expected input is a string URL for the audio, and the output is a function to remove the preload effect. This pattern ensures that the audio plays immediately when mounted while allowing cleanup when no longer needed.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/preload/preload-audio.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import { preloadAudio } from "@remotion/preload";

const unpreload = preloadAudio(
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
);

// If you want to un-preload the audio later
unpreload();
```

----------------------------------------

TITLE: Optimizing Google Font Loading with loadFont - Remotion TypeScript
DESCRIPTION: Demonstrates best practices for using the loadFont function from @remotion/google-fonts/Inter in a TypeScript (tsx) Remotion project. Shows both an incorrect usage where all font weights and subsets are loaded by default, and a recommended usage loading only the required weights and subsets (regular and bold, Latin subset). Dependencies: @remotion/google-fonts/Inter package. Key parameters are style (default 'normal'), subsets (e.g., ['latin']), and weights (e.g., ['400', '700']). Input is the font style and options object; output is the loaded font resources in Remotion without timeout errors. Limitations: Only subsets and weights provided are loaded, improving performance and reliability.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/troubleshooting/font-loading-errors.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import {loadFont} from '@remotion/google-fonts/Inter';\n\n// \u274C Avoid: Loading all weights and subsets\nloadFont();\n\n// \u2705 Recommended: Load only required weights and subsets\nloadFont('normal', {\n  subsets: ['latin'],\n  weights: ['400', '700'], // Only load regular (400) and bold (700)\n});\n
```

----------------------------------------

TITLE: Demonstrating Inefficient Data Propagation in Remotion Composition - TypeScript/React
DESCRIPTION: This snippet illustrates an anti-pattern where a large object (`audioData`) is fetched using `getAudioData` and passed into a Remotion `<Composition>` via `defaultProps`. This approach can cause serialization errors due to data size limits. It depends on `@remotion/media-utils`, hooks (`useEffect`, `useState`), and several Remotion functions such as `cancelRender`, `continueRender`, `delayRender`, and `staticFile`. The expected input includes an audio asset, and the outputs are the passing of `audioData` as a prop. The main limitation is the risk of exceeding Chrome's serialization limits, making this method unsuitable for large data payloads.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/troubleshooting/defaultprops-too-big.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { AudioData, getAudioData } from "@remotion/media-utils";
import { useEffect, useState } from "react";
import {
  cancelRender,
  Composition,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";

// MyComp.tsx
const MyComp: React.FC<{
  audioData: AudioData | null;
}> = ({ audioData }) => {
  return null;
};

// src/Root.tsx
const RemotionRoot = () => {
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [handle] = useState(() => delayRender());

  useEffect(() => {
    getAudioData(staticFile("audio.mp3"))
      .then((data) => {
        setAudioData(data);
        continueRender(handle);
      })
      .catch((e) => {
        cancelRender(e);
      });
  }, [handle]);

  return (
    <Composition
      id="my-comp"
      durationInFrames={90}
      width={1080}
      height={1080}
      fps={1080}
      component={MyComp}
      defaultProps={{
        audioData,
      }}
    />
  );
};
```

----------------------------------------

TITLE: Defining a Still Image Composition with Remotion <Still /> (TypeScript/React)
DESCRIPTION: This snippet demonstrates how to define a still image composition using Remotion's <Still /> component in a React/TypeScript project. The Still component is similar to Composition but is streamlined for single-frame (still) renders, eliminating the need for fps and durationInFrames properties. Required dependency: 'remotion' npm package; key parameters include id (unique string), component (React.FC reference), width, height, and defaultProps for runtime customization. This component is used to specify the metadata for images rendered by Remotion's still pipeline, with all property types inferred from standard Remotion components.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-08-11-remotion-2-3.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import {Still} from 'remotion';
const Thumbnail: React.FC = () => null;
// ---cut---
<Still
  id="Thumbnail"
  component={Thumbnail}
  width={1200}
  height={627}
  defaultProps={{
    title: 'Welcome to Remotion',
    description: 'Edit Video.tsx to change template',
    slogan: 'Write videos\nin React',
  }}
/>;
```

----------------------------------------

TITLE: Handling PlayerRef Timeupdate Event (TypeScript/React)
DESCRIPTION: Demonstrates attaching a 'timeupdate' event listener on PlayerRef to obtain periodic frame updates during playback. Accesses the current frame via e.detail.frame and logs it. Requires a PlayerRef instance, with ref and existence checks. Outputs frequent frame index logs during playback with throttling constraints (~250ms).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/api.mdx#_snippet_11

LANGUAGE: TSX
CODE:
```
import {PlayerRef} from '@remotion/player';
import {useRef} from 'react';
const playerRef = useRef<PlayerRef>(null);
if (!playerRef.current) {
  throw new Error();
}
// ---cut---
playerRef.current.addEventListener('timeupdate', (e) => {
  console.log('current frame is ' + e.detail.frame); // current frame is 120
});
```

----------------------------------------

TITLE: Generating Public URLs for Multiple Assets with staticFile (TypeScript)
DESCRIPTION: This snippet demonstrates generating URLs for different asset types with staticFile, including images and fonts. It also presents sample expected output, showing how staticFile returns URLs with unique static paths for use in Remotion components or custom loaders. Dependencies include remotion v2.5.7 or higher and a public directory with the referenced files.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/staticfile.mdx#_snippet_2

LANGUAGE: TypeScript
CODE:
```
import { staticFile } from "remotion";

const myImage = staticFile(`/my-image.png`); // "/static-32e8nd/my-image.png"
const font = staticFile(`/font.woff2`); // "/static-32e8nd/font.woff2"
```

----------------------------------------

TITLE: Deploying Remotion Lambda Function with CLI (bash)
DESCRIPTION: Uses the Remotion Lambda CLI command to deploy a pre-built AWS Lambda function to the user's AWS account. This function contains the necessary binaries and runtime code to execute Remotion rendering tasks based on a provided serve URL.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/setup.mdx#_snippet_4

LANGUAGE: bash
CODE:
```
npx remotion lambda functions deploy
```

----------------------------------------

TITLE: Animating Component Styles with interpolateStyles() in React (TSX)
DESCRIPTION: This React functional component demonstrates using `interpolateStyles` from `@remotion/animation-utils` to animate styles. It interpolates `opacity` and `transform` (using `makeTransform` and `translateY`) based on a fixed input value (15) across specified input and output ranges ([0, 30, 60] mapping to corresponding style objects). The resulting interpolated styles object is then applied to a `div` element.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/animation-utils/interpolate-styles.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
// ---cut---
import {
  interpolateStyles,
  makeTransform,
  translateY,
} from "@remotion/animation-utils";

const MyComponent: React.FC = () => {
  const animatedStyles = interpolateStyles(
    15,
    [0, 30, 60],
    [
      { opacity: 0, transform: makeTransform([translateY(-50)]) },
      { opacity: 1, transform: makeTransform([translateY(0)]) },
      { opacity: 0, transform: makeTransform([translateY(50)]) },
    ],
  );

  return <div style={animatedStyles} />;
};
```

----------------------------------------

TITLE: Emitting a Text Artifact in a Remotion Component (TSX)
DESCRIPTION: Shows how to use the `<Artifact>` component within a React functional component (`MyComp`) to generate a file (`captions.srt`) during a Remotion render. The artifact is conditionally rendered only on the first frame (frame 0) using the `useCurrentFrame` hook. It depends on the `remotion` library (`Artifact`, `useCurrentFrame`) and assumes a `generateSubtitles` function provides the artifact content.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/artifacts.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
// @filename: subtitles.tsx

export const generateSubtitles = () => {
  return ``;
};
// @filename: MyComp.tsx
// ---cut---
import React from 'react';
import {Artifact, useCurrentFrame} from 'remotion';
import {generateSubtitles} from './subtitles';

export const MyComp: React.FC = () => {
  const frame = useCurrentFrame();
  return <>{frame === 0 ? <Artifact filename="captions.srt" content={generateSubtitles()} /> : null}</>;
};
```

----------------------------------------

TITLE: Implementing Combined Spring Animation in a Remotion Component (TypeScript)
DESCRIPTION: This code shows a full React functional component (`AnimationMath`) utilizing Remotion hooks and the `spring` function to create an animated element. It calculates `enter` and `exit` spring values based on the current frame and video duration, subtracts them to achieve a combined `scale` animation, and applies this scale transform to a styled `div`. Requires `react` and `remotion`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/animation-math.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="Full snippet"
import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const AnimationMath: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({
    fps,
    frame,
    config: {
      damping: 200,
    },
  });

  const exit = spring({
    fps,
    config: {
      damping: 200,
    },
    durationInFrames: 20,
    delay: durationInFrames - 20,
    frame,
  });

  const scale = enter - exit;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          height: 100,
          width: 100,
          backgroundColor: "#4290f5",
          borderRadius: 20,
          transform: `scale(${scale})`,
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          fontSize: 50,
          color: "white",
        }}
      >
        {frame}
      </div>
    </AbsoluteFill>
  );
};
```
```

----------------------------------------

TITLE: Checking Lambda Render Progress with getRenderProgress in TypeScript
DESCRIPTION: This TypeScript snippet demonstrates how to import and call the `getRenderProgress` function from the `@remotion/lambda/client` library. It asynchronously retrieves the progress status of a specific Remotion render job identified by `renderId`, `bucketName`, `functionName`, and `region`. The function requires these parameters, which are typically obtained from the initial `renderMediaOnLambda` call.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/getrenderprogress.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {getRenderProgress} from '@remotion/lambda/client';

const progress = await getRenderProgress({
  renderId: 'd7nlc2y',
  bucketName: 'remotionlambda-d9mafgx',
  functionName: 'remotion-render-la8ffw',
  region: 'us-east-1',
});
```

----------------------------------------

TITLE: Organizing Remotion Compositions with `<Folder>` (TSX)
DESCRIPTION: This example shows how to use the `<Folder>` component from Remotion to group `<Composition>` components in the Remotion Studio sidebar. Compositions nested within a `<Folder>` (like `CompInFolder`) will appear under that folder's name ('Visuals' in this case), while others (like `CompOutsideFolder`) remain at the top level. This helps organize projects with multiple compositions.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/composition.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
```tsx twoslash
import React from "react";
const Component: React.FC = () => null;
// ---cut---
import { Composition, Folder } from "remotion";

export const Video = () => {
  return (
    <>
      <Folder name="Visuals">
        <Composition
          id="CompInFolder"
          durationInFrames={100}
          fps={30}
          width={1080}
          height={1080}
          component={Component}
        />
      </Folder>
      <Composition
        id="CompOutsideFolder"
        durationInFrames={100}
        fps={30}
        width={1080}
        height={1080}
        component={Component}
      />
    </>
  );
};
```
```

----------------------------------------

TITLE: Rendering a Colored Layer using Remotion Sequence – TypeScript/React
DESCRIPTION: Defines a React functional component (Layer) to render a colored rectangle at a specified place and size using Remotion's Sequence for precise timing. It relies on the Item type to retrieve color, size, and position data, and outputs a styled div matching these properties, wrapped in a Remotion Sequence to control when in the animation the layer appears. Dependencies are React, Remotion, and the shared Item type definition.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/drag-and-drop/index.mdx#_snippet_4

LANGUAGE: tsx
CODE:
```
import React, {useMemo} from 'react';
import {Sequence} from 'remotion';
import type {Item} from './item';

export const Layer: React.FC<{
  item: Item;
}> = ({item}) => {
  const style: React.CSSProperties = useMemo(() => {
    return {
      backgroundColor: item.color,
      position: 'absolute',
      left: item.left,
      top: item.top,
      width: item.width,
      height: item.height,
    };
  }, [item.color, item.height, item.left, item.top, item.width]);

  return (
    <Sequence
      key={item.id}
      from={item.from}
      durationInFrames={item.durationInFrames}
      layout="none"
    >
      <div style={style} />
    </Sequence>
  );
};
```

----------------------------------------

TITLE: Deploying AWS Lambda Function via Remotion Lambda - TypeScript
DESCRIPTION: This snippet demonstrates how to use the deployFunction method from @remotion/lambda to deploy an AWS Lambda function for video rendering. Dependencies required are @remotion/lambda and an AWS account with necessary permissions. The main parameters include region, timeoutInSeconds, memorySizeInMb, createCloudWatchLogGroup, and diskSizeInMb. The function returns the created function's name. Inputs are deployment configuration options and output is an object with functionName and alreadyExisted. Constraints include AWS-imposed limits on timeout, memory, and disk size, and the region must match the Lambda Layer.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/deployfunction.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import {deployFunction} from '@remotion/lambda';

const {functionName} = await deployFunction({
  region: 'us-east-1',
  timeoutInSeconds: 120,
  memorySizeInMb: 2048,
  createCloudWatchLogGroup: true,
  diskSizeInMb: 2048,
});
console.log(functionName);
```

----------------------------------------

TITLE: Attaching Zod Schema to Remotion Composition (TSX)
DESCRIPTION: This snippet demonstrates how to integrate a Zod schema (`myCompSchema`) with a Remotion `<Composition>`. It shows defining a component (`MyComponent`) whose props are typed using the schema and then attaching the schema to the `<Composition>` using the `schema` prop. It also shows providing `defaultProps` that match the schema, which is required by Remotion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/schemas.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
import React from 'react';
import {z} from 'zod';

export const myCompSchema = z.object({
  propOne: z.string(),
  propTwo: z.string(),
});

export const MyComponent: React.FC<z.infer<typeof myCompSchema>> = ({propOne, propTwo}) => {
  return (
    <div>
      <h1>{propOne}</h1>
      <h2>{propTwo}</h2>
    </div>
  );
};
```

LANGUAGE: tsx
CODE:
```
import React from 'react';
import {Composition} from 'remotion';
import {MyComponent, myCompSchema} from './MyComponent';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="my-video"
      component={MyComponent}
      durationInFrames={100}
      fps={30}
      width={1920}
      height={1080}
      schema={myCompSchema}
      defaultProps={{
        propOne: 'Hello World',
        propTwo: 'Welcome to Remotion',
      }}
    />
  );
};
```

----------------------------------------

TITLE: Deploying Lambda Function Using Remotion CLI - Bash
DESCRIPTION: This command deploys a new AWS Lambda function via the Remotion CLI to facilitate cloud video rendering. Prerequisites include a properly configured AWS account and installed Remotion CLI. The command deploys the serverless function, which is required for subsequent rendering operations. Input is none; output is the deployment of the Lambda function.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/static/llms.txt#_snippet_19

LANGUAGE: bash
CODE:
```
npx remotion lambda functions deploy
```

----------------------------------------

TITLE: Chunking Video with Series and OffthreadVideo Components (TypeScript/React)
DESCRIPTION: This snippet demonstrates how to split a large video into multiple parts and render them sequentially using Remotion\'s <Series> and <OffthreadVideo> components in a TypeScript React component. It imports necessary hooks and components from Remotion, iterates over an array of video parts, and mounts each one in a sequence with a defined duration. This technique helps avoid delayRender timeouts by loading only part of the video at a time. Required dependencies include Remotion, React, TypeScript, and the relevant video files accessible through staticFile(). The input is an array of part filenames and the output is a series of video sequences rendered one after another.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/troubleshooting/delay-render-proxy.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import { Series, useVideoConfig, OffthreadVideo, staticFile } from \"remotion\";

const parts = [\"part1.mp4\", \"part2.mp4\", \"part3.mp4\"];

const SeriesTesting: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <Series>
      {parts.map((part) => {
        return (
          <Series.Sequence durationInFrames={30 * 60}>
            <OffthreadVideo src={staticFile(part)} />
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
```

----------------------------------------

TITLE: Using Offthread Video Texture in React Three Fiber - TypeScript/TSX
DESCRIPTION: This snippet shows a simple usage of Remotion's useOffthreadVideoTexture hook within a React component to map a synchronized video texture onto a mesh in a ThreeCanvas. External dependencies required are @remotion/three and remotion. Key parameters include the video source (as a static file) and the React video config providing canvas width and height. The component only renders the mesh material if a videoTexture is available, returning null otherwise. This example only works during Remotion's dedicated rendering environment.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/use-offthread-video-texture.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import {ThreeCanvas, useOffthreadVideoTexture} from '@remotion/three';
import {staticFile, useVideoConfig} from 'remotion';

const videoSrc = staticFile('/vid.mp4');

const My3DVideo = () => {
  const {width, height} = useVideoConfig();

  const videoTexture = useOffthreadVideoTexture({src: videoSrc});

  return (
    <ThreeCanvas width={width} height={height}>
      <mesh>{videoTexture ? <meshBasicMaterial map={videoTexture} /> : null}</mesh>
    </ThreeCanvas>
  );
};
```

----------------------------------------

TITLE: Clamping Animation Output using interpolate() Options in TSX
DESCRIPTION: Demonstrates using the `extrapolateRight: 'clamp'` option with the `interpolate` function. This option prevents the output value (`scale`) from exceeding the maximum value of the specified output range (1 in this case), even when the input (`frame`) goes beyond the input range (greater than 20).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/interpolate.mdx#_snippet_6

LANGUAGE: tsx
CODE:
```
import { interpolate, useCurrentFrame } from "remotion";
const frame = useCurrentFrame();
// ---cut---
const scale = interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: "clamp",
});
```

----------------------------------------

TITLE: Installing Project Dependencies with npm - Console
DESCRIPTION: This command installs all required dependencies defined in the project's package.json file. It must be executed inside the project directory. No additional parameters are required. The expected output is a fully populated node_modules directory with all essential libraries for the Remotion and React Three Fiber template.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-three/README.md#_snippet_0

LANGUAGE: console
CODE:
```
npm install
```

----------------------------------------

TITLE: Installing Dependencies with npm - Bash
DESCRIPTION: Installs all project dependencies as defined in package.json using npm. This is a prerequisite for running the application, ensuring that all required Node.js packages are available in the node_modules directory.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-next-app-tailwind/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
npm i

```

----------------------------------------

TITLE: Embedding Local Video Using staticFile in Remotion (TypeScript)
DESCRIPTION: This example illustrates loading a local video file by referencing it through Remotion's staticFile utility. The video must be placed inside the public directory for staticFile to resolve it. Dependencies include remotion and React. The src parameter is set to a file relative to the public folder, and the output is an OffthreadVideo player rendering that file.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/videos/index.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import React from 'react';\nimport {OffthreadVideo, staticFile} from 'remotion';\n\nexport const MyComp: React.FC = () => {\n  return <OffthreadVideo src={staticFile('video.mp4')} />;\n};
```

----------------------------------------

TITLE: Custom Premounted Sequence Component in Remotion (TypeScript/React)
DESCRIPTION: This advanced implementation defines a custom PremountedSequence React component that allows fine control over premounting behavior using Remotion's APIs. The component receives premountFor as a prop along with all standard Sequence props and manages style, opacity, and pointer-events for invisible preloading. It prevents usage with layout='none'. The component leverages useCurrentFrame, getRemotionEnvironment, and useMemo, as well as a nested <Freeze> to control playback, demonstrating careful handling of mounting logic, buffer state, and forwarding refs. The code should be used in Remotion environments with all relevant APIs, and considerations around native buffer states must be handled by the developer.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/premounting.mdx#_snippet_1

LANGUAGE: typescript
CODE:
```
import React, {forwardRef, useMemo} from 'react';
import {
  Freeze,
  getRemotionEnvironment,
  Sequence,
  SequenceProps,
  useCurrentFrame,
} from 'remotion';

export type PremountedSequenceProps = SequenceProps & {
  premountFor: number;
};

const PremountedSequenceRefForwardingFunction: React.ForwardRefRenderFunction<
  HTMLDivElement,
  {
    premountFor: number;
  } & SequenceProps
> = ({premountFor, ...props}, ref) => {
  const frame = useCurrentFrame();

  if (props.layout === 'none') {
    throw new Error('`<Premount>` does not support layout="none"');
  }

  const {style: passedStyle, from = 0, ...otherProps} = props;
  const active =
    frame < from &&
    frame >= from - premountFor &&
    !getRemotionEnvironment().isRendering;

  const style: React.CSSProperties = useMemo(() => {
    return {
      ...passedStyle,
      opacity: active ? 0 : 1,
      // @ts-expect-error Only in the docs - it will not give a type error in a Remotion project
      pointerEvents: active ? 'none' : (passedStyle?.pointerEvents ?? 'auto'),
    };
  }, [active, passedStyle]);

  return (
    <Freeze frame={from} active={active}>
      <Sequence
        ref={ref}
        name={`<PremountedSequence premountFor={${premountFor}}>`}
        from={from}
        style={style}
        {...otherProps}
      />
    </Freeze>
  );
};

export const PremountedSequence = forwardRef(
  PremountedSequenceRefForwardingFunction,
);
```

----------------------------------------

TITLE: Passing Input Props During Server-Side Rendering in Remotion (TypeScript)
DESCRIPTION: Demonstrates passing inputProps while invoking server-side rendering in Remotion using '@remotion/renderer'. Props are supplied both to 'selectComposition' and 'renderMedia', ensuring the correct initial props during the render. Requires Node.js and Remotion's renderer; inputProps must be serializable. Key parameters include 'serveUrl', 'outputLocation', and the props object.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/passing-props.mdx#_snippet_3

LANGUAGE: typescript
CODE:
```
const serveUrl = '/path/to/bundle';
const outputLocation = '/path/to/frames';
// ---cut---
import {renderMedia, selectComposition} from '@remotion/renderer';

const inputProps = {
  titleText: 'Hello World',
};

const composition = await selectComposition({
  serveUrl,
  id: 'my-video',
  inputProps,
});

await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation,
  inputProps,
});
```

----------------------------------------

TITLE: Loading All Variants of a Google Font Using loadFont - TypeScript & React
DESCRIPTION: Demonstrates how to load all styles, weights, and subsets of the Lobster font using the loadFont() method from @remotion/google-fonts/Lobster. This code imports the font loader and the AbsoluteFill component, and then extracts the fontFamily from the loader's return value to assign to the CSS style. Dependencies include React, Remotion, and the relevant Google Fonts package for the desired font. Inputs: none are required, as loadFont() is called without arguments. Output: A React component styled with the fetched Google font. Useful for scenarios where a developer wants the full font family available in their Remotion video.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/google-fonts/load-font.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import {loadFont} from '@remotion/google-fonts/Lobster';
import {AbsoluteFill} from 'remotion';

const {fontFamily} = loadFont();

export const GoogleFontsExample: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: fontFamily,
      }}
    >
      <h1>Google Fonts</h1>
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Creating a Loopable OffthreadVideo Component in Remotion (TypeScript)
DESCRIPTION: This React functional component (`LoopableOffthreadVideo`) provides a wrapper around Remotion's `<OffthreadVideo>` to enable looping functionality. It uses `@remotion/media-parser` to determine the video duration asynchronously. During rendering, it wraps `<OffthreadVideo>` with `<Loop>` if the `loop` prop is true. During preview, it falls back to the standard `<Video>` component which supports looping natively. This addresses the limitation that `<OffthreadVideo>` does not have a built-in `loop` prop.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/offthreadvideo.mdx#_snippet_8

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="src/LoopableOffthreadVideo.tsx"
import {mediaParserController, parseMedia} from '@remotion/media-parser';
import React, {useEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender, getRemotionEnvironment, Loop, OffthreadVideo, RemotionOffthreadVideoProps, useVideoConfig, Video} from 'remotion';

const LoopedOffthreadVideo: React.FC<RemotionOffthreadVideoProps> = (props) => {
  const [duration, setDuration] = useState<number | null>(null);
  const [handle] = useState(() => delayRender());
  const {fps} = useVideoConfig();

  useEffect(() => {
    const controller = mediaParserController();

    parseMedia({
      src: props.src,
      acknowledgeRemotionLicense: true,
      controller,
      fields: {
        slowDurationInSeconds: true,
      },
    })
      .then(({slowDurationInSeconds}) => {
        setDuration(slowDurationInSeconds);
        continueRender(handle);
      })
      .catch((err) => {
        cancelRender(err);
      });

    return () => {
      continueRender(handle);
      controller.abort();
    };
  }, [handle, props.src]);

  if (duration === null) {
    return null;
  }

  return (
    <Loop durationInFrames={Math.floor(duration * fps)}>
      <OffthreadVideo {...props} />;
    </Loop>
  );
};

export const LoopableOffthreadVideo: React.FC<
  RemotionOffthreadVideoProps & {
    loop?: boolean;
  }
> = ({loop, ...props}) => {
  if (getRemotionEnvironment().isRendering) {
    if (loop) {
      return <LoopedOffthreadVideo {...props} />;
    }

    return <OffthreadVideo {...props} />;
  }

  return <Video loop={loop} {...props}></Video>;
};
```
```

----------------------------------------

TITLE: Setting Video Image Format in Remotion Config (TypeScript)
DESCRIPTION: Configures the image format ('jpeg', 'png', or 'none') used for rendering video frames in a Remotion project via `remotion.config.ts`. 'jpeg' is the default and fastest, 'png' supports transparency, and 'none' skips image rendering for audio-only calculation. Depends on the `Config` object from `@remotion/cli/config`. Available since Remotion v4.0.0.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/config.mdx#_snippet_0

LANGUAGE: ts
CODE:
```
import {Config} from '@remotion/cli/config';
// ---cut---
Config.setVideoImageFormat('png');
```

----------------------------------------

TITLE: Using Math.random() for State Initialization in Remotion Components (TypeScript/React)
DESCRIPTION: This code shows initializing a local randomValues state array in a Remotion React component using Math.random(). While functional during preview, this creates non-deterministic output when rendering because Math.random() produces distinct values on each parallel render. This approach should be avoided for deterministic video generation. Dependencies: React (useState), Remotion (project context). Inputs: none, Outputs: JSX fragment. Limitation: Not deterministic across multiple rendering threads.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/using-randomness.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { useState } from \"react\";
// ---cut---
const MyComp: React.FC = () => {
  const [randomValues] = useState(() =>
    new Array(10).fill(true).map((a, i) => {
      return {
        x: Math.random(),
        y: Math.random(),
      };
    }),
  );
  // Do something with coordinates
  return <></>;
};
```

----------------------------------------

TITLE: Refactoring Remotion Component to Accept Video Source as Prop in TypeScript
DESCRIPTION: Modifies the `MyComp` component to accept the video source (`src`) as a React prop defined in `MyCompProps`. This change makes the video source configurable and is a prerequisite for calculating metadata based on the specific video.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/align-duration.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import React from 'react';
import {OffthreadVideo, staticFile} from 'remotion';

type MyCompProps = {
  src: string;
};

export const MyComp: React.FC<MyCompProps> = ({src}) => {
  return <OffthreadVideo src={src} />;
};
```

----------------------------------------

TITLE: Managing Timeline State and Rendering Remotion Player in React/TypeScript
DESCRIPTION: Provides a React component for keeping track of tracks and their items using useState, and integrates Remotion's Player with inputProps derived from the current editor state. Demonstrates the pattern of passing real-time data into playback and editing environments, critical for an interactive editor experience. Dependencies: React, Remotion Player; Input: None (initializes with default tracks), Output: Player rendered with timeline data, state usable for timeline manipulation.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/building-a-timeline.mdx#_snippet_2

LANGUAGE: TSX
CODE:
```
// @filename: types.ts
type BaseItem = {
  from: number;
  durationInFrames: number;
};

export type SolidItem = BaseItem & {
  type: 'shape';
  color: string;
};

export type TextItem = BaseItem & {
  type: 'text';
  text: string;
  color: string;
};

export type VideoItem = BaseItem & {
  type: 'video';
  src: string;
};

export type Item = SolidItem | TextItem | VideoItem;

export type Track = {
  name: string;
  items: Item[];
};

// @filename: remotion/Main.tsx
import React from 'react';
import type {Track} from '../types';
export const Main: React.FC<{
  tracks: Track[];
}> = ({tracks}) => {
  return null;
};

// @filename: Editor.tsx
// ---cut---
import React, {useMemo, useState} from 'react';
import {Player} from '@remotion/player';
import type {Item} from './types';
import {Main} from './remotion/Main';

type Track = {
  name: string;
  items: Item[];
};

export const Editor = () => {
  const [tracks, setTracks] = useState<Track[]>([
    {name: 'Track 1', items: []},
    {name: 'Track 2', items: []},
  ]);

  const inputProps = useMemo(() => {
    return {
      tracks,
    };
  }, [tracks]);

  return (
    <>
      <Player component={Main} fps={30} inputProps={inputProps} durationInFrames={600} compositionWidth={1280} compositionHeight={720} />
    </>
  );
};
```

----------------------------------------

TITLE: Ensuring Chrome Installation via Remotion CLI (Best Practice)
DESCRIPTION: Recommends using the `npx remotion browser ensure` command as a best practice to proactively download and manage the correct Chrome Headless Shell version pinned by Remotion. This ensures rendering readiness and avoids potential issues with external or incompatible browser installations, especially important in CI/CD or server environments.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/chrome-headless-shell.mdx#_snippet_9

LANGUAGE: bash
CODE:
```
npx remotion browser ensure
```

----------------------------------------

TITLE: Incorrect Playback Rate Interpolation with Remotion (TypeScript/React)
DESCRIPTION: This snippet demonstrates an attempted approach to vary the playback speed of a video over time by directly interpolating the playbackRate of an OffthreadVideo in Remotion. It illustrates why this method does not produce expected results: Remotion evaluates each frame independently, leading to a frame jump rather than an accumulated speed effect. No external dependencies aside from 'remotion' and React are required. The primary parameter, frame, drives playbackRate through interpolation, but correct temporal sequencing is not achieved.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/accelerated-video.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {interpolate, OffthreadVideo} from 'remotion';\nlet frame = 0;\n// ---cut---\n<OffthreadVideo\n  playbackRate={interpolate(frame, [0, 100], [1, 5])}\n  src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4#disable"\n/>;
```

----------------------------------------

TITLE: Executing the `remotion still` Command (Bash)
DESCRIPTION: Shows the basic command structure for rendering a still frame using the Remotion CLI. It accepts an optional serve URL or entry point, an optional composition ID, and an optional output location. If arguments are omitted, defaults are used (e.g., output to 'out' folder) or interactive prompts may appear. Various flags (like `--props`, `--frame`, `--image-format`) can be appended to customize the rendering process.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cli/still.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion still <serve-url|entry-point>? [<composition-id>] [<output-location>]
```

----------------------------------------

TITLE: Installing @remotion/animation-utils package using npm (Bash)
DESCRIPTION: This command uses the Node Package Manager (npm) to install the `@remotion/animation-utils` library. The `--save-exact` flag ensures that the specific version installed is recorded in the `package.json` file without any version range specifiers (like ^ or ~), which is recommended for Remotion packages to avoid version conflicts.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/animation-utils/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
npm install @remotion/animation-utils --save-exact
```

----------------------------------------

TITLE: Setting Output Scaling Factor in Remotion Config (TypeScript)
DESCRIPTION: Sets a scaling factor for the output frames using the `Config` object in `remotion.config.ts`. For example, a factor of 1.5 scales a 1280x720 frame to 1920x1080. Vector elements are rendered with extra detail. The default scale is 1. Depends on the `Config` object from `@remotion/cli/config`. Available since Remotion v2.6.7. The `--scale` command line flag overrides this setting.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/config.mdx#_snippet_2

LANGUAGE: ts
CODE:
```
import {Config} from '@remotion/cli/config';
// ---cut---
Config.setScale(2);
```

----------------------------------------

TITLE: Loading and Using a Local Font with `loadFont()` in a Remotion Component (TypeScript)
DESCRIPTION: This snippet demonstrates how to load a local font file (`bangers.ttf`) using the `loadFont()` function from `@remotion/fonts`. It uses `staticFile()` from `remotion` to get the correct path to the font file. The font is assigned the family name 'Bangers'. Once loaded, it logs a message to the console. A simple React functional component `GoogleFontsExample` then uses this loaded font by setting the `fontFamily` style property.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/fonts-api/load-font.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash title="MyComp.tsx"
import { loadFont } from "@remotion/fonts";
import { AbsoluteFill, staticFile } from "remotion";

loadFont({
  family: "Bangers",
  url: staticFile("bangers.ttf"),
}).then(() => console.log("Font loaded!"));

export const GoogleFontsExample: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: "Bangers",
      }}
    >
      <h1>Local Font</h1>
    </AbsoluteFill>
  );
};
```
```

----------------------------------------

TITLE: Configuring AWS Credentials in .env File (txt)
DESCRIPTION: Demonstrates the required format for storing the AWS Access Key ID and Secret Access Key in a `.env` file at the project root. These environment variables are used by Remotion Lambda tools and the SDK for authentication with AWS.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/setup.mdx#_snippet_1

LANGUAGE: txt
CODE:
```
REMOTION_AWS_ACCESS_KEY_ID=<Access key ID>
REMOTION_AWS_SECRET_ACCESS_KEY=<Secret access key>
```

----------------------------------------

TITLE: Rendering Still Images via Remotion CLI - Bash
DESCRIPTION: This Bash command renders a still image from a specified Remotion composition to a PNG file. It uses the 'remotion still' CLI tool and demonstrates passing custom props as a JSON string to the composition. Required dependencies include an initialized Remotion project and availability of the appropriate composition (e.g., 'my-comp'). The key parameters are '--props' for custom data, the composition name, and the output filename. The command supports changing output format via the optional '--image-format' flag. Output is a still image file, by default in PNG format, but JPEG, WEBP, and PDF are also available. No duration or FPS needs to be specified for stills.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/stills.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion still --props='{"custom": "data"}' my-comp out.png
```

----------------------------------------

TITLE: Installing @remotion/cli with npm (Exact Version)
DESCRIPTION: This Bash command installs the `@remotion/cli` package using npm. The `--save-exact` flag ensures that the specific version installed is recorded in the `package.json` file, preventing potential issues caused by minor version mismatches between different Remotion packages. Requires Node.js and npm installed.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/cli/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
npm install @remotion/cli --save-exact
```

----------------------------------------

TITLE: Re-encoding MediaRecorder Blob to MP4 using @remotion/webcodecs (TypeScript)
DESCRIPTION: This TypeScript snippet demonstrates how to re-encode a video Blob (typically obtained from MediaRecorder) directly in the browser using the `@remotion/webcodecs` library. It calls the `convertMedia` function, specifying the source Blob, target container ('mp4'), H.264 video codec, and AAC audio codec. This provides a client-side alternative to server-based FFmpeg for creating more compatible MP4 files.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/webcodecs/fix-a-mediarecorder-video.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
import {convertMedia} from '@remotion/webcodecs';

// The video get from the MediaRecorder as a Blob
const blob = new Blob([], {type: 'video/webm'});

await convertMedia({
  src: blob,
  container: 'mp4',
  videoCodec: 'h264',
  audioCodec: 'aac',
});
```

----------------------------------------

TITLE: Importing an Image Asset Using staticFile in Remotion (TypeScript)
DESCRIPTION: Demonstrates how to import and display a static image using Remotion's Img component and the staticFile() helper. Requires the remotion package as a dependency. The staticFile() function is used to resolve the path to logo.png in the public/ folder, which is then rendered through <Img /> in a React functional component.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/importing-assets.mdx#_snippet_1

LANGUAGE: typescript
CODE:
```
import { Img, staticFile } from \"remotion\";\n\nexport const MyComp: React.FC = () => {\n  return <Img src={staticFile(\"logo.png\")} />;\n};\n
```

----------------------------------------

TITLE: Rendering a Still Image via Remotion CLI (Shell)
DESCRIPTION: This shell snippet demonstrates the use of the 'remotion still' command-line interface to generate a still image (PNG or JPEG) from a named composition. It passes inputProps in JSON string format, specifies the source composition (my-comp), and the output file path (out.png). Dependencies: Remotion CLI (must be installed or used via npx). Inputs include custom properties and composition name; output is a rendered still image. This command is suitable for quick, scriptable image generation without Node.js scripting.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-08-11-remotion-2-3.mdx#_snippet_2

LANGUAGE: shell
CODE:
```
npx remotion still --props='{"custom": "data"}'  my-comp out.png
```

----------------------------------------

TITLE: Installing Dependencies for Remotion Three Integration - Bash
DESCRIPTION: This snippet demonstrates installing all required packages for using Remotion with React Three Fiber and Three.js in a project using npm. It installs 'three', '@react-three/fiber' (the official React Three Fiber implementation), '@remotion/three' (for Remotion integration), and '@types/three' (TypeScript type definitions). To use advanced 3D graphics in Remotion, all these packages must be present. Run this in the terminal at your project's root. Input: none. Output: dependencies added to package.json.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/three.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npm i three @react-three/fiber @remotion/three @types/three
```

----------------------------------------

TITLE: Enabling SCSS in Remotion Webpack Configuration with TypeScript
DESCRIPTION: This snippet imports the enableScss utility and applies it to the current webpack configuration by overriding it via Remotion's Config.overrideWebpackConfig. It requires the @remotion/cli/config and @remotion/enable-scss packages. The callback receives the existing webpack configuration and returns a modified configuration supporting SCSS/SASS. The input is the current configuration object, with the output being an enhanced configuration that handles .scss files. The code is limited to simply adding SCSS support and doesn't combine other settings.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/enable-scss/enable-scss.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import { Config } from "@remotion/cli/config";
import { enableScss } from "@remotion/enable-scss";

Config.overrideWebpackConfig((currentConfiguration) => {
  return enableScss(currentConfiguration);
});
```

----------------------------------------

TITLE: Rendering Video via Remotion Cloud Run using CLI (Bash)
DESCRIPTION: Demonstrates rendering a video using a deployed Studio URL through Remotion Cloud Run via the CLI. It uses `npx remotion cloudrun render`, providing the serve URL, composition ID (`HelloWorld`), and input props. Requires prior setup of Remotion Cloud Run.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/studio/deploy-static.mdx#_snippet_7

LANGUAGE: bash
CODE:
```
npx remotion cloudrun render https://remotion-helloworld.vercel.app HelloWorld --props '{"titleText":"Hello World"}'
```

----------------------------------------

TITLE: Accessing Absolute Frame within a Sequence in Remotion (TSX)
DESCRIPTION: This example illustrates a method to access the absolute timeline frame within a component rendered inside a `<Sequence>`. It involves calling `useCurrentFrame` in the parent component (`MyVideo`) to get the absolute frame and then passing this value down as a prop (`absoluteFrame`) to the child component (`Subtitle`) within the `<Sequence>`. The child component can then access both the relative frame (via its own `useCurrentFrame` call) and the absolute frame (via the prop).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/use-current-frame.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
```tsx twoslash
import { Sequence, useCurrentFrame } from "remotion";

// ---cut---

const Subtitle: React.FC<{ absoluteFrame: number }> = ({ absoluteFrame }) => {
  console.log(useCurrentFrame()); // 15
  console.log(absoluteFrame); // 25

  return null;
};

const MyVideo = () => {
  const frame = useCurrentFrame(); // 25

  return (
    <Sequence from={10}>
      <Subtitle absoluteFrame={frame} />
    </Sequence>
  );
};
```
```

----------------------------------------

TITLE: Basic <OffthreadVideo> Usage with Local File in Remotion (tsx)
DESCRIPTION: Demonstrates the fundamental usage of the `<OffthreadVideo>` component within an `<AbsoluteFill>` layout. It imports `AbsoluteFill`, `OffthreadVideo`, and `staticFile` from Remotion to display a video loaded from a local file ('video.webm') referenced using `staticFile`. This component renders video frames as images using FFmpeg.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/offthreadvideo.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {AbsoluteFill, OffthreadVideo, staticFile} from 'remotion';

export const MyVideo = () => {
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile('video.webm')} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Starting the Remotion Application Server - Bash
DESCRIPTION: This command starts the Remotion application using npm, which launches an HTTP service on the port configured in the .env file, here specified as 8080. Prerequisites include Node.js, npm, and the Remotion project dependencies installed. The command must be executed from the application directory and will bind the server to the relevant port; any port conflicts or missing modules may prevent startup.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/without-iam/ec2.mdx#_snippet_5

LANGUAGE: bash
CODE:
```
npm run start
```

----------------------------------------

TITLE: Ensuring Browser Availability with Remotion CLI (Shell)
DESCRIPTION: This shell command invokes the Remotion CLI to check for an available Chrome browser for rendering; if none is found, it attempts to download one automatically. It requires Node.js and the Remotion CLI installed via npm or run through npx. Optional parameters such as --browser-executable, --chrome-mode, and --log can modify behavior by specifying a custom browser path, adjusting Chrome's operational mode, or setting log verbosity. The command produces CLI output indicating success or actions taken, and errors if prerequisites are not met.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cli/browser/ensure.mdx#_snippet_0

LANGUAGE: shell
CODE:
```
npx remotion browser ensure
```

----------------------------------------

TITLE: Starting Remotion Studio in Interactive Mode (Node.js, Bash)
DESCRIPTION: Launches the Remotion Studio interface, allowing users to preview and edit videos programmatically within their project. This command uses npx to run 'remotion studio' without a global install. Requires project dependencies to be installed and should be run in project root. It opens a development webpage with an interactive video previewer.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-next-pages/README.md#_snippet_3

LANGUAGE: bash
CODE:
```
npx remotion studio
```

----------------------------------------

TITLE: Defining TailwindCSS v3 Directives
DESCRIPTION: CSS code for the `src/style.css` file. This file uses the `@tailwind` directives to include Tailwind's base styles, component classes, and utility classes into the project.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/tailwind.mdx#_snippet_9

LANGUAGE: css
CODE:
```
@tailwind base;
@tailwind components;
@tailwind utilities;
```

----------------------------------------

TITLE: Displaying Remotion CLI Help
DESCRIPTION: This command executes the Remotion Command Line Interface (CLI) using `npx` and invokes the `help` command. It outputs a list of all available Remotion commands and global flags, along with their descriptions, directly to the console. This is useful for understanding the available options and how to use the CLI.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cli/help.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion help
```

----------------------------------------

TITLE: Loading Google Fonts with Remotion Package in TypeScript
DESCRIPTION: Demonstrates importing and using the type-safe @remotion/google-fonts loader to retrieve and apply a Google Font in a React component. `@remotion/google-fonts/TitanOne` is required as a dependency, and the snippet expects a React rendering context. The imported `loadFont()` function outputs a CSS font family name, which is then applied inline to a React element. This method eliminates the need for writing manual CSS or handling font loading side-effects.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/fonts.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import { loadFont } from "@remotion/google-fonts/TitanOne";

const { fontFamily } = loadFont();

const GoogleFontsComp: React.FC = () => {
  return <div style={{ fontFamily }}>Hello, Google Fonts</div>;
};
```

----------------------------------------

TITLE: Integrating Remotion Timeline Components (TSX)
DESCRIPTION: Demonstrates the recommended structure for integrating Remotion timeline components in a React/Remotion application. It shows how to wrap the player and timeline with necessary context providers (`TimelineProvider`, `TimelineZoomProvider`, `TimelineSizeProvider`) and the `TimelineContainer` for proper state management, zooming, and sizing.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/timeline/usage.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import type {PlayerRef} from '@remotion/player';
import {Timeline, TimelineContainer} from './timeline/remotion-timeline/components/timeline';
import {TimelineProvider} from './timeline/remotion-timeline/context/provider';
import {TimelineSizeProvider} from './timeline/remotion-timeline/context/timeline-size-provider';
import {TimelineZoomProvider} from './timeline/remotion-timeline/context/timeline-zoom-provider';
import {PreviewContainer} from './layout';

export const App = () => {
  const playerRef = useRef<PlayerRef>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const timelineContainerSize = useElementSize(timelineContainerRef);
  const timelineContainerWidth = timelineContainerSize?.width;

  return (
    <TimelineProvider
      onChange={(newState) => {
        console.log('New timeline state:', newState);
      }}
      initialState={initialState}
    >
      <TimelineZoomProvider initialZoom={1}>
        <PreviewContainer>
          <VideoPreview loop playerRef={playerRef} />
          <ActionRow playerRef={playerRef} />
        </PreviewContainer>

        <TimelineContainer timelineContainerRef={timelineContainerRef}>
          {timelineContainerWidth ? (
            <TimelineSizeProvider containerWidth={timelineContainerWidth}>
              <Timeline playerRef={playerRef} />
            </TimelineSizeProvider>
          ) : null}
        </TimelineContainer>
      </TimelineZoomProvider>
    </TimelineProvider>
  );
};

```

----------------------------------------

TITLE: Rendering a Circle with @remotion/shapes in TSX
DESCRIPTION: This TSX snippet demonstrates how to import and use the `Circle` component from the `@remotion/shapes` library within a Remotion project. It defines a simple composition `MyComposition` that uses `AbsoluteFill` to center content and renders a `Circle` component with specified `radius`, `fill` color, `stroke` color, and `strokeWidth`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/shapes/circle.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { Circle } from "@remotion/shapes";
import { AbsoluteFill } from "remotion";

export const MyComposition = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Circle radius={100} fill="green" stroke="red" strokeWidth={1} />
    </AbsoluteFill>
  );
};
```

----------------------------------------

TITLE: Preloading Video Assets with @remotion/preload in TypeScript/React
DESCRIPTION: This snippet demonstrates how to use the preloadVideo function from the @remotion/preload package to preload a video resource before it is mounted in a React component. Calling preloadVideo returns a function for un-preloading if necessary. The snippet requires the @remotion/preload package, and expects a video URL to be provided. It ensures videos play instantly when they appear in the DOM, optimizing performance in the Remotion Player or Studio context. No component mount required for preloading, and can be cancelled by invoking the returned function.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/preload/preload-video.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import { preloadVideo } from "@remotion/preload";

const unpreload = preloadVideo(
  "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
);

// If you want to un-preload the video later
unpreload();
```

----------------------------------------

TITLE: Using Variables for Font Properties in Text Measurement (TypeScript/React)
DESCRIPTION: This snippet shows how to parameterize font properties (text, fontFamily, fontWeight, fontSize) as variables for both measureText utility invocation and actual rendered markup. This ensures consistent font properties are applied when measuring and displaying the text, reducing the possibility of layout discrepancies. This reusable variable pattern helps maintain congruency across UI and measurement calculations.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/layout-utils/best-practices.mdx#_snippet_4

LANGUAGE: TSX
CODE:
```
import {measureText} from '@remotion/layout-utils';\n\nconst text = 'Hello world';\nconst fontFamily = 'Inter';\nconst fontWeight = 'bold';\nconst fontSize = 16;\n\n// Use the variable in the measurement function:\nmeasureText({\n  text,\n  fontFamily,\n  fontWeight,\n  fontSize,\n});\n\n// As well as in markup\n<div style={{fontFamily, fontWeight, fontSize}}>{text}</div>;
```

----------------------------------------

TITLE: Executing 'remotion compositions' Command
DESCRIPTION: This command uses `npx` to execute the `remotion` CLI tool with the `compositions` subcommand. It lists the composition IDs found in the specified `<serve-url>` or `<entry-file>`, or determines the entry point automatically if none is provided. Requires Node.js and Remotion to be available.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/cli/compositions.mdx#_snippet_0

LANGUAGE: bash
CODE:
```
npx remotion compositions <serve-url|entry-file>?
```

----------------------------------------

TITLE: Simulating Transparency for Black Background Video in Remotion using TypeScript
DESCRIPTION: This snippet shows how to embed a video file that does not have an alpha channel but uses a black background meant to be transparent. It employs the `<OffthreadVideo>` component and applies the CSS `mix-blend-mode: 'screen'` style. This blend mode effectively makes black pixels transparent, simulating transparency for videos without an explicit alpha channel.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/videos/transparency.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
import React from 'react';
import {OffthreadVideo, staticFile} from 'remotion';

export const MyComp: React.FC = () => {
  return (
    <OffthreadVideo
      src={staticFile('nottransparent.mp4')}
      style={{
        mixBlendMode: 'screen',
      }}
    />
  );
};
```

----------------------------------------

TITLE: Downloading a Rendered Media File using downloadMedia() in TypeScript
DESCRIPTION: This TypeScript snippet demonstrates how to use the `downloadMedia` function from `@remotion/lambda` to download a rendered file (e.g., video) from an AWS S3 bucket. It specifies the necessary AWS region, bucket name, the unique render ID, and the desired local output path (`out.mp4`). An optional `onProgress` callback is included to log the download progress. The function returns a promise resolving to an object containing the final absolute `outputPath` and the `sizeInBytes` of the downloaded file, which are then logged to the console.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/downloadmedia.mdx#_snippet_0

LANGUAGE: ts
CODE:
```
import {downloadMedia} from '@remotion/lambda';

const {outputPath, sizeInBytes} = await downloadMedia({
  bucketName: 'remotionlambda-r42fs9fk',
  region: 'us-east-1',
  renderId: '8hfxlw',
  outPath: 'out.mp4',
  onProgress: ({totalSize, downloaded, percent}) => {
    console.log(`Download progress: ${totalSize}/${downloaded} bytes (${(percent * 100).toFixed(0)}%)`);
  },
});

console.log(outputPath); // "/Users/yourname/remotion-project/out.mp4"
console.log(sizeInBytes); // 21249541
```

----------------------------------------

TITLE: Premounting a Sequence in Remotion (TypeScript/React)
DESCRIPTION: This snippet demonstrates how to premount a video sequence in Remotion by adding the premountFor prop to the <Sequence> component. Dependencies include 'remotion' with access to Sequence, staticFile, and Video. The key parameter premountFor determines how many frames before appearance the component is mounted; its value (e.g., 100) controls the length of the preloading window. This approach helps assets load in advance and prevents flickering, but should be used sparingly to avoid performance issues from having too many elements mounted.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/premounting.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import {Sequence, staticFile, Video} from 'remotion';

// ---cut---
const MyComp: React.FC = () => {
  return (
    <Sequence premountFor={100}>
      <Video src={staticFile('bigbuckbunny.mp4')}></Video>
    </Sequence>
  );
};
```

----------------------------------------

TITLE: Rendering a Lottie Animation in a Remotion Component (TSX)
DESCRIPTION: This TSX snippet demonstrates the basic usage of the `<Lottie>` component from `@remotion/lottie`. It defines a React functional component `MyAnimation` that imports Lottie animation data from a local JSON file (`animation.json`) and passes it to the `animationData` prop of the `<Lottie>` component to render the animation within a Remotion video.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lottie/lottie-comp.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
import { Lottie } from "@remotion/lottie";
import animationData from "./animation.json";

export const MyAnimation: React.FC = () => {
  return <Lottie animationData={animationData} />;
};
```

----------------------------------------

TITLE: Detecting Fullscreen Changes with Remotion Player in TypeScript/React
DESCRIPTION: Shows how to listen for the 'fullscreenchange' event on a Remotion Player using a `PlayerRef`. The event handler accesses `e.detail.isFullscreen` to log the current fullscreen state when the player enters or exits fullscreen mode. Depends on React and `@remotion/player`.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/api.mdx#_snippet_13

LANGUAGE: tsx
CODE:
```
import {PlayerRef} from '@remotion/player';
import {useRef} from 'react';
const playerRef = useRef<PlayerRef>(null);
if (!playerRef.current) {
  throw new Error();
}
// ---cut---
playerRef.current.addEventListener('fullscreenchange', (e) => {
  console.log('is fullscreen' + e.detail.isFullscreen); // is fullscreen true
});
```

----------------------------------------

TITLE: Avoiding Custom Browser Path via Remotion Config (Best Practice)
DESCRIPTION: Advises against using the `setBrowserExecutable()` configuration option as a best practice, unless strictly necessary. Relying on Remotion's managed Chrome Headless Shell ensures compatibility with the Remotion version used and avoids potential disruptions from automatic Chrome updates or API changes.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/chrome-headless-shell.mdx#_snippet_10

LANGUAGE: typescript
CODE:
```
setBrowserExecutable()
```

----------------------------------------

TITLE: Rendering Media Programmatically using Node.js/Bun (TypeScript/TSX)
DESCRIPTION: Provides a Node.js/Bun script (`render.mjs`) using TypeScript/TSX syntax that renders media programmatically. It imports `renderMedia` and `selectComposition` from `@remotion/renderer`, defines input props, specifies the deployed Studio `serveUrl`, selects the `HelloWorld` composition, and calls `renderMedia` to initiate the render process. Requires the `@remotion/renderer` package.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/studio/deploy-static.mdx#_snippet_4

LANGUAGE: tsx
CODE:
```
const outputLocation = '/path/to/frames';

import {renderMedia, selectComposition} from '@remotion/renderer';

// ---cut---
const inputProps = {
  titleText: 'Hello World',
};

const serveUrl = 'https://remotion-helloworld.vercel.app';

const composition = await selectComposition({
  serveUrl,
  id: 'HelloWorld',
  inputProps,
});

await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  inputProps,
});
```

----------------------------------------

TITLE: Creating a Remotion Remix Project with yarn (Bash)
DESCRIPTION: Provides the command using the `yarn` package manager to initialize a new Remotion project using the specific Remix template. This serves as an alternative to using npm or pnpm for project setup.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2022-11-17-remotion-3-3.mdx#_snippet_9

LANGUAGE: bash
CODE:
```
```bash
yarn create video --remix
```
```

----------------------------------------

TITLE: Implementing a Mute Toggle Button for Remotion Player in React (tsx)
DESCRIPTION: Defines a `MuteButton` React component (tsx) designed to control the mute state of a Remotion player referenced by `playerRef`. It uses `useState` to track the `muted` status, initialized from the player. An `onClick` handler, memoized with `useCallback`, toggles the player's mute state by calling `playerRef.current.mute()` or `playerRef.current.unmute()`. A `useEffect` hook listens for the 'mutechange' event on the player to keep the component's `muted` state synchronized, updating the button's text ('Mute' or 'Unmute') accordingly. No special handling is needed for zero volume, as Remotion treats it as muted.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/custom-controls.mdx#_snippet_7

LANGUAGE: tsx
CODE:
```
import type {PlayerRef} from '@remotion/player';
import React, {useEffect, useState} from 'react';

export const MuteButton: React.FC<{ // tsx(React)
  playerRef: React.RefObject<PlayerRef | null>;
}> = ({playerRef}) => {
  const [muted, setMuted] = useState(playerRef.current?.isMuted() ?? false);

  const onClick = React.useCallback(() => {
    if (!playerRef.current) {
      return;
    }

    if (playerRef.current.isMuted()) {
      playerRef.current.unmute();
    } else {
      playerRef.current.mute();
    }
  }, [playerRef]);

  useEffect(() => {
    const {current} = playerRef;
    if (!current) {
      return;
    }

    const onMuteChange = () => {
      setMuted(current.isMuted());
    };

    current.addEventListener('mutechange', onMuteChange);
    return () => {
      current.removeEventListener('mutechange', onMuteChange);
    };
  }, [playerRef]);

  return (
    <button type="button" onClick={onClick}>
      {muted ? 'Unmute' : 'Mute'}
    </button>
  );
};
```

----------------------------------------

TITLE: Scaffolding a Remotion Project using Yarn
DESCRIPTION: This command utilizes Yarn's `create` command to initialize a new Remotion project via the 'video' template (Remotion's scaffolder). It guides the user through the setup process. Use this command if Yarn is your preferred package manager.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/getting-started.mdx#_snippet_2

LANGUAGE: bash
CODE:
```
```bash title="Use Yarn as the package manager"
yarn create video
```
```

----------------------------------------

TITLE: Bundling Remotion Project Using bundle() in Node.js - TypeScript
DESCRIPTION: This snippet demonstrates how to bundle a Remotion project in a Node.js environment using the bundle() function from the @remotion/bundler package. It imports path for file system handling and invokes bundle() with the entry point to the Remotion source, including an example of passing a webpack override. To run, ensure @remotion/bundler is installed and that your entry point path and any custom webpackOverride are correct. The serveUrl output will point to the bundled build directory, typically used as input for renderMedia().
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/bundle.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import path from 'path';\nimport {bundle} from '@remotion/bundler';\n\nconst serveUrl = await bundle({\n  entryPoint: path.join(process.cwd(), './src/index.ts'),\n  // If you have a webpack override in remotion.config.ts, pass it here as well.\n  webpackOverride: (config) => config,\n});
```

----------------------------------------

TITLE: Downloading and Parsing Media with Metadata Extraction - @remotion/media-parser - TypeScript
DESCRIPTION: Demonstrates downloading a remote media file using downloadAndParseMedia while simultaneously extracting key metadata fields such as the durationInSeconds and available tracks. Requires the @remotion/media-parser and @remotion/media-parser/node-writer modules. The src parameter specifies the remote media URL, writer handles the file output location, and fields determines which metadata to extract. Returns an object with the selected metadata upon successful completion.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/media-parser/download-and-parse.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import {downloadAndParseMedia} from '@remotion/media-parser';
import {nodeWriter} from '@remotion/media-parser/node-writer';

const {durationInSeconds, tracks} = await downloadAndParseMedia({
  src: 'https://s3.amazonaws.com/bucket/uploaded-asset.mp4',
  writer: nodeWriter('output.mp4'),
  fields: {
    durationInSeconds: true,
    tracks: true,
  },
});
// If here was reached, file is downloaded!
console.log(durationInSeconds);
console.log(tracks);
```

----------------------------------------

TITLE: Using getLottieMetadata to Extract Lottie Animation Info (TSX)
DESCRIPTION: This TSX snippet demonstrates how to use the `getLottieMetadata` function from `@remotion/lottie` to parse Lottie animation data. It defines sample animation data (a complex JavaScript object adhering to the Lottie schema) in one file and imports it along with the function in another. Calling `getLottieMetadata` with the data returns an object containing the animation's width, height, duration (in frames and seconds), and frames per second (fps). The expected output structure is shown in a comment. The function requires a JavaScript object representing the Lottie animation data as input.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lottie/getlottiemetadata.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
// @allowUmdGlobalAccess
// @filename: animation.ts
export const animationData = {
  v: "5.9.6",
  fr: 29.9700012207031,
  ip: 0,
  op: 90.0000036657751,
  w: 1920,
  h: 1080,
  nm: "Comp 1",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Shape Layer 1",
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: {
          a: 1,
          k: [
            {
              i: { x: [0.833], y: [0.833] },
              o: { x: [0.167], y: [0.167] },
              t: 0,
              s: [360],
            },
            { t: 58.0000023623884, s: [0] },
          ],
          ix: 10,
        },
        p: {
          a: 1,
          k: [
            {
              i: { x: 0.833, y: 0.833 },
              o: { x: 0.167, y: 0.167 },
              t: 0,
              s: [979.401, 1368, 0],
              to: [0, -138, 0],
              ti: [0, 138, 0],
            },
            { t: 58.0000023623884, s: [979.401, 540, 0] },
          ],
          ix: 2,
          l: 2,
        },
        a: { a: 0, k: [517.365, 112.096, 0], ix: 1, l: 2 },
        s: { a: 0, k: [100, 100, 100], ix: 6, l: 2 },
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "rc",
              d: 1,
              s: { a: 0, k: [425.883, 425.883], ix: 2 },
              p: { a: 0, k: [0, 0], ix: 3 },
              r: { a: 0, k: 98, ix: 4 },
              nm: "Rectangle Path 1",
              mn: "ADBE Vector Shape - Rect",
              hd: false,
            },
            {
              ty: "st",
              c: { a: 0, k: [1, 1, 1, 1], ix: 3 },
              o: { a: 0, k: 100, ix: 4 },
              w: { a: 0, k: 2, ix: 5 },
              lc: 1,
              lj: 1,
              ml: 4,
              bm: 0,
              nm: "Stroke 1",
              mn: "ADBE Vector Graphic - Stroke",
              hd: false,
            },
            {
              ty: "fl",
              c: { a: 0, k: [0, 0.468933612108, 1, 1], ix: 4 },
              o: { a: 0, k: 100, ix: 5 },
              r: 1,
              bm: 0,
              nm: "Fill 1",
              mn: "ADBE Vector Graphic - Fill",
              hd: false,
            },
            {
              ty: "tr",
              p: { a: 0, k: [494.618, 123.481], ix: 2 },
              a: { a: 0, k: [0, 0], ix: 1 },
              s: { a: 0, k: [100, 100], ix: 3 },
              r: { a: 0, k: 0, ix: 6 },
              o: { a: 0, k: 100, ix: 7 },
              sk: { a: 0, k: 0, ix: 4 },
              sa: { a: 0, k: 0, ix: 5 },
              nm: "Transform",
            },
          ],
          nm: "Rectangle 2",
          np: 3,
          cix: 2,
          bm: 0,
          ix: 1,
          mn: "ADBE Vector Group",
          hd: false,
        },
      ],
      ip: 0,
      op: 90.0000036657751,
      st: 0,
      ct: 1,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 1,
      nm: "White Solid 1",
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [960, 540, 0], ix: 2, l: 2 },
        a: { a: 0, k: [960, 540, 0], ix: 1, l: 2 },
        s: { a: 0, k: [100, 100, 100], ix: 6, l: 2 },
      },
      ao: 0,
      sw: 1920,
      sh: 1080,
      sc: "#ffffff",
      ip: 0,
      op: 90.0000036657751,
      st: 0,
      bm: 0,
    },
  ],
  markers: [],
};

// @filename: Animation.tsx
import { animationData } from "./animation";

// ---cut---
import { getLottieMetadata } from "@remotion/lottie";

// animationData is a JSON object, can be imported from a .json file, remote file or using staticFile()
const metadata = getLottieMetadata(animationData);

/*
{
  durationInFrames: 90,
  durationInSeconds: 3.0030030030030037,
  fps: 29.9700012207031,
  height: 1080,
  width: 1920,
}
*/
```

----------------------------------------

TITLE: Using useVideoTexture Hook to Create Three.js VideoTexture - TypeScript/TSX
DESCRIPTION: This snippet shows how to use the useVideoTexture hook from @remotion/three to convert an existing HTMLVideoElement ref into a THREE.VideoTexture, suitable for use in Three.js materials. The key dependency is the useVideoTexture hook, and the input is a React ref to the video element. The expected output is a THREE.VideoTexture or null if the video is not ready. Ensure that the hook is called in the same component where the ref was created.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/use-video-texture.mdx#_snippet_1

LANGUAGE: tsx
CODE:
```
const videoRef: React.MutableRefObject<HTMLVideoElement | null> =
  React.useRef(null);
// ---cut---
import { useVideoTexture } from "@remotion/three";

// ...

const texture = useVideoTexture(videoRef);
```

----------------------------------------

TITLE: Installing Remotion Dependencies using pnpm (Bash)
DESCRIPTION: Installs Remotion core, player, CLI, React, ReactDOM as main dependencies, and associated TypeScript types and the Vite React plugin as development dependencies using the pnpm package manager.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/vue.mdx#_snippet_1

LANGUAGE: bash
CODE:
```
pnpm i remotion @remotion/player @remotion/cli react react-dom
pnpm i --dev @types/react @types/react-dom @vitejs/plugin-react
```

----------------------------------------

TITLE: Implementing a Continuous Loop in Remotion (TSX)
DESCRIPTION: Shows how to create a continuous (infinite) loop using the Remotion <Loop> component. By providing only the durationInFrames prop (set to 50), the loop defaults to repeating indefinitely. The BlueSquare component is rendered within the loop.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/loop.mdx#_snippet_3

LANGUAGE: tsx
CODE:
```
```tsx twoslash
// @include: example-BlueSquare
import { Loop } from "remotion";
// ---cut---
const MyComp = () => {
  return (
    <Loop durationInFrames={50}>
      <BlueSquare />
    </Loop>
  );
};
```
```

----------------------------------------

TITLE: Conditionally Rendering meshBasicMaterial with VideoTexture - TypeScript/TSX
DESCRIPTION: This snippet demonstrates conditional rendering of a Three.js mesh material in React, only when a valid video texture has been created. By checking if videoTexture is not null, it ensures that meshBasicMaterial does not receive an uninitialized texture map, avoiding rendering bugs. Dependencies include React, @remotion/three, meshBasicMaterial from Three.js, and the useVideoTexture-generated texture; the input is the videoTexture and the output is a meshBasicMaterial component with a map prop.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/use-video-texture.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
import { useVideoTexture } from "@remotion/three";
const videoRef: React.MutableRefObject<HTMLVideoElement | null> =
  React.useRef(null);
const videoTexture = useVideoTexture(videoRef);
// ---cut---
{
  videoTexture ? <meshBasicMaterial map={videoTexture} /> : null;
}
```

----------------------------------------

TITLE: Styling the Remotion Player Width in React (TypeScript/TSX)
DESCRIPTION: This code snippet demonstrates setting the width of the Remotion Player component to 100% using a React style prop. The approach ensures the video fills the parent container's width while its height maintains the aspect ratio defined by the Player's other parameters. No external dependencies are required aside from React and Remotion. Key parameter: the style prop with a width of '100%'. The input is a React component; the output is a player component that dynamically fits its container's width.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/scaling.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
style={{ width: "100%" }}
```

----------------------------------------

TITLE: Registering a Combined Remotion Composition in TSX
DESCRIPTION: This snippet updates the `Root` component to include the newly created `Main` component as a Remotion composition. It is registered alongside the original `One` and `Two` compositions using the `<Composition>` tag. The `durationInFrames` for the `Main` composition reflects the combined duration of its sequenced components.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/miscellaneous/snippets/combine-compositions.mdx#_snippet_2

LANGUAGE: tsx
CODE:
```
// @filename: One.tsx
import React from "react";
export const One: React.FC = () => {
  return <div>One</div>;
};

// @filename: Two.tsx
import React from "react";
export const Two: React.FC = () => {
  return <div>Two</div>;
};

// @filename: Main.tsx
import React from "react";
export const Main: React.FC = () => {
  return <div>Main</div>;
};

// @filename: Root.tsx
// ---cut---
import React from "react";
import { Composition } from "remotion";
import { One } from "./One";
import { Two } from "./Two";
import { Main } from "./Main";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="One"
        component={One}
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={120}
      />
      <Composition
        id="Two"
        component={Two}
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={120}
      />
      <Composition
        id="Main"
        component={Main}
        width={1080}
        height={1080}
        fps={30}
        durationInFrames={240} // Sum of One and Two durations
      />
    </>
  );
};
```

----------------------------------------

TITLE: Correct Usage: Passing Component Directly to Player in Remotion (TypeScript)
DESCRIPTION: This snippet demonstrates the correct pattern for using the Remotion <Player> by passing the target component (AnotherComp) directly to the component prop of Player, instead of wrapping it in a <Composition>. Only video parameters are provided alongside the component, and no Composition component is mounted within. Dependencies: @remotion/player. Expected parameters are duration, fps, width, height, and the component. Input is the component to be played, and output is a correctly configured Remotion Player instance.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/wrong-composition-mount.mdx#_snippet_2

LANGUAGE: TypeScript
CODE:
```
import { Player } from "@remotion/player";

const AnotherComp: React.FC = () => {
  return null;
};

// ---cut---

const Index: React.FC = () => {
  return (
    <Player
      durationInFrames={300}
      fps={30}
      compositionWidth={1080}
      compositionHeight={1080}
      component={AnotherComp}
    />
  );
};
```

----------------------------------------

TITLE: Triggering Remotion Lambda Render from Supabase Edge Function - TypeScript
DESCRIPTION: Provides a complete example of a Supabase Edge Function in TypeScript/TSX that triggers a Remotion Lambda render using renderMediaOnLambda from @remotion/lambda-client. Expects AWS credentials from the environment, and receives input props via POSTed JSON. Returns the Lambda response as JSON; errors are logged and returned with a 500 status. The functionName is dynamically constructed (speculateFunctionName), with placeholders for memory, disk, timeout, and AWS region—these should be customized. Dependencies: @remotion/lambda-client (v4.0.265), Deno runtime, AWS credentials.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/supabase.mdx#_snippet_2

LANGUAGE: typescript
CODE:
```
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
// FIXME: Replace 4.0.265 with the version of Remotion you are using.
import {renderMediaOnLambda} from 'npm:@remotion/lambda-client@4.0.265';

Deno.serve(async (req) => {
  const {props} = await req.json();

  try {
    const response = await renderMediaOnLambda({
      serveUrl: 'https://remotion-helloworld.vercel.app',
      composition: 'HelloWorld',
      codec: 'h264',
      // FIXME: Replace with your AWS region
      region: 'eu-central-1',
      // FIXME: Add your function specs here
      functionName: speculateFunctionName({
        memorySizeInMb: 2048,
        diskSizeInMb: 2048,
        timeoutInSeconds: 120,
      }),
      inputProps: props,
    });

    return new Response(JSON.stringify(response), {headers: {'Content-Type': 'application/json'}});
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({error: (error as Error).message}), {headers: {'Content-Type': 'application/json'}, status: 500});
  }
});

```

----------------------------------------

TITLE: Defining Remotion Composition with Default Props - TypeScript
DESCRIPTION: This snippet defines a React component that renders a Remotion `Composition`. It configures the composition with specific dimensions, frame rate, duration, a schema, and a variety of default props including strings, numbers, arrays, objects, and union types to demonstrate schema usage.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/studio-server/src/test/snapshots/problematic.txt#_snippet_0

LANGUAGE: TypeScript
CODE:
```
export const Index: React.FC = () => {
	return (
		<>
			<Composition
				id="schema-test"
				component={SchemaTest}
				width={1200}
				height={630}
				fps={30}
				durationInFrames={150}
				schema={schemaTestSchema}
				defaultProps={{
					title: 'sdasds',
					delay: 5.2,
					color: '#df822a',
					matrix: [0, 1, 1, 0],
					list: [{name: 'first', age: 12}],
					description: 'Sample description \nOn multiple lines',
					dropdown: 'a' as const,
					superSchema: [
						{type: 'a' as const, a: {a: 'hi'}},
						{type: 'b' as const, b: {b: 'hi'}},
					],
				}}
			/>
		</>
	);
};
```

----------------------------------------

TITLE: Rendering and Configuring GIFs with Remotion <Gif> Component in TypeScript React
DESCRIPTION: This TypeScript React snippet demonstrates how to import and render the <Gif> component from the @remotion/gif package within a Remotion project. It shows how to synchronize the GIF's playback with the Remotion video context, pass key props including width, height, src, fit, playbackRate, and attach a React ref typed as HTMLCanvasElement. Dependencies include react, remotion, and @remotion/gif. The required inputs are the GIF URL and the video configuration provided by useVideoConfig, while optional props control playback, sizing, and looping behavior. The output is a rendered GIF on a canvas synchronized with Remotion's frame timeline. This approach enables GIFs to integrate seamlessly into custom Remotion video compositions and supports advanced props for extended control.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/gif/gif.mdx#_snippet_0

LANGUAGE: typescript
CODE:
```
import {useRef} from 'react';\nimport {useVideoConfig} from 'remotion';\n// ---cut---\nimport {Gif} from '@remotion/gif';\n\nexport const MyComponent: React.FC = () => {\n  const {width, height} = useVideoConfig();\n  const ref = useRef<HTMLCanvasElement>(null);\n\n  return (\n    <Gif\n      ref={ref}\n      src=\"https://media.giphy.com/media/3o72F7YT6s0EMFI0Za/giphy.gif\"\n      width={width}\n      height={height}\n      fit=\"fill\"\n      playbackRate={2}\n    />\n  );\n};
```

----------------------------------------

TITLE: Demoing Drag-and-Drop Layers with Remotion Player in TypeScript
DESCRIPTION: This snippet defines a React component that serves as a fully functional demo of a drag-and-drop, resizable layer system, integrating with Remotion's Player. It establishes initial item state, manages selection, and builds change mechanisms with useCallback and useMemo, then passes structured props to the Main component rendered inside the Remotion <Player>. Dependencies include React, Remotion's Player, and the previously defined Main component and types; inputProps shape is critical for correct behavior. Inputs are initial item arrays and outputs are visual, interactive demo compositions.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/drag-and-drop/index.mdx#_snippet_8

LANGUAGE: tsx
CODE:
```
import {Player} from '@remotion/player';\nimport React, {useCallback, useMemo, useState} from 'react';\nimport type {MainProps} from './Main';\nimport {Main} from './Main';\nimport type {Item} from './item';\n\nexport const DragAndDropDemo: React.FC = () => {\n  const [items, setItems] = useState<Item[]>([\n    {\n      left: 395,\n      top: 270,\n      width: 540,\n      durationInFrames: 100,\n      from: 0,\n      height: 540,\n      id: 0,\n      color: '#ccc',\n      isDragging: false,\n    },\n    {\n      left: 985,\n      top: 270,\n      width: 540,\n      durationInFrames: 100,\n      from: 0,\n      height: 540,\n      id: 1,\n      color: '#ccc',\n      isDragging: false,\n    },\n  ]);\n  const [selectedItem, setSelectedItem] = useState<number | null>(null);\n\n  const changeItem = useCallback(\n    (itemId: number, updater: (item: Item) => Item) => {\n      setItems((oldItems) => {\n        return oldItems.map((item) => {\n          if (item.id === itemId) {\n            return updater(item);\n          }\n\n          return item;\n        });\n      });\n    },\n    [],\n  );\n\n  const inputProps: MainProps = useMemo(() => {\n    return {\n      items,\n      setSelectedItem,\n      changeItem,\n      selectedItem,\n    };\n  }, [changeItem, items, selectedItem]);\n\n  return (\n    <Player\n      style={{\n        width: '100%',\n      }}\n      component={Main}\n      compositionHeight={1080}\n      compositionWidth={1920}\n      durationInFrames={300}\n      fps={30}\n      inputProps={inputProps}\n      overflowVisible\n    />\n  );\n};
```

----------------------------------------

TITLE: Prefetching Video Assets with Remotion prefetch() API (TypeScript/TSX)
DESCRIPTION: Demonstrates how to use the prefetch() function from the Remotion library to asynchronously load a remote video asset, ensuring it is fully cached before playback in a <Player> component. The snippet outlines the import, basic usage with the 'blob-url' method, waiting for the asset to finish loading, and how to free loaded resources. Dependencies include the 'remotion' library and requires network access to the asset URL. The function returns an object with 'free' and 'waitUntilDone' methods; 'waitUntilDone' resolves to a downloadable URL, while 'free' releases held memory. This approach is suitable for scenarios where media must be available immediately after player initialization.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/prefetch.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import {prefetch} from 'remotion';

const {free, waitUntilDone} = prefetch('https://example.com/video.mp4', {
  method: 'blob-url',
});

waitUntilDone().then(() => {
  console.log('Video has finished loading');
});

// Call free() if you want to un-prefetch and free up the memory:
free();
```

----------------------------------------

TITLE: Initializing a Remotion Project with NPM (Shell)
DESCRIPTION: This shell command uses `npm init` with the `video` initializer (Remotion's shorthand) to create a new Remotion project structure, automatically setting it up to use NPM for dependency management. It simplifies the project setup process for users preferring NPM.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/blog/2021-05-06-remotion-2-1.mdx#_snippet_0

LANGUAGE: shell
CODE:
```
npm init video
```

----------------------------------------

TITLE: Rendering a Video Locally with Remotion CLI (Shell)
DESCRIPTION: Uses the Remotion CLI via `npx` to render the defined video composition(s) locally. This command generates the actual video file(s) based on the project's code.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/template-next-app/README.md#_snippet_4

LANGUAGE: shell
CODE:
```
npx remotion render
```

----------------------------------------

TITLE: Calculating Text Dimensions with Remotion Layout Utils in TypeScript
DESCRIPTION: Demonstrates importing and invoking the measureText function from @remotion/layout-utils to calculate text width and height in a browser environment. Requires installation of @remotion/layout-utils as a dependency and access to the DOM (will not work in Node.js or Bun). The parameters such as text, fontFamily, fontWeight, fontSize, and letterSpacing must be provided, and the function returns an object with height and width. Result is cached for identical inputs, and developers should ensure all fonts are loaded before measurement for accuracy.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/layout-utils/measure-text.mdx#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import {measureText} from '@remotion/layout-utils';\n\nconst text = 'remotion';\nconst fontFamily = 'Arial';\nconst fontWeight = '500';\nconst fontSize = 12;\nconst letterSpacing = '1px';\n\nmeasureText({\n  text,\n  fontFamily,\n  fontWeight,\n  fontSize,\n  letterSpacing,\n}); // { height: 14, width: 20 }
```

----------------------------------------

TITLE: Implementing Basic <IFrame> Usage in Remotion with TypeScript
DESCRIPTION: This TypeScript React code snippet demonstrates the basic usage of the `<IFrame>` component imported from the 'remotion' library. It defines a functional component `MyComp` that renders an iframe element, setting its source URL to "https://remotion.dev" via the `src` prop. Remotion automatically wraps this component to delay rendering until the iframe content is loaded.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/iframe.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
```tsx twoslash
import { IFrame } from "remotion";

export const MyComp: React.FC = () => {
  return <IFrame src="https://remotion.dev" />;
};
```
```

----------------------------------------

TITLE: Managing Item Selection and Resize Outlines – Remotion/React – TypeScript
DESCRIPTION: Implements a SelectionOutline React component to visually outline and enable item selection, hovering, and movement using Remotion's scale and pointer events. It renders resize handles (through ResizeHandle) when the item is selected and processes drag operations to move the item or change its selected state. Dependencies include React, Remotion (useCurrentScale), the ResizeHandle component, and the Item type. Inputs include callbacks for item modification and selection state. Outputs are an absolutely positioned div that handles dragging and hover outlines, limited to rectangular selections and four-corner resizing.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/player/drag-and-drop/index.mdx#_snippet_5

LANGUAGE: tsx
CODE:
```
import React, {useCallback, useMemo} from 'react';
import {useCurrentScale} from 'remotion';

import {ResizeHandle} from './ResizeHandle';
import type {Item} from './item';

export const SelectionOutline: React.FC<{
	item: Item;
	changeItem: (itemId: number, updater: (item: Item) => Item) => void;
	setSelectedItem: React.Dispatch<React.SetStateAction<number | null>>;
	selectedItem: number | null;
	isDragging: boolean;
}> = ({item, changeItem, setSelectedItem, selectedItem, isDragging}) => {
	const scale = useCurrentScale();
	const scaledBorder = Math.ceil(2 / scale);

	const [hovered, setHovered] = React.useState(false);

	const onMouseEnter = useCallback(() => {
		setHovered(true);
	}, []);

	const onMouseLeave = useCallback(() => {
		setHovered(false);
	}, []);

	const isSelected = item.id === selectedItem;

	const style: React.CSSProperties = useMemo(() => {
		return {
			width: item.width,
			height: item.height,
			left: item.left,
			top: item.top,
			position: 'absolute',
			outline:
				(hovered && !isDragging) || isSelected
					? `${scaledBorder}px solid #0B84F3`
					: undefined,
			userSelect: 'none',
			touchAction: 'none',
		};
	}, [item, hovered, isDragging, isSelected, scaledBorder]);

	const startDragging = useCallback(
		(e: PointerEvent | React.MouseEvent) => {
			const initialX = e.clientX;
			const initialY = e.clientY;

			const onPointerMove = (pointerMoveEvent: PointerEvent) => {
				const offsetX = (pointerMoveEvent.clientX - initialX) / scale;
				const offsetY = (pointerMoveEvent.clientY - initialY) / scale;
				changeItem(item.id, (i) => {
					return {
						...i,
						left: Math.round(item.left + offsetX),
						top: Math.round(item.top + offsetY),
						isDragging: true,
					};
				});
			};

			const onPointerUp = () => {
				changeItem(item.id, (i) => {
					return {
						...i,
						isDragging: false,
					};
				});
				window.removeEventListener('pointermove', onPointerMove);
			};

			window.addEventListener('pointermove', onPointerMove, {passive: true});

			window.addEventListener('pointerup', onPointerUp, {
				once: true,
			});
		},
		[item, scale, changeItem],
	);

	const onPointerDown = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (e.button !== 0) {
				return;
			}

			setSelectedItem(item.id);
			startDragging(e);
		},
		[item.id, setSelectedItem, startDragging],
	);

	return (
		<div
			onPointerDown={onPointerDown}
			onPointerEnter={onMouseEnter}
			onPointerLeave={onMouseLeave}
			style={style}
		>
			{isSelected ? (
				<>
					<ResizeHandle item={item} setItem={changeItem} type="top-left" />
					<ResizeHandle item={item} setItem={changeItem} type="top-right" />
					<ResizeHandle item={item} setItem={changeItem} type="bottom-left" />
					<ResizeHandle item={item} setItem={changeItem} type="bottom-right" />
				</>
			) : null}
		</div>
	);
};
```

----------------------------------------

TITLE: Triggering Remotion Lambda Video Render from Python
DESCRIPTION: This snippet initializes the RemotionClient using environment variables, sets up a video rendering request with specific parameters (composition, privacy, image format, and input properties), and polls for render status until completion. It demonstrates using the render_media_on_lambda API, handling credentials, and checking real-time progress. Requires the remotion-lambda package (same version as remotion) and dotenv for env loading; expects REMOTION_APP_REGION, REMOTION_APP_FUNCTION_NAME, and REMOTION_APP_SERVE_URL environment variables. Input parameters include composition name, privacy level, image format, and input_props payload; outputs include the render ID, bucket name, and URL to the final video file. There's a limitation with large input_props (>200KB not supported).
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lambda/python.mdx#_snippet_0

LANGUAGE: python
CODE:
```
from remotion_lambda import RenderMediaParams, Privacy, ValidStillImageFormats
from remotion_lambda import RemotionClient
import os
from dotenv import load_dotenv


load_dotenv()

# Load env variables
REMOTION_APP_REGION = os.getenv('REMOTION_APP_REGION')
if not REMOTION_APP_REGION:
    raise Exception("REMOTION_APP_REGION is not set")

REMOTION_APP_FUNCTION_NAME = os.getenv('REMOTION_APP_FUNCTION_NAME')
if not REMOTION_APP_FUNCTION_NAME:
    raise Exception("REMOTION_APP_FUNCTION_NAME is not set")

REMOTION_APP_SERVE_URL = os.getenv('REMOTION_APP_SERVE_URL')
if not REMOTION_APP_SERVE_URL:
    raise Exception("REMOTION_APP_SERVE_URL is not set")

# Construct client
client = RemotionClient(region=REMOTION_APP_REGION,
                        serve_url=REMOTION_APP_SERVE_URL,
                        function_name=REMOTION_APP_FUNCTION_NAME)

# Set render request
render_params = RenderMediaParams(
    composition="react-svg",
    privacy=Privacy.PUBLIC,
    image_format=ValidStillImageFormats.JPEG,
    input_props={
        'hi': 'there'
    },
)

render_response = client.render_media_on_lambda(render_params)
if render_response:
    # Execute render request

    print("Render ID:", render_response.render_id)
    print("Bucket name:", render_response.bucket_name)

    # Execute progress request
    progress_response = client.get_render_progress(
        render_id=render_response.render_id, bucket_name=render_response.bucket_name)

    while progress_response and not progress_response.done:
        print("Overall progress")
        print(str(progress_response.overallProgress * 100) + "%")
        progress_response = client.get_render_progress(
            render_id=render_response.render_id, bucket_name=render_response.bucket_name)
    print("Render done!", progress_response.outputFile)
```

----------------------------------------

TITLE: Using Easing.bezier with interpolate in Remotion (TSX)
DESCRIPTION: This React functional component demonstrates how to use Remotion's `interpolate` function with a custom `Easing.bezier` curve. It animates the `scale` transform of an `AbsoluteFill` element based on the current frame, clamping the interpolation output between 0 and 1.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/easing.mdx#_snippet_0

LANGUAGE: tsx
CODE:
```
import { AbsoluteFill, useCurrentFrame } from "remotion";
// ---cut---
import { Easing, interpolate } from "remotion";

const MyVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const interpolated = interpolate(frame, [0, 100], [0, 1], {
    easing: Easing.bezier(0.8, 0.22, 0.96, 0.65),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${interpolated})`,
        backgroundColor: "red",
      }}
    />
  );
};
```

----------------------------------------

TITLE: Loading Remote Lottie Animation with Remotion in TypeScript/React
DESCRIPTION: This snippet demonstrates how to asynchronously fetch a Lottie animation JSON from a public URL and render it in a Remotion composition using React. It utilizes Remotion's delayRender, continueRender, and cancelRender functions for controlled rendering, and manages the LottieAnimationData state. The animation renders only after the data fetch succeeds; errors during loading are handled with cancelRender. Prerequisites: Remotion, @remotion/lottie, and a CORS-enabled Lottie animation JSON resource. Input: a remote JSON animation URL. Output: the rendered Lottie component, with null returned until data is ready.
SOURCE: https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/lottie/lottie-remote.mdx#_snippet_0

LANGUAGE: TSX
CODE:
```
import { Lottie, LottieAnimationData } from "@remotion/lottie";
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";

const Balloons = () => {
  const [handle] = useState(() => delayRender("Loading Lottie animation"));

  const [animationData, setAnimationData] =
    useState<LottieAnimationData | null>(null);

  useEffect(() => {
    fetch("https://assets4.lottiefiles.com/packages/lf20_zyquagfl.json")
      .then((data) => data.json())
      .then((json) => {
        setAnimationData(json);
        continueRender(handle);
      })
      .catch((err) => {
        cancelRender(err);
      });
  }, [handle]);

  if (!animationData) {
    return null;
  }

  return <Lottie animationData={animationData} />;
};
```