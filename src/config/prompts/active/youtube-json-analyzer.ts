/**
 * YouTube Video JSON Analysis Prompt for Gemini
 * Uses SECONDS-BASED timing and SEGMENT structure
 * More intuitive and accurate than frame-based analysis
 */

export const YOUTUBE_JSON_ANALYSIS_PROMPT = `You are analyzing a video to extract a timeline of visual elements using SECONDS, not frames.

CRITICAL RULES:
1. Use SECONDS for all timing (e.g., 0.5, 1.2, 3.0)
2. Minimum visibility: Elements must appear for at least 0.5 seconds
3. Describe ONLY what you SEE - no imagination or assumptions
4. Group related elements into logical segments
5. Use relative timing descriptions when appropriate

ELEMENT TYPES (NEVER use "image" for animations):
- "text" - Any text on screen
- "shape" - Circles, rectangles, lines, etc.
- "icon" - Simple icons or symbols
- "gradient" - Color gradients
- "particle" - Particle effects

OUTPUT FORMAT:

{
  "totalDuration": 7.0,  // Total video duration in seconds
  "segments": [
    {
      "name": "intro",
      "startTime": 0,
      "endTime": 2.5,
      "description": "Opening animation with logo",
      "background": {
        "type": "solid",
        "color": "#FFFFFF"
      },
      "elements": [
        {
          "type": "text",
          "content": "Hello World",
          "timing": {
            "appears": 0.5,      // When it first appears (seconds)
            "disappears": 2.0,   // When it's gone (seconds)
            "fadeInDuration": 0.3,  // How long the fade in takes
            "fadeOutDuration": 0.2  // How long the fade out takes
          },
          "position": {
            "x": "center",  // or pixel value
            "y": "center"   // or percentage like "30%"
          },
          "style": {
            "fontSize": "48px",
            "color": "#000000",
            "fontWeight": "bold"
          },
          "animation": {
            "entrance": "fade-in",  // or "slide-up", "scale-in", "none"
            "exit": "fade-out",     // or "slide-down", "scale-out", "none"
            "during": "none"        // or "pulse", "rotate", "bounce"
          }
        }
      ]
    },
    {
      "name": "main-message",
      "startTime": 2.5,
      "endTime": 5.0,
      "description": "Main content display",
      // ... more segment details
    }
  ]
}

TIMING GUIDELINES:
- "appears": The exact second when element becomes visible
- "disappears": The exact second when element is fully gone
- "fadeInDuration": How long the entrance animation takes (typically 0.2-0.5s)
- "fadeOutDuration": How long the exit animation takes (typically 0.2-0.5s)

POSITION OPTIONS:
- "center" - Centered on that axis
- Pixels: 100, 200, 300
- Percentages: "25%", "50%", "75%"
- Relative: "left", "right", "top", "bottom"

ANIMATION TYPES:
Entrance: "fade-in", "slide-up", "slide-down", "slide-left", "slide-right", "scale-in", "bounce-in", "none"
Exit: "fade-out", "slide-up", "slide-down", "slide-left", "slide-right", "scale-out", "none"
During: "pulse", "rotate", "bounce", "float", "none"

IMPORTANT:
1. Round times to nearest 0.1 second (e.g., 1.2, not 1.234)
2. If something appears and disappears quickly, still give it at least 0.5 seconds
3. Overlapping elements are fine - many things can be visible at once
4. Use segments to group related content (intro, main point, transition, outro, etc.)
5. Each segment should be at least 0.5 seconds long

EXAMPLES OF GOOD TIMING:
✅ "appears": 0.5, "disappears": 2.0 (visible for 1.5 seconds)
✅ "appears": 1.0, "disappears": 1.8, "fadeOutDuration": 0.3
❌ "appears": 1.0, "disappears": 1.1 (too short!)
❌ "appears": 1.234567 (too precise!)

BEFORE OUTPUTTING:
- Verify all times are in seconds (not frames!)
- Check that elements are visible for at least 0.5 seconds
- Ensure segments flow logically from start to end
- Confirm total duration matches the video length

OUTPUT: Valid JSON only. No explanations outside JSON.`;