// /memory-bank/api-docs/user-to-video-final.md


---

## 0. Technology Stack (authoritative)

| **Layer**    | **Tech**                       | **Key Packages**                                              | **Reference File(s)**              |
|-------------|-------------------------------|----------------------------------------------------------|---------------------------------|
| **Frontend** | Next.js (App Router)          | React (see version in package.json) &middot; TypeScript &middot; TailwindCSS &middot; @remotion/player &middot; zustand | [package.json](../../package.json) |
| **Backend**  | Next.js API Routes + tRPC    | @trpc/server &middot; @trpc/client &middot; superjson          | [package.json](../../package.json) |
| **Auth**     | NextAuth (Auth.js)            | next-auth                                                | [package.json](../../package.json) |
| **Database** | Neon (Postgres) + Drizzle ORM | drizzle-orm                                             | [package.json](../../package.json) |
| **AI**       | OpenAI GPT-4o Tools API      | openai (see version in package.json)                        | [package.json](../../package.json) |
| **Video**    | Remotion                       | remotion &middot; @remotion/transitions                    | [package.json](../../package.json) |
| **Storage**  | Cloudflare R2 (custom components) | @aws-sdk/client-s3 (R2 compat)                           | [package.json](../../package.json) |
| **CI tasks** | esbuild (TSX&rightarrow;ESM)    | esbuild                                                  | [package.json](../../package.json) |

**Note:** Always check [package.json](../../package.json) for the authoritative version numbers. Remove hardcoded versions from docs unless absolutely required for compatibility. Update this table if the stack changes in code.

---

## 1. Bird’s-Eye Flow

```mermaid
sequenceDiagram
  autonumber
  User->>Frontend(ChatPanel): types natural-language prompt
  Frontend->>tRPC chat.sendMessage: { projectId, message }
  tRPC(chat.ts)->>DB: save user message
  tRPC->>OpenAI GPT-4o: tools=[applyJsonPatch, generateRemotionComponent]
  alt Patch path
      OpenAI->>tRPC: tool_call=applyJsonPatch(operations[])
      tRPC: validate+apply patch → DB.projects.props + DB.patches
      tRPC-->>Frontend: { patch }
      Frontend->>VideoState: applyPatch()
  else Custom component path
      OpenAI->>tRPC: tool_call=generateRemotionComponent(effectDescription)
      tRPC->>generateComponentCode(): GPT-4o function-call returns { effect, tsxCode }
      tRPC->>DB.customComponentJobs: status=pending, tsxCode saved
      tRPC-->>Frontend: { noPatches:true, jobId }
      cron(R2 builder)->>buildCustomComponent.ts: compile TSX→JS, upload to R2, status=success
      Frontend CustomComponentsSidebar: polls custom component list
      User clicks "Insert" → VideoState.applyPatch(add custom scene ref)
  end
  VideoState->>@remotion/player: inputProps updated
  @remotion/player->>Remotion Composition: re-render frames
```

---

## 2. Detailed Stage-by-Stage Breakdown

### 2.1 Frontend — Chat Input

| Concern      | Implementation                                                                 |
|--------------|-------------------------------------------------------------------------------|
| UI component | `src/app/projects/[id]/edit/panels/ChatPanel.tsx` (file exists)              |
| State        | Zustand store: `src/stores/videoState.ts` (functions: `addMessage`, `applyPatch`, `replace`) |
| TRPC call    | `api.chat.sendMessage.useMutation` (calls tRPC mutation)                      |
| Validation   | Local check: `if (!message.trim()) return;` in ChatPanel                      |

**Details:**
- `ChatPanel.tsx` renders a text input and submit button for user prompts.
- On submit, calls `mutation.mutate({ projectId, message })` which triggers the tRPC mutation.
- Implements optimistic UI: `addMessage` is called before server response.
- Zustand store keeps per-project chat history and props state.
- All state logic is colocated in `videoState.ts` for maintainability.

---

### 2.2 Frontend → tRPC Backend — `chat.sendMessage`

