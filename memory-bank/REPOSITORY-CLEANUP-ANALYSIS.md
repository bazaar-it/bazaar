# Repository Cleanup Analysis & Action Plan

**Generated on**: January 9, 2025  
**Status**: Production-ready codebase cleanup  
**Goal**: Create a clean, maintainable codebase with single source of truth for all services and utilities

## 🎯 Executive Summary

This Next.js 15 + tRPC video creation platform has grown through extensive development and testing, resulting in:
- **Scattered services** across `/src/lib/services/` and `/src/server/services/`
- **Duplicate implementations** of similar functionality
- **Legacy test files** and debug scripts from development phases
- **Mixed file organization** patterns that confuse the single source of truth principle

**Impact**: The cleanup will improve maintainability, reduce bundle size, and establish clear architectural patterns for the engineering team.

---

## 🔍 Current Architecture Analysis

### Core Application Flow
```
User Request (Generate Page) 
    ↓
GenerateWorkspaceRoot → WorkspaceContentAreaG → Panel Components
    ↓
ChatPanelG → generation.ts tRPC router → Brain Orchestrator
    ↓
MCP Tools (addScene, editScene, etc.) → Code Generator → Database
    ↓
Video State Updates → Preview Panel Refresh
```

### Key Dependencies
- **Frontend**: Next.js 15, React 19, Tailwind, tRPC client
- **Backend**: tRPC v11, Drizzle ORM, PostgreSQL (Neon)
- **AI**: OpenAI GPT-4o-mini, multi-agent system (A2A)
- **Video**: Remotion for rendering, R2 for storage

---

## ❌ Issues Identified

### 1. Service Architecture Problems

#### **Scattered Services** 
```
src/lib/services/              # Client-side services
├── codeGenerator.service.ts   # AI code generation
├── aiClient.service.ts        # OpenAI/Anthropic client
└── mcp-tools/                 # MCP tool implementations

src/server/services/           # Server-side services  
├── brain/orchestrator.ts      # Main orchestration
├── componentGenerator.service.ts  # Component generation
└── llm.service.ts             # LLM interactions
```

**Problem**: Similar functionality exists in both locations with unclear boundaries.

#### **Duplicate OpenAI Services**
- `/src/server/lib/openai/` (main implementation)
- `/src/scripts/log-agent/services/openai.service.ts` (separate log agent)
- `/src/lib/services/aiClient.service.ts` (universal client)

#### **Config File Duplication**
- PostCSS: `postcss.config.cjs` AND `postcss.config.mjs`
- Jest: `jest.setup.cjs`, `jest.setup.js`, `jest.setup.ts`

### 2. Test Organization Issues

#### **Scattered Test Locations**
```
src/app/__tests__/                    # App router tests
src/server/workers/__tests__/         # Worker tests  
src/tests/integration/                # Integration tests
src/tests/llm/__tests__/              # LLM tests
src/tests/performance/                # Performance tests
src/tests/remotion/__tests__/         # Remotion tests
src/__tests__/                        # Root level tests
```

### 3. Development Artifacts

#### **Legacy Files to Remove**
- `.backup` files: `componentTemplate.ts.backup`, `generateComponentCode.ts.backup`
- Compiled code: `src/scripts/log-agent/dist/` (should be gitignored)
- Empty files: `component.js`, `debug-duplicates.js`
- Old migration files and temporary scripts

#### **Extensive Script Collection**
- 50+ scripts in `/src/scripts/` for debugging, testing, and development
- Many were useful during development but not needed in production

---

## ✅ Cleanup Action Plan

### Phase 1: Immediate Cleanup (Safe Deletions)

#### **Remove Backup Files**
```bash
rm src/server/workers/componentTemplate.ts.backup
rm src/server/workers/generateComponentCode.ts.backup
rm src/server/utils/tsxPreprocessor.ts.bak
```

#### **Remove Empty/Minimal Files**
```bash
rm component.js                 # 0 bytes
rm debug-duplicates.js          # 1 byte  
rm check-database-emergency.js  # Legacy
```

#### **Remove Compiled Code**
```bash
rm -rf src/scripts/log-agent/dist/
# Add to .gitignore: src/scripts/log-agent/dist/
```

#### **Consolidate Configs**
- Keep `postcss.config.mjs`, remove `postcss.config.cjs`
- Keep `jest.setup.ts`, remove `.js` and `.cjs` versions

### Phase 2: Script Cleanup (Review Required)

#### **Safe to Delete (Development/Debug Scripts)**
```bash
# Debug scripts
src/scripts/debug/
src/scripts/diagnostics/
src/scripts/test/

# Development utilities  
src/scripts/diagnose-*.js
src/scripts/debug-*.ts
src/scripts/manual-*.js
src/scripts/repair-*.js
src/scripts/reset-*.js
src/scripts/replace-*.js
src/scripts/force-fix-*.js

# Legacy test scripts
src/scripts/manualTestCustomComponents.js
src/scripts/test-*.ts (except test runners)
```

#### **Keep (Production Utilities)**
```bash
# Migration tools
src/scripts/migrate-*.ts
src/scripts/set-initial-admins.ts

# Evaluation system
src/scripts/evaluation/

# Database tools
src/scripts/explore-db.ts
src/scripts/list-projects.ts
```

### Phase 3: Test Organization

#### **Recommended Test Structure**
```
src/
├── __tests__/                    # Unit tests close to source
│   ├── components/               # Component tests
│   ├── services/                 # Service tests  
│   └── utils/                    # Utility tests
├── tests/                        # Integration & E2E tests
│   ├── integration/              # API integration tests
│   ├── e2e/                      # End-to-end tests
│   └── performance/              # Performance tests
```

