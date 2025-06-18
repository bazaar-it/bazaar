# Sprint 43: Cleanup Lessons Learned

## Files That Look Unused But Are Actually Needed

Through our cleanup process, we discovered several files that appeared to be orphaned but are actually required:

### 1. Templates (`/src/templates/`)
- **Why needed**: Used by TemplatesPanelG in the workspace
- **Lesson**: Check panel imports before deleting

### 2. UI Components (`/src/components/ui/`)
- **Files needed**:
  - `dropdown-menu.tsx` - Used by AppHeader
  - `popover.tsx`, `sheet.tsx`, `accordion.tsx`, etc. - Used by various components
  - Dialog components - Used for user interactions
- **Lesson**: shadcn/ui components are often imported dynamically

### 3. Eval System (`/src/lib/evals/`)
- **Why needed**: Used by admin router for testing
- **Lesson**: Admin/testing features may have hidden dependencies

### 4. Core Files
- `/src/app/sitemap.ts` - Next.js automatic SEO
- `/src/lib/cn.ts` - Class name utility
- Various hooks - Used by components

## Safe Deletions Made

### Confirmed Orphans (Safe to Delete)
1. **Duplicate directories**:
   - `/src/shared/modules/` - Unused module registry
   - `/src/client/` - Consolidated to `/src/components/`
   - `/src/utils/` - Moved to `/src/lib/utils/`

2. **Old implementations**:
   - `/src/server/services/scene/` - Replaced by `/src/tools/`
   - Experimental video states - Kept only `videoState.ts`
   - Duplicate brain config

3. **Empty/unused files**:
   - Empty index.ts files
   - Backup files (.backup)
   - Test files for deleted code

## Final Clean Structure

```
src/
├── app/                    # Next.js pages (T3 convention)
├── server/                 # Backend (T3 convention)
│   ├── api/               # tRPC routers
│   ├── db/                # Database
│   └── services/          # Business logic
├── brain/                  # AI orchestration
├── tools/                  # MCP tools
├── components/             # UI components
├── lib/                    # Shared utilities
├── templates/              # Pre-built video templates
└── hooks/                  # React hooks
```

## Key Takeaways

1. **Test build after each deletion phase** - Many imports are not obvious
2. **UI libraries have hidden dependencies** - shadcn/ui components import each other
3. **Workspace panels may use features** - Check all panels before deleting
4. **T3 App structure should be preserved** - It's a proven pattern
5. **When in doubt, keep it** - Better to have some unused files than break the build

## Results

- Started: 394 files, 153 directories
- Cleaned: ~250 files, ~125 directories
- Removed: ~140 files safely
- Build: ✅ Working