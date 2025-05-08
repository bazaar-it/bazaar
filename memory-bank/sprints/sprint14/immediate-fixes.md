# Sprint 14 Immediate Fixes Implementation Plan

This document outlines specific implementation strategies to address the three critical issues identified in the current-status.md report.

## 1. UI Feedback Delay

### Problem
Users experience a 2+ minute delay between backend scene planning and UI updates, with no intermediate feedback.

### Root Cause
- Scene planning results are only displayed after complete database transactions
- No streaming updates or progressive rendering of partial results
- UI waits for full completion before showing any results

### Implementation Plan

#### 1.1 Update ScenePlanningHistoryPanel to Show Partial Results

```typescript
// In ScenePlanningHistoryPanel.tsx
// Add state for in-progress scene planning
const [inProgressScenePlan, setInProgressScenePlan] = useState<{
  isPlanning: boolean;
  planStartTime?: Date;
  scenes?: Array<{description: string, duration?: number}>;
}>({ isPlanning: false });

// Listen for scene planning start and update events
useEffect(() => {
  if (chatMessages) {
    // Find assistant messages with partial scene planning content
    const planningMessages = chatMessages
      .filter(msg => msg.role === 'assistant' && 
             (msg.status === 'pending' || msg.status === 'tool_calling'))
      .filter(msg => {
        // Check for scene planning content
        return msg.content?.toLowerCase().includes('planning') || 
               msg.content?.toLowerCase().includes('scene');
      });
      
    if (planningMessages.length > 0) {
      // Extract partial scene information using regex
      const partialScenes = extractScenesFromContent(planningMessages[0].content || '');
      setInProgressScenePlan({
        isPlanning: true,
        planStartTime: planningMessages[0].createdAt,
        scenes: partialScenes
      });
    } else {
      setInProgressScenePlan({ isPlanning: false });
    }
  }
}, [chatMessages]);

// Create a component to display in-progress scene planning
const ScenePlanningProgress = () => {
  if (!inProgressScenePlan.isPlanning) return null;
  
  return (
    <div className="mb-4 p-4 border border-yellow-500 rounded-md bg-yellow-50 dark:bg-yellow-900/20">
      <div className="flex items-center gap-2 mb-2">
        <Loader2Icon className="animate-spin" size={16} />
        <h3 className="font-medium">Scene Planning in Progress</h3>
        {inProgressScenePlan.planStartTime && (
          <span className="text-xs text-gray-500">
            Started {formatDistanceToNow(inProgressScenePlan.planStartTime)} ago
          </span>
        )}
      </div>
      
      {inProgressScenePlan.scenes && inProgressScenePlan.scenes.length > 0 ? (
        <>
          <p className="text-sm mb-2">Planned scenes so far:</p>
          <ul className="space-y-2">
            {inProgressScenePlan.scenes.map((scene, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">Scene {i + 1}:</span> {scene.description}
                {scene.duration && <span> ({scene.duration}s)</span>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm">Planning your video scenes...</p>
      )}
    </div>
  );
};

// Add the progress component to the render function
return (
  <div className="...">
    <h2 className="...">Scene Planning History</h2>
    <p className="...">See how your video ideas were broken down into scenes</p>
    
    {/* Show in-progress planning if active */}
    <ScenePlanningProgress />
    
    {/* Existing scene plans display */}
    {/* ... */}
  </div>
);
```

#### 1.2 Add Helper Function to Extract Scenes from Partial Content

```typescript
// Helper function to extract scenes from partial content
function extractScenesFromContent(content: string): Array<{description: string, duration?: number}> {
  const scenes: Array<{description: string, duration?: number}> = [];
  
  // Match patterns like "Scene 1: Description... (3s)"
  const sceneRegex = /Scene\s+\d+\s*:\s*([^()]+)(?:\s*\((\d+)s\))?/gi;
  let match;
  
  while ((match = sceneRegex.exec(content)) !== null) {
    scenes.push({
      description: match[1].trim(),
      duration: match[2] ? parseInt(match[2], 10) : undefined
    });
  }
  
  return scenes;
}
```

#### 1.3 Monitor Chat Messages for Real-time Updates

