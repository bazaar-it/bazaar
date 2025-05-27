/**
 * Feature flags for enabling new features
 */

// Environment-based feature flags
const FEATURE_FLAGS = {
  MCP_ENABLED: process.env.FEATURE_MCP_ENABLED === 'true',
} as const;

/**
 * Check if MCP (Model Context Protocol) is enabled
 * Simple boolean flag - no gradual rollout needed with 0 users
 */
export function isMCPEnabled(): boolean {
  return FEATURE_FLAGS.MCP_ENABLED;
}

/**
 * Get all feature flag states (for debugging/admin)
 */
export function getFeatureFlags() {
  return {
    ...FEATURE_FLAGS,
    timestamp: new Date().toISOString(),
  };
} 