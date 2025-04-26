# Cursor Agent Guide – Bazaar‑Vid

> **Purpose** Give Cursor (or Codex CLI) a single, authoritative source of truth so every file it touches follows the same ground rules.  Paste this into the repo root (or `.cursor/README.md`).

---

## 1 Project snapshot

| Layer | Choice |
|-------|--------|
| Framework | Next 15 (App Router) – generated via **create‑t3‑app** |
| Styling | Tailwind + **21stst.dev** design tokens |
| DB | Postgres (Neon / Railway) |
| ORM | **Drizzle** (`drizzle-orm`, `drizzle-kit`) |
| Auth | **Auth.js v5** + Drizzle adapter (tables in same DB) |
| API | **tRPC v11** (HTTP + WS links) |
| Video | **Remotion** (OSS) for preview, **Remotion Lambda** for renders |
| Realtime | tRPC WebSocket link (no Supabase Realtime) |
| Storage | Cloudflare R2 (S3‑compatible) for image / MP4 assets |

---

## 2 Non‑negotiable rules

1. **Preview is props‑driven only.**  `@remotion/player` lives in a single `"use client"` island, fed by `inputProps` JSON.
2. **LLM edits === JSON Patches** compliant with RFC 6902.  No live TS/JS execution.
3. **One auth call per request.**  Use `await auth()` (from `@/auth.ts`) inside Route Handlers / Server Components.  Never instantiate extra clients.
4. **One DB client.**  Import `db` from `@/db` (Drizzle).  No direct `pg` or Prisma.
5. **Type safety end‑to‑end.**  Schema lives in `db/schema.ts` + shared `InputProps` Zod type.
6. **Keep it tiny.**  Prefer explicit SQL to heavy abstractions; avoid unnecessary dependencies.

---

## 3 Folder layout

```
/app
  + api/
      chat/route.ts       // tRPC router -> JSON patch flow
      render/route.ts     // Remotion Lambda trigger
/auth.ts                 // Auth.js config & helpers
/db/
  schema.ts              // Drizzle table defs
  index.ts               // createDrizzle() client
/components/
  client/PlayerShell.tsx // "use client" – Remotion Player
  DynamicVideo.tsx       // Remotion composition
/lib/
  llm.ts                 // OpenAI / Claude helpers
  patch.ts               // fast-json-patch utils
/t3/
  trpc.ts                // tRPC init (HTTP + WS links)
```

---

## 4 Installing Remotion (follow **exactly**)

1. **Deps**
   ```bash
   pnpm add @remotion/player @remotion/cli remotion
   pnpm add -D @remotion/renderer @remotion/lambda
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
   *`components/DynamicVideo.tsx`*:
   ```tsx
   import { Composition } from "remotion";
   export const DynamicVideo = ({ inputProps }: { inputProps: InputProps }) => {
     // switch over scene types here
   };

   export const RemotionRoot: React.FC = () => (
     <Composition
       id="main"
       component={DynamicVideo}
       durationInFrames={inputProps.meta.duration}
       fps={30}
       width={1080}
       height={1920}
       defaultProps={inputProps}
     />
   );
   ```
4. **Player shell**
   ```tsx
   "use client";
   import { Player } from "@remotion/player";
   export function PlayerShell({ props }: { props: InputProps }) {
     return (
       <Player
         component={DynamicVideo}
         inputProps={props}
         durationInFrames={props.meta.duration}
         fps={30}
         style={{ width: "100%" }}
       />
     );
   }
   ```
5. **Local dev**
   * `pnpm remotion dev remotion.config.ts`* for studio.

---

## 5 Styling conventions (21stst.dev)

* Tailwind preset: `pnpm add -D @21stst/tailwind-config` ➜ extend in `tailwind.config.ts`.
* Use semantic classes (`text‑primary`) over raw hex.
* Shadows & radius sizes use 21stst scale.

---

## 6 Cursor code‑writing commandments

1. **Always update docs:** if you add a table ➜ update `schema.ts` + README.
2. **Keep PRs atomic** – one feature / one migration / one test.
3. **No unused code** – run `pnpm test && pnpm lint && pnpm type-check` locally before proposing.
4. **Prefer explicit over clever** – write the SQL, don’t hide it behind magic helpers.
5. **Validate everything** – LLM JSON patches must pass Zod before persisting.

---

*Last update: 2025‑04‑26*