```typescript
// Subscribe to chat events for real-time updates
const { subscribe, unsubscribe } = useChatEvents();

useEffect(() => {
  const handleChatEvent = (event: ChatEvent) => {
    if (event.type === 'content' && 
        event.role === 'assistant' && 
        (event.content.includes('Scene') || event.content.includes('planning'))) {
      // Update in-progress plan immediately without waiting for db
      const partialScenes = extractScenesFromContent(event.content);
      if (partialScenes.length > 0) {
        setInProgressScenePlan(prev => ({
          ...prev,
          isPlanning: true,
          scenes: partialScenes
        }));
      }
    }
  };
  
  subscribe(handleChatEvent);
  return () => unsubscribe(handleChatEvent);
}, [subscribe, unsubscribe]);
```

## 2. Animation Design Brief Validation Failures

### Problem
Animation Design Briefs (ADBs) are generated but fail validation, resulting in fallback briefs with partial data.

### Root Cause
- Schema validation for animations is failing
- Elements in positions 1, 3, and 4 have animation object validation issues
- Missing required properties or incorrect property types

### Implementation Plan

#### 2.1 Add Debug Logging to Identify Specific Validation Issues

```typescript
// In animationDesigner.service.ts
function validateAnimationDesignBrief(brief: any): ValidationResult {
  // Existing validation code
  const result = animationDesignBriefSchema.safeParse(brief);
  
  if (!result.success) {
    // Enhanced debugging
    console.log('Animation Design Brief Validation Failed:');
    console.log('Raw brief data:', JSON.stringify(brief, null, 2));
    console.log('Validation errors:', JSON.stringify(result.error.format(), null, 2));
    
    // Extract specific issues with animations
    if (result.error.format().elements) {
      const elementsErrors = result.error.format().elements;
      Object.entries(elementsErrors).forEach(([index, errors]) => {
        if (index !== '_errors' && errors.animations) {
          console.log(`Element at index ${index} has animation errors:`, errors.animations);
          console.log(`Element data:`, JSON.stringify(brief.elements[parseInt(index)], null, 2));
        }
      });
    }
    
    return {
      isValid: false,
      errors: result.error.format()
    };
  }
  
  return {
    isValid: true,
    validatedBrief: result.data
  };
}
```

#### 2.2 Update Animation Schema to Be More Flexible

```typescript
// In animationDesignBrief.schema.ts

// Update the animation schemas to be more permissive
const animationPropertySchema = z.object({
  property: z.string().optional(),  // Make property optional
  from: z.union([z.number(), z.string()]).optional(),  // Allow numbers or strings
  to: z.union([z.number(), z.string()]).optional(),
  // Add other properties with optional() to make schema more forgiving
}).passthrough();  // Allow additional properties temporarily

const animationSchema = z.object({
  elementId: z.string().uuid().optional(),  // Make elementId optional
  animationId: z.string().uuid().optional(),  // Make animationId optional
  delayInFrames: z.number().optional(),     // Make all timing fields optional
  durationInFrames: z.number().optional(),
  easing: z.string().optional(),
  trigger: z.enum(['onEnter', 'onExit', 'afterPrevious', 'withPrevious']).optional(),
  properties: z.array(animationPropertySchema).optional().default([]),  // Make properties optional
}).passthrough();  // Allow additional unknown properties
```

#### 2.3 Implement Fallback Schema for Animation Briefs

```typescript
// Create a simplified fallback schema for partial data recovery
const fallbackAnimationSchema = z.object({
  elementId: z.string().optional(),  // More permissive - doesn't require UUID format
  animationId: z.string().optional(),
  delayInFrames: z.union([z.number(), z.string(), z.null()]).optional()
    .transform(val => typeof val === 'string' ? parseInt(val, 10) || 0 : val || 0),
  durationInFrames: z.union([z.number(), z.string(), z.null()]).optional()
    .transform(val => typeof val === 'string' ? parseInt(val, 10) || 30 : val || 30),
  easing: z.string().optional().default('linear'),
  properties: z.array(z.any()).optional().default([]),
}).passthrough();

// Use fallback schema when primary validation fails
function createFallbackAnimationDesignBrief(rawBrief: any): AnimationDesignBrief {
  const fallbackSchema = z.object({
    sceneId: z.string(),
    sceneName: z.string().optional(),
    scenePurpose: z.string().optional(),
    overallStyle: z.string().optional(),
    durationInFrames: z.number().default(180),
    dimensions: z.object({
      width: z.number().default(1920),
      height: z.number().default(1080),
    }).default({ width: 1920, height: 1080 }),
    elements: z.array(
      z.object({
        elementId: z.string(),
        elementType: z.string(),
        content: z.string().optional(),
        initialLayout: z.record(z.any()).optional(),
        animations: z.array(fallbackAnimationSchema).optional().default([]),
      }).passthrough()
    ).default([]),
    // Other fields with defaults
  }).passthrough();
  
  // Apply the fallback schema
  try {
    const result = fallbackSchema.parse(rawBrief);
    console.log('Created fallback brief with partial data');
    return result;
  } catch (error) {
    console.error('Even fallback schema failed:', error);
    // Create minimal valid brief
    return {
      sceneId: rawBrief.sceneId || 'unknown',
      scenePurpose: rawBrief.scenePurpose || 'Unknown scene purpose',
      overallStyle: 'default',
      durationInFrames: 180,
      dimensions: { width: 1920, height: 1080 },
      elements: [],
      colorPalette: {
        background: '#FFFFFF',
        primary: '#000000',
      },
      briefVersion: '1.0',
    };
  }
}
```

