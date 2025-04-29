import React, { useMemo } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const LETTERS = ["B", "a", "z", "a", "a", "r"];

/**
 * We draw each glyph with a <text> element, give it a *very* long dash array,
 * and animate `strokeDashoffset` down to 0 → looks like it’s being “written”.
 * Each letter’s animation is staggered by 8 frames so the word builds up
 * in a satisfying cascade, similar to the 3-stroke N.
 */
export const BazaarLogo: React.FC<{ outProgress: number }> = ({ outProgress }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global scale-down when parent wants to fade everything away
  const wrapperStyle: React.CSSProperties = useMemo(
    () => ({
      height: 140,
      borderRadius: 70,
      scale: String(1 - outProgress),
    }),
    [outProgress],
  );

  return (
    <svg viewBox="0 0 180 180" fill="none" style={wrapperStyle}>
      {/* ------- circular crop identical to original ------- */}
      <mask id="circle-mask">
        <circle cx="90" cy="90" r="90" fill="white" />
      </mask>

      <g mask="url(#circle-mask)">
        {/* solid black background */}
        <circle cx="90" cy="90" r="90" fill="black" />

        {/* write the letters */}
        <g
          fontFamily="Inter, sans-serif"
          fontWeight="700"
          fontSize="44"
          fill="none"
          stroke="url(#stroke-grad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {LETTERS.map((letter, i) => {
            // start each glyph 8 frames after the previous one
            const progress = spring({
              fps,
              frame: frame - i * 8,
              config: { damping: 200 },
            });
            const dash = 1400; // much longer than any glyph outline
            const offset = (1 - progress) * dash;

            /* We nudge each letter 26 px right so the word centres nicely.
               Feel free to tweak spacing if you change font/size. */
            const x = 40 + i * 26;
            const y = 112; // baseline

            return (
              <text
                key={i}
                x={x}
                y={y}
                strokeDasharray={dash}
                strokeDashoffset={offset}
              >
                {letter}
              </text>
            );
          })}
        </g>

        {/* subtle radial sheen like the original white fade-out */}
        <circle cx="90" cy="90" r="90" fill="url(#bgSheen)" />
      </g>

      {/* ------- gradient & sheen defs (verbatim style from NextLogo) ------- */}
      <defs>
        {/* white → transparent stroke gradient so ends fade out   */}
        <linearGradient
          id="stroke-grad"
          x1="0"
          x2="0"
          y1="40"
          y2="140"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* gentle vignette on black circle */}
        <radialGradient id="bgSheen" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="60%" stopColor="white" stopOpacity="0.06" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};