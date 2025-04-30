// src/remotion/webpack-override.mjs
import { enableTailwind } from "@remotion/tailwind-v4";
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {import('@remotion/cli').WebpackOverrideFn}
 */
export const webpackOverride = (currentConfiguration) => {
  // Use a Remotion-specific Tailwind config file as recommended in docs
  // This isolates Remotion's Tailwind from the main app's config
  const configPath = path.resolve(__dirname, 'tailwind.config.js');
  
  // Enable Tailwind with our Remotion-specific config
  const withTailwind = enableTailwind(currentConfiguration, {
    configPath
  });
  
  // Add crypto polyfill support (for UUID generation)
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      fallback: {
        ...withTailwind.resolve?.fallback,
        crypto: 'crypto-browserify'
      }
    }
  };
};