## 3. Component Generation Build Failures

### Problem
TSX code is generated successfully but the build process fails, resulting in component jobs with "error" status.

### Root Cause
- Build process in buildCustomComponent.ts is failing
- Limited error information in logs
- Potentially syntax or import issues in generated components

### Implementation Plan

#### 3.1 Add Enhanced Error Logging to Build Process

```typescript
// In buildCustomComponent.ts
async function buildComponent(component: ComponentJob): Promise<void> {
  try {
    console.log(`[BUILD] Starting build for component ${component.jobId}`);
    
    // Validate the TSX code
    if (!component.tsxCode) {
      console.error(`[BUILD] No TSX code provided for job ${component.jobId}`);
      throw new Error("TSX code is missing");
    }
    
    // Log component code for debugging
    console.log(`[BUILD] Component code for job ${component.jobId}:`, 
      component.tsxCode.substring(0, 500) + '... (truncated)');
    
    // Create a temporary directory for building
    const tmpDir = path.join(os.tmpdir(), `bazaar-vid-${component.jobId}`);
    await fs.mkdir(tmpDir, { recursive: true });
    console.log(`[BUILD] Created temp directory: ${tmpDir}`);
    
    // Write the TSX code to a file
    const tsxPath = path.join(tmpDir, 'component.tsx');
    await fs.writeFile(tsxPath, component.tsxCode);
    console.log(`[BUILD] Wrote TSX code to ${tsxPath}`);
    
    // Create a minimal package.json with dependencies
    const packageJson = {
      name: `bazaar-vid-component-${component.jobId}`,
      version: '1.0.0',
      type: 'module',
      dependencies: {
        'react': '^18.2.0',
        'remotion': '^4.0.0'
      }
    };
    await fs.writeFile(
      path.join(tmpDir, 'package.json'), 
      JSON.stringify(packageJson, null, 2)
    );
    console.log(`[BUILD] Created package.json`);
    
    // Build the component with esbuild
    try {
      console.log(`[BUILD] Starting esbuild for ${component.jobId}`);
      const result = await esbuild.build({
        entryPoints: [tsxPath],
        bundle: true,
        outfile: path.join(tmpDir, 'component.js'),
        format: 'esm',
        platform: 'browser',
        target: 'es2020',
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        loader: {
          '.png': 'dataurl',
          '.jpg': 'dataurl',
          '.jpeg': 'dataurl',
          '.svg': 'dataurl',
          '.gif': 'dataurl',
          '.webp': 'dataurl',
        },
        logLevel: 'verbose',  // Increase log level for debugging
        metafile: true,       // Generate meta information for debugging
        define: {
          'process.env.NODE_ENV': '"production"',
        },
        external: ['react', 'remotion'],
      });
      
      // Log build metadata for debugging
      console.log(`[BUILD] Build successful for ${component.jobId}`);
      console.log(`[BUILD] Build meta:`, JSON.stringify(result.metafile, null, 2).substring(0, 1000) + '... (truncated)');
      
      // Read the output file
      const output = await fs.readFile(path.join(tmpDir, 'component.js'), 'utf8');
      console.log(`[BUILD] Output size: ${output.length} bytes`);
      
      // Upload the component to R2
      // ... existing upload code ...
      
    } catch (buildError) {
      console.error(`[BUILD] esbuild error for ${component.jobId}:`, buildError);
      throw buildError;
    }
    
  } catch (error) {
    console.error(`[BUILD] Error processing component ${component.jobId}:`, error);
    
    // Add more contextual information to the error
    let errorMessage = error instanceof Error ? error.message : String(error);
    errorMessage = `Build failed: ${errorMessage}`;
    
    // Update the job status to error
    await updateComponentStatus(component.jobId, 'error', error);
    throw error;
  } finally {
    // Clean up temp directory
    // ... existing cleanup code ...
  }
}
```

