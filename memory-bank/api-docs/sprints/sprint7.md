# Sprint 7: Real-time Chat-Driven Component Creation & Streaming Optimization

## Key Metrics & Targets

| Metric | Current | Target | How We'll Measure |
|--------|---------|--------|-------------------|
| Assistant initial response time | ~1000ms | < 250ms | Client-side timing from submit → first assistant token |
| Time to first meaningful feedback | 3-5s | < 500ms | Submit → first "thinking" streamed token |
| Component generation success rate | ~70% | > 90% | (Success builds ÷ Total custom component requests) |
| Intent-to-code fidelity | No metric | > 85% | LLM self-evaluation score (1-100) |
| User repeat requests/refinements | ~30% | < 15% | % of components that need revision after first generation |
| Code quality pass rate | No metric | 100% | Binary metric: compilation + ESLint pass = 100%, fail = 0% |

## Core Philosophy

* **Chat as the Primary Interface**: All feedback, status updates, and refinements happen in chat
* **Maximum Transparency**: Real-time thought streams reveal what's happening at each step
* **No Loading Placeholders**: Keep the welcome video animation as the starting point, but never insert temporary loading placeholders for in-progress custom components
* **Proactive Quality Control**: Detect and fix issues before the user sees them

1. Streaming Chat Feedback Pipeline
---------------------------------

| Phase | What User Sees in Chat | Implementation | Response Time Target |
|-------|--------------------------|----------------|----------------------|
| T=0 (prompt received) | User's message sent | Existing flow | - |
| T=0+150ms | Assistant begins streaming: "Thinking about your wheel animation..." | Use Vercel AI SDK streaming response in chat.ts | **<150ms to first token** |
| T=0+300ms | Stream continues: "I'll create a spinning wheel with glowing blue spokes..." | OpenAI stream parameter=true, temperature=0.7 | Running stream |
| T=0+500ms | Stream updates: "Starting component generation now..." | Continue streaming while job creation starts | **<500ms to first status** |
| T=1-2s | Stream updates with job creation: "Component job queued, building..." | Update stream as job status changes | Real-time updates |
| T=5-10s | Final message: "✅ Done! Your spinning wheel is now ready. I've added it to the timeline at 0:08." | Replace stream with final message on success | **<10s to completed component** |
| Error case | Stream updates: "Hmm, I'm having trouble with that code. Let me try a different approach... [retry details]" | Surface errors in human-readable form | Immediate error feedback |

### Technical Implementation Details

**1. Message Updates vs. New Messages:**
We've implemented the **update approach** to avoid cluttering the chat with multiple system messages:

```typescript
// src/server/db/schema.ts
export const messages = pgTable('message', {
  // ... existing fields
  kind: varchar('kind').default('message'), // 'message' | 'status'
  status: varchar('status'), // 'pending' | 'building' | 'success' | 'error'
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// src/server/api/routers/chat.ts - update existing message
await db.update(messages)
  .set({
    content: "✅ Done! Component ready.",
    status: 'success',
    updatedAt: new Date(),
  })
  .where(eq(messages.id, statusMessageId));
```

**2. Streaming Implementation with Vercel AI SDK:**
We've implemented real-time streaming using the Vercel AI SDK and tRPC observables to hit the 150ms target while providing continuous feedback:

