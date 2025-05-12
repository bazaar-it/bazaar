# Sprint 17 Approach: Building the Benchmarking Foundation

This document outlines the approach for creating the initial pipeline test and benchmark system, building upon the ideas in [initalthoughts.md](./initalthoughts.md).

## I. Core Principles

We will adhere to the principles outlined previously:

*   **Modularity:** Test individual stages (ADB Gen, TSX Gen, Build) and end-to-end.
*   **Measurability:** Define clear, quantifiable metrics.
*   **Reproducibility:** Ensure tests can be re-run consistently.
*   **Automation:** Automate execution and data collection.
*   **Extensibility:** Design for adding new models, prompts, and metrics easily.
*   **Actionability:** Results should guide optimization efforts.

## II. Initial Implementation Steps

### A. Test Scenarios

1.  **Format:** Define a simple JSON structure for scenarios in `/memory-bank/benchmarking/scenarios/`.
    ```json
    // Example: /memory-bank/benchmarking/scenarios/001_red_circle_fade_in.json
    {
      "scenarioId": "001_red_circle_fade_in",
      "description": "A simple red circle appearing with a fade-in animation.",
      "userPrompt": "Create a scene with a red circle that fades in over 2 seconds.",
      "expectedOutcomeQualitative": "A red circle should smoothly appear from transparent to fully opaque red over the first 2 seconds of the scene. It should be centered.",
      "tags": ["simple", "fade", "shape"],
      "goldenAdbJsonPath": null, // Optional path to a reference ADB
      "goldenTsxPath": null // Optional path to reference TSX
    }
    ```
2.  **Initial Set:** Create 2-3 scenarios:
    *   Simple shape animation (e.g., Red Circle Fade In).
    *   Simple text animation (e.g., Text Slide In).
    *   Slightly more complex interaction (if feasible with current services, maybe two shapes animating).

### B. Service Parameterization

1.  **Target:** Start with `animationDesigner.service.ts` -> `generateAnimationDesignBrief`.
2.  **Modification:** Add an optional `llmConfig` parameter.
    ```typescript
    interface LlmConfig {
      model: string; // e.g., 'gpt-4-turbo-preview', 'claude-3-opus-20240229'
      temperature?: number;
      systemPrompt?: string; // Allow overriding the default system prompt
      // Potentially add other relevant parameters like top_p
    }

    export async function generateAnimationDesignBrief(
      params: AnimationBriefGenerationParams,
      llmConfig: LlmConfig = { model: env.DEFAULT_ADB_MODEL || 'o4-mini' } // Use env var for default
    ): Promise<{ designBrief: AnimationDesignBrief; briefId: string }> {
      // ... inside the function
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY }); // Or initialize based on model provider
      const completion = await openai.chat.completions.create({
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        messages: [
          { role: 'system', content: llmConfig.systemPrompt || DEFAULT_ADB_SYSTEM_PROMPT },
          // ... other messages
        ],
        // ... other options
      });
      // ... rest of the function
    }
    ```
3.  **Environment Variables:** Define default model names (e.g., `DEFAULT_ADB_MODEL`, `DEFAULT_TSX_MODEL`) in `.env` for regular operation.

### C. Test Harness (`/scripts/run-benchmark.ts`)

1.  **Technology:** Node.js script using `ts-node` or compiled JS.
2.  **Functionality (Initial):**
    *   Accept command-line arguments for:
        *   Scenario ID(s) or path to scenario file(s).
        *   LLM configuration overrides (e.g., `--adb-model=gpt-4 --tsx-model=claude-3`).
    *   Load the specified scenario(s).
    *   For each scenario:
        *   Instantiate required services (potentially mocking dependencies initially if needed).
        *   Call the parameterized service(s) (e.g., `generateAnimationDesignBrief`) with the specified LLM config.
        *   Measure latency (using `performance.now()` or `console.time`).
        *   Capture input/output (the ADB JSON).
        *   Capture success/failure status (e.g., did Zod validation pass?).
        *   Capture token usage if returned by the service/API call.
        *   Log results using Winston (consider a dedicated benchmark log file).
        *   Save structured results (see Section D).

### D. Results Storage

1.  **Initial Format:** Start with simple JSON files per test run, stored in `/benchmark-results/` (add to `.gitignore`).
    ```json
    // Example: /benchmark-results/run_20250512_205500_scenario_001.json
    {
      "runId": "run_20250512_205500",
      "timestamp": "2025-05-12T13:55:00.123Z",
      "scenarioId": "001_red_circle_fade_in",
      "configuration": {
        "adbLlm": { "model": "o4-mini", "temperature": 0.7 },
        "tsxLlm": { "model": "claude-3-sonnet" } // Example if TSX gen was included
      },
      "stages": [
        {
          "stageName": "adb_generation",
          "success": true,
          "latencyMs": 3500,
          "tokenUsage": { "input": 500, "output": 1200 },
          "costEstimate": 0.0025, // If calculated
          "outputArtifact": { "adbJson": { ... } }, // Or path to stored ADB
          "metrics": {
            "zodValidationPassed": true
          },
          "error": null
        },
        // Add results for tsx_generation, esbuild etc. in future sprints
      ]
    }
    ```
2.  **Database Schema (Future Goal):** Plan for database tables mirroring this structure (`TestRuns`, `StageResults`).

### E. Metrics (Initial Set)

*   **Latency:** `generateAnimationDesignBrief` call duration.
*   **Success:** `generateAnimationDesignBrief` completed without error AND ADB passed Zod validation.
*   **Cost:** Input/Output tokens for the ADB LLM call (calculate estimated cost).

## III. Integration & Best Practices

*   **Logging:** Use the existing Winston setup. Add specific context (e.g., `scenarioId`, `runId`) to benchmark-related logs.
*   **Error Handling:** Ensure the harness gracefully handles errors in service calls and logs them.
*   **Modularity:** Keep the harness script focused on orchestration. Core logic remains in services.
*   **Configuration:** Use environment variables for defaults and command-line args for overrides.
*   **Code Quality:** Apply standard TypeScript/ESLint/Prettier rules to the harness script.

## IV. Next Steps (Beyond Sprint 17)

*   Parameterize `generateComponentCode.ts`.
*   Integrate TSX generation and `esbuild` steps into the harness.
*   Add more automated metrics (linting TSX, code complexity).
*   Implement database storage for results.
*   Develop a simple dashboard/viewer for results.
*   Implement manual review workflows.
*   Explore advanced evaluations (semantic similarity, VLM).
