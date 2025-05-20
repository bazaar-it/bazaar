# Bazaar-Vid: Agent Guide

This document provides comprehensive guidance for AI assistants like Codex when working with the Bazaar-Vid codebase. It outlines not just what to do, but how to work effectively with this specific project structure.

## Project Overview

Bazaar-Vid is an AI-powered video creation platform leveraging Remotion and Next.js, with an Agent-to-Agent (A2A) architecture for complex video generation tasks.

| Layer | Technology |
|-------|------------|
| Framework | Next 15 (App Router) with TypeScript |
| Styling | Tailwind + shadcn/ui |
| Database | Postgres (Neon) |
| ORM | Drizzle (`drizzle-orm`, `drizzle-kit`) |
| Auth | Auth.js v5 + Drizzle adapter |
| API | tRPC v11 (HTTP + WS links) |
| Video | Remotion (@remotion/player for preview, @remotion/lambda for renders) |
| Realtime | Server-Sent Events (SSE) for A2A updates, tRPC WebSocket for streaming |
| Storage | Cloudflare R2 (S3-compatible) for assets |
| LLM | OpenAI API with GPT-4o-mini model |
| Agent System | Google's Agent-to-Agent (A2A) protocol implementation |

## Key Architecture Components

The codebase has two parallel architectures:

1. **Standard Functionality (Main Production):** 
   - Entry: `src/app/projects/[id]/edit/page.tsx`
   - Pattern: Direct service calls
   - Key Files: `src/server/api/routers/chat.ts`, `chatOrchestration.service.ts`

2. **Agent-to-Agent (A2A) System (Experimental):**
   - Entry: `src/app/test/evaluation-dashboard/page.tsx`
   - Pattern: Message bus with pub/sub
   - Key Files: `message-bus.ts`, `taskProcessor.service.ts`, `taskManager.service.ts`

## Documentation Structure and Sprint Workflow

### Memory Bank Organization

All documentation lives in the `/memory-bank` folder:

```
/memory-bank/
  progress.md             # Project-wide progress overview
  TODO.md                 # Project-wide pending tasks
  /api-docs/              # API endpoint documentation
  /testing/               # Testing strategies and results
  /a2a/                   # A2A protocol documentation
  /remotion/              # Remotion component docs
  /sprints/               # Sprint-specific documentation
    /sprint24/            # Current sprint
      overview.md         # Sprint goals and architecture
      progress.md         # Sprint-specific progress tracking
      TODO.md             # Sprint-specific tasks
      tickets.md          # Specific tickets/issues to address
```

memory-bank/progress-system.md
"//memory-bank/progress-system.md
# Progress & TODO Guidelines

This document explains how progress updates and TODO lists are organized.

## Progress Logs

- **Main log**: `/memory-bank/progress.md` contains brief highlights and an index
  of sprint progress files.
- **Sprint logs**: Each sprint keeps a detailed progress file under
  `/memory-bank/sprints/<sprint>/progress.md`.
- **Special topics**: Additional progress files such as
  `/memory-bank/a2a/progress.md` or `/memory-bank/scripts/progress.md` are linked
  from the main log.

When adding new progress notes:
1. Update the relevant sprint's `progress.md` with detailed information.
2. Add a short summary to `/memory-bank/progress.md` if it is a major update.

## TODO Lists

- **Main TODO**: `/memory-bank/TODO.md` gathers outstanding tasks.
- **Sprint TODOs**: Each sprint may include a `TODO.md` for sprint‑specific
  tasks.
- **High priority**: `/memory-bank/TODO-critical.md` tracks urgent issues.

Keep these documents up to date and reference them from Pull Requests so the team
has a single source of truth for work status.

## Log Retention Policy

The first 200 lines of `/memory-bank/progress.md` should always contain the most
important recent updates. Older entries should be moved to
`/memory-bank/progress-history.md` rather than deleted. This keeps the main log
focused while preserving a complete history.
"

