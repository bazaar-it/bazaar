# Bazaar-Vid: AI-Powered Video Creation Platform

> **Purpose**: This README provides an overview of the Bazaar-Vid platform, its components, and development guidelines.

> **Documentation**: For detailed documentation, refer to the `/memory-bank` folder, which contains comprehensive documentation on all aspects of the project. See also:
> - [Prompt Flow Architecture](docs/prompt-flow.md) - Scene-first generation and edit loop system

---

## 1 Project Overview

| Layer | Choice |
|-------|--------|
| Framework | Next 15 (App Router) – generated via **create‑t3‑app** |
| Styling | Tailwind + **21stst.dev** design tokens |
| DB | Postgres (Neon / Railway) |
| ORM | **Drizzle** (`drizzle-orm`, `drizzle-kit`) |
| Auth | **Auth.js v5** + Drizzle adapter (tables in same DB) |
| API | **tRPC v11** (HTTP + WS links) |
| Video | **Remotion** (@remotion/player for preview, @remotion/lambda for renders) |
| Realtime | Server-Sent Events (SSE) for A2A updates, tRPC WebSocket for streaming |
| Storage | Cloudflare R2 (S3‑compatible) for image / MP4 assets |
| LLM | OpenAI API with GPT-4o-mini model (note: use "gpt-4o-mini", not "gpt-o4-mini") |
| Agent System | Google's Agent-to-Agent (A2A) protocol implementation |

---

## 2 Non‑negotiable rules

1. **Preview is props‑driven only.** `@remotion/player` lives in a single `"use client"` island, fed by `inputProps` JSON.
2. **LLM edits === JSON Patches** compliant with RFC 6902. No live TS/JS execution.
3. **One auth call per request.** Use `await auth()` (from `@/auth.ts`) inside Route Handlers / Server Components. Never instantiate extra clients.
4. **One DB client.** import { db } from '~/server/db';` (Drizzle). No direct `pg` or Prisma.
5. **Type safety end‑to‑end.** Schema lives in `db/schema.ts` + shared `InputProps` Zod type.
6. **Keep it tiny.** Prefer explicit SQL to heavy abstractions; avoid unnecessary dependencies.
7. **Use standard UUIDs.** Always use `randomUUID()` from Node.js crypto module for database IDs, not `nanoid()` or other formats.
8. **Rigorous validation.** Always validate external inputs with Zod schemas before processing.

---

## 3 Folder layout

```
/app
  /api/
      trpc/[trpc]/route.ts  // tRPC router handler for all procedures
      components/[id]/route.ts // Custom component server
  /projects/[id]/
      edit/                 // Editor UI with panels and timeline
      page.tsx              // Project view
/server/
  /api/
      /routers/
          chat.ts           // tRPC chat router with streaming
          video.ts          // Video state management
          customComponent.ts // Custom component management
  /workers/
      generateComponentCode.ts // LLM code generation
      buildCustomComponent.ts  // Compile & upload to R2
/components/
  client/                   // All "use client" components
      Timeline/             // Timeline UI components
      PlayerShell.tsx       // Remotion Player wrapper
/remotion/
  compositions/DynamicVideo.tsx // Main Remotion composition
  components/scenes/       // Scene implementations
/stores/
  videoState.ts            // Zustand store for video state
/types/
  input-props.ts           // Zod schemas for video data
  timeline.ts              // Timeline data structures
/db/
  schema.ts                // Drizzle table definitions
  index.ts                 // Drizzle client export