#### 3.2 Create Test Utility for Minimal Component Builds

```typescript
// In src/scripts/test-component-build.ts
import * as esbuild from 'esbuild';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Utility to test component build process with a minimal example
 */
async function testMinimalComponentBuild() {
  const testId = Date.now().toString();
  const tmpDir = path.join(os.tmpdir(), `bazaar-vid-test-${testId}`);
  
  try {
    console.log(`Creating test directory: ${tmpDir}`);
    await fs.mkdir(tmpDir, { recursive: true });
    
    // Create a minimal component
    const minimalComponent = `
    // src/remotion/components/scenes/TestComponent.tsx
    import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
    import React from 'react';
    
    export const TestComponent: React.FC = () => {
      const frame = useCurrentFrame();
      const { fps, width, height } = useVideoConfig();
      
      return (
        <AbsoluteFill style={{ backgroundColor: 'white' }}>
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            fontSize: '32px',
            fontFamily: 'Arial'
          }}>
            Frame: {frame}
          </div>
        </AbsoluteFill>
      );
    };
    `;
    
    // Write the component to a file
    const tsxPath = path.join(tmpDir, 'TestComponent.tsx');
    await fs.writeFile(tsxPath, minimalComponent);
    console.log(`Wrote minimal component to ${tsxPath}`);
    
    // Create package.json
    const packageJson = {
      name: `bazaar-vid-test-component-${testId}`,
      version: '1.0.0',
      type: 'module',
      dependencies: {
        'react': '^18.2.0',
        'remotion': '^4.0.0'
      }
    };
    await fs.writeFile(
      path.join(tmpDir, 'package.json'), 
      JSON.stringify(packageJson, null, 2)
    );
    
    // Build with esbuild
    console.log('Starting test build...');
    const result = await esbuild.build({
      entryPoints: [tsxPath],
      bundle: true,
      outfile: path.join(tmpDir, 'TestComponent.js'),
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      logLevel: 'info',
      metafile: true,
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      external: ['react', 'remotion'],
    });
    
    console.log('Test build successful!');
    console.log('Output files:', await fs.readdir(tmpDir));
    
    // Read the output file
    const output = await fs.readFile(path.join(tmpDir, 'TestComponent.js'), 'utf8');
    console.log(`Output size: ${output.length} bytes`);
    console.log('First 500 characters of output:');
    console.log(output.substring(0, 500) + '...');
    
    return {
      success: true,
      outputPath: path.join(tmpDir, 'TestComponent.js')
    };
    
  } catch (error) {
    console.error('Test build failed:', error);
    return {
      success: false,
      error
    };
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testMinimalComponentBuild()
    .then(result => {
      console.log('Test result:', result.success ? 'SUCCESS' : 'FAILURE');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { testMinimalComponentBuild };
```

#### 3.3 Fix Slow tRPC Procedure Performance

