//memory-bank/sprints/sprint27/TODO.md
# Sprint 27 TODO List

## BAZAAR-305: Core Features & Quality

### My Projects (Project Persistence & Retrieval)
- **[USER/CASCADE]** Design the UI for the "My Projects" page (listing projects).
- **[USER/CASCADE]** Scaffold the "My Projects" page component (e.g., `src/app/projects/page.tsx` or similar).
- **[USER/CASCADE]** Implement fetching and displaying projects using `api.project.list.useQuery()`.
- **[USER/CASCADE]** Design UI/UX for project actions (open, rename, delete - further implementation in later sprints).

### Animation Quality (Prompt Engineering - BAZAAR-301)
- **[USER]** Run test animation prompts:
    - "a blue circle smoothly growing from small to large over 2 seconds"
    - "the text 'Hello World' sliding in from the left and fading in over 1.5 seconds"
    - (Optional) "a vibrant particle explosion"
- **[USER]** Share generated code and observations with Cascade.
- **[CASCADE/USER]** Analyze test results. If quality is low, collaboratively update the system prompt in `src/server/api/routers/generation.ts` using guidance from `BAZAAR-301-improve-animation-focus.md`.
- **[CASCADE/USER]** Investigate `scene.props` structure in `generateComponentCode` input.

### Publish & Share (BAZAAR-303)
- **[USER/CASCADE]** Define specific sub-tasks for BAZAAR-303 to be tackled in Sprint 27.
- **[USER/CASCADE]** Begin/continue implementation of the storyboard publishing scope.
- **[USER/CASCADE]** Design UI for initiating publish and displaying shareable links.

### BAZAAR-302 Wrap-up
- **[USER/CASCADE]** Review `BAZAAR-302.md` and `sprint26/progress.md` for any minor outstanding tasks (UX tweaks, tests, docs).
- **[USER/CASCADE]** Address identified items.

### Sprint Management
- **[CASCADE]** Update `/memory-bank/progress.md` to link to `sprint27/progress.md`.
- **[CASCADE]** Update `/memory-bank/TODO.md` with high-level BAZAAR-305 tasks for Sprint 27.
