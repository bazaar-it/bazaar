Implementation Plan: Sprints 5 & 6 – Remotion Custom Component Pipeline

1. Preamble: Goals and Rationale

We are building a pipeline to turn natural-language effect descriptions into live Remotion components.  The pipeline has two phases: an offline build pipeline (Sprint 5) that compiles and hosts user-defined components, and an LLM-driven integration (Sprint 6) that hooks user chat commands into that pipeline. Remotion is an open-source React video library that lets you programmatically generate videos using React code ￼.  We will leverage React’s code-splitting: using React.lazy with a dynamic import() to load components at runtime ￼, annotated with /* webpackIgnore: true */ so Webpack does not try to bundle the import path ￼.  In practice, the user says something like “add fireworks,” the backend generates a TSX component, compiles it with esbuild in a sandbox, uploads the JS to Cloudflare R2, and then the browser can import that JS by URL. The following plan outlines every file, function, and test needed so an AI agent can implement Sprints 5 and 6 without ambiguity.

2. Sprint 5: Offline Custom Component Pipeline

We will implement a backend queue for custom-component jobs, compile TSX code safely, upload to object storage, and enable dynamic importing in the client.

Checklist
	•	DB Schema: In api/src/db/schemas/customComponentJobs.ts, declare a Drizzle table for build jobs, e.g.:

