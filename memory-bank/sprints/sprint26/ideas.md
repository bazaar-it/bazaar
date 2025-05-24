# Agent IDE Context & Scaffolding Checklist

Below is a checklist of extra context & scaffolding you can add to the repo so that your “agent IDE” (and any dev who joins later) has one place to look for every contract, prompt, and quality-gate.  
Each item includes a short rationale and the minimum viable artefact you should commit (often a small `.md`, `.yml`, or `.ts` file). References point to the official doc pages or battle-tested examples that inspired the suggestion.

---

## 1. Storyboard Contracts Beyond the Core JSON Schema

| File                    | Purpose                                                                                  | Notes                                                                                   |
|-------------------------|------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `storyboard.schema.json`| Already sketched—houses global fps/size + scenes array                                  | Compile with AJV in CI (see §8).                                                        |
| `storyboard.d.ts`       | Generated TypeScript typings from the JSON Schema                                        | Lets IDE autocomplete when agents patch the storyboard.                                 |
| `storyboard.patch.yml`  | Tiny RFC on allowed patch ops (add / replace / remove) — prevents chat tools from breaking invariants. | Enforced by a run-time guard before `applyPatch`.                                       |

**Why:**  
Having both the schema and a patch contract makes it obvious which edits are legal; ESM modules remain valid after every incremental change.

**Doc Refs:**  
AJV compile-time validation examples show how to auto-generate `.d.ts` files.

---

## 2. Streaming-Chat Event Catalogue

Create `docs/chat-events.md` with a table of every SSE payload your `chat.ts` can emit:

| Event type    | Shape                        | Emitted by      | Typical cadence      |
|---------------|-----------------------------|-----------------|---------------------|
| `delta`       | `{content:string}`           | OpenAI stream loop | ≤ 1 token         |
| `tool_start`  | `{name:string}`              | router          | once per tool        |
| `sceneStatus` | `{sceneId,status,jobId}`     | build worker    | ~3 per scene         |
| `finalized`   | `{status}`                   | router          | once                 |

This lives next to a small `@types/chat-events.ts` so the front-end and the SSE router share typings.

**Why:**  
Avoids magic strings & helps new agent authors know how to report progress.

**Doc Refs:**  
tRPC v11 `experimental_stream` uses the same “typed observable” pattern.

---

## 3. Agent Configuration Matrix

Commit `config/agents.yml`:

```yaml
planner:   openai:gpt-4o
style:     anthropic:claude-3-sonnet
coder:     anthropic:claude-3-haiku
vision:    openai:gpt-4o-vision
evaluator: openai:gpt-4o
```

Your orchestrator reads this once at boot so swapping providers is a one-line diff (mirrors the “model-flexible architecture” section).

**Doc Refs:**  
OpenAI “routines & hand-offs” post recommends declarative agent routing.

---

## 4. Prompt Templates Folder

Store few-shot examples plus the hard rules (e.g. “import from remotion, no React import”) in plain text so both IDE and LLM calls stay in sync.

Example structure:

- `prompts/scene-agent-system.md`
- `prompts/component-generator.md`
- ...

**Why:**  
When you later tune a model you only tweak these files, not scattered code.

---

## 5. esbuild Worker Manifest

`builders/esbuild-worker.ts` (or `.js`) that wraps the snippet you already drafted:

```js
externalGlobalPlugin({
  react: 'window.React',
  'react-dom': 'window.ReactDOM',
  'react/jsx-runtime': 'window.ReactJSX',
  remotion: 'window.Remotion',
  'remotion/*': 'window.Remotion',
});
```

Add a short README pointing to the external-global plugin docs.

---

## 6. Global-Exposure Snippet

`web/_app_exposeGlobals.tsx` containing the `useEffect` that sets `window.React`, `window.Remotion`, etc.  
Import it once in `_app.tsx`.

**Why:**  
Every dev sees exactly where the globals come from (and that they run only on the client).

---

## 7. CORS & R2 Boilerplate

`infra/r2-cors-policy.md` — copy Cloudflare’s example that allows `Origin: *`, `Range`, `Access-Control-Request-Headers` so dynamic `import()` works from any deployment env.

---

## 8. CI Quality Gates

Add a GitHub Action (`.github/workflows/ci.yml`) with three jobs:

**1. Schema test**

```sh
npx ajv-cli validate -s storyboard.schema.json -d test/fixtures/*.json
```

**2. Bundle size**  
Fail if any built scene > 120 kB (`du -k`).

**3. No duplicate React hook-errors**  
Headless Puppeteer launches `/preview`, asserts console free of Invalid hook call.

---

## 9. Motion Best-Practice Cheatsheet

`docs/motion-principles.md` — two-column table mapping the 12 principles of animation to code patterns (easing, squash-&-stretch).  
Helps evaluators & LLM prompts.  
You can cite Lightning Design System “Design Transitions” for timing ratios.

---

## 10. Streaming vs WebSocket Rationale

One-pager `docs/why-sse.md` summarising the duplex vs simplex trade-off you already made; link Ably’s comparison.

---

## 11. A2A Future Stub