```typescript
// src/server/api/routers/chat.ts - Core streaming implementation
export const chatRouter = createTRPCRouter({
  // First initialize the chat session
  initiateChat: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      message: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Creates user message and placeholder assistant message
      // Returns the ID needed for streaming
      return { assistantMessageId };
    }),
    
  // Then stream the response
  streamResponse: protectedProcedure
    .input(z.object({
      assistantMessageId: z.string().uuid(),
      projectId: z.string().uuid(),
    }))
    .subscription(({ ctx, input }) => {
      // Return a subscription using observable
      return observable<StreamEvent>((emit) => {
        // Start a self-executing async function to handle the stream
        (async () => {
          try {
            // 1. Emit initial status immediately
            emit.next({ type: "status", status: "thinking" });
            
            // 2. Process OpenAI streaming response
            const stream = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: /* context */,
              stream: true,
              tools: TOOLS,
            });
            
            // 3. Process stream chunks with proper database updates
            // at critical points during streaming
          } catch (error) {
            // Handle errors with proper typing
          }
        })();
        
        // Return cleanup function
        return () => { /* cleanup */ };
      });
    })
});

// Real-time streaming events
export type StreamEvent =
  | { type: "status"; status: "thinking" | "tool_calling" | "building" }
  | { type: "delta"; content: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_result"; name: string; success: boolean; jobId?: string | null; finalContent?: string }
  | { type: "complete"; finalContent: string }
  | { type: "error"; error: string; finalContent?: string }
  | { type: "finalized"; status: "success" | "error" | "building" | "pending"; jobId?: string | null };

// Client-side implementation
const handleSubmit = async (message: string) => {
  // 1. First, initiate the chat and get the placeholder message ID
  const { assistantMessageId } = await api.chat.initiateChat.mutate({
    projectId,
    message,
  });
  
  // 2. Connect to the streaming subscription
  const subscription = api.chat.streamResponse.subscribe(
    { assistantMessageId, projectId },
    {
      onData: (event) => {
        // Handle different event types
        switch (event.type) {
          case "status":
            updateMessageStatus(assistantMessageId, event.status);
            break;
          case "delta":
            appendMessageContent(assistantMessageId, event.content);
            break;
          case "complete":
            finalizeMessage(assistantMessageId, event.finalContent);
            break;
          // ... handle other event types
        }
      },
      onError: (error) => handleStreamError(error, assistantMessageId),
    }
  );
};
```

**3. UX Risk Mitigation:**
- We maintain the welcome video as a starting point (never blank screens) 
- Chat provides continuous real-time updates to keep users oriented
- The video timeline shows exactly where the component will appear

**Implementation Details:**
- Add a subtle, unobtrusive overlay for lengthy builds:

```tsx
// src/remotion/compositions/DynamicVideo.tsx
// Add this inside the AbsoluteFill for builds over ~8 seconds
// The overlay will not appear in the final exported video

{isBuilding && buildTime > 8000 && (
  <div style={{
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 12,
    opacity: 0.8,
    pointerEvents: 'none', // ensures it doesn't interfere with interactions
    transition: 'opacity 0.5s',
  }}>
    Compiling custom component...
  </div>
)}
```

- Optimize build time through smarter code generation
- Use selective bundling to reduce compilation time
- Implement parallel processing for component builds
- External React/Remotion reference for smaller bundles:

```typescript
// src/server/workers/buildCustomComponent.ts
export async function buildCustomComponent(job: CustomComponentJob): Promise<void> {
  // Add this wrapper to the generated code
  const codeWithExternals = `
    // Make React and Remotion globals available to the component
    // This is required when externalizing these dependencies
    if (typeof window !== 'undefined') {
      globalThis.React = React;
      globalThis.Remotion = Remotion;
    }
    
    ${job.tsxCode}
  `;
  
  // Configure esbuild with externals
  const result = await esbuild.build({
    stdin: {
      contents: codeWithExternals,
      loader: 'tsx',
      resolveDir: process.cwd(),
    },
    bundle: true,
    external: ['react', 'remotion'], // Make these external
    format: 'esm',
    // Other options...
  });
  
  // Rest of implementation...
}
```

**Optimization Targets:**
- Reduce average build time from ~8s to <5s
- Eliminate all "loading" UI in favor of informative chat
- Provide specific progress indicators through chat

2. Code Quality & Fidelity Improvements
-------------------------------------

### Two-Phase Prompting with Quality Gates

