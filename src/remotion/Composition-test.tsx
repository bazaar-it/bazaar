// src/remotion/Composition.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import React from "react";

/**
 * Simple animated title so the <Player> is never blank.
 * Removes automatically once you wire real footage.
 */
export const StaticPreview: React.FC = () => {
  const frame          = useCurrentFrame();
  const { fps }        = useVideoConfig();
  const opacity        = Math.min(1, frame / (1 * fps)); // fade-in over 1s

  return (
    <AbsoluteFill className="items-center justify-center bg-slate-800 text-white">
      <h1 style={{ fontSize: 72, fontWeight: 700, opacity }}>
        Bazaar-Vid
      </h1>
      <p style={{ opacity, transition: "opacity 0.4s" }}>
        Frame {frame.toString().padStart(3, "0")}
      </p>
    </AbsoluteFill>
  );
};