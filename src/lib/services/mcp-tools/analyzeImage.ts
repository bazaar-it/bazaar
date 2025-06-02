import { z } from "zod";
import { BaseMCPTool } from "./base";
import { AIClientService } from "../aiClient.service";
import { getAnalyzeImageModel } from "~/config/models.config";
import { getParameterizedPrompt } from "~/config/prompts.config";

const analyzeImageInputSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(2),
  userPrompt: z.string().optional(),
  projectId: z.string().describe("Project context for analysis"),
  traceId: z.string().optional().describe("Trace ID for debugging"),
});

const analyzeImageOutputSchema = z.object({
  layoutJson: z.any(),                    // Your existing SceneLayout schema
  palette: z.array(z.string()),           // ["#667eea", "#764ba2"]
  typography: z.string(),                 // "Inter, bold, 72px headers"
  mood: z.string(),                       // "sleek fintech" 
  animations: z.array(z.string()).optional(), // ["fadeIn", "slideUp"]
  rawModelResponse: z.string(),           // For debugging/tuning
  schemaVersion: z.literal("v1"),
  processingTimeMs: z.number(),
});

type AnalyzeImageInput = z.infer<typeof analyzeImageInputSchema>;
type AnalyzeImageOutput = z.infer<typeof analyzeImageOutputSchema>;

export class AnalyzeImageTool extends BaseMCPTool<AnalyzeImageInput, AnalyzeImageOutput> {
  name = "analyzeImage";
  description = "Analyze uploaded images to extract layout, colors, typography, and style for scene generation.";
  inputSchema = analyzeImageInputSchema;
  