**Phase 1 & 2: Parallel Intent Extraction & Code Generation**
```typescript
// src/server/workers/generateComponent.ts
export async function generateComponent(prompt: string) {
  // Start both phases immediately without waiting
  const intentPromise = openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Extract the exact visual intent from this animation request" },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2 // Lower temperature for more consistent parsing
  });
  
  // Immediately kick off the code generation (Phase 2) in parallel
  // This saves ~300ms vs sequential calls
  const codePromise = openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: `Generate Remotion component code for this animation request. 
                 Focus on matching the visual intent exactly.` 
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.7
  });
  
  // Wait for both to complete
  const [intentResponse, codeResponse] = await Promise.all([intentPromise, codePromise]);
  
  // Parse intent for storage and validation
  const intent = JSON.parse(intentResponse.choices[0].message.content || "{}");
  const tsxCode = codeResponse.choices[0].message.content || "";
  
  // Note: We don't use the intent to guide code generation in this approach,
  // but we still store it for evaluation and debugging purposes
  return {
    intent,
    tsxCode,
    // Run quick validation on the generated code
    isValid: validateGeneratedCode(tsxCode)
  };
}
```

**Phase 2: Code Generation with Validation (Target success rate: >90%)**

- Add unit tests for component code output
- Implement token-by-token code validation
- Perform static analysis on generated code before compilation
- Apply code formatting standards (ESLint, Prettier)

**Automatic Code Quality Improvements:**
- Enforce TypeScript strict mode for all generated code
- Add JSDoc comments for all generated functions and components
- Ensure consistent code style with example components
- Validate dependencies and imports
- Check for common animation performance issues
- Verify all Remotion API usage is correct

**Measurable Quality Metrics:**
- Code reliability score (pass/fail for TS compile)
- Code readability score (based on complexity metrics)
- Performance score (animation frame rate estimate)
- Intent fidelity score (LLM self-assessment)

3. No-Placeholder Real-Time Generation
------------------------------------

**Instead of placeholder scenes:**
- Keep the welcome video animation as the starting point
- Only update the preview when the actual component is ready
- Keep users engaged with detailed streaming thought process in chat
- Show realistic time estimates based on component complexity

**Implementation Details:**
- Add a subtle, unobtrusive overlay for lengthy builds:

```tsx
// src/remotion/compositions/DynamicVideo.tsx
// Add this inside the AbsoluteFill for builds over ~8 seconds
// The overlay will not appear in the final exported video

{isBuilding && buildTime > 8000 && (
  <div style={{
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: 4,
    fontSize: 12,
    opacity: 0.8,
    pointerEvents: 'none', // ensures it doesn't interfere with interactions
    transition: 'opacity 0.5s',
  }}>
    Compiling custom component...
  </div>
)}
```

- Optimize build time through smarter code generation
- Use selective bundling to reduce compilation time
- Implement parallel processing for component builds
- External React/Remotion reference for smaller bundles:

```typescript
// src/server/workers/buildCustomComponent.ts
export async function buildCustomComponent(job: CustomComponentJob): Promise<void> {
  // Add this wrapper to the generated code
  const codeWithExternals = `
    // Make React and Remotion globals available to the component
    // This is required when externalizing these dependencies
    if (typeof window !== 'undefined') {
      globalThis.React = React;
      globalThis.Remotion = Remotion;
    }
    
    ${job.tsxCode}
  `;
  
  // Configure esbuild with externals
  const result = await esbuild.build({
    stdin: {
      contents: codeWithExternals,
      loader: 'tsx',
      resolveDir: process.cwd(),
    },
    bundle: true,
    external: ['react', 'remotion'], // Make these external
    format: 'esm',
    // Other options...
  });
  
  // Rest of implementation...
}
```

**Optimization Targets:**
- Reduce average build time from ~8s to <5s
- Eliminate all "loading" UI in favor of informative chat
- Provide specific progress indicators through chat

4. Measurable Success Metrics & Risk Mitigation
------------------------------------------

### Detailed Metric Definitions 

