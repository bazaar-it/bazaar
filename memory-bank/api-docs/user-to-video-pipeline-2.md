// /memory-bank/api-docs/user-to-video-pipeline-2.md

# User-to-Video Pipeline: End-to-End Documentation

This document provides a detailed breakdown of the entire flow from user interaction to video generation and rendering in the Bazaar-Vid application. It explains each component, file, and process involved in the pipeline.

## Table of Contents

1. [Technology Stack Overview](#technology-stack-overview)
2. [User Interaction Flow](#user-interaction-flow)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Processing](#backend-processing)
5. [LLM Integration](#llm-integration)
6. [Custom Component Generation](#custom-component-generation)
7. [R2 Storage Integration](#r2-storage-integration)
8. [Dynamic Component Loading](#dynamic-component-loading)
9. [State Management](#state-management)
10. [Database Schema](#database-schema)
11. [Authentication Flow](#authentication-flow)
12. [Rendering Pipeline](#rendering-pipeline)
13. [Current Challenges](#current-challenges)

## Technology Stack Overview

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Next.js API Routes, tRPC procedures
- **Database**: Neon Postgres via Drizzle ORM
- **Authentication**: Auth.js (NextAuth)
- **Video**: Remotion ^4.0 for preview and rendering
- **LLM**: OpenAI GPT-4o with Tools API
- **Storage**: Cloudflare R2 for custom components
- **State Management**: Zustand
- **API Communication**: tRPC with WebSocket transport
- **Build Tools**: esbuild (TSX→ESM)

## User Interaction Flow

### 1. User Authentication and Project Creation

**Relevant Files:**
- `src/server/auth.ts` - Authentication configuration
- `src/app/page.tsx` - Landing page with prompt input
- `src/app/projects/[id]/edit/page.tsx` - Project editor

**Process:**
1. User logs in via Auth.js
2. User can start a new project in one of two ways:
   - From the landing page by submitting an initial prompt (via `project.create.useMutation` with `initialMessage`)
   - From within an existing project by creating a new one in the editor interface
3. System initializes a new project in the database with default video properties
4. User is navigated to the project edit page (`/projects/[id]/edit`)

### 2. Project Editor Interface

**Relevant Files:**
- `src/app/projects/[id]/edit/page.tsx` - Main editor page
- `src/app/projects/[id]/edit/InterfaceShell.tsx` - Editor layout container
- `src/app/projects/[id]/edit/panels/ChatPanel.tsx` - Chat interface
- `src/app/projects/[id]/edit/panels/PreviewPanel.tsx` - Video preview
- `src/app/projects/[id]/edit/Sidebar.tsx` - Project sidebar with custom components list

**Process:**
1. `page.tsx` loads project data from database
2. Server components fetch initial project data
3. `InterfaceShell.tsx` sets up the layout with panels for Chat, Preview, and Sidebar
4. `PreviewPanel` initializes the Remotion player with the project's video properties
5. `ChatPanel` loads or initializes the chat history

## Frontend Architecture

### Chat Interface

**Relevant Files:**
- `src/app/projects/[id]/edit/panels/ChatPanel.tsx` - Chat UI & mutation logic
- `src/stores/videoState.ts` - Zustand store with chat message handling

**Process:**
1. User types a message in the chat input
2. `ChatPanel.handleSubmit` captures the message and calls the `api.chat.sendMessage.useMutation`
3. The state is optimistically updated with the user's message via `addMessage`
4. When the server responds, the system either:
   - Updates the chat with LLM's response
   - Applies JSON patches to the video state
   - Handles custom component generation requests

### Video Preview

**Relevant Files:**
- `src/app/projects/[id]/edit/panels/PreviewPanel.tsx` - Preview container
- `src/remotion/compositions/DynamicVideo.tsx` - Main Remotion composition
- `src/remotion/components/scenes/index.ts` - Scene registry
- `src/hooks/useRemoteComponent.tsx` - Hook for loading dynamic components

**Process:**
1. `PreviewPanel` sets up the Remotion Player with the current video state
2. The Player renders the `DynamicVideo` composition
3. `DynamicVideo` iterates through the scenes and renders each one based on its type via `sceneRegistry`
4. For custom components, it uses the `CustomScene` component
5. `CustomScene` uses `useRemoteComponent` to dynamically load components from R2

## Backend Processing

### tRPC Routers

**Relevant Files:**
- `src/server/api/root.ts` - tRPC router configuration
- `src/server/api/routers/chat.ts` - Chat handling and LLM integration
- `src/server/api/routers/project.ts` - Project management
- `src/server/api/routers/customComponent.ts` - Custom component operations
- `src/server/api/routers/timeline.ts` - Timeline operations

**Process:**
1. The frontend interacts with backend exclusively through type-safe tRPC procedures
2. Each router handles a specific domain of functionality
3. Protected procedures verify user authentication and authorization
4. Procedures interact with the database using Drizzle ORM

## LLM Integration

**Relevant Files:**
- `src/server/api/routers/chat.ts` - Chat handling with LLM (`chat.ts > processUserMessageInProject`)
- `src/server/lib/openai.ts` - OpenAI client configuration

**Process:**
1. User message is sent to `chat.sendMessage` tRPC procedure
2. Procedure retrieves conversation history from database
3. System constructs a prompt with:
   - The user's message
   - Conversation history
   - System instructions about available scene types
   - Function definitions for `applyJsonPatch` and `generateRemotionComponent`
4. Request is sent to OpenAI with function calling enabled using the Tools API
5. LLM responds with either:
   - A regular text message
   - A function call to `applyJsonPatch` with operations
   - A function call to `generateRemotionComponent` with TSX code

## Custom Component Generation

**Relevant Files:**
- `src/server/api/routers/chat.ts` - Handles LLM component generation requests
- `src/server/api/routers/customComponent.ts` - Component job management
- `src/server/workers/generateComponentCode.ts` - Component code processing
- `src/server/workers/buildCustomComponent.ts` - Component compilation
- `src/app/api/cron/process-component-jobs/route.ts` - Background processing

**Process:**
1. LLM generates code through function calling in `chat.ts`
2. System creates a new component job in the `custom_component_job` table with status=`pending`
3. The cron job endpoint periodically processes pending jobs
4. For each job, the system:
   - Updates status to "building"
   - Performs code sanitization and post-processing (only `react`/`remotion` imports)
   - Compiles TSX to JS using esbuild
   - Uploads the compiled JS to R2 (`custom-components/{id}.js`)
   - Updates the job status to "completed" with the output URL

## R2 Storage Integration

**Relevant Files:**
- `src/server/workers/buildCustomComponent.ts` - R2 upload logic
- `src/app/api/components/[id]/route.ts` - Component serving proxy

**Process:**
1. Compiled JS files are uploaded to the R2 bucket
2. The R2 URL is stored in the `outputUrl` field of the job
3. When component is needed in the frontend, the browser loads it via the API proxy
4. The API proxy in `src/app/api/components/[id]/route.ts`:
   - Fetches the component from R2
   - Transforms the code to make it runnable in the browser (strips ESM imports/exports)
   - Adds necessary wrapper code to handle React and Remotion globals
   - Wraps in IIFE and assigns to `window.__REMOTION_COMPONENT`
   - Serves the component with proper caching headers (`Cache-Control: public, max-age=86400`)

## Dynamic Component Loading

**Relevant Files:**
- `src/hooks/useRemoteComponent.tsx` - Component loading hook
- `src/remotion/components/scenes/CustomScene.tsx` - Custom scene renderer
- `src/app/api/components/[id]/route.ts` - Component serving API

**Process:**
1. When a scene with `type: "custom"` is encountered:
   - `DynamicVideo` renders a `CustomScene` component
   - `CustomScene` gets the component ID from the scene data
   - It passes this ID to the `RemoteComponent` wrapper
2. `RemoteComponent` uses `useRemoteComponent` hook to:
   - Create a script tag pointing to `/api/components/[id]`
   - Add it to the document
   - Wait for the script to execute
   - Access the component from `window.__REMOTION_COMPONENT`
3. The hook delivers the loaded component, which is then rendered in the Remotion composition

## State Management

**Relevant Files:**
- `src/stores/videoState.ts` - Zustand store for video state
- `src/types/input-props.ts` - Video state type definitions
- `src/types/json-patch.ts` - JSON patch type definitions

**Process:**
1. Video state is managed in the `videoState.ts` Zustand store
2. The store maintains:
   - InputProps for each project
   - Chat history with optimistic updates
   - Methods for applying JSON patches
3. When patches come from the server, they're applied to the state:
   - `applyPatch` method applies the patches immutably
   - The updated state triggers a re-render of the Remotion player
4. The entire state flow is type-safe through TypeScript and Zod schemas

## Database Schema

**Relevant Files:**
- `src/server/db/schema.ts` - Drizzle schema definitions
- `src/server/db/index.ts` - Database client setup
- `drizzle.config.ts` - Drizzle configuration

**Main Tables:**
1. **user, account, session, verificationToken** - Auth.js tables
2. **project** - Stores project metadata and video properties (`id`, `userId`, `title`, `props JSONB`, timestamps)
3. **message** - Stores chat history for each project
4. **custom_component_job** - Tracks component generation jobs (status enum, outputUrl etc.)
5. **patch** - Stores applied JSON patches (if implemented)

## Authentication Flow

**Relevant Files:**
- `src/lib/auth.ts` - Auth.js configuration (exposes `getServerAuthSession()`)
- `src/app/login/page.tsx` - Login page
- `src/server/api/trpc.ts` - tRPC authentication middleware

**Process:**
1. User signs in through the login page
2. Auth.js handles the authentication flow
3. User session is stored in the database
4. tRPC's `protectedProcedure` middleware verifies authentication
5. Additional authorization checks ensure users can only access their own projects
6. Each tRPC resolver double-checks `project.userId === session.user.id` before mutation

## Rendering Pipeline

**Relevant Files:**
- `src/app/projects/[id]/edit/InterfaceShell.tsx` - Render button handler
- `src/server/api/routers/render.ts` - tRPC render procedure
- Future: Integration with Remotion Lambda for serverless rendering

**Current Process:**
1. User clicks "Render" button in the UI
2. Frontend calls `render.start` tRPC mutation
3. Backend initiates the rendering process
4. Current implementation needs enhancement for full video rendering
5. Future integration with `@remotion/lambda` to export final MP4 to R2

## Current Challenges

1. **Component Loading Optimization**:
   - The current approach uses script tags to load components
   - This works but could be optimized for better performance
   - Consider `import(/* @vite-ignore */ url)` or dynamic `SystemJS` style loader to avoid global namespace clashes

2. **Code Generation Quality**:
   - LLM-generated code occasionally has issues
   - Post-processing helps but more robust validation might be needed
   - Static analysis with eslint/tsc is planned

3. **Rendering Pipeline**:
   - Full rendering workflow needs completion
   - Integration with Remotion Lambda for serverless rendering
   - R2 storage for rendered videos

4. **State Management at Scale**:
   - As projects grow in complexity, state management needs optimization
   - Consider more granular updates or memoization
   - Large JSON-Patch arrays can balloon; investigate operational-transform or Y-js style diffing

5. **Error Handling**:
   - More robust error handling and recovery mechanisms are needed
   - Especially for component generation and loading failures
   - Add retry/back-off UI for R2 fetch failures

## Source Files Reference

| Component | Primary Files |
|-----------|--------------|
| Authentication | `src/lib/auth.ts` |
| Database Schema | `src/server/db/schema.ts` |
| Chat Logic | `src/server/api/routers/chat.ts`, `src/app/projects/[id]/edit/panels/ChatPanel.tsx` |
| Video Preview | `src/app/projects/[id]/edit/panels/PreviewPanel.tsx`, `src/remotion/compositions/DynamicVideo.tsx` |
| Custom Components | `src/server/api/routers/customComponent.ts`, `src/server/workers/buildCustomComponent.ts` |
| Component Loading | `src/hooks/useRemoteComponent.tsx`, `src/app/api/components/[id]/route.ts` |
| State Management | `src/stores/videoState.ts` |
| Remotion Integration | `src/remotion/Root.tsx`, `src/remotion/components/scenes/index.ts` | 