```

---

## 4 Installing Remotion (follow **exactly**)

1. **Deps**
   ```bash
   npm add @remotion/player@4.0.291 @remotion/cli@4.0.291 remotion@4.0.291
   npm add -D @remotion/renderer@4.0.291 @remotion/lambda@4.0.291
   ```
2. **Config**
   *`remotion.config.ts`* in repo root:
   ```ts
   import { defineRemotionConfig } from "remotion";
   export default defineRemotionConfig({
     id: "bazaar-vid-site",
     codec: "h264",
   });
   ```
3. **Composition**
   *`remotion/compositions/DynamicVideo.tsx`*:
   ```tsx
   import React from "react";
   import { AbsoluteFill, Series } from "remotion";
   import type { InputProps } from "~/types/input-props";
   import { sceneRegistry } from "../components/scenes";
   
   export const DynamicVideo: React.FC<InputProps> = ({ scenes, meta }) => {
     return (
       <AbsoluteFill>
         <Series>
           {scenes.map((scene) => {
             const SceneComponent = sceneRegistry[scene.type];
             if (!SceneComponent) {
               console.warn(`Unknown scene type: ${scene.type}`);
               return null;
             }
             return (
               <Series.Sequence
                 key={scene.id}
                 durationInFrames={scene.duration}
                 offset={scene.start}
               >
                 <SceneComponent {...scene.data} />
               </Series.Sequence>
             );
           })}
         </Series>
       </AbsoluteFill>
     );
   };
   
   export const RemotionRoot: React.FC = () => (
     <Composition
       id="main"
       component={DynamicVideo}
       durationInFrames={300} // Default, will be overridden
       fps={30}
       width={1920}
       height={1080}
       defaultProps={{ scenes: [], meta: { duration: 300, title: "New Video" } }}
     />
   );
   ```
4. **Player shell**
   ```tsx
   "use client";
   import { Player } from "@remotion/player";
   import { DynamicVideo } from "~/remotion/compositions/DynamicVideo";
   import type { InputProps } from "~/types/input-props";
   
   export function PlayerShell({ props }: { props: InputProps }) {
     return (
       <Player
         component={DynamicVideo}
         inputProps={props}
         durationInFrames={props.meta.duration}
         fps={30}
         style={{ width: "100%" }}
         compositionWidth={1920}
         compositionHeight={1080}
       />
     );
   }
   ```
5. **Local dev**
   * `npm exec remotion studio` for Remotion studio.

---

## 5 Styling conventions (21stst.dev)

* Tailwind preset: `npm add -D @21stst/tailwind-config` ➜ extend in `tailwind.config.ts`.
* Use semantic classes (`text-primary`) over raw color classes (`text-blue-500`).
* Shadows & radius sizes use 21stst scale.
* First line in every file should be a comment about the relative path to maintain context.

---

## 6 Custom Component Generation

1. **LLM Generation**: When a user requests a custom animation, the OpenAI GPT-4o-mini model generates the TSX code.
2. **UUID Handling**: All database IDs use standard UUIDs generated with `randomUUID()` from the Node.js crypto module.
3. **Secure Build**: The generated TSX is compiled to JS using esbuild and stored in Cloudflare R2.
4. **Dynamic Loading**: Components are loaded dynamically in the player using a script tag approach.
5. **Codebase Maintenance**: Keep all code well-structured and documented with clear error handling.

---

## 7 Timeline System

1. **Timeline UI**: A custom timeline UI with tracks, items, and interactive editing.
2. **Scene Management**: Each scene in the video has a corresponding timeline item.
3. **Status Feedback**: Timeline items display status indicators for building, success, errors, etc.
4. **Integration**: Timeline changes update the video preview in real-time via JSON patches.

---

## 8 Cursor code‑writing commandments

1. **Always update docs:** if you add a table ➜ update `schema.ts` + README.
2. **Keep PRs atomic** – one feature / one migration / one test.
3. **No unused code** – run `npm test && npm lint && npm type-check` locally before proposing.
5. **Validate everything** – LLM JSON patches must pass Zod before persisting.
6. **Use proper UUIDs** – Always use `randomUUID()` for database IDs, not `nanoid()`.
7. **Add path comments** – First line in every file should indicate its relative path.

---

## 9 Documentation

All detailed documentation is maintained in the `/memory-bank` folder. Key documentation includes:

### Core Documentation

- **[agent.md](/memory-bank/agent.md)** - Comprehensive documentation of the A2A system
- **[a2a](/memory-bank/a2a/)** - Detailed A2A implementation docs
- **[api-docs](/memory-bank/api-docs/)** - API endpoints documentation
- **[sprints](/memory-bank/sprints/)** - Sprint planning and progress docs
- **[remotion](/memory-bank/remotion/)** - Remotion component documentation

### Development Guides

- **[db-analysis-toolkit.md](/memory-bank/db-analysis-toolkit.md)** - Database analysis tools
- **[testing](/memory-bank/testing/)** - Testing strategy and tools
- **[scripts_documentation](/memory-bank/scripts_documentation/)** - Utility scripts documentation

*Last update: 2025-05-18*

## 10 Log Agent

The Log Agent is a standalone service that analyzes runtime logs for patterns and
issues. It can perform automated checks and optional LLM-powered analysis to
help diagnose problems during development.

### Starting the Log Agent

```bash
npm run log:agent
```

Or use the helper script which also starts Redis if needed:

```bash
scripts/start-log-agent.sh
```

### Required environment variables

- `LOG_AGENT_PORT` – Port to run the service (default `3002`)
- `LOG_AGENT_REDIS_URL` – Redis connection URL
- `OPENAI_API_KEY` – API key for LLM analysis
- `LOG_AGENT_OPENAI_MODEL` – OpenAI model (`gpt-4o-mini`)
- `LOG_AGENT_MAX_TOKENS` – Token limit for analysis
- `LOG_AGENT_ISSUE_THRESHOLD` – Issue notification threshold

See [memory-bank/logs/log-agent.md](memory-bank/logs/log-agent.md) for detailed
documentation.