| Step                  | Implementation & Details                                                                 |
|-----------------------|-----------------------------------------------------------------------------------------|
| tRPC client call      | `api.chat.sendMessage.useMutation` in ChatPanel (calls backend)                         |
| Router mutation       | `sendMessage` mutation in `src/server/api/routers/chat.ts` (file exists)                |
| Message persistence   | `db.insert(messages)` saves user message to DB                                          |
| Security              | Uses `protectedProcedure` middleware (see trpc.ts)                                      |

**Details:**
- The tRPC router defines `sendMessage` as a protected mutation.
- The mutation handler is `processUserMessageInProject`, which is responsible for handling both patch and component requests.
- All message inserts go to the `messages` table, schema defined in `src/server/db/schema.ts`.
- If the user is not authenticated, `protectedProcedure` throws `UNAUTHORIZED`.

---

### 2.3 tRPC Backend → OpenAI GPT-4o — Tools API

| Step                | Implementation & Details                                                                                  |
|---------------------|----------------------------------------------------------------------------------------------------------|
| OpenAI call         | `openai.chat.completions.create` in `processUserMessageInProject` (calls GPT-4o)                          |
| Tools definition    | `tools: [applyPatchTool, generateRemotionComponentTool]`, `tool_choice: "auto"`                          |
| Patch path          | Response: `tool_calls[0].function.name === "applyJsonPatch"`                                             |
| Component path      | Response: `tool_calls[0].function.name === "generateRemotionComponent"`                                  |
| Parsing logic       | Handles `tool_calls` array (not legacy `function_call`)                                                   |

**Details:**
- Tools API is used (not deprecated function_call); see Memory 7a9140d6 for code pattern.
- Each tool is defined as `type: "function"` with a JSON schema for parameters.
- The request payload includes the current video props and user message.
- The handler branches on the tool name returned by OpenAI.
- All input/output is validated with Zod schemas for safety.

---

### 2.4 Patch Path — JSON State Update

| Step                        | Implementation & Details                                                                            |
|-----------------------------|-----------------------------------------------------------------------------------------------------|
| Parse & validate operations | `jsonPatchSchema.parse` in `chat.ts` (~line 120)                                                    |
| Apply patch in-memory       | `applyPatch(structuredClone(project.props), ops)` (uses `fast-json-patch`)                          |
| Schema-validate new props   | `inputPropsSchema.safeParse(nextProps)`                                                             |
| Persist to DB               | `db.update(projects).set({ props: nextProps })` + insert into `patches` table                       |
| Respond to client           | Returns `{ patch }` (array of ops)                                                                  |
| Frontend reaction           | `useVideoState.applyPatch` merges update; `PreviewPanel` polls for new props every 1s               |

**Details:**
- If patch is invalid, returns TRPC error to client.
- All patches are logged and stored for auditability.
- The frontend applies the patch optimistically for instant feedback.
- Polling ensures eventual consistency even if optimistic update fails.

### 2.2 Backend — tRPC Router `chat.ts`

File: `src/server/api/routers/chat.ts`

1. **Security** — `protectedProcedure` ensures authenticated session (`ctx.session`).  
2. **Message persistence** — inserts into `bazaar-vid_message` table (`db.insert(messages)`).
3. **LLM Request** — Builds `llmRequestPayload` with **Tools API** (`tools: [applyPatchTool, generateRemotionComponentTool]`, `tool_choice:"auto"`).
4. **LLM Response Dispatch** — Branches on `response.tool_calls[0].function.name`:
   - `applyJsonPatch` ➟ _Patch Path_ (see 2.3).
   - `generateRemotionComponent` ➟ _Custom Component Path_ (see 2.4).

> NOTE: Legacy `function_call` code has been removed; the live code exclusively uses the Tools interface (see Memory `7a9140d6`).

### 2.3 Patch Path — JSON State Update

| Step | Source File / Line(s) | Notes |
|------|----------------------|-------|
| Parse & Zod-validate operations | `chat.ts`, ~120 (`jsonPatchSchema.parse`) |
| Apply patch in-memory | `applyPatch(structuredClone(project.props), ops)` |
| Schema-validate new props | `inputPropsSchema.safeParse` |
| Persist | `db.update(projects).set({ props: nextProps })` + insert into `bazaar-vid_patch` |
| Respond to client | `{ patch }` (array of ops) |

