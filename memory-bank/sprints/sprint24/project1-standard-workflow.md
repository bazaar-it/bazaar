Project 1 – Standard Workflow: Best-of-Both-Worlds Edition

This document fuses the two “Standard Workflow” write-ups into a single, streamlined reference. It keeps every useful detail, removes duplication, and highlights the forward path toward an event-driven, job-based architecture.

⸻

1. Purpose & Scope
	•	Project 1 is Bazaar-Vid’s traditional, direct-service workflow that powers the /projects/[id]/edit experience.
	•	This document covers:
	•	The current end-to-end pipeline (prompt → video preview)
	•	Key files & services and how they interact
	•	Pain points that limit reliability and velocity
	•	An idealized architecture that blends event-driven patterns with today’s simpler sync flow
	•	Migration steps to get there without a big-bang rewrite
	•	A quick contrast with the A2A agent system to clarify boundaries

⸻

2. Current End-to-End Pipeline

#	Stage	What Happens	Primary Code Paths
1	User Input	User types a prompt in ChatPanel inside /projects/[id]/edit	src/app/projects/[id]/edit/panels/ChatPanel.tsx
2	Send Message	tRPC mutation chat.sendMessage persists the user line & a blank assistant stub	src/server/api/routers/chat.ts
3	LLM Orchestration	processUserMessage() builds context, streams to OpenAI (function calling on)	chatOrchestration.service.ts
4	Stream Handling	Incoming chunks can be plain text or function/tool calls	same file
5	Tool Execution	Three core tools executed as they appear: • applyJsonPatch (project props) • generateRemotionComponent (custom TSX) • planVideoScenes	toolExecution.service.ts + dedicated services
6	Component Generation	- Create job → generate code → build TSX → write to DB/storage	componentGenerator.service.tsworkers/generateComponentCode.tsworkers/buildCustomComponent.ts
7	Scene Planning	Natural-language scene plan → structured DB rows → timeline update	scenePlanner.service.ts
8	Real-time UI Updates	SSE pushes: LLM deltas, tool status, job progress	chatOrchestration.service.ts (SSE emitter)
9	Preview & Editing	PreviewPanel renders components; TimelinePanel shows sequence; user tweaks	panels under src/app/.../panels
10	Render Export	Remotion render invoked when user requests final video	same page flow

Key Assumptions
	1.	Single-user, single-project active at a time
	2.	Mostly synchronous service chaining
	3.	Direct calls yield tight coupling
	4.	OpenAI availability is assumed
	5.	Limited mid-stream error recovery

⸻

3. Problems We Feel Today

Category	Pain
Monolithic Orchestration	chatOrchestration.service.ts does everything—hard to test or evolve
Tight Coupling	Service A calls service B calls service C. One change ripples everywhere
Sequential Bottlenecks	Long component builds block further LLM streaming
Poor Recovery	If a build fails mid-stream, chat hangs and UI gets half-baked state
Observability Gaps	Logs are inconsistent; tracing a single prompt end-to-end is tough


⸻

4. Ideal “Best-of-Both” Architecture

We don’t need a full A2A agent swarm for simple chat→video flows, but we do want event-driven decoupling, job tracking, and better tracing.

graph TD
  A(User Prompt) -->|MessageEvent| B(LLM Service)
  B -- ToolCallEvent --> C{Event Router}

  C -->|applyJsonPatch| D(JSON-Patch Svc)
  C -->|generateRemotionComponent| E(Component Svc)
  C -->|planVideoScenes| F(Scene Planner)
  C -->|other| G(Other Tools)

  D -->|StateUpdateEvent| H(UI Update)
  E -->|ComponentBuiltEvent| H
  F -->|ScenePlanEvent| H
  G -->|ResultEvent| H
  H --> I(Browser UI)

Guiding Principles
	1.	Lightweight Event Bus
– In-process (Node EventEmitter or tiny Pub/Sub) first → Kafka/Redis later
	2.	Job-Based Long Tasks
– Component build & render become jobs with status rows, retries, checkpoints
	3.	Slim, Focused Services
– Split orchestration: LLM-only, Tool Executor, Component Builder, Scene Planner
	4.	Stateless Workers
– Workers pull jobs; state lives in DB + object storage
	5.	Uniform Error Strategy
– Every event carries contextId + attempt + error fields; callers decide retry/backoff
	6.	First-Class Observability
– Winston + pino + next-gen Log Agent feed; traceId propagated in headers/events

⸻

5. Migration Roadmap

Phase	What We Do	Impact
0 (Prep)	Add traceId, jobId, runId columns & middleware	Instant better logs
1	Extract LLM Service: isolate OpenAI streaming + error handling	Safer, testable
2	Introduce Event Bus wrapper (tiny) + event schemas (zod)	Begin decoupling
3	Convert Component Build to BuildJob rows + worker loop	Retry, resumable
4	Emit events for JSONPatch & ScenePlan; UI subscribes	Real-time, stateless
5	Remove direct service calls ⇒ event-driven across the board	Loose coupling
6	Layer in metrics & tracing (OTel exporter → Grafana)	Observability complete

Each phase is backwards-compatible; we gate new paths behind feature flags until stable.

⸻

6. File & Directory Reference (Post-Refactor Target)

src/
├── app/
│   └── projects/[id]/edit/              # unchanged UI
├── events/                              # new
│   ├── bus.ts                           # tiny pub/sub abstraction
│   └── schemas/
│       └── *.ts                         # zod-typed event payloads
├── jobs/
│   ├── models/                          # drizzle table defs
│   └── workers/
│       ├── componentBuilder.worker.ts
│       └── renderVideo.worker.ts
├── services/
│   ├── llm.service.ts                   # OpenAI wrapper
│   ├── toolExecutor.service.ts          # routes events → tools
│   ├── jsonPatch.service.ts
│   ├── scenePlanner.service.ts
│   └── component.service.ts
└── utils/
    └── tracing.ts                       # traceId helpers


⸻

7. Comparing to the A2A Agent System

Dimension	Standard (Event-Driven)	A2A (Autonomous Agents)
Granularity	Service-level	Micro-agent-level
Decision Logic	Single LLM decides, calls typed tools	Multiple agents decide, chain, debate
Complexity	Moderate	High
Best Use	Chat-driven video creation	Multi-step supplier onboarding, crawling, enrichment

In short, Project 1 should stay opinionated and simple; we just need events + jobs for robustness—not the full agent zoo.

⸻

8. Take-Aways & Next Actions
	1.	Start with traceId & job tables – zero-risk, immediate insight.
	2.	Carve out llm.service.ts – removes 300+ LOC monolith bloat.
	3.	Prototype event bus inside the same process; no infra ticket needed.
	4.	Move Component Build → BuildJob worker – biggest real-world win (retry, progress).
	5.	Review UI listeners – flip SSE source from “chat orchestration” to “event bus.”

Once these are done, we’ll have the resilience, observability, and modularity we’ve wanted—without jumping straight to the full A2A paradigm.