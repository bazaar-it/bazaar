// Centralized feature flags for gating incomplete/experimental features
export const FEATURES = {
  // Temporarily disable website-to-video pipeline in production
  WEBSITE_TO_VIDEO_ENABLED: false,
} as const;