Frontend reaction:
`useVideoState.applyPatch` merges update; `PreviewPanel` already polling but immediate optimistic update ensures seamless preview.

### 2.4 Custom Component Path

| Step | Code | Description |
|------|------|-------------|
| 1. Generate TSX | `src/server/workers/generateComponentCode.ts` calls GPT-4o with `generateCustomComponent` function def; ensures imports. |
| 2. Create Job Row | `db.insert(customComponentJobs)` status=`pending` with raw `tsxCode`. |
| 3. Assistant reply | Saves assistant message explaining job queued. |
| 4. _Optional_ immediate build | `handleCustomComponentRequest` dynamically `import("~/server/workers/buildCustomComponent")` to kick off build in-process (dev convenience). |
| 5. Cron build |  **Prod path** ➟ Vercel cron hits `src/app/api/cron/process-component-jobs/route.ts` every 5 min (Bearer `CRON_SECRET`). This invokes `processPendingJobs()`.
| 6. Build Worker | `buildCustomComponent.ts`:
  - Sanitises TSX (only `react`/`remotion` imports).
  - `esbuild` bundle → single ESM file.
  - Uploads to R2 (`custom-components/{id}.js`).
  - Updates row `status:"success"`, `outputUrl`.

### 2.5 Serving Component JS

| Path | Purpose |
|------|---------|
| `src/app/api/components/[id]/route.ts` | Acts as signed-URL proxy; fetches JS from R2, **strips ESM imports/exports**, injects globals, wraps in IIFE and assigns `window.__REMOTION_COMPONENT`. |

Caching: `Cache-Control: public, max-age=86400`.

### 2.6 Frontend — Loading & Rendering Custom Component

### 2.6 Custom Component Path — Rendering & Insertion Details

| Step                | Implementation & Details                                                                                     |
|---------------------|-------------------------------------------------------------------------------------------------------------|
| Sidebar UI          | `src/app/projects/[id]/edit/Sidebar.tsx > CustomComponentsSidebar` lists jobs via `api.customComponent.listAllForUser.useQuery()` |
| Insert action       | On click, constructs JSON-Patch to add a new scene `{ type: "custom", data: { componentId: job.id, name: job.effect } }` and calls `applyPatch()` from Zustand (`useVideoState`) |
| Patch details       | Patch adds scene to `/scenes/-` and updates `/meta/duration` if needed; uses `crypto.randomUUID()` for scene ID |
| useRemoteComponent  | `src/hooks/useRemoteComponent.tsx` creates `<script src="/api/components/{id}">`, waits for `window.__REMOTION_COMPONENT` global, and returns the loaded React component. Handles loading, error, and cleanup. |
| CustomScene         | `src/remotion/components/scenes/CustomScene.tsx` renders `<RemoteComponent componentId={componentId} {...data}/>` inside `<AbsoluteFill>`. Handles missing componentId gracefully. |
| Scene registry      | `src/remotion/components/scenes/index.ts` maps type `"custom"` to `CustomScene` in `sceneRegistry`, so all dynamic video rendering can resolve it. |

**Nuances & Caveats:**
- The patch is applied both locally (optimistic UI) and persisted via API.
- Remote component loading is script-based to avoid ESM import issues in browsers.
- The `RemoteComponent` and `useRemoteComponent` handle global namespace and cleanup to prevent leaks.
- Scene registry is the single source of truth for supported scene types, including "custom".

---

### 2.7 Preview Refresh Logic

| File                                 | Behaviour                                                                                      |
|--------------------------------------|------------------------------------------------------------------------------------------------|
| `src/app/projects/[id]/edit/panels/PreviewPanel.tsx` | Polls `api.project.getById` every 1s (tRPC); on new props, calls `videoState.replace()`; passes props as `inputProps` to `<Player component={DynamicVideo}/>` |
| `src/remotion/compositions/DynamicVideo.tsx`         | Iterates through `inputProps.scenes` and renders via `sceneRegistry` inside Remotion `<Series>`; supports transitions and fallback to `TextScene` if type missing |

