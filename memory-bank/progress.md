# Project Progress Overview

This file serves as the entry point for progress updates.
For details on how to maintain these logs see [progress-system.md](./progress-system.md).
Each sprint keeps its own `progress.md` under `/memory-bank/sprints/<sprint>/`.
Add short highlights here and detailed notes in the sprint files.

The first **200 lines** of this file should remain a concise summary of recent
work. When entries grow beyond that, move older sections to
`./progress-history.md` so the main file stays focused.

## Recent Highlights

**May 26, 2025: BAZAAR-255 Build Pipeline Migrated to ESM**
- Migrated `buildCustomComponent.ts` to output ES modules and validate them via dynamic `import()`.
- See [Sprint 25 Progress](./sprints/sprint25/progress.md) for full notes.

**May 24, 2025: BAZAAR-260 Test Scaffolding for ESM Migration**
- Updated server-side tests (`buildComponent.test.ts`) for ESM output verification.
- Created placeholder client-side test file (`CustomScene.test.tsx`) and noted existing `useRemoteComponent.test.tsx`.
- This lays the groundwork for comprehensive testing of the ESM migration.
- See [Sprint 25 Progress](./sprints/sprint25/progress.md) for details.

**May 21, 2025: ESM Migration Planning Started**
- Detailed tickets written for Sprint 25 to convert dynamic components to ES modules.
- See [Sprint 25 Progress](./sprints/sprint25/progress.md) for more.

**May 20, 2025: Database Schema Corrected - Migration `0009` Applied**
- Successfully resolved a `TRPCClientError` caused by a missing `last_successful_step` column in the `bazaar-vid_custom_component_job` table. Migration `0009_smart_the_twelve.sql` was applied after a workaround for conflicting older migrations (moving them and using temporary empty placeholders).
- The database schema is now up-to-date with the application code, unblocking features dependent on the new columns.
- *Details in [Sprint 24 Progress](./sprints/sprint24/progress.md).*

**May 18, 2025: Message Bus Integration for A2A System**
- Implemented a new Message Bus architecture (singleton, feature-flagged with `USE_MESSAGE_BUS`) to significantly improve communication between A2A agents. CoordinatorAgent and UIAgent have been integrated, featuring enhanced error handling and performance monitoring.
- *Details can be found in the relevant sprint log (e.g., [Sprint 24](./sprints/sprint24/progress.md) or `progress-history.md`).*

**May 17, 2025: Critical A2A TaskProcessor Stability Resolved**
- Fixed persistent Next.js HMR-induced restart loops that were destabilizing the TaskProcessor and A2A system. Achieved stability through a multi-pronged approach:
    - Enhanced Next.js & Webpack configurations (ignore patterns, polling).
    - Introduced new development scripts (`dev:no-restart`, `dev:stable`, standalone task processor).
    - Improved TaskProcessor resilience (true singleton, robust shutdown, instance tracking).
    - Corrected logger configurations (e.g., `buildLogger`, log file locations) to prevent HMR triggers.
- The A2A system, including ScenePlannerAgent, now operates reliably.
- *Details can be found in the relevant sprint log (e.g., [Sprint 24](./sprints/sprint24/progress.md) or `progress-history.md`).*

## Sprint Progress Index
- [Sprint 25](./sprints/sprint25/progress.md)
- [Sprint 24](./sprints/sprint24/progress.md)
- [Sprint 20](./sprints/sprint20/progress.md)
- [Sprint 17](./sprints/sprint17/progress.md)
- [Sprint 16](./sprints/sprint16/progress.md)
- [Sprint 14](./sprints/sprint14/progress.md)
- [Sprint 12](./sprints/sprint12/12-progress.md)

### Other Logs
- [A2A System](./a2a/progress.md)
- [Scripts Reorganization](./scripts/progress.md)
- [Evaluation Framework](./progress/eval-framework-progress.md)
- [Metrics](./evaluation/progress.md)

---
