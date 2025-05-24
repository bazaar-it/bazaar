# Bazaar-Vid: AI-Powered Video Creation Platform

## Project Overview

Bazaar-Vid is a sophisticated full-stack video creation platform that enables users to generate custom video content through natural language prompts. Built with Next.js, Remotion, and AI agents, it provides real-time collaboration and dynamic component generation for video production.

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
- **AI**: OpenAI GPT-4o-mini with multi-agent system
- **Real-time**: SSE + JSON Patch for collaboration

### Core Components

```
src/
├── app/                    # Next.js App Router pages
├── server/                 # Backend services and APIs
│   ├── agents/            # AI agent system (A2A)
│   ├── services/          # Business logic services
│   └── db/                # Database schema and queries
├── components/            # Reusable UI components
├── remotion/              # Video composition components
├── hooks/                 # React hooks
├── stores/                # State management
└── types/                 # TypeScript definitions
```

## Key Features

### 1. Agent-to-Agent (A2A) System
Multi-agent AI workflow for video generation:
- **CoordinatorAgent**: Orchestrates overall process
- **ScenePlannerAgent**: Creates structured scene plans
- **BuilderAgent**: Generates React/Remotion code
- **ErrorFixerAgent**: Debugs and repairs components
- **R2StorageAgent**: Handles asset storage

### 2. Video Generation Pipeline
```
User Prompt → Scene Planning → Animation Design Brief → 
Component Generation → Building → Storage → Preview
```

### 3. Real-time Collaboration
- SSE streaming for live updates
- JSON Patch system for efficient state sync
- tRPC subscriptions over WebSockets

### 4. Dynamic Component System
- Built-in scenes: Text, images, shapes, animations
- AI-generated custom components
- ESM loading from R2 storage

## Development Workflow

### Testing
```bash
npm test                    # Run Jest tests
npm run test:e2e           # End-to-end tests
npm run test:component     # Component pipeline tests
```

### Database Operations
```bash
npm run db:generate        # Generate new migrations
npm run db:migrate         # Apply migrations
npm run db:studio          # Open Drizzle Studio
npm run db:seed            # Seed development data
```

### Debugging
```bash
# Component pipeline debugging
npm run debug:components

# A2A agent system debugging
npm run debug:a2a

# Scene planner testing
npm run test:scene-planner
```

## Project Structure Deep Dive

### Frontend Pages
- `/` - Landing page
- `/projects` - Project list and management
- `/projects/[id]/edit` - Video editor interface
- `/dashboard` - User dashboard
- `/test/*` - Development testing pages

### API Routes
- `/api/components/*` - Component CRUD operations
- `/api/a2a` - Agent-to-agent communication
- `/api/trpc/*` - tRPC API endpoints
- `/api/test/*` - Development testing endpoints

### Database Schema
Key tables:
- `projects` - Video projects with metadata
- `scenes` - Individual video segments
- `messages` - Chat history and AI conversations
- `customComponentJobs` - AI component generation tracking
- `animationDesignBriefs` - Structured animation specs

### Configuration Files
- `next.config.js` - Next.js configuration
- `remotion.config.ts` - Remotion setup
- `drizzle.config.ts` - Database configuration
- `tailwind.config.ts` - Styling configuration

## Memory Bank System

The `memory-bank/` directory contains comprehensive project documentation:
- **Architecture**: System design and patterns
- **Sprints**: Development progress and plans
- **API docs**: Service documentation
- **Testing**: Test strategies and results
- **Fixes**: Technical solutions and debugging

Current sprint: **Sprint 26** - ESM component loading improvements

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Tailwind for styling (no CSS modules)
- tRPC for type-safe APIs

### Testing Strategy
- Unit tests with Jest
- Integration tests for API routes
- E2E tests for critical user flows
- Component pipeline validation

### Error Handling
- Structured error logging with Winston
- A2A agent error recovery system
- Database transaction rollback
- User-friendly error messages

## Key Scripts

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm run start              # Production server

# Database
npm run db:generate        # Generate migrations
npm run db:migrate         # Apply migrations
npm run db:studio          # Database UI

# Testing
npm test                   # Unit tests
npm run test:e2e          # E2E tests
npm run lint              # Linting
npm run typecheck         # Type checking

# Utilities
npm run analyze           # Bundle analysis
npm run debug:*           # Various debugging tools
```

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

## Deployment

The application is designed for deployment on:
- **Vercel** (recommended for Next.js)
- **Cloudflare Pages** 
- Any Node.js hosting platform

Key considerations:
- PostgreSQL database (Neon recommended)
- Cloudflare R2 for asset storage
- Environment variables configuration
- Build optimization for large bundles

## Troubleshooting

### Common Issues
1. **Component Loading Errors**: Check R2 storage configuration
2. **Database Connection**: Verify DATABASE_URL and migrations
3. **AI Agent Timeouts**: Check OPENAI_API_KEY and rate limits
4. **Build Failures**: Review TypeScript errors and dependencies

### Debug Tools
- `/test/component-pipeline` - Component generation testing
- `/test/a2a-integration` - Agent system testing
- `npm run debug:*` - Various debugging scripts
- Browser DevTools for real-time updates

## Contributing

1. Create feature branch from `allnighter`
2. Follow TypeScript and ESLint guidelines
3. Add tests for new functionality
4. Update memory-bank documentation
5. Submit PR with detailed description

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Remotion Documentation](https://remotion.dev/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [tRPC Documentation](https://trpc.io/docs)
- Project memory bank: `memory-bank/` directory