**Nuances & Caveats:**
- Polling interval is 1s for near real-time preview; can be optimized with tRPC subscriptions in future.
- Zustand state is always kept in sync with backend via `replace()`.
- DynamicVideo composition supports both with- and without-transition scene lists.
- All scene rendering is type-safe and mapped through the registry.

---

### 2.8 Authentication & Authorization

| File/Path                                 | Responsibility                                                                                       |
|-------------------------------------------|------------------------------------------------------------------------------------------------------|
| `src/server/auth/index.ts`                | Exports `auth()` (NextAuth) used for session retrieval in both tRPC context and page logic           |
| `src/server/api/trpc.ts`                  | Calls `auth()` in `createTRPCContext`; exposes `protectedProcedure` which enforces `ctx.session?.user` presence (throws UNAUTHORIZED otherwise) |
| `src/app/projects/[id]/edit/page.tsx`     | Imports `auth()`; redirects to `/login` if no session.user; checks project ownership (shows access denied if not owner) |
| DB Checks                                 | Each tRPC resolver (e.g. chat, project) explicitly checks `project.userId === session.user.id` before allowing mutations |

**Nuances & Caveats:**
- All authentication is handled via NextAuth, configured in `/src/server/auth/config.ts`, exported from `/src/server/auth/index.ts`.
- All backend (tRPC) procedures requiring authentication use `protectedProcedure`, which ensures a valid session and user.
- The edit page (`page.tsx`) checks for a session and user, redirecting to `/login` if missing, and verifies project ownership before rendering.
- There is no `getServerAuthSession()`; all session logic is consolidated under `auth()` from `/src/server/auth`.
- No hallucinated or legacy paths are referenced; all logic is grounded in the current codebase.

| `src/server/api/trpc.ts` | Calls `auth()` in `createTRPCContext`; exposes `protectedProcedure` which enforces `ctx.session?.user` presence (throws UNAUTHORIZED otherwise) |
| `src/app/projects/[id]/edit/page.tsx` | Imports `auth()`; redirects to `/login` if no session.user; checks project ownership (shows access denied if not owner) |
| DB Checks | Each tRPC resolver (e.g. chat, project) explicitly checks `project.userId === session.user.id` before allowing mutations |

**Summary:**
- Authentication is handled via NextAuth, configured in `/src/server/auth/config.ts`, and exported from `/src/server/auth/index.ts` as `auth()`.
- All backend (tRPC) procedures requiring authentication use `protectedProcedure`, which ensures a valid session and user.
- The edit page (`page.tsx`) checks for a session and user, redirecting to `/login` if missing, and verifies project ownership before rendering.
- There is no `getServerAuthSession()`; all session logic is consolidated under `auth()` from `/src/server/auth`.
- No hallucinated or legacy paths are referenced; all logic is grounded in the current codebase.

### 2.9 Database Schema (drizzle-orm)

All tables and columns below are defined in [`src/server/db/schema.ts`](../../src/server/db/schema.ts) using Drizzle ORM. This section is code-verified and reflects the live schema.

| Table                   | Columns & Types                                                                                                  | Relationships / Notes                                                                                           |
|-------------------------|----------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `user`                  | `id` (PK, uuid, default random), `name`, `email` (unique), `emailVerified` (timestamp), `image`                 | Has many `account`, referenced by `project.userId`                                                              |
| `account`               | `userId` (FK), `type`, `provider`, `providerAccountId`, `refresh_token`, `access_token`, `expires_at`, etc.     | FK to `user.id`, PK is (`provider`, `providerAccountId`)                                                        |
| `verificationToken`     | `identifier`, `token`, `expires` (timestamp)                                                                    | PK is (`identifier`, `token`)                                                                                   |
| `project`               | `id` (PK, uuid), `userId` (FK), `title`, `props` (JSONB), `createdAt`, `updatedAt`                             | FK to `user.id`; has many `patch`, `message`, `customComponentJob`; unique index on (`userId`, `title`)         |
| `patch`                 | `id` (PK, uuid), `projectId` (FK), `patch` (JSONB), `createdAt`                                                | FK to `project.id`, cascade on delete; indexes on `projectId`                                                   |
| `message`               | `id` (PK, uuid), `projectId` (FK), `content`, `role`, `createdAt`                                              | FK to `project.id`, cascade on delete; indexes on `projectId`; `role` is 'user' or 'assistant'                  |
| `custom_component_job`  | `id` (PK, uuid), `projectId` (FK), `effect`, `tsxCode`, `status`, `outputUrl`, `errorMessage`, `retryCount`, `createdAt`, `updatedAt` | FK to `project.id`, cascade on delete; indexes on `projectId`, `status`; status is 'pending', 'building', etc.  |

