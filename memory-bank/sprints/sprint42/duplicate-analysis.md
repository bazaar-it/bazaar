# Duplicate Utils, Services, and Scripts Analysis

## Utils Folders (3 locations)

### 1. `/src/utils/` (Root utils - KEEP)
- `finnhubDataFormatter.ts` - Financial data formatting
- `retryWithBackoff.ts` - Generic retry utility

### 2. `/src/server/utils/` (Server-specific utils - KEEP)
- `tsxPreprocessor.ts` - Server-side TSX processing

### 3. `/src/lib/utils/` (Library utils - KEEP)
- `codeDurationExtractor.ts` - Video timeline utilities
- `timeline.ts` - Timeline manipulation
- `welcomeSceneUtils.ts` - Scene-specific utilities

### 4. `/src/app/projects/[id]/generate/utils/` (Page-specific utils - KEEP)
- `getTemplateSnippet.ts` - Template utilities
- `promptInspector.ts` + tests - Prompt validation
- `validateComponent.test.ts` - Component validation

**Recommendation**: Keep all utils folders as they serve different purposes:
- `/src/utils/` - Generic app utilities
- `/src/server/utils/` - Server-only utilities
- `/src/lib/utils/` - Shared library utilities
- Page-specific utils stay with their pages

## Service Implementations (Duplicates Found)

### 1. `/src/server/api/services/` (DELETE - Legacy location)
- `background.service.ts` - Background job processing
- `database.service.ts` - DB operations (marked for removal per TICKET-004)

### 2. `/src/server/services/` (KEEP - Primary location)
Complete service architecture with organized subdirectories:
- `ai/` - AI services
- `brain/` - Orchestration services
- `data/` - Data management
- `generation/` - Code generation
- `scene/` - Scene management (add/edit/delete)
- `base/` - Base service classes

### 3. `/src/tools/` (KEEP - NEW MCP tools implementation)
New tool-based architecture:
- `add/` - Add tools with helpers
- `edit/` - Edit tools with helpers
- `delete/` - Delete tools
- `helpers/` - Shared tool helpers

**Scene Management Duplicates**:
- `/src/server/services/scene/add/CodeGenerator.ts` (OLD)
- `/src/tools/add/add_helpers/CodeGeneratorNEW.ts` (NEW)

Similar pattern for:
- ImageToCodeGenerator
- LayoutGenerator
- BaseEditor, CreativeEditor, SurgicalEditor, ErrorFixer

## Scripts Folders (2 locations)

### 1. `/scripts/` (Root scripts - KEEP)
Project-level scripts:
- `analyze-dependencies.ts`, `analyze-deps.cjs`
- `cleanup-orphaned-files.js`, `find-orphaned-files.cjs`
- `dev-seed.ts` - Development seeding
- `generate-types.ts` - Type generation
- `migrate-neon.ts` - Database migration
- `run-evals.ts`, `run-performance-evals.ts` - Testing
- `set-initial-admins.ts` - Admin setup
- `stress-test.js` - Performance testing
- `switch-models.cjs` - Model switching
- `test-data-lifecycle.js` - Data testing

### 2. `/src/scripts/` (Source scripts - EVALUATE)
Contains:
- `migrate-*.ts` files - Database migration tools
- `log-tools/` - Logging utilities
- `migration-tools/` - Migration helpers
- Own `package.json` and `tsconfig.json` (indicates standalone tooling)

**Recommendation**: 
- Keep `/scripts/` for project-level scripts
- Evaluate `/src/scripts/` - appears to be specialized migration tooling that might be needed

## MCP-Related Folders

### 1. `/src/server/services/mcp/` (DELETE - Empty)
- Only contains `index.ts` that exports from non-existent `./tools`
- No actual implementation
- Should be removed

### 2. Memory bank MCP docs (KEEP - Documentation)
- `/memory-bank/architecture/mcp-tools-analysis.md`
- `/memory-bank/sprints/sprint30/mcp-*` files
- These are documentation, not code

## Recommended Actions

### DELETE:
1. `/src/server/api/services/` - Legacy service location
2. `/src/server/services/mcp/` - Empty MCP folder
3. Old scene service implementations in `/src/server/services/scene/` (after verifying new tools work)

### KEEP:
1. All utils folders (they serve different purposes)
2. `/src/server/services/` as primary service location
3. `/src/tools/` as new MCP tools implementation
4. Both script folders (they serve different purposes)
5. Memory bank MCP documentation

### MIGRATE:
1. Any functionality from `/src/server/api/services/` to appropriate locations
2. Ensure new tools in `/src/tools/` replace old scene services