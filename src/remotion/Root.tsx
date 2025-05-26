// src/remotion/Root.tsx
import { Composition } from "remotion";
import { Main } from "./MyComp/Main";
import {
  COMP_NAME,
  defaultMyCompProps,
  DURATION_IN_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  defaultDemoProps,
} from "../types/remotion-constants";
import { BazaarLogo } from "./MyComp/Logo";
import "../index.css";
import { Rings } from "./MyComp/Rings";
import { DemoTimeline } from "./compositions/DemoTimeline";
import { DynamicVideo } from "./compositions/DynamicVideo";
import { inputPropsSchema } from "../types/input-props";
import type { InputProps } from "../types/input-props";
import { TailwindTest } from "./components/TailwindTest";

// Sample default props for DynamicVideo
const defaultDynamicProps: InputProps = {
  meta: {
    duration: 150,
    title: "Sample Dynamic Video",
  },
  scenes: [
    {
      id: "7c5836d3-5e87-4a0f-87a5-c34b5a6d9012",
      type: "text",
      start: 0,
      duration: 60,
      data: {
        text: "Welcome to Bazaar-Vid",
        color: "#FFFFFF",
        fontSize: 70,
        backgroundColor: "#000000",
      },
    },
    {
      id: "9a7b6c5d-4e3f-2d1c-0b9a-8f7e6d5c4b3a",
      type: "image",
      start: 45,
      duration: 60,
      data: {
        src: "/demo.jpg",
        fit: "cover",
      },
    },
    {
      id: "1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p",
      type: "text",
      start: 105,
      duration: 45,
      data: {
        text: "Created with Bazaar-Vid",
        color: "#FFFFFF",
        fontSize: 50,
        backgroundColor: "#000000",
      },
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={COMP_NAME}
        component={Main}
        durationInFrames={DURATION_IN_FRAMES}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultMyCompProps}
      />
      <Composition
        id="BazaarLogo"
        component={BazaarLogo}
        durationInFrames={300}
        fps={30}
        width={140}
        height={140}
        defaultProps={{
          outProgress: 0,
        }}
      />
      <Composition
        id="Demo"
        component={DemoTimeline}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultDemoProps}
      />
      <Composition
        id="DynamicVideo"
        component={DynamicVideo}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultDynamicProps}
        schema={inputPropsSchema}
      />
      <Composition
        id="TailwindTest"
        component={TailwindTest}
        durationInFrames={90}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{}}
      />
    </>
  );
};