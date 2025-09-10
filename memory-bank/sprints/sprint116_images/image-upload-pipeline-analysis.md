# Image Upload → Generation Pipeline Deep Dive

Date: 2025-09-08

Scope: What happens when a user uploads an image and submits a prompt like "animate this". This maps the exact code paths, tools, and system prompts used, and highlights why tool selection can feel unstable.

## High-Level Flow

```
User (ChatPanelG) → /api/upload (R2) → Chat message + SSE ready → tRPC generation.generateScene →
ContextBuilder → IntentAnalyzer (Brain prompt) → Tool execution (add/edit/imageRecreator) →
CodeGen prompt(s) → Save scene (DB) → PreviewPanelG refresh
```

## Step-by-Step (with code references)

1) UI upload & storage
- Component: `src/components/chat/MediaUpload.tsx`
  - Compresses large images, then `POST /api/upload` with `projectId`
- API: `src/app/api/upload/route.ts`
  - Auth check, content-type/size validation
  - Uploads to Cloudflare R2 (`PutObjectCommand`)
  - Returns public URL like `https://...r2.dev/projects/{projectId}/images/...`
  - Persists asset to project asset context (for future references)

2) User submits prompt with image(s)
- Component: `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`
  - Gathers `imageUrls` from uploaded media and calls SSE: `useSSEGeneration.generate(...)`
  - SSE endpoint creates the user message, then emits `{ type: 'ready', imageUrls, ... }`
  - On `ready`, ChatPanelG calls tRPC `generation.generateScene` with:
    - `userMessage: <text>`
    - `userContext: { imageUrls, videoUrls, audioUrls, sceneUrls, modelOverride, useGitHub }`

3) SSE (for message creation and optional website pipeline)
- API: `src/app/api/generate-stream/route.ts`
  - Creates DB user message with attachments
  - If `websiteUrl` present → runs WebsiteToVideo pipeline and streams status
  - Else emits `ready` event (no assistant text yet)

4) Generation Router entry
- tRPC router: `src/server/api/routers/generation.universal.ts`
- Operation: `generateScene` in `generation/scene-operations.ts`
  - Parallel fetch: project, scenes, last 100 chat messages, usage limits
  - Builds storyboard payload for the Brain
  - Calls Brain orchestrator with the full `userContext` (including `imageUrls`)

5) Brain Orchestrator (decision only)
- Orchestrator: `src/brain/orchestratorNEW.ts`
  - Context: `ContextBuilder.buildContext` → recent scenes (with code), chat, image context, assets, optional web context, template context
  - Intent: `IntentAnalyzer.analyzeIntent`
    - System prompt: `src/config/prompts/active/brain-orchestrator.ts`
    - Model: `getModel('brain')` (pack-controlled; currently `optimal-pack` ⇒ OpenAI gpt-5-mini, temp 0.4)
    - Builds a structured user message with:
      - Storyboard summary
      - Attached scenes (sceneUrls) override rules
      - Image context
      - Recent chat
      - Asset context
    - Expects JSON with `{ toolName, targetSceneId?, referencedSceneIds?, userFeedback, reasoning }`

6) Tool selection outcomes (with images)
- Brain prompt “IMAGE DECISION CRITERIA” (file above) guides selection:
  - imageRecreatorScene → if prompt implies “recreate / replicate exactly / copy style”
  - editScene → if prompt references a specific existing scene (“for scene 2”) with images
  - addScene → default for “inspired by / use as reference” or ambiguous image uploads
  - Note: “attached scenes” (dragged) strictly override target for edit/trim/delete

7) Tool execution & prompts
- Dispatcher: `src/server/api/routers/generation/helpers.ts` → `executeToolFromDecision`
  - addScene → `src/tools/add/add.ts`
    - If images present: `generateFromImages`
    - LLM prompt: `src/config/prompts/active/code-generator.ts`
    - Implementation: `CodeGeneratorNEW.generateCodeFromImage`
  - imageRecreatorScene → `src/tools/image-recreator/image-recreator.ts`
    - LLM prompt: `src/config/prompts/active/image-recreator.ts`
    - Implementation: `CodeGeneratorNEW.generateImageRecreationScene`
      - Validates image URLs; fixes hallucinated URLs where possible
      - Returns code, name, duration
  - editScene → `src/tools/edit/edit.ts`
    - LLM prompt: `src/config/prompts/active/code-editor.ts`
    - Receives target scene code + image URLs for vision edits