### Sprint-Based Workflow

When working on tasks, ALWAYS:

1. **Start by reviewing the current sprint documentation:**
   - First check `/memory-bank/sprints/[current-sprint]/overview.md` for high-level context
   - Review `/memory-bank/sprints/[current-sprint]/progress.md` for recent developments
   - Consult `/memory-bank/sprints/[current-sprint]/TODO.md` for pending tasks

2. **Document your work in the sprint-specific files:**
   - Update `progress.md` with completed items and findings
   - Update `TODO.md` with new or refined tasks
   - Create detailed implementation notes or research in new files within the sprint folder

3. **Only update project-wide files when appropriate:**
   - For significant milestones: update `/memory-bank/progress.md`
   - For new major tasks: update `/memory-bank/TODO.md`
   - Only after completing sprint tasks that impact project-wide status

4. **Create specialized documentation when needed:**
   - API endpoints → `/memory-bank/api-docs/api-[router]-[procedure].md`
   - Testing approaches → `/memory-bank/testing/[feature]-testing.md`
   - Architectural decisions → `/memory-bank/[system]-architecture.md`

## Work Patterns for Complex Tasks

### Documentation-First Approach

When tackling complex tasks:

1. **Create a research document** in the current sprint folder
2. **Outline the approach** with potential solutions
3. **Document findings** and experiments
4. **Reference external documentation** with links
5. **Update the sprint progress** file with key decisions

### Implementation Guidance

1. **Create a task checklist** in the sprint folder for multi-step implementations
2. **Document progress incrementally** as you work
3. **Include architectural diagrams** when appropriate
4. **Link to commit hashes** for significant changes
5. **Document troubleshooting** steps and solutions

## Project Startup Modes and Logging

The application can be started in two distinct modes, each with a different focus and logging behavior:

### 1. Project 1 Mode (Standard Application)

**Startup Command:** `npm run dev`

**Purpose:** Focus on the main application (Project 1) without A2A agent distractions

**Logging Behavior:**
- Main application logs are displayed in the console
- A2A agent logs at `info` and `debug` levels are **suppressed** in the console
- Only critical errors from A2A agents (at `error` level) are shown
- All logs are still sent to log files and the Log Agent service

**When to Use:** For most development tasks focused on the user interface, chat functionality, or standard features that don't involve the Agent-to-Agent system

### 2. Project 2 Mode (A2A Development)

**Startup Command:** `scripts/startup-with-a2a.sh`

**Purpose:** Focus on Agent-to-Agent (A2A) functionality (Project 2) with detailed agent logging

**Logging Behavior:**
- All logs, including detailed A2A agent logs, are displayed in the console
- Agent initialization messages, lifecycle events, and agent-to-agent messages are visible
- The script sets `LOGGING_MODE=a2a` environment variable to enable verbose A2A logging
- A2A logs are stored in an external directory to prevent triggering HMR

**When to Use:** When developing, debugging, or testing the A2A system, agent interactions, or components that rely on the agent pipeline

### Technical Implementation

The logging separation is controlled by the `LOGGING_MODE` environment variable in `src/lib/logger.ts`. When the application starts:

1. The logger checks if `LOGGING_MODE === 'a2a'` 
2. If true (Project 2 mode), the a2aLogger's console transport level is set to `'info'` or the specified LOG_LEVEL
3. If false (Project 1 mode), the a2aLogger's console transport level is set to `'error'`, suppressing info and debug logs

This separation keeps the console clean and focused on the relevant logs for each development context.

## Key Principles