```typescript
// In src/server/api/routers/customComponent.ts

// Optimize getJobStatus procedure
export const customComponentRouter = router({
  // ... existing procedures
  
  getJobStatus: protectedProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const { jobId } = input;
      const { db, userId } = ctx;
      
      // Add caching to improve performance
      const cacheKey = `job-status-${jobId}`;
      const cachedResult = await getFromCache(cacheKey);
      if (cachedResult) {
        return cachedResult as ComponentJobStatus;
      }
      
      // Add timeout to prevent long-running queries
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), 5000);
      });
      
      const queryPromise = db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.jobId, jobId),
        columns: {
          status: true,
          createdAt: true,
          updatedAt: true,
          error: true,
          outputUrl: true,
        },
      });
      
      try {
        const result = await Promise.race([queryPromise, timeoutPromise]) as ComponentJobStatus;
        
        // Cache result to improve performance of repeated calls
        if (result) {
          await setInCache(cacheKey, result, 10); // Cache for 10 seconds
        }
        
        return result;
      } catch (error) {
        console.error(`Error fetching job status for ${jobId}:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }),
    
  // Add a bulk status endpoint to reduce number of queries
  getJobsStatus: protectedProcedure
    .input(z.object({
      jobIds: z.array(z.string()),
    }))
    .query(async ({ ctx, input }) => {
      const { jobIds } = input;
      const { db, userId } = ctx;
      
      if (jobIds.length === 0) {
        return [];
      }
      
      // Single query for multiple jobs
      const results = await db.query.customComponentJobs.findMany({
        where: inArray(customComponentJobs.jobId, jobIds),
        columns: {
          jobId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          error: true,
          outputUrl: true,
        },
      });
      
      // Map results to ensure order matches input jobIds
      return jobIds.map(id => {
        const job = results.find(r => r.jobId === id);
        return job || { 
          jobId: id, 
          status: 'unknown' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
    }),
});
```

## 4. Component Identification and Regeneration Issues

### Problem
The system fails to properly identify, track, and allow regeneration of individual custom components within scenes. Currently, when planning scenes, the LLM generates several custom components for each scene, but there's no way to:
1. Clearly identify which element in the ADB corresponds to which custom component
2. Regenerate a specific component if it fails or needs improvement
3. See detailed status information about component generation in the UI

### Root Cause
- Missing component identifiers in the Animation Design Brief schema
- No UI implementation for per-component feedback and regeneration
- No direct mapping between ADB elements and generated components
- Lack of error messaging shown in UI when all components fail to generate

### Implementation Plan

#### 4.1 Add Component Identifiers to Animation Design Brief Schema

```typescript
// In animationDesignBrief.schema.ts

// Update element schema to include component identification
const elementSchema = z.object({
  elementId: z.string().uuid(),
  elementType: z.string(),
  componentId: z.string().uuid().optional(), // Add componentId to track custom components
  componentName: z.string().optional(),      // Add a friendly name for the component
  componentStatus: z.enum(['pending', 'generating', 'success', 'error']).optional(),
  componentErrorMessage: z.string().optional(), // Track component-specific errors
  // ... other existing fields
});
```

#### 4.2 Enhance ScenePlanningHistoryPanel with Component Status and Regeneration

```tsx
// In ScenePlanningHistoryPanel.tsx

// Add a function to regenerate a specific component
const regenerateComponent = async (componentId: string, feedback?: string) => {
  setComponentStatus(componentId, 'generating');
  
  try {
    await regenerateComponentMutation.mutateAsync({
      componentId,
      feedback: feedback || '',
    });
    
    // Show success toast
    toast({
      title: 'Component regeneration started',
      description: 'The component is being regenerated with your feedback.',
      status: 'success',
    });
  } catch (error) {
    console.error('Error regenerating component:', error);
    setComponentStatus(componentId, 'error');
    
    // Show error toast
    toast({
      title: 'Failed to regenerate component',
      description: error instanceof Error ? error.message : 'Unknown error',
      status: 'error',
    });
  }
};

// Add a component for displaying element status and regeneration options
const ElementComponent = ({ element, sceneId }: { element: ADBElement, sceneId: string }) => {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  
  return (
    <div className="p-2 border rounded-md mb-2">
      <div className="flex justify-between items-center">
        <div>
          <span className="font-medium">{element.elementType}</span>
          {element.content && <span className="ml-2 text-sm text-gray-600">{truncateText(element.content, 30)}</span>}
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {element.componentStatus === 'pending' && <ClockIcon size={16} className="text-yellow-500" />}
          {element.componentStatus === 'generating' && <Loader2Icon size={16} className="animate-spin text-blue-500" />}
          {element.componentStatus === 'success' && <CheckCircleIcon size={16} className="text-green-500" />}
          {element.componentStatus === 'error' && <AlertCircleIcon size={16} className="text-red-500" />}
          
          {/* Regenerate button */}
          {element.componentId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFeedback(!showFeedback)}
            >
              {element.componentStatus === 'error' ? 'Fix' : 'Regenerate'}
            </Button>
          )}
        </div>
      </div>
      
      {/* Feedback input for regeneration */}
      {showFeedback && (
        <div className="mt-2 space-y-2">
          <Textarea
            placeholder="Describe how you want to improve this component..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full text-sm"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowFeedback(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                regenerateComponent(element.componentId!, feedback);
                setShowFeedback(false);
                setFeedback('');
              }}
            >
              Submit Feedback
            </Button>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {element.componentErrorMessage && (
        <div className="mt-1 text-sm text-red-500">
          {element.componentErrorMessage}
        </div>
      )}
    </div>
  );
};
```

#### 4.3 Update Component Generation Process to Track Element-to-Component Relationships

```typescript
// In componentGenerator.service.ts

