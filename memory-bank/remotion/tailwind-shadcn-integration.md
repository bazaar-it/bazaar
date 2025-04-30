# Remotion Integration with Next.js, Tailwind v4, and Shadcn UI

## Problem

When integrating Remotion Studio with a Next.js application that uses Tailwind v4 and Shadcn UI, you may encounter these issues:

1. **CSS conflicts**: Tailwind utility classes like `border-border` or `bg-background` aren't recognized by Remotion's bundler
2. **Node.js module errors**: `crypto` and other Node.js-specific modules aren't available in browser environments
3. **Conflicting Tailwind configurations**: Different Tailwind setups between the main app and Remotion Studio

## Solution: Official Approach

Following Remotion's official documentation, the correct approach is to create **isolated configurations** for Remotion components:

### 1. Create Remotion-specific Tailwind Config

Create a dedicated Tailwind config file specifically for Remotion components:

```js
// src/remotion/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/remotion/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Define colors that match your CSS variables
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Add other Shadcn UI colors as needed
      }
    },
  },
  plugins: [],
};
```

### 2. Create a Minimal CSS File for Remotion

Create a simplified CSS file that only includes the CSS variables needed by Remotion:

```css
/* src/remotion/style.css */
:root {
  --radius: 0.625rem;
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  /* Add other variables needed by your components */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
  /* Add dark mode variables as needed */
}
```

### 3. Configure Webpack for Remotion

Create or update your webpack override to use the Remotion-specific Tailwind config:

```js
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
  // Use a Remotion-specific Tailwind config file
  const configPath = path.resolve(__dirname, 'tailwind.config.js');
  
  // Enable Tailwind with our Remotion-specific config
  const withTailwind = enableTailwind(currentConfiguration, {
    configPath
  });
  
  // Add polyfills for Node.js modules
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
```

### 4. Update Remotion Entry Point

Import the Remotion-specific CSS instead of your main app's CSS:

```ts
// src/remotion/index.ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
// Use Remotion-specific CSS for better isolation/compatibility
import "./style.css";

registerRoot(RemotionRoot);
```

### 5. Use Browser-Compatible Libraries

Replace Node.js-specific modules with browser-compatible alternatives:

```ts
// Instead of this:
import crypto from "crypto";
const id = crypto.randomUUID();

// Use this:
import { v4 as uuidv4 } from 'uuid';
const id = uuidv4();
```

## Benefits of This Approach

1. **Clean Separation**: Remotion and your main app use separate configs and styles
2. **Improved Maintainability**: Changes to main app styling won't break Remotion
3. **Follows Official Documentation**: Built on Remotion's recommended patterns
4. **Better Browser Compatibility**: Avoids Node.js-specific code in browser environments

## References

- [Remotion Custom Webpack Config](https://www.remotion.dev/docs/webpack)
- [Enabling Tailwind in Remotion](https://www.remotion.dev/docs/tailwind)
- [Browser Compatibility](https://www.remotion.dev/docs/browser-compatibility)
- [Using Node.js APIs in Remotion](https://www.remotion.dev/docs/node-apis-in-browser)

## Troubleshooting

If you encounter issues:

1. Always check the browser console for detailed error messages
2. Verify that your Tailwind configurations match your CSS variables
3. Ensure all Node.js modules have browser-compatible alternatives
4. Check Remotion's webpack configuration for any conflicts
5. Make sure all CSS variables used in components are defined in your Remotion CSS file
