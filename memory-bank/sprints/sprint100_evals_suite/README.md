# Sprint 100 – Admin Evals Suite

Goal: Build a comprehensive LLM evaluation suite in the admin dashboard to compare models, prompting strategies, latency, token/cost, code quality, and rendered video quality across tasks (YouTube → code, general prompts, images, precise edits).

Scope (Phase 1 – implemented)
- Admin page: `/admin/evals`
- Run YouTube → Remotion code evals with selectable model + strategy
- Server tRPC router `evals` with persistence to `evals` table
- Metrics captured: timeMs, tokensUsed, cost, error, metadata
- History listing (paginated)

Next (Phase 2)
- Add tasks: General prompt → code, Image → code, Edit existing code
- Strategy matrix: direct, two-step (describe → code), multi-agent, iterative
- Providers: native Gemini + Claude support (dynamic import, env-guarded)
- Code runner: sandbox compile + inline Remotion preview for generated code
- Comparison view: side-by-side render + qualitative ratings
- Cost tracking: per-provider pricing tables + totals per run
- Export: save best result to a project scene and render via Lambda

Data Model
- Table: `evals`
  - id, userId, youtubeUrl, model, strategy, prompt, generatedCode, timeMs, tokensUsed, cost, error, metadata, createdAt

Notes
- Default model set to `gpt-4o-mini` to match our standard
- Gemini/Claude routed to OpenAI temporarily until keys + logic added
- Remotion preview pending safe code execution pipeline
