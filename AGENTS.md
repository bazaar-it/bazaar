# Bazaar-Vid: Agent Guide

This document provides guidance for AI assistants like Codex when working with the Bazaar-Vid codebase.

## Project Overview

Bazaar-Vid is an AI-powered video creation platform leveraging Remotion and Next.js, with an Agent-to-Agent (A2A) architecture for complex video generation tasks.

| Layer | Technology |
|-------|------------|
| Framework | Next 15 (App Router) with TypeScript |
| Styling | Tailwind + shadcn/ui |
| Database | Postgres (Neon ) |
| ORM | Drizzle (`drizzle-orm`, `drizzle-kit`) |
| Auth | Auth.js v5 + Drizzle adapter |
| API | tRPC v11 (HTTP + WS links) |
| Video | Remotion (@remotion/player for preview, @remotion/lambda for renders) |
| Realtime | Server-Sent Events (SSE) for A2A updates, tRPC WebSocket for streaming |
| Storage | Cloudflare R2 (S3-compatible) for assets |
| LLM | OpenAI API with GPT-4o-mini model |
| Agent System | Google's Agent-to-Agent (A2A) protocol implementation |

## Key Principles

1. **Preview is props-driven only.** `@remotion/player` lives in a single `"use client"` island, fed by `inputProps` JSON.
2. **LLM edits === JSON Patches** compliant with RFC 6902. No live TS/JS execution.
3. **One auth call per request.** Use `await auth()` inside Route Handlers / Server Components.
4. **One DB client.** Import `db` from '~/server/db' (Drizzle). No direct `pg` or Prisma.
5. **Type safety end-to-end.** Schema lives in `db/schema.ts` + shared `InputProps` Zod types.
6. **Keep it tiny.** Prefer explicit SQL to heavy abstractions; avoid unnecessary dependencies.
8. **Rigorous validation.** Always validate external inputs with Zod schemas before processing.

## Directory Structure

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
  /agents/                  // A2A system implementation
      base-agent.ts         // Base agent class
      coordinator-agent.ts  // Main orchestrator agent
      adb-agent.ts          // Animation Design Brief agent
      scene-planner-agent.ts // Scene planning agent
      builder-agent.ts      // Component builder agent
  /services/
      /a2a/                 // A2A core services
          taskManager.service.ts // Task management
          sseManager.service.ts  // SSE real-time updates
          agentRegistry.service.ts // Agent registry
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
  a2a.ts                   // A2A protocol type definitions
/db/
  schema.ts                // Drizzle table definitions
  index.ts                 // Drizzle client export
/memory-bank/              // Project documentation and guides
```

## A2A System

The Agent-to-Agent (A2A) system implements Google's A2A protocol to enable autonomous agents to collaborate on complex tasks:

1. **Base Agent Framework**:
   - `base-agent.ts` provides common agent functionality
   - Agents register with the `agentRegistry.service.ts`
   - Communication via `message-bus.ts`
   - Real-time updates via `sseManager.service.ts`

2. **Specialized Agents**:
   - `coordinator-agent.ts`: Orchestrates workflow
   - `scene-planner-agent.ts`: Plans video scenes
   - `adb-agent.ts`: Creates Animation Design Briefs
   - `builder-agent.ts`: Generates component code
   - Additional agents for storage, error fixing, etc.

3. **Communication Flow**:
   - User prompt → TaskManager → UserInteractionAgent → CoordinatorAgent
   - CoordinatorAgent delegates to specialized agents
   - SSE provides real-time updates to frontend

## Development Guidelines

1. **File Structure**:
   - First line in every file should be a comment about its relative path
   - Avoid dead code and artifacts
   - Use clear, descriptive filenames

2. **Code Style**:
   - Write simple, readable, modular code
   - Create small, focused functions/components
   - Prioritize clarity and maintainability over cleverness
   - Adhere to ESLint/Prettier rules

3. **Type Safety**:
   - Use TypeScript strictly for ALL code
   - Leverage Drizzle ORM for type-safe database interactions
   - Ensure tRPC procedures have typed inputs/outputs
   - Validate ALL external inputs using Zod schemas

4. **React Best Practices**:
   - Add "use client" directive ONLY to components that require it
   - Keep Client Components focused on UI/interaction
   - Prefer Server Components or server-side logic where possible

5. **API Communication**:
   - Use tRPC exclusively for internal API communication
   - All database operations MUST use Drizzle ORM
   - Do not generate or execute raw SQL strings

6. **Testing**:
   - Run `npm test && npm lint && npm type-check` before proposing changes
   - Update tests when modifying functionality

## MCP Tool Usage

| Tool | Purpose |
|------|---------|  
| log_query | Ask questions about current logs via Log Agent |
| log_clear | Flush logs & start fresh run |
| log_issues | List deduped issues for a run |

## Documentation

For detailed documentation, refer to the `/memory-bank` folder, which contains comprehensive guides on all aspects of the project:

- `/memory-bank/agent.md`: A2A system documentation
- `/memory-bank/a2a/`: Detailed A2A implementation docs
- `/memory-bank/api-docs/`: API endpoints documentation
- `/memory-bank/sprints/`: Sprint planning and progress
- `/memory-bank/remotion/`: Remotion component documentation

## Commands

### Development:
```bash
# Standard development server
npm run dev

# With A2A system enabled
npm run dev:a2a

# Run startup script with A2A
./scripts/startup-with-a2a.sh

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database:
```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:push
```

### Remotion:
```bash
# Start Remotion studio
npm exec remotion studio
```

## PR Guidelines

1. Keep PRs atomic - one feature/migration/test per PR
2. Always update documentation alongside code changes
3. Include test coverage for new features
4. Validate all inputs and ensure type safety
5. Remove any unused code
6. Add path comments to new files
