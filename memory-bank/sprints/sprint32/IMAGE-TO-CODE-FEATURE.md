# Image-to-Code Feature Specification (REVISED)

**Sprint**: 32 (Phase 2)  
**Priority**: High Impact Feature  
**Estimated Development**: 6-8 hours (today)  
**Status**: Architecture Finalized

## 🎯 **Revised Architecture (Based on User Feedback)**

### **Current Pipeline (Proven & Working)**:
```
User Text → Brain Orchestrator → addScene Tool → Layout Generator → Code Generator → Scene
```

### **Enhanced Pipeline (Clean Separation)**:
```
User Text + Images → Brain Orchestrator → analyzeImageTool → visionAnalysis JSON
                                       ↓
                      addScene/editScene Tool (with visionAnalysis) → Enhanced Layout Generator → Existing Code Generator → Scene
```

## 🏗️ **Architecture Principles (User's Clean Design)**

### **1. Upload & Storage Tier (Cloudflare R2)**
| Component | Implementation | Why |
|-----------|----------------|-----|
| **Cloudflare R2 public bucket** | Pre-signed PUT URLs + 1024px downscaled analysis copy | Keeps vision requests slim, owns master file |
| **Metadata row** (`media_files`) | `id, project_id, url_original, url_1024, width, height, sha256, created_at` | Deduplication + future style memory |
| **CDN URLs in chat** | Chat carries public URL, never raw file | Decouples chat from storage |

### **2. Job Orchestration Tier (Brain Router)**
```
chat-message (with images)
        │
        ▼
┌──────────────────┐
│  Brain Router    │ (detects images)
└──────┬───────────┘
       │
       ▼
┌───────────────────┐
│ analyzeImageTool  │ ← NEW: Stateless, reusable, 10s SLA
└──────┬────────────┘
       │ visionAnalysis JSON
       ▼
┌───────────────────┐
│ addScene/editScene│ (existing tools + visionAnalysis)
└───────────────────┘
```

**Why separate analyzeImageTool?**
- ✅ **Reuse**: Future tools ("Brand palette", "Style suggestions") can use same analysis
- ✅ **Observability**: Single bounded service for vision quality monitoring  
- ✅ **Fallbacks**: If vision fails, short-circuit to text flow without touching scene logic

### **3. Vision Service Contract (Versioned Day 1)**
```typescript
interface VisionAnalysisV1 {
  layoutJson: SceneLayoutV1;     // Your existing validated schema
  palette: string[];             // ["#667eea", "#764ba2"]  
  fonts: string[];               // ["Inter", "bold", "72px"]
  mood: string;                  // "sleek fintech" - for chat responses
  animations?: AnimationHint[];  // Best-effort if 2 images provided
  rawModelResponse: string;      // Keep for audit/tuning
  schemaVersion: "v1";          // Version from day 1
}
```

## 🔧 **Implementation Plan (Realistic for Today)**

### **Phase 1: Cloudflare R2 Upload (2 hours)**

1. **Backend R2 Presign Endpoint**:
   ```typescript
   // src/app/api/r2-presign/route.ts
   import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
   import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
   
   export async function POST(request: Request) {
     const { fileName, projectId } = await request.json();
     
     const s3Client = new S3Client({
       region: "auto",
       endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
       credentials: {
         accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
         secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
       },
     });
     
     const key = `projects/${projectId}/images/${crypto.randomUUID()}-${fileName}`;
     const command = new PutObjectCommand({
       Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
       Key: key,
     });
     
     const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
     const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
     
     return Response.json({ presignedUrl, publicUrl, key });
   }
   ```

2. **Frontend Upload Component**:
   ```typescript
   // src/components/ImageUploadArea.tsx
   export function ImageUploadArea({ projectId, onUpload, maxImages = 2 }) {
     const uploadToR2 = async (file: File) => {
       // Get presigned URL
       const { presignedUrl, publicUrl } = await fetch('/api/r2-presign', {
         method: 'POST',
         body: JSON.stringify({ fileName: file.name, projectId })
       }).then(r => r.json());
       
       // Direct upload to R2
       await fetch(presignedUrl, {
         method: 'PUT',
         body: file,
         headers: { 'Content-Type': file.type }
       });
       
       return publicUrl;
     };
   }
   ```

### **Phase 2: analyzeImageTool (2 hours)**