**Nuances & Implementation Notes:**
- All PKs are UUIDs with default random generation.
- All FK relations use `onDelete: "cascade"` for project-linked tables (patch, message, custom_component_job).
- `project` has a unique index on (`userId`, `title`) to prevent duplicate project names per user.
- `custom_component_job.status` is an enum-like string: 'pending', 'building', 'success', 'error'.
- All tables have `createdAt` timestamps; `project` and `custom_component_job` also have `updatedAt`.
- The `props` column in `project` is the canonical JSON state for Remotion video composition.
- All relations are explicitly defined using Drizzle's `relations()` API for type safety and join support.

---

### 2.10 Remotion Scene Types Reference

A **canonical reference** for all supported Remotion scene types, their props, and available animations/transitions is maintained in:

- [`/memory-bank/remotion/scene-types-reference.md`](../remotion/scene-types-reference.md)

This table is **code-verified** and must be kept in sync with both the above file and the Zod schemas in [`/src/types/input-props.ts`](../../src/types/input-props.ts). All onboarding and LLM prompt engineering should reference this table and file.

| Scene Type         | Props (all required unless marked optional)                                                                                          | Supported Animations/Transitions                       |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|
| `text`             | `text`: string, `color`: string, `fontSize`: number, `backgroundColor`: string                                                      | —                                                      |
| `image`            | `src`: string, `fit`: "cover" \| "contain", `backgroundColor`: string                                                          | —                                                      |
| `background-color` | `color`: string, `toColor` (optional): string, `animation`: "fade" \| "spring" \| "pulse"                                      | —                                                      |
| `shape`            | `shapeType`: "circle" \| "square" \| "triangle", `color`: string, `backgroundColor`: string, `size`: number, `animation`: "pulse" \| "rotate" \| "bounce" \| "scale" | —                                                      |
| `gradient`         | `colors`: string[], `direction`: "linear" \| "radial" \| "conic", `angle` (optional): number, `animationSpeed` (optional): number | —                                                      |
| `particles`        | `count`: number, `type`: "circle" \| "square" \| "dot" \| "star", `colors`: string[], `backgroundColor`: string                | —                                                      |
| `text-animation`   | `text`: string, `color`: string, `backgroundColor`: string, `fontSize`: number, `fontFamily`: string, `animation`: "typewriter" \| "fadeLetters" \| "slideUp" \| "bounce" \| "wavy", `delay` (optional): number, `textAlign` (optional): "left" \| "center" \| "right" | —                                                      |
| `split-screen`     | `direction`: "horizontal" \| "vertical", `ratio`: number (0-1), `backgroundColor1`: string, `backgroundColor2`: string, `animationEffect`: "slide" \| "reveal" \| "split" \| "none" | —                                                      |
| `zoom-pan`         | `src`: string, `startScale`: number, `endScale`: number, `startX`: number, `endX`: number                                         | —                                                      |
| `svg-animation`    | `icon`: "circle" \| "square" \| "triangle" \| "star" \| "heart" \| "checkmark" \| "cross" \| "arrow", `color`: string, `animation`: "draw" \| "scale" \| "rotate" \| "fade" \| "moveIn" | —                                                      |
| `custom`           | `componentId`: string, (other props as needed by the component)                                                                    | —                                                      |

**Scene Transitions (between scenes):**
- `type`: "fade" | "slide" | "wipe"
- `duration` (optional): int (frames)
- `direction` (optional): "from-left" | "from-right" | "from-top" | "from-bottom"
- `useSpring` (optional): boolean

**Notes:**
- Only the above scene types and props are supported. For details, see the Zod schemas in `/src/types/input-props.ts`.
- Update this file and the LLM prompt whenever scene types or props change in code.
- This table and the referenced file are the single source of truth for Remotion scene support in Bazaar-Vid.