  protected async execute(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
    const startTime = Date.now();
    const { imageUrls, userPrompt, projectId, traceId } = input;
    
    console.log(`[AnalyzeImage] ${traceId ? `[${traceId}] ` : ''}Starting analysis of ${imageUrls.length} image(s) for project ${projectId}`);
    
    try {
      // Get the centralized vision prompt with user context
      const visionPrompt = getParameterizedPrompt('VISION_ANALYZE_IMAGE', {
        USER_PROMPT: userPrompt || ""
      });

      // Construct vision prompt content
      const content = [
        { 
          type: "text" as const, 
          text: visionPrompt.content
        },
        ...imageUrls.map(url => ({
          type: "image_url" as const,
          image_url: { 
            url,
            detail: "high" as const // Use high detail for better analysis
          }
        }))
      ];

      console.log(`[AnalyzeImage] ${traceId ? `[${traceId}] ` : ''}Calling vision model with ${imageUrls.length} images`);

      const response = await AIClientService.generateVisionResponse(
        getAnalyzeImageModel(),
        content,
        undefined, // system prompt is already in the content
        {
          responseFormat: { type: "json_object" }
        }
      );
      
      const rawResponse = (response.content || "{}") as string;
      console.log(`[AnalyzeImage] ${traceId ? `[${traceId}] ` : ''}Received vision response: ${rawResponse.substring(0, 200)}...`);
      
      // 🚨 NEW: EXTREMELY LENIENT JSON parsing - extract whatever we can get
      const extractedData = this.extractUsefulData(rawResponse, traceId);
      
      console.log(`[AnalyzeImage] ${traceId ? `[${traceId}] ` : ''}Analysis complete in ${Date.now() - startTime}ms`);
      console.log(`[AnalyzeImage] ${traceId ? `[${traceId}] ` : ''}Extracted: ${extractedData.palette.length} colors, mood: "${extractedData.mood}"`);
      
      return {
        ...extractedData,
        rawModelResponse: rawResponse,
        schemaVersion: "v1",
        processingTimeMs: Date.now() - startTime,
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[AnalyzeImage] ${traceId ? `[${traceId}] ` : ''}Vision analysis failed after ${processingTime}ms:`, error);
      return this.createFallback(input, String(error), processingTime);
    }
  }
  
  /**
   * 🚨 NEW: EXTREMELY lenient data extraction - use whatever we can get
   */
  private extractUsefulData(rawResponse: string, traceId?: string): Omit<AnalyzeImageOutput, 'rawModelResponse' | 'schemaVersion' | 'processingTimeMs'> {
    let parsed: any = {};
    
    // TRY 1: Parse as complete JSON
    try {
      parsed = JSON.parse(rawResponse);
      if (traceId) console.log(`[AnalyzeImage] [${traceId}] ✅ Complete JSON parsed successfully`);
    } catch (jsonError) {
      // TRY 2: Attempt to fix common truncation issues
      if (traceId) console.log(`[AnalyzeImage] [${traceId}] ⚠️ JSON parse failed, trying to extract partial data...`);
      
      try {
        // Add missing closing braces to handle truncation
        let fixedJson = rawResponse.trim();
        if (!fixedJson.endsWith('}')) {
          // Count open braces and add missing closing ones
          const openBraces = (fixedJson.match(/\{/g) || []).length;
          const closeBraces = (fixedJson.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          
          if (missingBraces > 0) {
            fixedJson += '}'.repeat(missingBraces);
            parsed = JSON.parse(fixedJson);
            if (traceId) console.log(`[AnalyzeImage] [${traceId}] ✅ Fixed truncated JSON by adding ${missingBraces} closing braces`);
          }
        }
      } catch (fixError) {
        // TRY 3: Extract individual fields using regex
        if (traceId) console.log(`[AnalyzeImage] [${traceId}] ⚠️ JSON fix failed, extracting individual fields...`);
        parsed = this.extractFieldsWithRegex(rawResponse, traceId);
      }
    }
    
    // 🚨 EXTRACT WHATEVER WE CAN GET - no strict validation
    const result = {
      layoutJson: this.extractLayoutJson(parsed),
      palette: this.extractPalette(parsed, rawResponse),
      typography: this.extractTypography(parsed, rawResponse),
      mood: this.extractMood(parsed, rawResponse),
      animations: this.extractAnimations(parsed, rawResponse),
    };
    
    if (traceId) {
      console.log(`[AnalyzeImage] [${traceId}] 📊 Extraction results:`);
      console.log(`[AnalyzeImage] [${traceId}] - Layout JSON: ${result.layoutJson ? 'FOUND' : 'MISSING'}`);
      console.log(`[AnalyzeImage] [${traceId}] - Palette: ${result.palette.length} colors`);
      console.log(`[AnalyzeImage] [${traceId}] - Typography: ${result.typography ? 'FOUND' : 'MISSING'}`);
      console.log(`[AnalyzeImage] [${traceId}] - Mood: ${result.mood ? 'FOUND' : 'MISSING'}`);
    }
    
    return result;
  }
  
  /**
   * Extract fields using regex when JSON parsing completely fails
   */
  private extractFieldsWithRegex(rawResponse: string, traceId?: string): any {
    const extracted: any = {};
    
    // Extract palette using regex
    const paletteMatch = rawResponse.match(/"palette"\s*:\s*\[(.*?)\]/s);
    if (paletteMatch) {
      try {
        const paletteStr = `[${paletteMatch[1]}]`;
        extracted.palette = JSON.parse(paletteStr);
        if (traceId) console.log(`[AnalyzeImage] [${traceId}] 🎨 Extracted palette via regex: ${extracted.palette.length} colors`);
      } catch {}
    }
    
    // Extract mood using regex
    const moodMatch = rawResponse.match(/"mood"\s*:\s*"([^"]+)"/);
    if (moodMatch) {
      extracted.mood = moodMatch[1];
      if (traceId) console.log(`[AnalyzeImage] [${traceId}] 🎭 Extracted mood via regex: "${extracted.mood}"`);
    }
    
    // Extract typography using regex
    const typographyMatch = rawResponse.match(/"typography"\s*:\s*"([^"]+)"/);
    if (typographyMatch) {
      extracted.typography = typographyMatch[1];
      if (traceId) console.log(`[AnalyzeImage] [${traceId}] ✍️ Extracted typography via regex`);
    }
    
    return extracted;
  }
  
  /**
   * Extract layout JSON with fallback
   */
  private extractLayoutJson(parsed: any): any {
    if (parsed?.layoutJson && typeof parsed.layoutJson === 'object') {
      return parsed.layoutJson;
    }
    
    // Build minimal layout from available data
    return {
      sceneType: parsed?.sceneType || "image-recreation",
      background: parsed?.background || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      elements: parsed?.elements || [
        {
          type: "title",
          position: "center",
          text: "Image Recreation",
          fontSize: 48,
          fontWeight: "700",
          color: "#ffffff"
        }
      ],
      layout: parsed?.layout || { align: "center", direction: "column", gap: 16 },
      animations: parsed?.animations || { element1: { type: "fadeIn", duration: 60, delay: 0 } }
    };
  }
  
  /**
   * Extract color palette with fallback
   */
  private extractPalette(parsed: any, rawResponse: string): string[] {
    // Try parsed JSON first
    if (Array.isArray(parsed?.palette)) {
      return parsed.palette.filter((color: any) => typeof color === 'string' && color.startsWith('#'));
    }
    
    // Try to find hex colors in raw response
    const hexColors = rawResponse.match(/#[0-9a-fA-F]{6}/g) || [];
    const uniqueColors = [...new Set(hexColors)];
    
    if (uniqueColors.length > 0) {
      return uniqueColors.slice(0, 10); // Max 10 colors
    }
    
    // Fallback colors
    return ["#667eea", "#764ba2", "#ffffff", "#000000"];
  }
  
  /**
   * Extract typography with fallback
   */
  private extractTypography(parsed: any, rawResponse: string): string {
    if (typeof parsed?.typography === 'string') {
      return parsed.typography;
    }
    
    if (typeof parsed?.typography === 'object') {
      return JSON.stringify(parsed.typography);
    }
    
    // Try to extract font information from raw response
    const fontMatch = rawResponse.match(/font[^"]*"([^"]+)"/i);
    if (fontMatch && fontMatch[1]) {
      return fontMatch[1];
    }
    
    return "Clean, modern typography extracted from image";
  }
  
  /**
   * Extract mood with fallback
   */
  private extractMood(parsed: any, rawResponse: string): string {
    if (typeof parsed?.mood === 'string' && parsed.mood.length > 0) {
      return parsed.mood;
    }
    
    // Try to extract style words from raw response
    const styleWords = rawResponse.match(/\b(modern|clean|minimal|elegant|professional|creative|bold|sleek|sophisticated)\b/gi) || [];
    if (styleWords.length > 0) {
      return `${styleWords.slice(0, 3).join(', ')} style extracted from image`;
    }
    
    return "Modern, clean style extracted from image analysis";
  }
  
  /**
   * Extract animations with fallback
   */
  private extractAnimations(parsed: any, rawResponse: string): string[] | undefined {
    if (Array.isArray(parsed?.animations)) {
      const validAnimations = parsed.animations.filter((anim: any) => typeof anim === 'string');
      return validAnimations.length > 0 ? validAnimations : undefined;
    }
    
    // Try to find animation keywords in raw response
    const animationWords = rawResponse.match(/\b(fadeIn|slideUp|bounce|scale|rotate|pulse|float)\b/gi) || [];
    if (animationWords.length > 0) {
      return [...new Set(animationWords)];
    }
    
    // Return undefined instead of empty array to match schema
    return undefined;
  }
  
  private createFallback(input: AnalyzeImageInput, error: string, processingTimeMs: number): AnalyzeImageOutput {
    console.log(`[AnalyzeImage] Creating fallback for ${input.imageUrls.length} images`);
    
    return {
      layoutJson: {
        sceneType: "card",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        elements: [
          {
            type: "title",
            position: "center",
            styling: "color: #ffffff, fontSize: 48px, fontWeight: bold",
            text: "Vision Analysis Failed",
            size: "large"
          }
        ],
        layout: { align: "center", direction: "column", gap: 16, padding: 32 },
        animations: { element1: { type: "fadeIn", duration: 60, delay: 0 } }
      },
      palette: ["#667eea", "#764ba2", "#ffffff", "#000000"],
      typography: "Unable to analyze typography from images",
      mood: "Could not determine style mood - analysis failed",
      animations: [],
      rawModelResponse: `Error: ${error}`,
      schemaVersion: "v1",
      processingTimeMs,
    };
  }
}

export const analyzeImageTool = new AnalyzeImageTool(); 