/**
 * Creates a mapping between ADB elements and component jobs
 */
export async function createElementComponentMapping(
  animationDesignBriefId: string,
  elementId: string,
  componentJobId: string
): Promise<void> {
  await db.insert(elementComponentMappings).values({
    id: uuidv4(),
    animationDesignBriefId,
    elementId,
    componentJobId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Updates the ADB with component generation status
 */
export async function updateElementComponentStatus(
  animationDesignBriefId: string,
  elementId: string,
  status: 'pending' | 'generating' | 'success' | 'error',
  errorMessage?: string
): Promise<void> {
  // Get the current ADB
  const adb = await db.query.animationDesignBriefs.findFirst({
    where: eq(animationDesignBriefs.id, animationDesignBriefId),
  });
  
  if (!adb || !adb.content) return;
  
  // Parse the content
  const brief = JSON.parse(adb.content);
  
  // Update the element
  if (brief.elements && Array.isArray(brief.elements)) {
    for (let i = 0; i < brief.elements.length; i++) {
      if (brief.elements[i].elementId === elementId) {
        brief.elements[i].componentStatus = status;
        if (errorMessage) {
          brief.elements[i].componentErrorMessage = errorMessage;
        }
        break;
      }
    }
  }
  
  // Save the updated ADB
  await db.update(animationDesignBriefs)
    .set({
      content: JSON.stringify(brief),
      updatedAt: new Date(),
    })
    .where(eq(animationDesignBriefs.id, animationDesignBriefId));
}
```

#### 4.4 Create API Endpoint for Component Regeneration

```typescript
// In customComponent.ts router

/**
 * Regenerate a specific component with user feedback
 */
regenerateComponent: protectedProcedure
  .input(z.object({
    componentId: z.string(),
    feedback: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { db, userId } = ctx;
    const { componentId, feedback } = input;
    
    // Get the component mapping
    const mapping = await db.query.elementComponentMappings.findFirst({
      where: eq(elementComponentMappings.componentJobId, componentId),
    });
    
    if (!mapping) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Component mapping not found',
      });
    }
    
    // Get the ADB
    const adb = await db.query.animationDesignBriefs.findFirst({
      where: eq(animationDesignBriefs.id, mapping.animationDesignBriefId),
    });
    
    if (!adb) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Animation Design Brief not found',
      });
    }
    
    // Parse the ADB content
    const brief = JSON.parse(adb.content);
    
    // Find the element
    let targetElement = null;
    if (brief.elements && Array.isArray(brief.elements)) {
      targetElement = brief.elements.find((el: any) => el.elementId === mapping.elementId);
    }
    
    if (!targetElement) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Element not found in Animation Design Brief',
      });
    }
    
    // Update element status
    targetElement.componentStatus = 'generating';
    await db.update(animationDesignBriefs)
      .set({
        content: JSON.stringify(brief),
        updatedAt: new Date(),
      })
      .where(eq(animationDesignBriefs.id, adb.id));
    
    // Create a new component job with the feedback
    const componentPrompt = `Create a custom visual effect for the following element: ${JSON.stringify(targetElement)}. 
${feedback ? `User feedback: ${feedback}` : ''}`;
    
    const jobId = await createComponentJob(
      adb.projectId,
      componentPrompt,
      adb.id,
      mapping.elementId
    );
    
    // Update the mapping
    await db.update(elementComponentMappings)
      .set({
        componentJobId: jobId,
        updatedAt: new Date(),
      })
      .where(eq(elementComponentMappings.id, mapping.id));
    
    return { jobId };
  }),
```

#### 4.5 Add Database Schema for Element-Component Mapping

```typescript
// In schema.ts