| Metric | Target | Precise Definition | Implementation |
|--------|--------|-------------------|----------------|
| Response Time | <150ms | Time from user submit to first assistant token | `performance.now()` delta in ChatPanel |
| Streaming Start | <500ms | Time to first meaningful content token (not just "...") | Custom token parsing in client |
| Build Success Rate | >90% | `(successful_builds / total_jobs) * 100` | Aggregated from job status table |
| Code Quality Score | >85/100 | Weighted average: <br>- TypeScript errors (30%)<br>- ESLint violations (30%)<br>- Code complexity (20%)<br>- Comment coverage (20%) | Static analysis in build process |
| Intent Fidelity | >85% | `(llm_score * 0.6) + (user_feedback * 0.4)` on 1-100 scale | Combined score stored with job |
| User Revisions | <15% | % of components that receive "improve this" request | Track follow-up requests with same job ID |

### Error Handling Strategy

```typescript
// src/server/api/routers/customComponent.ts
export const customComponentRouter = createTRPCRouter({
  // Existing endpoints...
  
  handleComponentError: protectedProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      errorType: z.enum([
        'llm-intent',        // Failed to extract intent from prompt
        'llm-generation',   // Failed to generate component code
        'ts-compilation',   // TypeScript errors in generated code
        'build-failure',    // esbuild compilation failure
        'runtime-error'     // Error when component runs
      ]),
      errorDetails: z.string().optional(),
      retry: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the component job
      const job = await ctx.db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, input.jobId)
      });
      
      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      // Record the error
      await ctx.db.insert(componentErrors).values({
        id: crypto.randomUUID(),
        jobId: input.jobId,
        errorType: input.errorType,
        details: input.errorDetails,
        createdAt: new Date()
      });
      
      // Update message to reflect error
      if (job.statusMessageId) {
        await ctx.db.update(messages)
          .set({
            status: 'error',
            content: getErrorMessage(input.errorType, input.errorDetails),
            updatedAt: new Date()
          })
          .where(eq(messages.id, job.statusMessageId));
      }
      
      // Handle retry if requested
      if (input.retry && job.retryCount < 3) {
        // Retry logic based on error type
        return handleRetry(job, input.errorType);
      }
      
      return { success: false, message: 'Error recorded' };
    }),
});
```

### Risk Mitigation Plan

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|--------------------|
| Sub-250ms response times not achievable | Medium | High | Fallback streaming strategy with client-side tokens while waiting for server |
| LLM self-assessment unreliable | High | Medium | Combine with user feedback; baseline calibration with human-reviewed samples |
| Users confused by lack of visual feedback | Medium | High | A/B test with small user group; add subtle timeline indicator if needed |
| Build process exceeds 10s target | High | Medium | Progressive optimization: identify bottlenecks in pipeline and prioritize them |
| Stream interruptions | Medium | High | Robust reconnection logic; message state persistence in DB |
| OpenAI rate-limit spikes (429 errors) | Medium | High | Implement exponential back-off + user-facing chat notice "Waiting for capacity..." |
| Browser compatibility issues | Medium | Medium | Test in all major browsers; fallback modes for Safari/Firefox |

### Monitoring Dashboard

```typescript
// src/lib/metrics.ts
export const metricDefinitions = {
  'initial-response': {
    title: 'Initial Response Time',
    description: 'Time from submit to first assistant token',
    target: 150, // ms
    unit: 'ms',
    alert_threshold: 250, // Alert if consistently above
  },
  'streaming-start': {
    title: 'Meaningful Streaming Start',
    description: 'Time to first real content token',
    target: 500, // ms
    unit: 'ms',
    alert_threshold: 1000,
  },
  'build-success-rate': {
    title: 'Build Success Rate',
    description: 'Percentage of successful builds',
    target: 90, // %
    unit: '%',
    alert_threshold: 80,
  },
  'intent-fidelity': {
    title: 'Intent Fidelity Score',
    description: 'How well component matches user intent',
    target: 85, // out of 100
    unit: '',
    alert_threshold: 75,
  },
  'code-quality': {
    title: 'Code Quality Score',
    description: 'Static analysis quality score',
    target: 85, // out of 100
    unit: '',
    alert_threshold: 75,
  },
  'user-revisions': {
    title: 'User Revision Rate',
    description: 'Percentage of components needing revision',
    target: 15, // %
    unit: '%', 
    alert_threshold: 25,
  }
};
```