---

## 3. Error & Edge-Case Handling

All error handling strategies are code-verified and reference the actual implementation. See the referenced files for logic and error boundaries.

| Surface                   | Current Strategy                                                                                                                                     | Gaps / TODOs                                                                                          | Reference File(s)                                      |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|--------------------------------------------------------|
| LLM returns invalid patch | Zod validation (`jsonPatchSchema.parse`) + tRPC error; patch is rejected and error sent to client                                                   | Could return partial diagnostics to user (see `chat.ts`)                                              | `src/server/api/routers/chat.ts`                       |
| LLM bad TSX               | `generateComponentCode.ensureImports` + esbuild compilation; failures mark job as `error` and error message is sent to user                        | Static analysis (eslint/tsc) not yet implemented                                                     | `src/server/workers/generateComponentCode.ts`, `buildCustomComponent.ts` |
| R2 fetch failure          | API route returns 500; `RemoteComponent` displays red error box                                               | Retry/back-off UI not implemented; user must retry manually                                           | `src/app/api/components/[id]/route.ts`, `hooks/useRemoteComponent.tsx`   |
| Player desync             | 1s polling in `PreviewPanel` ensures eventual consistency between client and server                           | Should switch to tRPC subscription/SSE for real-time sync                                             | `src/app/projects/[id]/edit/panels/PreviewPanel.tsx`   |

---

## 4. Current Bottlenecks & TODOs

All bottlenecks and TODOs are based on code review and real implementation constraints. Each item references the relevant file(s) for context.
We will reference memory-bank/TODO.md and memory-bank/progress.md as main TODOs and progress tracking.

1. **Script Injection Scaling** — Each custom component loads its JS individually. Consider `import(/* @vite-ignore */ url)` or a dynamic SystemJS-style loader to avoid global namespace clashes.  
   _See:_ `hooks/useRemoteComponent.tsx`, `remotion/components/scenes/CustomScene.tsx`
2. **Polling Overhead** — Replace `PreviewPanel` polling with **tRPC subscription** and SSE for real-time updates.  
   _See:_ `src/app/projects/[id]/edit/panels/PreviewPanel.tsx`
3. **Serverless Rendering** — Integrate `@remotion/lambda` to export final MP4; store in R2 and reflect download link in UI.  
   _See:_ `server/workers/buildCustomComponent.ts`, `remotion/compositions/DynamicVideo.tsx`
4. **Granular State Patches** — Large JSON-Patch arrays can balloon. Investigate operational-transform or Yjs-style diffing for more efficient state updates.  
   _See:_ `src/server/api/routers/chat.ts`, `stores/videoState.ts`
5. **Security** — Add CSP headers for inline script; further sanitize TSX (no `dangerouslySetInnerHTML`).  
   _See:_ `src/app/api/components/[id]/route.ts`, `generateComponentCode.ts`

---

## 5. File Reference Index (alphabetical)

All files below are referenced in this documentation and are the canonical sources for their respective logic. Always cross-check changes here when updating the pipeline or documentation.

```
src/app/api/components/[id]/route.ts             – Proxy + code transformer for custom component JS
src/app/api/cron/process-component-jobs/route.ts – Vercel-triggered cron to build pending jobs
src/app/projects/[id]/edit/panels/ChatPanel.tsx  – Chat UI & mutation logic
src/app/projects/[id]/edit/panels/PreviewPanel.tsx – Remotion player + polling
src/hooks/useRemoteComponent.tsx                 – Runtime loader for component JS
src/remotion/components/scenes/CustomScene.tsx   – Scene wrapper to render RemoteComponent
src/remotion/components/scenes/index.ts          – Scene registry (includes "custom")
src/server/api/routers/chat.ts                   – Central tRPC router handling AI logic
src/server/workers/generateComponentCode.ts      – GPT-4o TSX generator
src/server/workers/buildCustomComponent.ts       – esbuild + R2 uploader
src/server/db/schema.ts                          – Drizzle schema (projects, patches, jobs, …)
src/stores/videoState.ts                         – Zustand store for props & chat history
src/types/input-props.ts                         – Zod schemas for Remotion scenes & inputProps
```

---