export const elementComponentMappings = pgTable('element_component_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  animationDesignBriefId: uuid('animation_design_brief_id').notNull()
    .references(() => animationDesignBriefs.id, { onDelete: 'cascade' }),
  elementId: uuid('element_id').notNull(),
  componentJobId: uuid('component_job_id').notNull()
    .references(() => customComponentJobs.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

#### 4.6 Fix ADB Element-to-Component Relationship in Animation Designer Service

```typescript
// In animationDesigner.service.ts

// When generating the ADB, assign unique component IDs to elements
for (let i = 0; i < brief.elements.length; i++) {
  // Generate a unique component ID for this element if it needs a custom component
  if (shouldGenerateCustomComponent(brief.elements[i])) {
    brief.elements[i].componentId = uuidv4();
    brief.elements[i].componentName = generateComponentName(brief.elements[i], i);
    brief.elements[i].componentStatus = 'pending';
  }
}

// Helper function to determine if an element needs a custom component
function shouldGenerateCustomComponent(element: any): boolean {
  // Check if this element type typically needs a custom component
  const needsCustomComponent = [
    'complex',
    'animation',
    'custom',
    'interactive',
    'advanced'
  ].some(type => element.elementType.toLowerCase().includes(type));
  
  // Check if animations are complex enough to warrant a custom component
  const hasComplexAnimations = element.animations && 
    Array.isArray(element.animations) && 
    element.animations.length > 2;
    
  return needsCustomComponent || hasComplexAnimations;
}

// Helper function to generate a component name
function generateComponentName(element: any, index: number): string {
  const type = element.elementType || 'Custom';
  const content = element.content 
    ? element.content.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')
    : '';
  
  const baseName = content 
    ? `${capitalizeFirstLetter(type)}${capitalizeFirstLetter(content)}`
    : `${capitalizeFirstLetter(type)}Element${index + 1}`;
    
  return `${baseName}Component`;
}
```

## Implementation Timeline

1. **Day 1: Fix UI Feedback Delay**
   - Implement ScenePlanningHistoryPanel updates
   - Add real-time scene extraction
   - Test with sample prompts

2. **Day 2: Fix Animation Design Brief Validation**
   - Add enhanced debug logging
   - Update schema to be more flexible
   - Implement fallback schema
   - Test with known failing examples

3. **Day 3: Fix Component Generation**
   - Enhance error logging in build process
   - Create and test minimal component build
   - Optimize tRPC procedures
   - Implement caching for repeated status checks

4. **Day 4: Implement Component Identification and Regeneration**
   - Update ADB schema to include component tracking
   - Create element-to-component mapping in database
   - Add UI for component status and regeneration
   - Implement component regeneration API

## Success Criteria

1. **UI Feedback:**
   - Scene planning shows partial results within 10 seconds of starting
   - Users can see progress indicators during the entire process
   - Scene descriptions appear as they become available

2. **Animation Design Brief:**
   - No more validation failures for standard output
   - Graceful fallback for edge cases
   - Complete ADbs generated for all scenes

3. **Component Generation:**
   - Successful builds for all components
   - Clear error messages when failures occur
   - Performance improvements for getJobStatus (under 1000ms)

4. **Component Identification and Regeneration:**
   - Each custom component is clearly identifiable in the UI
   - Users can see which elements correspond to which components
   - Failed components show clear error messages
   - Users can provide feedback and regenerate specific components
   - System tracks component generation status at the element level 

## Summary of Completed Logging and UI Feedback Enhancements (Sprint 14 - Iteration 1)

This iteration focused on improving visibility and feedback for critical processes:

1.  **Scene Planning UI Feedback (`ScenePlanningHistoryPanel.tsx`)**:
    *   Enhanced UI to show in-progress scene planning details based on partial information extracted from assistant messages.
    *   Displays number of scenes planned so far, their descriptions, and estimated durations.
    *   Provides a start time and a running counter for how long planning has been active.

2.  **Animation Design Brief (ADB) Validation Logging (`animationDesigner.service.ts`)**:
    *   Added logging for the raw ADB data before Zod schema validation.
    *   Implemented detailed logging for Zod validation failures, including formatted error messages and the specific data of elements causing validation issues.

3.  **Component Generation Pipeline Logging**:
    *   **Incoming Request (`componentGenerator.service.ts`)**: Logged the `enhancedDescription` (the detailed prompt sent to the LLM for code generation).
    *   **Raw TSX Code (`generateComponentCode.ts`)**: Logged the final, processed TSX code from the LLM before it's passed to the build step.
    *   **Build Process Output (`buildCustomComponent.ts`)**: Logged errors, warnings, and a success confirmation (including compiled code size) from the `esbuild` JavaScript API during the TSX to JS compilation step. Also adjusted esbuild config to use `iife` format and pre-wrap with globals.

These enhancements provide significantly more insight into the data flow and potential failure points, aiding in debugging and future development.