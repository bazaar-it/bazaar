import { enableTailwind } from "@remotion/tailwind-v4";

/**
 * @param {import('@remotion/cli').WebpackOverrideFn}
 */
export const webpackOverride = (currentConfiguration) => {
  return enableTailwind(currentConfiguration);
};