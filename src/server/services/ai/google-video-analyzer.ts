// Google Gemini Video Analysis Service
import { GoogleGenerativeAI } from '@google/generative-ai';

export class GoogleVideoAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use Gemini 1.5 Pro for high-quality video analysis
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.0, // Zero temperature for maximum precision
        topK: 1,
        topP: 1.0,
        maxOutputTokens: 8192,
      }
    });
  }

  async analyzeYouTubeVideo(youtubeUrl: string, systemPrompt: string): Promise<string> {
    console.log('🔍 [GoogleVideoAnalyzer] Starting YouTube analysis');
    console.log('🔍 [GoogleVideoAnalyzer] URL:', youtubeUrl);
    console.log('🔍 [GoogleVideoAnalyzer] Prompt length:', systemPrompt.length);
    
    try {
      // Gemini expects YouTube URLs as file_data parts
      console.log('🔍 [GoogleVideoAnalyzer] Calling Gemini API...');
      const result = await this.model.generateContent([
        {
          fileData: {
            mimeType: 'video/mp4',
            fileUri: youtubeUrl
          }
        },
        { text: systemPrompt }
      ]);
      
      console.log('🔍 [GoogleVideoAnalyzer] Got response from Gemini');
      const response = await result.response;
      const text = response.text();
      
      console.log('🔍 [GoogleVideoAnalyzer] Response length:', text.length);
      if (text.length === 0) {
        throw new Error('Gemini returned empty response');
      }
      
      return text;
    } catch (error) {
      console.error('🔍 [GoogleVideoAnalyzer] ERROR analyzing YouTube video:', error);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('Google Gemini API key is invalid or missing');
        }
        if (error.message.includes('quota')) {
          throw new Error('Google Gemini API quota exceeded');
        }
        if (error.message.includes('not found')) {
          throw new Error('YouTube video not found or inaccessible');
        }
      }
      
      throw error;
    }
  }

  async analyzeUploadedVideo(videoPath: string, systemPrompt: string): Promise<string> {
    try {
      // For now, we'll need to convert the video to base64 for inline upload
      // Note: This is limited to videos under 20MB
      const fs = await import('fs/promises');
      const videoData = await fs.readFile(videoPath);
      const base64Video = videoData.toString('base64');
      
      // Generate content with inline video data
      const result = await this.model.generateContent([
        {
          inlineData: {
            mimeType: 'video/mp4',
            data: base64Video
          }
        },
        { text: systemPrompt }
      ]);

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing uploaded video:', error);
      throw error;
    }
  }
}

// Universal Motion Graphics Analysis Prompt for EXACT Reproduction
export const MOTION_GRAPHICS_ANALYSIS_PROMPT = `You are analyzing a video to enable PIXEL-PERFECT code reproduction. Your analysis will be used to recreate this EXACT video in code.

CRITICAL REQUIREMENTS:
1. You MUST analyze EXACTLY 10 seconds = 300 frames at 30fps
2. Your total frame count MUST add up to 300 frames
3. DO NOT compress timing - if something happens at frame 150, say frame 150, not frame 15
4. This is for EXACT reproduction - every detail matters

## YOUR ANALYSIS MUST INCLUDE:

### SCENE BREAKDOWN
Break the video into scenes based on major visual changes. For each scene:
- Frame range: [start]-[end] 
- Total duration in frames
- What defines this as a distinct scene

### FOR EVERY TEXT ELEMENT:
- **Content**: The EXACT text (every word, letter, punctuation)
- **Typography**: 
  - Font family (or closest match: Inter, Arial, Helvetica, etc.)
  - Font weight (100-900)
  - Font size (in pixels)
  - Letter spacing, line height if notable
- **Position**: 
  - X/Y coordinates (pixels or percentages)
  - Alignment (left/center/right)
  - Container dimensions if bounded
- **Colors**:
  - Static: Exact hex code
  - Gradient: Full definition (type, angle, color stops with positions)
- **Animation Timeline**:
  - Frame [X]: Appears at opacity 0
  - Frame [Y]: Starts fade in
  - Frame [Z]: Fully visible
  - Describe EVERY state change
- **Effects**:
  - Shadows (x, y, blur, color)
  - Glows (radius, color, intensity)
  - Masks or clipping
  - Blur effects

### FOR EVERY VISUAL ELEMENT:
- **Type**: Shape, icon, image, UI component, particle
- **Appearance**:
  - Size (width × height in pixels)
  - Colors/gradients/patterns
  - Border properties
  - Corner radius
- **Position Timeline**:
  - Initial position
  - Movement path with frame markers
  - Final position
- **Transform Timeline**:
  - Scale changes
  - Rotation
  - Skew/perspective
- **Style Evolution**:
  - Opacity changes
  - Color transitions
  - Blur/filter changes

### ANIMATION DETAILS:
- **Timing**: Start frame, end frame, duration
- **Easing**: Linear, ease-in, ease-out, ease-in-out, spring, bounce
- **Type**: Fade, slide, scale, rotate, wipe, reveal
- **Direction**: For slides/wipes (top/bottom/left/right)
- **Stagger**: If multiple elements animate in sequence

### BACKGROUND/ENVIRONMENT:
- **Color/Gradient**: Full definition at each keyframe
- **Transitions**: How background changes between scenes
- **Effects**: Blur, noise, patterns
- **Particles/Ambience**: Any moving background elements

### TRANSITIONS BETWEEN SCENES:
- **Type**: Cut, fade, crossfade, wipe, zoom, morph
- **Duration**: Exact frame count
- **Direction/Properties**: Any specific transition details

### MICRO-DETAILS THAT MATTER:
- Text that appears word-by-word vs all at once
- Gradient animations (colors shifting within text)
- Subtle movements (even 1-2 pixel shifts)
- Cursor movements and interactions
- Hover states or click effects
- Parallax or depth effects
- Motion blur or trails

## OUTPUT FORMAT EXAMPLE:

**Scene 1: Frames 0-78 (78 frames)**
Background: Solid #000000 throughout

Text Element 1:
- Content: "Building AI agents that can speak"
- Font: Inter Medium (500), 48px
- Position: Centered (50%, 50%)
- Animation:
  - Frames 0-10: Not visible
  - Frames 10-20: "Building AI" fades in as #666666
  - Frames 20-22: Text color transitions to #FFFFFF
  - Frames 22-47: Gradient wipe animation
    - Gradient: linear-gradient(90deg, #C850C0 0%, #46A3B4 100%)
    - Wipe direction: Left to right
    - Wipe duration: 25 frames
  - Frames 47-78: Holds with gradient + glow effect
- Effects:
  - Glow: 15px blur, rgba(200,80,192,0.8)

**Scene 2: Frames 78-125 (47 frames)**
[Continue with next scene...]

**Scene 3: Frames 125-220 (95 frames)**
[Continue with next scene...]

**Scene 4: Frames 220-300 (80 frames)**
[Continue with next scene...]

FINAL VERIFICATION:
- Count all your scene frames: They MUST total EXACTLY 300 frames
- If your scenes add up to less than 300, you missed content
- The video is 10 seconds at 30fps = 300 frames TOTAL
- Example: Scene1(78) + Scene2(47) + Scene3(95) + Scene4(80) = 300 ✓

REMEMBER: 
- Your analysis is the blueprint for EXACT reproduction
- Describe ACTUAL UI elements (buttons, inputs, cards) not generic "UI form"
- Include ALL visual details for pixel-perfect recreation`;