1. **New MCP Tool**:
   ```typescript
   // src/lib/services/mcp-tools/analyzeImage.ts
   import { z } from "zod";
   import { BaseMCPTool } from "./base";
   import { openai } from "~/server/lib/openai";
   
   const analyzeImageInputSchema = z.object({
     imageUrls: z.array(z.string()).min(1).max(2),
     userPrompt: z.string().optional(),
     projectId: z.string().describe("Project context for analysis"),
   });
   
   const analyzeImageOutputSchema = z.object({
     layoutJson: z.any(),                    // Your existing SceneLayout schema
     palette: z.array(z.string()),           // ["#667eea", "#764ba2"]
     typography: z.string(),                 // "Inter, bold, 72px headers"
     mood: z.string(),                       // "sleek fintech" 
     animations: z.array(z.string()).optional(), // ["fadeIn", "slideUp"]
     rawModelResponse: z.string(),           // For debugging/tuning
     schemaVersion: z.literal("v1"),
   });
   
   export class AnalyzeImageTool extends BaseMCPTool<AnalyzeImageInput, AnalyzeImageOutput> {
     name = "analyzeImage";
     description = "Analyze uploaded images to extract layout, colors, typography, and style for scene generation.";
     inputSchema = analyzeImageInputSchema;
     
     protected async execute(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
       try {
         const response = await openai.chat.completions.create({
           model: "gpt-4-vision-preview", // or "gpt-4o" when available
           temperature: 0.3,
           messages: [{
             role: "user",
             content: [
               { 
                 type: "text", 
                 text: this.buildVisionPrompt(input.userPrompt || "")
               },
               ...input.imageUrls.map(url => ({
                 type: "image_url" as const,
                 image_url: { url }
               }))
             ]
           }],
           response_format: { type: "json_object" }
         });
         
         const rawResponse = response.choices[0]?.message?.content || "{}";
         
         // Safe parsing with fallback
         const parsed = analyzeImageOutputSchema.safeParse({
           ...JSON.parse(rawResponse),
           rawModelResponse: rawResponse,
           schemaVersion: "v1"
         });
         
         if (!parsed.success) {
           console.warn('[AnalyzeImage] Parse failed, using fallback:', parsed.error);
           return this.createFallback(input, rawResponse);
         }
         
         return parsed.data;
         
       } catch (error) {
         console.error('[AnalyzeImage] Vision analysis failed:', error);
         return this.createFallback(input, String(error));
       }
     }
     
     private buildVisionPrompt(userPrompt: string): string {
       return `Analyze these images for motion graphics recreation. User context: "${userPrompt}"
       
       Return JSON matching this exact schema:
       {
         "layoutJson": {
           "sceneType": "hero|card|list|form|etc",
           "background": "gradient|solid color|pattern description",
           "elements": [
             {
               "type": "title|subtitle|button|card|icon|image",
               "position": "center|top-left|bottom-right|etc",
               "styling": "color, size, font details",
               "text": "actual text if visible"
             }
           ],
           "layout": {"align": "center", "direction": "column"},
           "animations": {"element1": {"type": "fadeIn", "duration": 60}}
         },
         "palette": ["#hex1", "#hex2", "#hex3"],
         "typography": "Font family, weights, sizes observed",
         "mood": "Brief style description (sleek, playful, corporate, etc)",
         "animations": ["fadeIn", "slideUp", "scale"] // if 2 images show motion
       }
       
       Focus on elements that can be recreated in React/Remotion. Be specific about colors and layout.`;
     }
     
     private createFallback(input: AnalyzeImageInput, error: string): AnalyzeImageOutput {
       return {
         layoutJson: {},
         palette: [],
         typography: "Unable to analyze typography",
         mood: "Could not determine style mood",
         animations: [],
         rawModelResponse: error,
         schemaVersion: "v1"
       };
     }
   }
   
   export const analyzeImageTool = new AnalyzeImageTool();
   ```

### **Phase 3: Brain Orchestrator Integration (1 hour)**

1. **Register New Tool**:
   ```typescript
   // src/server/services/brain/orchestrator.ts
   import { analyzeImageTool } from "~/lib/services/mcp-tools/analyzeImage";
   
   function initializeTools() {
     if (!toolsInitialized) {
       const tools = [addSceneTool, editSceneTool, deleteSceneTool, fixBrokenSceneTool, analyzeImageTool];
       tools.forEach(tool => toolRegistry.register(tool));
       toolsInitialized = true;
     }
   }
   ```

2. **Enhanced Intent Analysis**:
   ```typescript
   // Add to buildIntentAnalysisPrompt()
   `
   AVAILABLE TOOLS:
   - analyzeImage: Analyze uploaded images for style, layout, colors before scene generation
   - addScene: Create new scene (can accept visionAnalysis from analyzeImage)
   - editScene: Modify existing scene (can accept visionAnalysis from analyzeImage)
   
   IMAGE WORKFLOW:
   If user uploads images:
   1. ALWAYS call analyzeImage tool first
   2. Then call addScene or editScene with the visionAnalysis result
   3. Never skip image analysis - it provides crucial visual context
   
   MULTI-STEP EXAMPLE:
   {
     "workflow": [
       {
         "toolName": "analyzeImage",
         "context": "Analyze uploaded design reference",
         "dependencies": []
       },
       {
         "toolName": "addScene", 
         "context": "Create scene based on image analysis",
         "dependencies": ["step1_result"]
       }
     ]
   }
   `
   ```

### **Phase 4: Enhanced Scene Tools (1 hour)**

