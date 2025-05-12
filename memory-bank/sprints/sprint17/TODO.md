# Sprint 17 TODO: Pipeline Benchmarking Foundation

-   [ ] Define JSON schema for Test Scenarios. # Still need formal schema if desired, but format is defined.
-   [x] Create `/memory-bank/benchmarking/scenarios/` directory.
-   [x] Create 2-3 initial test scenario JSON files (e.g., `001_red_circle_fade_in.json`). (Created 3/3)
-   [x] Refactor `animationDesigner.service.ts` -> `generateAnimationDesignBrief` to accept `llmConfig` parameter.
-   [/] Add default model environment variables (e.g., `DEFAULT_ADB_MODEL`) to `.env.example` and documentation. (Schema updated in env.js, .env.example skipped due to gitignore, needs manual update/documentation).
-   [ ] Create initial test harness script (`/scripts/run-benchmark.ts`).
    -   [ ] Implement argument parsing (scenario ID, LLM config overrides).
    -   [ ] Implement scenario loading.
    -   [ ] Implement calling `generateAnimationDesignBrief` with specified config.
    -   [ ] Implement basic latency measurement.
    -   [ ] Implement logging of results.
    -   [ ] Implement saving results to a JSON file in `/benchmark-results/`.
-   [ ] Add `/benchmark-results/` to `.gitignore`.
-   [ ] Document the test harness usage.
-   [ ] Add environment variables for model configuration to `.env.example` and documentation.
-   [x] Fix esbuild `format` setting ('iife' -> 'esm') in `buildCustomComponent.ts` to resolve 'Cannot use import statement outside a module' error. (Investigated logs, identified root cause in esbuild config, applied fix).
