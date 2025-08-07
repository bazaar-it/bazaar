// Google Gemini Direct Video-to-Code Service
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GoogleVideoToCode {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use Gemini 1.5 Pro for high-quality video analysis and code generation
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.1, // Low temperature for accurate reproduction
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 16000, // Enough for complex code
      }
    });
  }

  async convertYouTubeToCode(youtubeUrl: string): Promise<string> {
    try {
      // Gemini directly converts video to Remotion code
      const result = await this.model.generateContent([
        {
          fileData: {
            mimeType: 'video/mp4',
            fileUri: youtubeUrl
          }
        },
        { text: DIRECT_VIDEO_TO_REMOTION_PROMPT }
      ]);
      
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error converting YouTube video to code:', error);
      throw error;
    }
  }
}

// Direct Video-to-Remotion Code Generation Prompt
export const DIRECT_VIDEO_TO_REMOTION_PROMPT = `TASK: Watch this video carefully and generate Remotion code that recreates it EXACTLY.

CRITICAL INSTRUCTIONS:
1. Watch the ENTIRE first 10 seconds (300 frames)
2. Capture EVERY visual element, animation, and transition
3. Output ONLY JavaScript code - no explanations
4. The code must recreate the video PERFECTLY

CODE STRUCTURE:
\`\`\`javascript
const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig } = window.Remotion;

// Load exact fonts seen in video
window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "500", "600", "700"] });

const script_[uniqueid] = [
  { type: "scene1", frames: [exact_count] },
  { type: "scene2", frames: [exact_count] },
  // ... all scenes to total 300 frames
];

let accumulatedFrames_[uniqueid] = 0;
const sequences_[uniqueid] = script_[uniqueid].map(scene => {
  const start = accumulatedFrames_[uniqueid];
  accumulatedFrames_[uniqueid] += scene.frames;
  return { ...scene, start, end: accumulatedFrames_[uniqueid] };
});

const totalFrames_[uniqueid] = 300;
export const durationInFrames_[uniqueid] = totalFrames_[uniqueid];

export default function Scene_[uniqueid]() {
  const frame = useCurrentFrame();
  
  // Implement ACTUAL visuals from video here
  // NO PLACEHOLDERS - real implementation only
}
\`\`\`

WHAT TO CAPTURE:
- Exact text content and animations
- Precise colors (use hex codes)
- Animation timing (which frame things appear/disappear)
- Text positions and sizes
- Background colors/gradients
- Any shapes, icons, or UI elements
- Transition effects between scenes

ANIMATION EXAMPLES:
// Fade in text:
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

// Slide in from right:
const translateX = interpolate(frame, [0, 30], [100, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

// Scale animation:
const scale = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

REMEMBER:
- NO COMMENTS in the code
- NO PLACEHOLDERS - implement everything
- Match the video EXACTLY
- Total must be 300 frames (10 seconds)`;

// Alternative approach - step by step
export const STEP_BY_STEP_VIDEO_PROMPT = `Your task is to convert a video into Remotion React code.

STEP 1: Watch the first 10 seconds carefully
STEP 2: List everything you see (text, colors, animations, timing)
STEP 3: Convert your observations into working Remotion code

The code must:
- Use this exact structure: export default function Scene_[8chars]()
- Include all text you see
- Match all animations and timing
- Use proper Remotion interpolate() for animations
- Total exactly 300 frames

Output ONLY the final JavaScript code, no explanations.`;