#### **Files to Relocate**
- Move `src/app/__tests__/` to `src/__tests__/app/`
- Move `src/server/workers/__tests__/` to `src/__tests__/workers/`
- Consolidate scattered component tests

### Phase 4: Service Consolidation

#### **Single Source of Truth Structure**
```
src/
├── lib/
│   ├── services/                 # Universal services (client + server)
│   │   ├── ai/                   # AI-related services
│   │   │   ├── aiClient.service.ts
│   │   │   ├── codeGenerator.service.ts
│   │   │   └── mcp-tools/
│   │   ├── storage/              # Storage services
│   │   └── utils/                # Utility services
│   ├── types/                    # All TypeScript types
│   │   ├── api.ts               # API types
│   │   ├── video.ts             # Video/Remotion types
│   │   └── ai.ts                # AI service types
│   └── config/                   # All configuration
│       ├── models.config.ts     # AI model config
│       ├── prompts.config.ts    # AI prompts
│       └── app.config.ts        # App configuration
├── server/
│   ├── api/                     # tRPC routers only
│   ├── db/                      # Database schema & queries
│   └── auth/                    # Authentication
```

#### **Services to Consolidate**
1. **OpenAI Services**: Merge into single `aiClient.service.ts`
2. **Component Services**: Clarify boundaries between code generation and component building
3. **Storage Services**: Centralize R2 and database utilities

### Phase 5: Log Management Cleanup

#### **Log Files (Temporary)**
```bash
# Remove old log files (keep recent)
logs/combined-2025-05-*.log      # Keep last 7 days
logs/error-2025-05-*.log         # Keep last 7 days
logs/a2a/a2a-2025-05-*.log       # Keep last 7 days
```

#### **Log Agent Evaluation**
- Review if log-agent should be separate service or integrated
- Currently: Full separate Node.js service with own package.json
- Recommendation: Evaluate if complexity justifies separation

---

## 📁 Detailed File-by-File Analysis

### Safe to Delete Immediately
```bash
# Backup files
src/server/workers/componentTemplate.ts.backup
src/server/workers/generateComponentCode.ts.backup
src/server/utils/tsxPreprocessor.ts.bak

# Empty files
component.js
debug-duplicates.js

# Compiled code (should be gitignored)
src/scripts/log-agent/dist/

# Legacy config files
postcss.config.cjs
jest.setup.cjs
jest.setup.js

# Legacy development files
check-database-emergency.js
check-database-emergency.cjs
execute-tetris-fix.sh
quick-admin-setup.js
simple-test.html
```

### Review Before Deletion
```bash
# Development scripts (70+ files)
src/scripts/debug-*
src/scripts/diagnose-*
src/scripts/test-*
src/scripts/manual-*
src/scripts/repair-*
src/scripts/force-*
src/scripts/reset-*
src/scripts/replace-*

# Test JSON data
json/*.json                      # Review if still needed for tests

# Fixed components
fixed-components/*.js            # Temporary component fixes

# Examples
examples/VisualQualityTestSuite.tsx
```

### Keep (Essential)
```bash
# Core application
src/app/                         # Next.js App Router
src/components/                  # React components
src/hooks/                       # React hooks
src/stores/                      # State management
src/remotion/                    # Video composition

# Backend services
src/server/api/                  # tRPC routers
src/server/db/                   # Database schema
src/server/auth/                 # Authentication
src/server/services/brain/       # Core orchestration

# Configuration
src/config/                      # App configuration
src/lib/services/                # Business logic
src/types/                       # TypeScript types

# Infrastructure
drizzle/                         # Database migrations
memory-bank/                     # Project documentation
```

---

## 🎯 Expected Benefits

### **Code Quality**
- ✅ Single source of truth for all services
- ✅ Clear separation between client and server code
- ✅ Standardized test organization
- ✅ Eliminated duplicate implementations

### **Developer Experience**  
- ✅ Faster onboarding for new engineers
- ✅ Clearer file organization patterns
- ✅ Reduced cognitive load from scattered code

### **Performance**
- ✅ Smaller repository size (~50-100MB reduction)
- ✅ Faster build times from fewer files
- ✅ Cleaner bundle analysis

### **Maintenance**
- ✅ Easier to find and update code
- ✅ Clear ownership of functionality
- ✅ Reduced risk of using outdated code

---

## 🚨 Risk Assessment

### **Low Risk** (Phase 1)
- Removing backup files
- Removing empty files  
- Consolidating config files
- Removing compiled code

### **Medium Risk** (Phase 2-3)
- Script cleanup (some may be used in CI/CD)
- Test file reorganization
- Log file cleanup

### **High Risk** (Phase 4)
- Service consolidation
- Moving core business logic
- Changing import paths

### **Mitigation Strategy**
1. **Start with Phase 1** (safe deletions)
2. **Test thoroughly** after each phase
3. **Update documentation** as changes are made
4. **Use git branches** for each phase
5. **Coordinate with team** on service consolidation

---

## 🎯 Next Steps

1. **Get approval** for Phase 1 deletions
2. **Execute Phase 1** cleanup (safe deletions)
3. **Review script usage** with team for Phase 2
4. **Plan service consolidation** strategy for Phase 4
5. **Update CLAUDE.md** with new organizational patterns

This cleanup will establish a clean, maintainable codebase foundation for the engineering team while preserving all production functionality.