8) Persistence and UI update
- On success: insert/update `scenes` row and create `sceneIterations` record
- Chat message updated with success text
- Client invalidates `getProjectScenes`; `PreviewPanelG` reads DB scenes and rebuilds preview

## Why tool choice feels “random” for images

- The decision is made by an LLM (Brain) with temperature > 0, guided by the brain-orchestrator prompt. Ambiguous phrasing like “animate this” with an image doesn’t strongly map to a specific tool.
- The Brain prompt defines defaults, but intent keywords in user text can vary widely. Small semantic differences push the model to choose either:
  - `imageRecreatorScene` (recreate exactly) vs.
  - `addScene` (inspired by / embed image)
- There are no hard-coded pre-rules forcing one tool before the LLM call when `imageUrls` are present.

Consequence: With the same image(s) and slightly different wording (“animate this”, “make this a scene”, “recreate this”), users may see different tools selected.

## Determinism knobs

- Model pack: `MODEL_PACK=optimal-pack` (see `.env*`) → Brain is OpenAI gpt‑5‑mini, temperature 0.4 (more stable than 0.6, but still non-zero)
- System prompts used at each stage:
  - Tool selection: `brain-orchestrator.ts`
  - New code generation (add): `code-generator.ts`
  - Image recreation: `image-recreator.ts`
  - Edits: `code-editor.ts`
  - First message title: `title-generator.ts` (via SSE route)

## Concrete example: “animate this” + 1 image

Inputs:
- ChatPanelG collects 1 `imageUrl` and user text “animate this”.
- `generateScene` passes `userContext.imageUrls=[…]` to Brain.

Observed decisions (based on logs and prompt rules):
- If model infers “recreate exactly” → `imageRecreatorScene` → Image Recreator prompt
- If model infers “use image as reference/inspiration” → `addScene` → Code Generator prompt
- If the user mentions a specific scene (“for scene 2”) → `editScene` → Code Editor prompt

Because “animate this” is ambiguous, selection can vary. The current Brain prompt recommends defaulting to addScene when unclear; however, the LLM may still pick the image recreator path if it infers exact recreation.

## Key log anchors (to trace live)

- ChatPanelG: search for logs like `[ChatPanelG] Backend message with icon info:` and `✅ Generation completed`
- SSE: `[SSE]` in `src/app/api/generate-stream/route.ts`
- Router: `scene-operations.ts` logs "Parallel DB queries" and Brain decision handling
- Orchestrator: `🧠 [NEW ORCHESTRATOR]` and `🎯 [NEW INTENT ANALYZER]` logs, including raw JSON decisions
- Helpers (tool execution): `📥 [ROUTER] Received from ADD/EDIT` and `🖼️ [HELPERS] Using IMAGE RECREATOR tool`
- Code generator: `🖼️ [UNIFIED PROCESSOR] IMAGE RECREATOR` / `[CODE GENERATOR]`

## Stabilization proposals

Short-term (no UX changes):
- Add pre-LMM rules in `IntentAnalyzer.analyzeIntent` to deterministically map:
  - If `imageUrls.length > 0` AND prompt matches /(recreate|replicate|copy|exact)/i → force `imageRecreatorScene`
  - If `imageUrls.length > 0` AND prompt matches /(for\s+scene\s+\d+)/i or attached `sceneUrls` present → force `editScene` to that scene
  - If `imageUrls.length > 0` AND prompt matches /^\s*animate this\.?$/i → force `addScene`
- Reduce Brain temperature for intent: set `brain.temperature` to 0.2 in `optimal-pack` for more consistent classification.

Medium-term (UX affordance):
- Add a tiny toggle in the chat input when images are attached:
  - “Use exact image (recreate)” vs. “Use as reference (add)” → Pass a `userContext.intentHint` to bias the Brain/tool.

Verification:
- Enable trace logs in prod for N requests; compare tool choice distribution before/after.
- Add a “Decision Debug” attachment to the assistant message (hidden in UI) with `{ toolName, reasoning, matchedRule }`.

## Takeaway

Nothing is random in code paths; the variability is in the LLM’s interpretation of ambiguous phrasing. For “animate this” with an image, today both `addScene` and `imageRecreatorScene` are plausible. The above deterministic pre-rules and/or lower temperature will remove that variability.

