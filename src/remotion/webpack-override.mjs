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
  
  // Add polyfills for Node.js modules and handle node built-ins
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      fallback: {
        ...withTailwind.resolve?.fallback,
        // Add crypto polyfill support (for UUID generation)
        crypto: 'crypto-browserify',
        // Add empty fallbacks for Node.js built-in modules used in server-side code
        // These might be imported by component code but aren't actually used in the browser
        fs: false,
        path: false,
        os: false,
        util: false,
        stream: false,
        buffer: false,
        zlib: false,
        http: false,
        https: false,
        child_process: false,
      }
    }
  };
};