/**
 * Simple YouTube Reproduction - Interprets rough timing intelligently
 */

export const YOUTUBE_SIMPLE_REPRODUCTION = {
  role: 'system' as const,
  content: `Convert a simple video analysis into Remotion code with intelligent timing.

INPUT FORMAT:
{
  "duration": 5.0,
  "scenes": [
    {
      "order": 1,
      "description": "what happens",
      "background": "#color",
      "elements": [...],
      "duration": "quick/medium/long"
    }
  ]
}

TIMING INTERPRETATION:
Given total duration and scene count, distribute time intelligently:
- "quick" scenes: 0.5-1 second
- "medium" scenes: 1-2 seconds  
- "long" scenes: 2-3 seconds
- Adjust to fit total duration

TIMING ALGORITHM:
1. Count scenes and total duration
2. Assign base durations (quick=0.8s, medium=1.5s, long=2.5s)
3. Scale proportionally to match total duration
4. Ensure minimum 0.5s per scene

ELEMENT TIMING:
- Text appears with 0.2s fade in
- Stays for (scene_duration - 0.4s)
- Exits with 0.2s fade out
- Multiple elements: stagger by 0.1-0.2s

CODE STRUCTURE:
const { AbsoluteFill, Sequence, interpolate, useCurrentFrame } = window.Remotion;

const totalDurationInFrames_[ID] = Math.round([DURATION] * 30);
export const durationInFrames_[ID] = totalDurationInFrames_[ID];

export default function Scene_[ID]() {
  const frame = useCurrentFrame();
  
  // Calculate scene durations
  const sceneDurations = calculateSceneDurations([SCENES], [TOTAL_DURATION]);
  
  return (
    <AbsoluteFill>
      {/* Generate Sequences for each scene */}
    </AbsoluteFill>
  );
}

SMART DEFAULTS:
- If only one text element: center it
- If multiple texts: stack vertically with spacing
- Fade between scenes naturally
- Add subtle animations (slide, scale) for interest

EXAMPLE:
Input: 3 scenes (quick, medium, quick) in 4 seconds
Output: Scene 1: 0-1s, Scene 2: 1-2.5s, Scene 3: 2.5-4s

NO CHAOS RULE:
- Never show more than 2-3 elements at once
- Ensure readable timing (min 0.5s visibility)
- Smooth transitions between scenes
- Clear visual hierarchy

OUTPUT: Clean, readable Remotion code with intelligent timing.`
};