**Daily Monitoring:**
- Automated alerts when metrics fall below threshold for >30 minutes
- Daily report with trend analysis emailed to the team
- Weekly review of failed builds to identify common patterns
- Dedicated dashboard for real-time metrics visualization

## User Experience Example (Ideal Flow)

| Time | What Happens | Technical Process |
|------|-------------|-------------------|
| T+0ms | User: *"Give me spinning futuristic bike wheels with glowing spokes"* | User submits message |
| T+150ms | Assistant: *"Thinking about your request for futuristic bike wheels..."* | First streamed token appears (timed via client metrics) |
| T+300ms | Assistant continues: *"I'm going to create a component with glowing blue spokes that spin smoothly..."* | Stream continues, intent extraction begins |
| T+500ms | Assistant adds: *"Now generating the component code..."* | Component job creation starts, stream continues |
| T+1.5s | Assistant streams detailed plan: *"I'll make the wheels have a metallic rim with 12 radiant spokes that pulse from center to edge. They'll rotate at 15rpm with a slight motion blur effect..."* | Intent extraction complete, code generation in progress |
| T+3s | Assistant updates: *"Building your component now..."* | Code generated, esbuild compiling TSX → JS bundle |
| T+7s | Assistant: *"✅ Your futuristic wheels are ready! I've placed them in the timeline at 0:08. The spokes glow with a blue pulse as they spin. Would you like me to make them spin faster or change the color?"* | Component successfully built and inserted, preview updates directly to final version |

During this entire process, **the preview shows nothing until the final component is ready**, avoiding UI noise and focusing attention on the rich, informative chat experience.

### Error Handling Example

| Time | What Happens | Technical Process |
|------|-------------|-------------------|
| T+3s | Assistant: *"Hmm, I'm having a slight issue with the spoke animation. Let me fix that..."* | Error detected during build process |
| T+5s | Assistant: *"I've adjusted the approach - using a different animation technique for the spokes that will work better with Remotion..."* | Auto-retry with modified code |
| T+8s | Assistant: *"✅ Success! Your wheels are ready. I had to make a small technical adjustment to ensure smooth animation, but they match your description perfectly."* | Recovery successful, component inserted |

The approach centers on **maximum transparency** while keeping the user engaged, with no failed previews or loading placeholders.








Custom Component → Video Preview Pipeline: File Reference & Flow
===============================================================

### 1. Sidebar UI: Insert Custom Component

* File: `src/app/projects/[id]/edit/Sidebar.tsx`
* Component: `CustomComponentsSidebar`
* What it does:
	+ Lists all custom component jobs for the user/project.
	+ Handles UI for inserting a custom component into the video (via JSON patch).
	+ When "insert" is triggered, creates a new scene with type: "custom" and data.componentId = job.id and appends it to the scenes array.

### 2. State Management: Video Props

* File: `src/stores/videoState.ts`
* What it does:
	+ Holds the canonical inputProps for the current video in Zustand.
	+ applyPatch and replace methods update the state when a component is inserted or when the backend pushes a new version.

### 3. Preview Panel: Polling & Rendering

* File: `src/app/projects/[id]/edit/panels/PreviewPanel.tsx`
* Component: `PreviewPanel`
* What it does:
	+ Polls the backend every second for updated project props.
	+ When props change, calls replace in Zustand to update local state.
	+ Renders the video preview using `<Player component={DynamicVideo} inputProps={inputProps} ... />`.

### 4. Dynamic Video Composition

* File: `src/remotion/compositions/DynamicVideo.tsx`
* Component: `DynamicVideo`
* What it does:
	+ Iterates through all scenes in inputProps.scenes.
	+ For each scene, looks up the scene type in sceneRegistry.
	+ For type: "custom", uses the CustomScene component.
	+ Handles transitions between scenes.

### 5. Scene Registry & CustomScene

* File: `src/remotion/components/scenes/index.ts`
	+ Maps "custom" to CustomScene.
* File: `src/remotion/components/scenes/CustomScene.tsx`
	+ Extracts componentId from data.
	+ Renders `<RemoteComponent componentId={componentId} {...data} />`.

