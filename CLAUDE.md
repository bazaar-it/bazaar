# Bazaar-Vid: AI-Powered Video Creation Platform

## Progress & TODO Guidelines (CRITICAL - READ FIRST)

**All development work MUST follow these guidelines:**

### Sprint-Based Workflow
- **Current Sprint**: Sprint 34 (check `/memory-bank/sprints/sprint34/` for context)
- **Documentation First**: For complex tasks, create analysis docs in sprint folder before coding
- **Progress Tracking**: Update `/memory-bank/progress.md` AND sprint-specific progress files
- **Memory Bank**: Always check relevant docs in `/memory-bank/` before starting work

### TODO Organization Structure
```
/memory-bank/
├── TODO-critical.md        # Immediate blockers & bugs
├── TODO.md                 # General backlog
├── sprints/sprintX/
│   ├── TODO.md            # Sprint-specific tasks
│   ├── progress.md        # Sprint progress log
│   └── [analysis-docs]    # Technical analysis files
└── progress.md            # Overall project progress
```

### Documentation Patterns
1. **Before Complex Work**: Create analysis document in current sprint folder
2. **During Work**: Update progress files continuously
3. **After Work**: Document findings and next steps
4. **Cross-Reference**: Link related docs and maintain memory bank connections

### Work Approach
- **Read First**: Check existing documentation before starting
- **Document Everything**: Decisions, findings, and reasoning
- **Progress Updates**: Real-time updates to progress files
- **Sprint Focus**: Stay within current sprint scope unless critical

## Project Overview

Bazaar-Vid is a sophisticated full-stack video creation platform that enables users to generate custom video content through natural language prompts. Built with Next.js 15, Remotion, and AI services, it provides real-time collaboration and dynamic component generation.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Configure: DATABASE_URL, OPENAI_API_KEY, CLOUDFLARE_R2_*, AUTH_SECRET

# Start development
npm run dev

# Database setup
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # View database
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Backend**: tRPC v11 + Next.js API Routes  
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Storage**: Cloudflare R2
- **Video**: Remotion for composition and rendering
- **AI**: OpenAI GPT-4o-mini with MCP tools
- **Real-time**: SSE + JSON Patch for collaboration

### Organized File Structure (Single Source of Truth)

```
src/
├── app/                    # Next.js App Router pages
├── server/                 # Backend services and APIs
│   ├── api/routers/       # tRPC API endpoints
│   ├── services/          # Business logic services
│   │   ├── ai/            # AI & LLM services  
│   │   ├── generation/    # Code generation services
│   │   ├── data/          # Data management
│   │   ├── mcp/           # MCP tools for scene generation
│   │   └── brain/         # Core orchestration
│   ├── db/                # Database schema and queries
│   └── auth/              # Authentication
├── lib/                   # Shared libraries
│   ├── types/             # TypeScript type definitions
│   │   ├── api/           # API and communication types
│   │   ├── video/         # Video and timeline types
│   │   ├── ai/            # AI-related types
│   │   └── shared/        # Shared utility types
│   ├── services/client/   # Client-side only services
│   ├── evals/             # Evaluation framework (CRITICAL)
│   └── utils/             # Utility functions
├── components/            # Reusable UI components
├── remotion/              # Video composition components
├── hooks/                 # React hooks
└── stores/                # State management (Zustand)
```

## Key Features

### 1. MCP Scene Generation System
Modern AI pipeline for video generation:
- **Brain Orchestrator**: Coordinates scene planning and generation
- **MCP Tools**: Structured AI tools for scene creation
- **Generation Router**: Manages component building and storage
- **Evaluation System**: Tests and validates AI pipeline (`/src/lib/evals/`)

### 2. Video Generation Pipeline
```
User Prompt → Scene Planning → Component Generation → 
Building → Storage → Preview → Chat Updates
```

### 3. Real-time Collaboration
- SSE streaming for live updates
- JSON Patch system for efficient state sync
- tRPC subscriptions for chat and progress

### 4. Dynamic Component System
- Built-in scenes: Text, images, shapes, animations
- AI-generated custom components via MCP tools
- ESM loading from R2 storage

## Development Workflow

### Essential Commands
```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm run test               # Run Jest tests
npm run lint               # Linting
npm run typecheck         # Type checking

# Database
npm run db:generate        # Generate migrations
npm run db:migrate         # Apply migrations
npm run db:studio          # Database UI
```

### Configuration Files
- `next.config.js` - Next.js configuration
- `remotion.config.ts` - Remotion setup
- `drizzle.config.ts` - Database configuration
- `tailwind.config.ts` - Styling configuration

## Memory Bank System (ESSENTIAL)

The `memory-bank/` directory contains ALL project documentation:
- **Progress**: `/memory-bank/progress.md` + sprint-specific files
- **Sprints**: `/memory-bank/sprints/sprint34/` (current)
- **Architecture**: System design and patterns
- **API docs**: Service documentation
- **Testing**: Test strategies and results
- **Fixes**: Technical solutions and debugging

**ALWAYS check memory bank before starting any work.**

## Environment Variables

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-...

# Cloudflare R2
CLOUDFLARE_R2_BUCKET_NAME=...
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...

# Auth
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Current Development Context

### Sprint 34 Focus
- State management improvements
- Scene generation reliability
- User analytics and management
- Production readiness

### Critical Systems
- **Evaluation Framework**: `/src/lib/evals/` - DO NOT DELETE
- **MCP Tools**: `/src/server/services/mcp/` - Core AI pipeline
- **Chat Router**: Simplified to essential endpoints only
- **Generation Services**: Organized under `/src/server/services/generation/`

## Contributing Guidelines

1. **Read memory-bank documentation first**
2. **Update progress files during work**
3. **Create analysis docs for complex tasks**
4. **Follow single source of truth patterns**
5. **Test thoroughly with evaluation framework**
6. **Document decisions and findings**

## Troubleshooting

### Common Issues
1. **Component Loading**: Check R2 storage and MCP tools
2. **Database**: Verify migrations and connection
3. **AI Pipeline**: Check OpenAI key and evaluation results
4. **Build**: Review TypeScript errors and organized imports

### Debug Resources
- Memory bank documentation
- Sprint-specific analysis files
- `/src/lib/evals/` testing framework
- Browser DevTools for real-time updates

## Resources

- **Memory Bank**: Primary source of truth for project knowledge
- **Sprint Docs**: Current sprint folder for active work context  
- [Next.js Documentation](https://nextjs.org/docs)
- [Remotion Documentation](https://remotion.dev/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [tRPC Documentation](https://trpc.io/docs)

---

**Remember: Documentation first, memory bank always, progress tracking continuous.**