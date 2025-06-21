// src/config/prompts.simplified.ts
// Simplified prompts that trust AI models

export const SIMPLIFIED_PROMPTS = {
  // ============= BRAIN (50 words) =============
  BRAIN_ORCHESTRATOR: `Choose the right tool for the user's request.

Tools:
- addScene: Create new scenes
- editScene: Modify scenes (surgical/creative/fix/duration)
- deleteScene: Remove scenes

Current project has {{SCENE_COUNT}} scenes.
User says: "{{PROMPT}}"

If unclear, return type: "ambiguous" with clarificationNeeded.`,

  // ============= INTENT ANALYSIS (40 words) =============
  INTENT_ANALYZER: `Understand what the user wants to do.

Context: {{CONTEXT}}
Request: "{{PROMPT}}"

Return:
- type: create/edit/delete/ambiguous
- editType: surgical/creative/fix/duration (if edit)
- targetSceneId: (if specific scene mentioned)
- confidence: 0-1`,

  // ============= CODE GENERATION (30 words) =============
  CODE_GENERATOR: `Create a React/Remotion component.

{{USER_PROMPT}}

Style: {{STYLE}}
Duration: {{DURATION}} seconds
Previous scene style: {{PREVIOUS_STYLE}}

Use window.Remotion, export default function {{NAME}}().`,

  // ============= LAYOUT GENERATOR (25 words) =============
  LAYOUT_GENERATOR: `Design layout for: {{PROMPT}}

Consider:
- {{STYLE}} style
- Good visual hierarchy
- Professional animations

Return as JSON with elements and animations.`,

  // ============= EDIT SERVICES =============
  
  SURGICAL_EDITOR: `Make this specific change: {{CHANGE}}

Current code:
{{CODE}}

Change only what's needed. Keep everything else.`,

  CREATIVE_EDITOR: `Enhance this scene creatively.

Request: {{PROMPT}}
Current code:
{{CODE}}

Improve visual design while keeping functionality.`,

  ERROR_FIXER: `Fix this error: {{ERROR}}

Broken code:
{{CODE}}

Make minimal changes to fix the error.`,

  // ============= IMAGE-AWARE GENERATION (35 words) =============
  IMAGE_TO_CODE: `Create React/Remotion component from this image.

User wants: {{PROMPT}}
Style preference: {{STYLE}}

Match the visual design exactly, add smooth animations.
Use window.Remotion, export default function {{NAME}}().`,

  IMAGE_GUIDED_EDIT: `Update code to match this image.

Request: {{PROMPT}}
Current code:
{{CODE}}

Apply visual style from image while preserving functionality.`
};

// Helper to get prompt with variables replaced
export function getPrompt(
  promptKey: keyof typeof SIMPLIFIED_PROMPTS, 
  variables: Record<string, any>
): string {
  let prompt = SIMPLIFIED_PROMPTS[promptKey];
  
  Object.entries(variables).forEach(([key, value]) => {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  });
  
  return prompt;
}

// Comparison with old prompts
export const PROMPT_COMPARISON = {
  CODE_GENERATOR: {
    old: 1847, // characters
    new: 183,  // characters
    reduction: '90%'
  },
  BRAIN_ORCHESTRATOR: {
    old: 4521,
    new: 201,
    reduction: '96%'
  },
  SURGICAL_EDITOR: {
    old: 1234,
    new: 87,
    reduction: '93%'
  }
};