1. **Update addScene Tool Schema**:
   ```typescript
   // src/lib/services/mcp-tools/addScene.ts
   const addSceneInputSchema = z.object({
     userPrompt: z.string(),
     projectId: z.string(),
     sceneNumber: z.number().optional(),
     storyboardSoFar: z.array(z.any()).optional(),
     visionAnalysis: z.any().optional(), // 🚨 NEW: From analyzeImage tool
   });
   ```

2. **Pass Vision Data to Layout Generator**:
   ```typescript
   // In addScene execute method
   const result = await sceneBuilderService.generateTwoStepCode({
     userPrompt: input.userPrompt,
     projectId: input.projectId,
     sceneNumber: input.sceneNumber,
     previousSceneJson: await this.getPreviousSceneJson(input.projectId),
     visionAnalysis: input.visionAnalysis, // 🚨 NEW: Pass through
   });
   ```

### **Phase 5: Enhanced Layout Generator (1 hour)**

1. **Accept Vision Data**:
   ```typescript
   // src/lib/services/layoutGenerator.service.ts
   export interface LayoutGeneratorInput {
     userPrompt: string;
     sceneNumber?: number;
     previousSceneJson?: string;
     visionAnalysis?: VisionAnalysisV1; // 🚨 NEW
   }
   
   private buildPrompt(input: LayoutGeneratorInput): string {
     const basePrompt = this.buildBasePrompt(input);
     
     if (input.visionAnalysis && input.visionAnalysis.layoutJson) {
       return `${basePrompt}
       
       🎨 VISUAL REFERENCE PROVIDED:
       - Style Mood: ${input.visionAnalysis.mood}
       - Color Palette: ${input.visionAnalysis.palette.join(', ')}
       - Typography: ${input.visionAnalysis.typography}
       - Layout Reference: ${JSON.stringify(input.visionAnalysis.layoutJson)}
       - Suggested Animations: ${input.visionAnalysis.animations?.join(', ') || 'none'}
       
       Use this visual reference to create a layout JSON that recreates the style and structure.
       Prioritize the detected colors, layout patterns, and visual hierarchy.
       Adapt elements to match the reference while ensuring React/Remotion compatibility.`;
     }
     
     return basePrompt;
   }
   ```

### **Phase 6: Frontend Integration (2 hours)**

1. **Update ChatPanelG**:
   ```typescript
   // src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
   const [uploadedImages, setUploadedImages] = useState<string[]>([]);
   
   const handleSubmit = async (e: React.FormEvent) => {
     // Include images in the message
     const messageData = {
       userMessage: message.trim(),
       projectId,
       sceneId: selectedSceneId,
       imageUrls: uploadedImages.length > 0 ? uploadedImages : undefined
     };
     
     const result = await generateSceneMutation.mutateAsync(messageData);
     // ... rest of existing logic
   };
   ```

2. **Update Generation Router**:
   ```typescript
   // src/server/api/routers/generation.ts  
   generateScene: protectedProcedure
     .input(z.object({
       projectId: z.string(),
       userMessage: z.string(),
       sceneId: z.string().optional(),
       imageUrls: z.array(z.string()).optional(), // 🚨 NEW
     }))
     .mutation(async ({ input, ctx }) => {
       // Pass imageUrls to brain orchestrator
       const result = await brainOrchestrator.processUserInput({
         prompt: input.userMessage,
         projectId: input.projectId,
         userId: ctx.session.user.id,
         userContext: { 
           sceneId: input.sceneId,
           imageUrls: input.imageUrls // 🚨 NEW
         },
         storyboardSoFar,
         chatHistory: recentMessages,
       });
     })
   ```

## 🚀 **Realistic Timeline for Today**

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | R2 presign endpoint + basic upload | 2h | ✅ Essential |
| 2 | analyzeImageTool implementation | 2h | ✅ Essential |  
| 3 | Brain orchestrator integration | 1h | ✅ Essential |
| 4 | Scene tools enhancement | 1h | ✅ Essential |
| 5 | Layout generator vision prompts | 1h | ⚠️ Important |
| 6 | Frontend upload UI (basic) | 1h | ⚠️ Important |

**Total: 8 hours** (manageable for focused day)

## 🎯 **MVP User Experience (Today's Goal)**

1. User uploads image via simple file input in chat
2. Types: "Create a hero section like this design"  
3. Brain automatically calls `analyzeImage` → gets vision analysis
4. Brain then calls `addScene` with vision data
5. Enhanced layout generator creates scene matching image style
6. Existing code generator produces React/Remotion code
7. Scene appears in preview with visual style from uploaded image

## 📊 **Success Metrics**

- ✅ Images upload to Cloudflare R2 successfully
- ✅ Vision analysis returns valid JSON structure  
- ✅ Brain orchestrator automatically handles image workflow
- ✅ Generated scenes visually match uploaded reference
- ✅ System gracefully falls back to text-only if vision fails

**This architecture gives you maximum capability with minimum risk by leveraging your proven MCP tool pattern!** 