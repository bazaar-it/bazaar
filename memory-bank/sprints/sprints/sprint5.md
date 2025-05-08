
Sprint 5 – “Tool Registry v1”

Why

We outgrown the single-purpose chat.sendMessage – we need structured tool calls for future vision & rendering.

Sprint 5 (2 weeks)
	1.	Tool registry
	•	applyJsonPatch (sync) – replaces current in-procedure logic.
	•	analyzeImage (async stub) – enqueues job, returns jobId.
	2.	LLM refactor
	•	System prompt lists tools.
	•	New code loops handling function-calls vs assistant text.
	•	Old patch logic extracted into tools/applyJsonPatch.ts.
	3.	Background worker
	•	Simple Cron or Inngest function that picks pending analyzeImage jobs, calls GPT-Vision (stub), writes result.
	4.	Real-time delivery
	•	MVP: mutate tRPC query polling; Stretch: Pusher.
	5.	Developer docs – auto-generated /docs/tools page listing JSON schemas for each tool.

Scope
	1.	Tool registry module src/server/llm/tools.ts

export const tools = [
  { name: 'updateVideoState', description: 'RFC-6902 patch', parameters: jsonPatchSchema },
] satisfies OpenAIToolSchema[];


	2.	Refactor chat.sendMessage
	•	Pass tools array to OpenAI.
	•	On function call → validate input via Zod → run existing patch logic → respond.
	•	On normal assistant message → just persist/display.
	3.	Add analyzeImage stub (returns fake JSON) – no real vision yet, but lets the LLM see two tools and choose between them; unit test via jest mock.
	4.	E2E test – user uploads image, LLM calls analyzeImage, server returns caption "A cat", LLM then calls updateVideoState with a patch adding an image scene. Ensure round-trip succeeds.

Out of scope: actual GPT-Vision call, Lambda render, custom component generation.

⸻

Deliverables checklist for Sprint 5
	•	Zod schemas for each tool.
	•	Server loop handling multi-step tool calls until assistant returns content.
	•	Client shows intermediate “🤖 Analyzing image…” messages pushed via mutation polling (no WebSockets yet).
	•	Documentation page /docs/tools auto-generated from tool registry for dev reference.

⸻

Decision gate

If Sprint 4 lands clean (no red UX flags, patches still <100 ms), we merge to main, tag v0.2, then green-light Sprint 5.

Once you’re happy with this outline, we can craft Cursor prompts to scaffold the files and components for Sprint 4.