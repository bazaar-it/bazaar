// src/components/client/Timeline/TimelineCounter.tsx
"use client";

import React, { useMemo } from "react";
import { useTimeline } from "./TimelineContext";

function formatSeconds(frames: number): string {
  const secs = frames / 30;
  return secs.toFixed(2); // 2 decimals for counter clarity
}

const TimelineCounter: React.FC = () => {
  const { currentFrame, durationInFrames, timeUnit = "frames" } = useTimeline();

  const leftStr = useMemo(() => {
    return timeUnit === "seconds" ? formatSeconds(currentFrame) : String(currentFrame);
  }, [currentFrame, timeUnit]);

  const rightStr = useMemo(() => {
    return timeUnit === "seconds" ? formatSeconds(durationInFrames) : String(durationInFrames);
  }, [durationInFrames, timeUnit]);

  // Compute stable column widths so the counter has a fixed total width
  // and the slash stays anchored. Use the maximum widths across units
  // using total duration as an upper bound for current values.
  const leftMaxCh = useMemo(() => {
    const secLen = formatSeconds(durationInFrames).length; // includes decimals
    const frmLen = String(durationInFrames).length;
    return Math.max(secLen, frmLen);
  }, [durationInFrames]);
  const rightMaxCh = useMemo(() => {
    const secLen = formatSeconds(durationInFrames).length;
    const frmLen = String(durationInFrames).length;
    return Math.max(secLen, frmLen);
  }, [durationInFrames]);
  const totalWidthCh = leftMaxCh + 1 + rightMaxCh;

  return (
    <div
      className="relative inline-block text-xs text-gray-700 dark:text-gray-200 font-mono"
      style={{ width: `${totalWidthCh}ch` }}
    >
      {/* Left value: right-aligned to the slash anchor */}
      <span
        className="inline-block text-right align-middle tabular-nums"
        style={{ width: `${leftMaxCh}ch` }}
      >
        {leftStr}
      </span>
      {/* Slash: hard-anchored at a constant position */}
      <span
        className="absolute top-0 bottom-0 flex items-center justify-center opacity-70"
        style={{ left: `${leftMaxCh}ch`, width: `1ch` }}
        aria-hidden
      >
        /
      </span>
      {/* Right value starts after the slash */}
      <span
        className="inline-block align-middle tabular-nums"
        style={{ marginLeft: `calc(${leftMaxCh}ch + 1ch)`, width: `${rightMaxCh}ch` }}
      >
        {rightStr}
      </span>
    </div>
  );
};

export default TimelineCounter;