`docs/a2a-protocol.md` — short note that the orchestrator can emit A2A-compliant traces once Google’s spec stabilises.

---

## Where to Start This Week

1. **Merge the Storyboard schema + TypeScript typings (item #1).**
2. **Check-in the chat-event catalogue (#2) so front-end and back-end SPEAK THE SAME LANGUAGE.**
3. **Lock the agent matrix YAML (#3) and wire the orchestrator to read it at runtime.**
4. **Add the CI bundle-size & schema guards (#8)** – they’re five-line shell steps but save hours later.

With these files in place your agent IDE will know exactly the contracts it must respect, newcomers will know where to plug features, and every PR will fail fast if it breaks the golden “one React / one Storyboard” rule.

---

# Where the Brains Live & How They Are Wired In

The PromptOrchestrator you saw is deliberately dumb — it only coordinates.  
The real “thinking” happens inside the agent adapters, each of which receives a ready-to-use LLM client that you configure once at startup.

```
PromptOrchestrator  ─┬─▶  SceneAgentAdapter   (LLM #1)
                     ├─▶  StyleAgentAdapter   (LLM #2)
                     └─▶  AssetAgentAdapter   (LLM #3)
```

Below is the recommended pattern for initialising those clients and injecting them.

---

### 1 · A Single LLM Registry / Factory

**`src/server/llm/registry.ts`**
```ts
import { OpenAI }      from "openai";
import { Anthropic }   from "@anthropic-ai/sdk";
import { Groq }        from "groq-sdk";          // example third provider
import config          from "../utils/config-loader";

// Canonical interface every provider must satisfy
export interface LLMClient {
  chat(prompt: string, args?: Record<string, any>): Promise<string>;
  stream?(prompt: string, onToken: (t: string) => void): Promise<void>;
}

type ProviderName = "openai" | "anthropic" | "groq";

const singletonCache = new Map<ProviderName, LLMClient>();

export function getLLM(provider: ProviderName): LLMClient {
  if (singletonCache.has(provider)) return singletonCache.get(provider)!;

  let client: LLMClient;
  switch (provider) {
    case "openai":
      client = new OpenAI({ apiKey: process.env.OPENAI_KEY }) as LLMClient;
      break;
    case "anthropic":
      client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY }) as LLMClient;
      break;
    case "groq":
      client = new Groq({ apiKey: process.env.GROQ_KEY }) as LLMClient;
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
  singletonCache.set(provider, client);
  return client;
}
```

**Why a singleton?**  
- Keeps connection pooling efficient and avoids hitting per-minute auth-handshake limits.

---

### 2 · Task-to-Model Matrix (YAML)

**`llm-matrix.yaml`**
```yaml
planner:
  provider: openai
  model: gpt-4o-mini
style:
  provider: anthropic
  model: claude-3-sonnet
coder:
  provider: groq
  model: llama3-70b
```

The utility we already referenced (`config-loader.ts`) simply parses this into a plain object.

---

### 3 · Adapters Receive the Client

**`src/server/agents/scene-agent.adapter.ts`**
```ts
import { getLLM } from "../llm/registry";
import cfg        from "../utils/config-loader";

const llm = getLLM(cfg.llm.planner.provider);

export async function generateScenePlan(intent: IntentJSON): Promise<ScenePlan> {
  const prompt = /* build prompt from intent */;
  const raw = await llm.chat(prompt, { model: cfg.llm.planner.model });
  return JSON.parse(raw) as ScenePlan;
}
```

Same pattern for `style-agent.adapter.ts` and `asset-agent.adapter.ts`, each using the provider/model pair from the YAML.

---

### 4 · The Orchestrator Just Plugs Things Together

**Excerpt from `prompt-orchestrator.ts`**
```ts
const [scenePlan, styleTokens, assetReport] = await Promise.all([
  sceneAgent.generateScenePlan(intent),     // uses LLM #1
  styleAgent.generateTokens(intent),        // uses LLM #2
  assetAgent.analyseUploads(intent)         // uses LLM #3 (or none)
]);
```

- Initialisation happens exactly once per process in `llm/registry.ts`.
- Choice of model is pure configuration in `llm-matrix.yaml`.
- Adapters hold the “intelligence”—the orchestrator is merely a traffic cop.

---

### 5 · Swapping Models or Providers

1. Update `llm-matrix.yaml` (e.g. `planner.provider: "anthropic"`).
2. No code changes needed because `getLLM()` fetches the right singleton on demand.
3. Restart your worker/container → new provider in effect.

*Tip: watch cold-start times; some providers’ SDKs fetch models list on first use. Cache that if needed.*

---

### 6 · Streaming Compatibility

If a provider supports token streaming:
- Implement the optional `.stream` method in its wrapper.
- In an adapter, prefer `llm.stream(prompt, onToken)` so you can forward deltas to the SSE emitter immediately.

---

## TL;DR 🚦

- The orchestrator deliberately has zero logic—it routes work to agents.
- Agents are thin wrappers around LLM clients pulled from a singleton registry whose configuration lives in YAML.
- That registry is where you initialise OpenAI / Anthropic / Groq once per process, keeping things fast and cheap.