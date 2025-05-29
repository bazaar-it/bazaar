//memory-bank/sprints/sprint31/STEP-1-NEW-PROJECT-IDEAS-TRADEOFFS.md

# Step 1 - New Project: Ideas & Trade-offs (Sprint 31)

## Purpose

This document captures enhancements and design decisions for the new project initialization flow in the Bazaar video generation system, before users submit their first prompt. It analyzes the current baseline from Sprint 30/31, proposes improvements based on user feedback, and evaluates trade-offs to guide Sprint 31 scope and future roadmap decisions.

## Current Baseline (Sprint 30/31)

- **Auth-Gated**: Unauthenticated users are shown a login modal when attempting to create a project (`src/app/page.tsx`).
- **Project Creation**: `api.project.create` mutation creates a project with an empty `props.scenes` array and `meta.duration = 10` seconds (`createDefaultProjectProps()`).
- **Workspace UI**: `ChatPanelG` displays a UI welcome block (not a chat message) for new projects if `messages` is empty.
- **Remotion Player**: Shows a blank state with no compositions or scenes rendered.

Details are in `/memory-bank/sprints/sprint31/STEP-1-NEW-PROJECT.md`.

## Decision Points for Enhancement

### 3.1 Guest Mode vs. Auth-Only

**Current**: All interactions are behind authentication; unauthenticated users are prompted to log in via a modal.

**Proposed Idea**: Allow guest users to try the system with a limited number of prompts (e.g., 5-8) before requiring login, to reduce friction and enable instant testing.

**Options & Trade-offs**:

| **Option**              | **Pros**                                                                 | **Cons**                                                                 | **Tech Impact**                                                                                           |
|-------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| **Auth-Only (Status Quo)** | - Simplest permission model<br>- All data keyed by `userId` for easy persistence | - Zero “instant demo” factor<br>- Funnel friction at first click         | No new work — keep protected tRPC routes as is.                                                           |
| **Limited Guest Mode**    | - Users can try 5-8 prompts instantly<br>- Improves viral shareability   | - Must generate & persist `guestId` cookie<br>- Dual-path auth checks in every mutation<br>- Data migration when guest logs in | - Add `guest_sessions` table<br>- Guard each router with `(userId || guestId)` logic<br>- Add usage counter + potential paywall logic. |

**Reasoning & Complexity**:
- **Guest Mode Pros**: Significantly lowers barrier to entry, allowing users to experience the core value proposition (video generation) before committing. This could boost conversion rates and shareability.
- **Guest Mode Cons**: Introduces complexity in tRPC routing, as many procedures are `protectedProcedures` expecting `ctx.session.user.id`. Solutions include separate public procedures (code duplication) or temporary guest IDs (complex auth logic). Additionally, handling project persistence for guests (local storage vs. temporary DB records) and migrating data upon login/signup adds overhead.
- **Auth-Only Simplicity**: As noted, requiring login simplifies development by ensuring a `userId` for data association and authorization, avoiding edge cases with guest data.

**Open Question A**: Which metric matters more for Sprint 31—lowering first-prompt friction to drive user acquisition, or shipping faster by maintaining simplicity? (Ownership: Product Manager decision)

**Discussion Points**:
- **Post-MVP Commitment**: If guest mode is on the long-term roadmap for frictionless entry, tackling complexity now (or planning for it) may prevent larger retrofits later.
- **Complexity Cost**: Can we estimate the effort (days vs. weeks) to implement guest mode? This impacts the trade-off decision.
- **Alternative**: Could a read-only demo project (low complexity) or limited prompting with local storage (higher complexity) serve as a middle ground?

### 3.2 Default Welcome Animation in Remotion Player

**Current**: The Remotion player is blank for new projects (`scenes: []` in `createDefaultProjectProps()`).

**Proposed Idea**: Display a default, nice-looking welcome animation as an initial Scene 1 in the Remotion player. When the user’s first `AddScene` command is processed, replace this welcome animation with the generated scene (do not append).

**Goal**: Avoid a blank player so users immediately see motion, reducing “empty canvas syndrome” and making the tool feel alive.

