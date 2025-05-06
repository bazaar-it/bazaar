# Scene Planning API

## chat.getScenePlanningHistory

Fetch the list of past scene planning operations for a project.

**Input**
- `projectId`: string

**Output** (array of plans)
```ts
type ScenePlan = {
  id: string;
  createdAt: string; // ISO timestamp
  intent: string;
  reasoning: string;
  scenes: {
    id: string;
    description: string;
    durationInSeconds: number;
    effectType: string;
  }[];
};
```

## chat.regenerateScene

Trigger regeneration of a prior scene plan, optionally with user-uploaded images.

**Input**
```ts
{
  planId: string;                // ID of the plan to regenerate
  attachments?: Record<          // Optional map of sceneId → images
    string,
    { id: string; url: string }[]
  >;
}
```

**Output**
```ts
{
  messageId: string;  // New assistant message record ID
  jobId: string;      // UUID of the background build job for the regenerated scene component
}
```

**Notes**
- Ensure the `jobId` column exists in your Drizzle schema for `chatMessages` (and any message insert migration).
- Use the returned `jobId` on the front end to poll or subscribe for component build status.
- Image attachments (sceneId keys) will be included in the regeneration prompt sent to the LLM.

## Scene Planning UI: ScenePlanningHistoryPanel

### Purpose
- Displays a list of past scene planning operations (plans) for a project, with intent and reasoning.

### Data Flow
- Fetches history via `chat.getScenePlanningHistory` tRPC query.
- `formatRelativeTime` shows when each plan was created.

### Interactive Features
- Collapsible plan cards (`togglePlan`) and sections (`toggleSection`) for reasoning and context.
- Per-plan **Regenerate** button: calls `handleRegenerate` (stub), intended to trigger `chat.regenerateScene` with current image attachments.

### Image Upload & Attachment
- Uses `ContextDropZone` for drag-and-drop uploads into `uploadedImages` state.
- Users drag thumbnails onto scene cards to attach images (tracked in `sceneImages`).
- Thumbnails render above each plan to visualize attachments.

### Image Analysis
- `useImageAnalysis` hook stub resolves tags after a delay.
- `handleAnalyzeImage` shows a spinner (`Loader2Icon`) and displays returned tags below each image.

### Placeholder & TODOs
- **handleRegenerate**: currently logs to console; needs tRPC mutation call.
- **useImageAnalysis**: stub; must integrate Vision API for real image analysis.

### Future Improvements
- Persist uploaded images and attachments in backend/database.
- Implement and test `chat.regenerateScene` mutation to consume attachments and return `jobId`.
- Replace stub analysis with real vision/AI service for tagging.
- Add UI for regeneration progress and per-scene regeneration.
- Improve error handling, loading states, and accessibility.