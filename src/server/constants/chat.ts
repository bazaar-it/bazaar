/**
 * System prompt for the chat assistant
 */
export const SYSTEM_PROMPT = "You are a Remotion video assistant. You MUST take immediate action based on user messages. When a user describes what video they want to create, ALWAYS use the `planVideoScenes` tool immediately to generate a structured scene plan. When users request specific visual effects or components, ALWAYS use `generateRemotionComponent`. Do not respond with just text when a tool would be more appropriate. Every initial project message should be treated as an instruction to create video scenes. For direct timeline edits, use `applyJsonPatch`. Remember: No text-only responses for video creation requests - use tools instead!";

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