### 6. Remote Component Loader

* File: `src/hooks/useRemoteComponent.tsx`
* What it does:
	+ Dynamically loads the custom component JS from /api/components/[componentId] using a script tag.
	+ Exposes the loaded React component globally as window.__REMOTION_COMPONENT.
	+ Handles loading and error states gracefully.

## Legend – Target Files/Modules

① **Sidebar**: `Sidebar.tsx`  
② **Zustand**: State Management  
③ **Preview Panel**: `PreviewPanel.tsx`  
④ **Dynamic Video**: `DynamicVideo.tsx`  
⑤ **Custom Scene**: `CustomScene.tsx`  
⑥ **Remote Component Hook**: `useRemoteComponent.tsx`  
*(Backend file names are mentioned inline below)*

---

---

## Tickets for Sprint 7

### Ticket #1 - DB & Types

*   Prisma / Drizzle migration
*   Add to messages table:
    *   `ts`
    *   `CopyInsert`
    *   `kind`   `varchar`  `default 'message'`  // 'message' | 'status'
    *   `status` `varchar`  `nullable`           // 'pending' | 'building' | 'success' | 'error'
    *   `updated_at` `timestamp` `default now()`
*   Add to custom_component_jobs:
    *   `ts`
    *   `CopyInsert`
    *   `status_message_id` `uuid` `nullable references messages(id)`
    *   `retry_count`       `int`  `default 0`
*   New table component_errors (jobId, errorType, details, createdAt)
*   TypeScript types in src/server/db/schema.ts + Zod models update
*   Data-backfill script (sets kind='message' on existing rows)

### Ticket #2 - Streaming API (Vercel AI SDK)

*   `src/server/api/routers/chat.ts`
*   Switch from `json()` response to `experimental_stream()` helper
*   Start the “thinking-dots” stream immediately; pipe OpenAI tokens as they arrive
*   Persist a “status” message row (pending) and stream its id to the client
*   Exponential back-off util for 429 errors (wrapped in `retryWithBackoff`)
*   Metrics hook - record initial-response-time when first token flushed

### Ticket #3 - Front-End Chat Streaming

*   `ChatPanel.tsx`
*   Replace `fetch('/api/chat')` with `const { stream, messageId } = startStream()`
*   Safari-safe interval clearing (code already in doc)
*   If `supportsMessageEditing`  `PATCH messages/:id` via tRPC; else hide superseded msg with `opacity: 0.5`
*   Client perf hooks to emit `performance.now()` deltas into `/api/metrics`

### Ticket #4 - Build Worker Optimisation

*   `src/server/workers/buildCustomComponent.ts`
*   Wrap generated TSX with globalThis.React / Remotion snippet
*   `esbuild`   `external: ['react','remotion'], format:'esm'`
*   Cap worker pool to cpuCount - 1 threads (piscina or a simple queue)
*   Metric emit: build duration ms and success/failure boolean

### Ticket #5 - Overlay for Long Builds

*   `src/remotion/compositions/DynamicVideo.tsx`
*   Local `isBuilding` flag from Zustand (videoState.buildingJobs.length > 0)
*   Render the “Compiling…” `<div>` overlay only when buildTime > 8000
*   Ensure `exportComposition()` path sets `overlayStyle.display='none'`

### Ticket #6 - Parallel Two-Phase Prompt Worker

*   New util `generateComponent.ts` (code from doc)
*   Unit test: prompt   returns `{ intent, tsxCode, isValid:true }` in <1.2 s (jest timeout 3 s)
*   Store intent JSON in `custom_component_jobs.metadata`

### Ticket #7 - Error & Retry Endpoint

*   `customComponentRouter.handleComponentError` (code from doc)
*   `handleRetry()` increments `retry_count` and re-queues job if <3
*   Chat status message updated with human-friendly error

### Ticket #8 - Dashboards & Alerts

*   Tiny endpoint `/api/metrics POST`   inserts into metrics table
*   Grafana (or Logflare) dashboard JSON committed under `infra/grafana/`
*   Vercel Cron job nightly email summary