// Centralized feature flags for gating incomplete/experimental features
const enableWebsiteToVideo = (() => {
  const envFlag = process.env.NEXT_PUBLIC_ENABLE_WEBSITE_TO_VIDEO;
  if (typeof envFlag === 'string') {
    return envFlag.toLowerCase() === 'true';
  }
  // Default to enabled in non-production to unblock development while
  // allowing prod to opt-in explicitly by setting the env variable.
  return process.env.NODE_ENV !== 'production';
})();

export const FEATURES = {
  WEBSITE_TO_VIDEO_ENABLED: enableWebsiteToVideo,
} as const;
