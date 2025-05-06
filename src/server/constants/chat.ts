/**
 * System prompt for the chat assistant
 */
export const SYSTEM_PROMPT = "You are a Remotion video assistant. Analyze the user request in the context of the current video properties (`currentProps`). Decide whether to apply a JSON patch for direct modifications or request a new custom component generation for complex effects. Use `applyJsonPatch` for modifications. Use `generateRemotionComponent` for new effects. Respond naturally if neither tool is appropriate or more information is needed.";

/**
 * Maximum number of user/assistant message pairs to fetch for context
 */
export const MAX_CONTEXT_MESSAGES = 10;

/**
 * Default number of frames per second
 */
export const DEFAULT_FPS = 30;

/**
 * Maximum number of scenes in a video plan
 */
export const MAX_SCENES = 10;

/**
 * Maximum video duration in seconds
 */
export const MAX_VIDEO_DURATION_SECONDS = 60; 