1. **Preview is props-driven only.** `@remotion/player` lives in a single `"use client"` island, fed by `inputProps` JSON.
2. **LLM edits === JSON Patches** compliant with RFC 6902. No live TS/JS execution.
3. **One auth call per request.** Use `await auth()` inside Route Handlers / Server Components.
4. **One DB client.** Import `db` from '~/server/db' (Drizzle). No direct `pg` or Prisma.
5. **Type safety end-to-end.** Schema lives in `db/schema.ts` + shared `InputProps` Zod types.
6. **Keep it tiny.** Prefer explicit SQL to heavy abstractions; avoid unnecessary dependencies.
7. **Rigorous validation.** Always validate external inputs with Zod schemas before processing.
8. **Path comments.** First line in every file should be a comment with its relative path.

## Directory Structure

```
/app
  /api/
      trpc/[trpc]/route.ts  // tRPC router handler for all procedures
      components/[id]/route.ts // Custom component server
  /projects/[id]/
      edit/                 // Editor UI with panels and timeline
      page.tsx              // Project view
  /test/
      evaluation-dashboard/ // A2A system testing UI
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
          taskProcessor.service.ts // Task polling and processing

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

4. **Current Focus (Sprint 24)**:
   - Stabilizing agent lifecycle
   - Improving logging and observability
   - Enhancing test coverage
   - Building diagnostic tools

## Testing Framework

When working on tests:

1. **Review existing test methodologies:**
   - Check `/memory-bank/testing/` for test strategies
   - Review current sprint test improvements

2. **Jest ESM Configuration:**
   - Project uses ESM modules
   - Config in `jest.config.cjs` with `extensionsToTreatAsEsm`
   - See `/memory-bank/testing/jest_esm_nextjs_setup.md` for details

3. **Test Categories:**
   - Unit tests for services and utilities
   - Integration tests for agent communication
   - End-to-end tests for component generation
   - UI component tests

4. **Running Tests:**
   ```bash
   # Run all tests
   npm test
   
   # Run specific test
   npm test -- -t "test name"
   
   # Run with coverage
   npm test -- --coverage
   ```

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
   - All database operations MUST use Drizzle ORM from `~/server/db` 
   - Do not generate or execute raw SQL strings

6. **UI Treatment**:
   - Use ShadCN library components for feedback, errors, and success messages
   - Avoid toast notifications
   - Create consistent UI patterns for similar interactions

## Commands and Tools

### Development Workflow:
```bash
# Standard development server
npm run dev

# With A2A system enabled
npm run dev:a2a

# Run startup script with A2A
./scripts/startup-with-a2a.sh



review the tests.md - file for how to do testing . and couemtn the testng in  memory-bank/testing folder
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Database Operations:
```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:push

# Database exploration tools (outputs to /analysis)
node src/scripts/db-tools/explore-db.js
node src/scripts/db-tools/list-projects.js
node src/scripts/db-tools/get-project-components.js [projectId]
```

### Remotion Development:
```bash
# Start Remotion studio
npm exec remotion studio

# Test component rendering
node src/scripts/check-component.ts [componentId]
```

### Debug Tools:
```bash
# MCP Log Tools
log_query "search through logs"
log_clear
log_issues

# A2A Diagnostic Tools
http://localhost:3000/test/evaluation-dashboard
```

## Documentation Requirements

When completing tasks, you MUST:

1. **Document process and progress:**
   - Create a new file in `/memory-bank/sprints/[current-sprint]/` if needed
   - Update sprint progress.md with what you've accomplished
   - Document any key findings or important patterns discovered

2. **For significant architectural changes:**
   - Create diagrams explaining the new structure
   - Document reasoning behind major decisions
   - Explain how the change impacts existing systems

3. **For API endpoints:**
   - Create a doc in `/memory-bank/api-docs/`
   - Include input/output types and examples
   - Document authentication requirements and error handling

4. **For component/UI improvements:**
   - Document the component hierarchy
   - Explain state management
   - Include screenshots or diagrams if helpful

## PR Guidelines

1. Always update documentation alongside code changes
2. Include test coverage for new features
3. Validate all inputs and ensure type safety
4. Remove any unused code
5. Add path comments to new files
6. Reference sprint tasks in commit messages