**Implementation Notes**:
- **Defining the Welcome Scene**: Create a standard Remotion component (e.g., a 3-second fade-in logo with text like “Start typing…”). Add it to `createDefaultProjectProps()` as `scenes: [defaultWelcomeSceneProps]` with a set duration (becomes initial `project.meta.duration`).
- **Replacing Logic**: For the first user-initiated `AddScene`, overwrite `scenes[0]` instead of appending. Subsequent `AddScene` calls append as usual. This requires the Brain LLM’s `AddScene` tool or backend logic to check if it’s the first real scene addition.
- **Flag**: Add an `is_placeholder` column or property to the scene data for easy identification and swap-out.

**Code Snippet**:
```typescript
if (scenes.length === 0 || (scenes.length === 1 && scenes[0].is_placeholder)) {
  // Replace with new scene
  scenes[0] = newScene;
} else {
  // Append as usual
  scenes.push(newScene);
}
```

**Pros**:
- Engaging first impression, showing the player’s potential.
- Immediate feedback on tool capability.

**Cons/Complexity**:
- Slightly more complex initial state (a scene exists by default).
- “Replace” logic for first `AddScene` adds a conditional path to standard append operation.

**Discussion Points**:
- Should the welcome scene be ephemeral (replaced without option to keep/edit), or could users want to retain it?
- How does this affect core `AddScene` logic? It introduces a “replace first if placeholder” condition.

### 3.3 Initial Chat Greeting Presentation

**Current**: `ChatPanelG` shows a grey UI block for the welcome message if `messages` is empty (`src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`, lines 648-660).

**Proposed Idea**: Present the initial welcome message as a real assistant chat message, rendered in a chat bubble as if the LLM typed it.

**Goal**: Ensure consistent UX by aligning the welcome with the chat interaction model, making it feel like the assistant is actively engaging the user.

**Implementation Steps**:
1. On `GeneratePage` load, if it’s a new project (`messages` array empty), programmatically create a message object:
   ```typescript
   {
     id: 'system-welcome-' + Date.now(),
     role: 'assistant',
     content: '👋 Welcome to your new project! Describe what you want to create...',
     createdAt: new Date()
   }
   ```
2. Add this to the local state managing messages in `ChatPanelG`.
3. Optionally, persist it to the `messages` table in the database with `type = 'system_welcome'` for coherent history.
4. Use existing message rendering logic to display it as an assistant message.

**Pros**:
- Consistent and conversational UX, setting the stage for AI interaction.
- Immersive feel, enhancing user engagement.

**Cons/Complexity**:
- Minimal; primarily a frontend logic change in `ChatPanelG`.

**Discussion Points**:
- Should this system-generated message be persisted in the `messages` table for consistency? (Recommended: Yes)
- Ensure it triggers only once for a truly new project.

## Recommended Sprint 31 Scope

Based on impact and complexity, the following priorities are suggested for Sprint 31:
1. **Guest Mode Strategy**: Stay auth-only for MVP to maintain simplicity and focus on core scene management (`AddScene`, `EditScene`, `DeleteScene`). Add a backlog ticket to spike guest mode implementation after the core flow is stable. This balances shipping speed with future planning for user acquisition.
2. **Welcome Animation**: Implement placeholder scene logic with an `is_placeholder` flag and swap-out rule for the first `AddScene`. This offers high UX value for moderate complexity.
3. **Chat Greeting as Message**: Convert the UI welcome block to an assistant chat message (one-time insert on new project load). This is a low-complexity, high-polish improvement.

## Questions / Next Actions

- **Q1**: Approve or revise the guest mode stance for Sprint 31—auth-only now with a backlog ticket, or prioritize limited guest mode despite complexity? (Owner: Product)
- **Q2**: Confirm placeholder scene design specs (duration, copy, styling) for the welcome animation. (Owner: Design)
- **Q3**: Is it acceptable to store synthetic assistant welcome messages in the `messages` table for consistency? (Owner: Backend)

## Conclusion

These enhancements address critical UX and strategic considerations for the new project initialization flow. The recommended scope for Sprint 31 focuses on achievable, high-impact improvements (welcome animation and chat greeting) while deferring the complex guest mode to a planned future iteration, ensuring we build a stable foundation first. Decisions on these trade-offs will shape the user onboarding experience and system architecture moving forward.

**Last Updated**: 2025-05-29
