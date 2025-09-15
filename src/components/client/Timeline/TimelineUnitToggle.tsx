// src/components/client/Timeline/TimelineUnitToggle.tsx
"use client";

import React from "react";
import { Clock, Film } from "lucide-react";
import { useTimeline } from "./TimelineContext";

const TimelineUnitToggle: React.FC = () => {
  const { timeUnit = "frames", setTimeUnit } = useTimeline();

  const isSeconds = timeUnit === "seconds";

  return (
    <div
      className="relative inline-flex h-8 items-center rounded-md border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur px-1 overflow-hidden"
      role="tablist"
      aria-label="Time unit toggle"
    >
      {/* Sliding highlight */}
      <div
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-sm bg-gray-200 dark:bg-gray-800 transition-transform duration-200 ease-out will-change-transform"
        style={{ transform: isSeconds ? "translateX(0)" : "translateX(100%)" }}
        aria-hidden
      />
      <button
        type="button"
        role="tab"
        aria-selected={isSeconds}
        title="Seconds"
        aria-label="Seconds"
        className={`relative z-10 mx-1 flex h-6 w-8 items-center justify-center rounded-sm text-gray-700 dark:text-gray-200 ${
          isSeconds ? "opacity-100" : "opacity-70 hover:opacity-90"
        }`}
        onClick={() => setTimeUnit && setTimeUnit("seconds")}
      >
        <Clock className="w-3.5 h-3.5" />
        <span className="sr-only">Seconds</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={!isSeconds}
        title="Frames"
        aria-label="Frames"
        className={`relative z-10 mx-1 flex h-6 w-8 items-center justify-center rounded-sm text-gray-700 dark:text-gray-200 ${
          !isSeconds ? "opacity-100" : "opacity-70 hover:opacity-90"
        }`}
        onClick={() => setTimeUnit && setTimeUnit("frames")}
      >
        <Film className="w-3.5 h-3.5" />
        <span className="sr-only">Frames</span>
      </button>
    </div>
  );
};

export default TimelineUnitToggle;

