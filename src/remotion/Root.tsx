// src/remotion/Root.tsx
import { Composition } from "remotion";
import { DynamicVideo } from "./compositions/DynamicVideo";
import { inputPropsSchema } from "~/lib/types/video/input-props";
import type { InputProps } from "~/lib/types/video/input-props";
import "../index.css";

// Sample default props for DynamicVideo
const defaultDynamicProps: InputProps = {
  meta: {
    duration: 150,
    title: "Sample Dynamic Video",
  },
  scenes: [
    {
      id: "7c5836d3-5e87-4a0f-87a5-c34b5a6d9012",
      type: "custom",
      start: 0,
      duration: 60,
      data: {
        componentId: "demo-component",
        name: "Welcome Scene",
      },
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
    </>
  );
};