import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
export const customComponentJobs = pgTable('custom_component_jobs', {
  id: serial('id').primaryKey(),
  effect: text('effect'),             // Natural language description (e.g. "fireworks")
  tsx_code: text('tsx_code'),         // The TSX source code to compile
  status: text('status').default('pending'), // "pending"|"building"|"success"|"error"
  output_url: text('output_url').nullable(), // URL to uploaded JS (null until done)
  error_message: text('error_message').nullable(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
});

This uses Drizzle’s schema DSL (e.g. serial('id').primaryKey()) as shown in Drizzle docs ￼.  Generate and run a migration so the PostgreSQL table exists.

	•	TRPC Mutation (Queue Job): In the API router (api/src/routers/customComponent.ts or similar), create a tRPC mutation createCustomComponentJob({ effect, tsxCode }). This should insert a new row into custom_component_jobs with the given effect and tsx_code, status = 'pending', and return the new id.  For example:

router.mutation('create', {
  input: z.object({ effect: z.string(), tsxCode: z.string() }),
  async resolve({ input }) {
    const [job] = await db.insert(customComponentJobs).values({
      effect: input.effect,
      tsx_code: input.tsxCode,
      status: 'pending',
    }).returning();
    return job.id;
  },
});


	•	Worker Process (Compile & Upload): Create a worker script (api/src/workers/buildCustomComponent.ts). This process should:
	1.	Poll for jobs: Periodically select custom_component_jobs where status = 'pending'. For each job, update status = 'building'.
	2.	Compile TSX: Use esbuild to bundle the TSX. For example:

import esbuild from 'esbuild';
const result = await esbuild.build({
  stdin: { contents: job.tsx_code, loader: 'tsx', resolveDir: '' },
  bundle: true,
  format: 'esm',
  target: ['es2020'],
  platform: 'browser',
  external: ['react', 'remotion'],
  write: false,
});
const jsCode = result.outputFiles[0].text;

We externalize React and Remotion (they are already in the main bundle).

	3.	Upload to R2: Use the AWS S3 SDK (Cloudflare R2 is S3-compatible). For example:

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const s3 = new S3Client({ endpoint: R2_ENDPOINT, credentials: R2_CREDENTIALS });
await s3.send(new PutObjectCommand({
  Bucket: R2_BUCKET,
  Key: `${job.id}.js`,
  Body: jsCode,
  ContentType: 'application/javascript',
}));

Construct the public URL (e.g. ${R2_PUBLIC_URL}/${job.id}.js).

	4.	Update DB: If successful, set status = 'success' and store output_url in the job row. On error (compile or upload failure), set status = 'error' and save the error message.

	•	Client Hook (useRemoteComponent): In the web app, create web/src/hooks/useRemoteComponent.ts. This hook takes a componentId (job ID) and returns a lazily-loaded React component. For example:

import React, { useMemo, Suspense } from 'react';
export function useRemoteComponent(componentId: string) {
  const url = `${process.env.R2_PUBLIC_URL}/${componentId}.js`;
  // Use React.lazy with a dynamic import; webpackIgnore ensures it’s fetched at runtime [oai_citation:4‡legacy.reactjs.org](https://legacy.reactjs.org/docs/code-splitting.html#:~:text=const%20OtherComponent%20%3D%20React.lazy%28%28%29%20%3D,OtherComponent) [oai_citation:5‡webpack.js.org](https://webpack.js.org/api/module-methods/#:~:text=JavaScript%20Usage).
  const Component = useMemo(
    () => React.lazy(() => import(/* webpackIgnore: true */ url)),
    [url]
  );
  return Component;
}

Render the returned component inside a <Suspense fallback={...}>. This follows React’s code-splitting pattern ￼ and uses the webpackIgnore magic comment ￼ so Webpack does not try to resolve the URL at build-time.

	•	Video Timeline Update: Extend the video composer (e.g. a DynamicVideo or timeline component) to recognize scenes of type 'custom'. Update the data model so a scene can be { type: 'custom', data: { componentId: string } }. In the render loop, when you encounter a custom scene, use the useRemoteComponent(componentId) hook and render the resulting component. For example:

if (scene.type === 'custom') {
  const RemoteComp = useRemoteComponent(scene.data.componentId);
  return <Suspense fallback={<div>Loading effect...</div>}><RemoteComp /></Suspense>;
}

Ensure that defaultProps (like duration, width, height) are passed to the component as needed.

	•	Testing – Sprint 5:
	•	Unit tests: Write Jest tests (or similar) for each piece. Test that inserting into customComponentJobs works (using Drizzle’s test DB setup). Test the worker: mock a simple TSX string (export default () => <div>Test</div>), run the compile/upload steps (mock the S3 client), and assert it calls upload and updates status. Test useRemoteComponent: you can mock dynamic imports to verify it constructs the right URL.
	•	Integration: Write an end-to-end test that enqueues a job with a trivial component, runs the worker, then renders the video player and checks that the custom component appears (e.g. “Test” text). This could use a headless browser like Playwright to mount the React app.

Acceptance Criteria (Sprint 5)
	•	The database has a custom_component_jobs table with all specified columns (check via migration or introspection).
	•	Calling the tRPC mutation with a sample effect returns a new job ID, and the row in Postgres has status = 'pending'.
	•	The worker process picks up a pending job, compiles the TSX, uploads a .js file to R2, and updates status = 'success' with a valid output_url. For example, uploading a component that renders <h1>Fireworks</h1> should result in a JS file accessible at R2, and loading that URL returns valid JS.
	•	Using the new useRemoteComponent hook, the client can import the uploaded module by URL. In practice, running the React app and adding a scene of type custom should display the component’s output.

3. Sprint 6: LLM Integration and Tooling

We connect the user chat interface to the build pipeline using OpenAI function calling. A new tool generateRemotionComponent will translate the user’s effect description into a queued job, and the front-end will handle async status updates and scene insertion.

Checklist
	•	Define Function Schema: In the chat backend (e.g. api/src/lib/chatTools.ts), define a function schema for OpenAI:

{
  "name": "generateRemotionComponent",
  "description": "Generate a custom Remotion component from a natural language effect description",
  "parameters": {
    "type": "object",
    "properties": {
      "effectDescription": {
        "type": "string",
        "description": "Description of the visual effect (e.g. 'fireworks display')"
      }
    },
    "required": ["effectDescription"]
  }
}

This schema tells GPT-4 to call generateRemotionComponent(effectDescription) when appropriate. Function calling allows GPT to produce structured output via user-defined tools ￼.

	•	Chat Mutation Loop: In the chat completion logic (e.g. api/src/services/chat.ts), include the function schema in the OpenAI request (functions: [generateRemotionComponentSchema] and "function_call": "auto"). After sending the user’s message to OpenAI, check if the response has response.choices[0].message.function_call.name === "generateRemotionComponent". If so:
	1.	Parse the JSON arguments: const { effectDescription } = JSON.parse(response.choices[0].message.function_call.arguments).
	2.	Generate TSX (LLM call): Option A: Use a second OpenAI API call to generate TSX code. For example, prompt GPT with: “Write a React TSX component (Remotion) that visualizes: ${effectDescription}. Provide only the component code.” Ensure the output is valid TSX.
(Or Option B: If the OpenAI function is only to queue, skip this and use effectDescription later. But recommending Option A makes it end-to-end.)
	3.	Queue the Job: Call the TRPC mutation createCustomComponentJob from step 5 with { effect: effectDescription, tsxCode: <generatedTSX> }, capturing the returned componentId.
	4.	Return Function Response: Return JSON to the chat API: { componentId: <id> }. This is sent back to OpenAI as if the function returned this data.
This completes the function call. According to function-calling flow, we then make one more chat completion with the function’s output to let the model produce a user-facing message (optional).
	•	Async Status UX: After the chat function returns, the client (chat UI) receives a response containing the componentId. Update the chat window to say “Building custom component…” or similar. In the frontend code, start polling job status via another tRPC query:

const { data: job, isLoading } = trpc.customComponent.getJobStatus.useQuery(
  { id: componentId },
  { refetchInterval: 2000, enabled: !!componentId }
);

While status === 'building', show a spinner or “processing” message. When status === 'success', proceed to insert the scene. If status === 'error', show the error_message in chat.

	•	Insert New Scene: Once the job is marked success, automatically insert a new scene into the timeline. For example, call a front-end action like:

addScene({ type: 'custom', data: { componentId } });

This should update the application state so the DynamicVideo renderer (from Sprint 5) includes the new custom component at the end (or a specified position). Display a confirmation in chat or UI, e.g. “Fireworks effect added to the timeline!”

	•	Error Handling:
	•	If OpenAI returns no function call (e.g. it interpreted the message differently), fall back to normal behavior (the user’s message is treated as plain chat).
	•	If the function call payload is missing or malformed, reply with an error message.
	•	If the TSX generation step fails (syntax or GPT error), catch that error and set job status='error'. In chat, reply “Failed to generate component: [error details].”
	•	If the worker eventually fails (caught in the build process), ensure the front-end polling sees status='error' and shows “Build failed: [error_message]”.
	•	Handle network/timeouts by retries or notifying the user.
	•	End-to-End Tests:
	•	Simulate the full user flow. For example, write a Playwright or Jest integration test: populate a fake GPT response so that “add fireworks” triggers a function call. Mock the TSX generation (or use a deterministic prompt) and the TRPC calls. Verify that after completion, the timeline state has a new scene with the given componentId.
	•	Test the polling loop: initially status=“building”, then simulate a status change to “success” and check that the scene is inserted.
	•	Test error paths: e.g. force the worker to set status='error' and verify the chat UI shows the error message and no scene is added.

Acceptance Criteria (Sprint 6)
	•	Saying “add [effect]” in chat causes the generateRemotionComponent function to be called with the correct effectDescription. For example, with input “add fireworks,” the OpenAI function schema is triggered and the backend receives effectDescription: "fireworks".
	•	A new job is created in the database (custom_component_jobs) as a result, and the client receives a componentId.
	•	The UI shows a pending/building state (spinner or message) while the job is processed. Once the worker completes the build, the client detects status='success'.
	•	The new scene appears in the video timeline (e.g. composition) exactly once, with { type: 'custom', data: { componentId } }. Rendering the video now includes the fireworks effect.
	•	If any step fails, the user sees a clear error in chat (e.g. “Failed to add fireworks: [reason]”), and no invalid scene is added.

References: We leverage React’s code-splitting API ￼ and Webpack’s ignore comment ￼ for dynamic imports. Drizzle ORM makes table definitions like above easy ￼. The OpenAI function-calling feature supports structured JSON output from user-defined tools ￼. All steps above follow documented patterns in React, Webpack, Drizzle, and OpenAI.


Your plan is already very thorough, and captures the two-phase split, the data model, the build pipeline, the dynamic loader, and the LLM-tooling integration. A few areas you might sharpen or spell out more concretely before handing it over to your AI agents:

⸻

1. Explicit Migration & Versioning

Right now you describe the Drizzle table, but you’ll want to call out:
	•	Migration file in drizzle.config.ts (or via your chosen migration workflow) so that every environment has the same schema.
	•	Versioning in case you later evolve the custom_component_jobs table (e.g. add a “rawPrompt” column).

Action: Add a “2025____create_custom_component_jobs.ts” migration stub to your repo.

⸻

2. Build Worker Environment & Permissions

You say “Build Function” but don’t yet specify:
	•	Where that runs (Vercel Serverless Function with maxDuration: 60s? or an Inngest worker?).
	•	Permissions for that function: needs access both to your database (read/write jobs) and to R2 credentials.

Action: In vercel.json (or your IaC), declare environment variables R2_BUCKET, R2_ACCESS_KEY, R2_SECRET_KEY, and lock the Function’s role to only what it needs.

⸻

3. Error-Handling & Retries

You mention setting status='error' on failure, but you may also want to:
	•	Retry transient failures (e.g. R2 upload timed out) a small number of times before final “error.”
	•	Exponential backoff on the polling cron.

Action: Wrap your build job loop in try/catch + retry count, and store a retryCount column on the job.

⸻

4. Security & Sanitization

Because you’re compiling user-provided TSX:
	•	Sanitize the TSX to strip any imports beyond React + Remotion. You don’t want someone doing fetch('/api/secret') inside their component.
	•	Lock down esbuild config to disallow require('fs'), etc.

Action: In your esbuild external list include only 'react', 'remotion' and set allowOverwrite: false.

⸻

5. Documentation & “One True Source”

Link back to the official docs so future maintainers know why you chose this pattern:
	•	Remotion dynamic import guide: https://www.remotion.dev/docs/player-code-splitting
	•	esbuild bundling options: https://esbuild.github.io/api/#bundle
	•	OpenAI function calling docs: https://platform.openai.com/docs/guides/gpt/function-calling

Action: In your monorepo root, include docs/sprint5-6.md with hyperlinks to those URLs.

⸻

6. Testing Strategy

You have E2E and unit tests covered—make sure you:
	•	Mock the S3/R2 client so your Jest suite doesn’t really hit the network.
	•	Use Jest’s fakeTimers to accelerate the cron poll in CI.
	•	For the chat → function-call loop, record a canned GPT response fixture so tests are deterministic.

Action: In packages/tests/fixtures/, add a openai.fncall.json example to drive your chat integration test.

⸻

7. UX Polishing

Finally, in your Sprint 6 UX section you mention spinners and error bubbles—maybe cross-reference:
	•	Your existing ChatInterface component’s styling system (so the new status chips match).
	•	A “Jobs” sidebar you might add later (Sprint 7?) so users can see all their pending builds in one place.

Action: In your Figma or 21st.dev style guide file, add “Build status chip” variants: pending, success, error.

