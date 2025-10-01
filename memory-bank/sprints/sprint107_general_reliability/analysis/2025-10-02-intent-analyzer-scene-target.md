# 2025-10-02 – Intent Analyzer Scene Targeting Regression

## Problem
When a user drags a scene into chat (scene attachment) and later submits a fresh prompt without dragging any scene, the new intent analyzer still forces the same scene ID. In a real test (`projectId=5bb61d5d-466f-4b3e-ae77-b6c3cfeaa695`), the prompt “change the login to google to login with apple” should have targeted the "Google Sign In" scene, but the brain selected the previously attached "Welcome to Bazaar" scene instead.

## Evidence
- Context builder log: `Scene attachments detected: 1 scenes` even though the user did not attach a scene for the second prompt.
- Intent analyzer prompt includes: “🚨 CRITICAL: These attached scenes MUST be used as targetSceneId…”.
- Brain response: `targetSceneId: 774b7cd8-4759-4864-8c04-d4be04c3b844` (`Welcome to Bazaar`) and only referenced the Google scene as a follow-up.

## Root Cause
1. Chat panel keeps `sceneUrls` populated from the previous drag until _after_ the next prompt is constructed — the attachment array is captured before we clear the state. That is intentional so the first request uses the drop, but it means the very next request sees `sceneUrls` populated even if the user meant a different scene.
2. The intent prompt tells the LLM the attached scenes “MUST be used” as the target for any edit/delete/trim, removing its ability to override the attachment when the textual instruction points elsewhere.

## Proposed Fix
- Adjust the instructions sent to the brain so attachments are treated as the default only when the user uses ambiguous language (“this scene”, “the scene I attached”, etc.). Explicit mentions like “change the Google Sign In scene” must take precedence even if `sceneUrls` contains IDs.
- Optionally, refine ChatPanel to drop the carry-over attachment once the message is constructed so the _next_ prompt starts clean.

## Next Steps
1. Update `buildUserPrompt` in `intentAnalyzer.ts` so the attachment blurb says “prefer these when the request is ambiguous” instead of “MUST”.
2. Review ChatPanel state flow to ensure we don’t unintentionally reattach scenes on the next prompt.
3. Retest with the same reproduction steps to confirm the brain selects the named scene.
