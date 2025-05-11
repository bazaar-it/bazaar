# Handling Node.js Built-ins in Browser Environment

## Problem

When using Remotion to render components in the browser, you may encounter errors such as:

```
Module not found: Can't resolve 'fs'
```

Or errors related to Node.js functions not being available in the browser:

```
Error: fs__WEBPACK_IMPORTED_MODULE_3___default(...).existsSync is not a function
```

This happens because some code might import Node.js built-in modules (like `fs`, `path`, `crypto`, etc.) that don't exist in browser environments. This can occur when:

1. Your component directly imports Node.js modules (rare)
2. An LLM-generated component includes server-side imports
3. A dependency you're using imports Node.js modules
4. Shared code between server and client is using Node.js APIs

## Solution

We've implemented several fixes to handle this issue:

### 1. Webpack Configuration for Next.js

In `next.config.js`, we've added fallbacks for Node.js built-in modules:

```js
// Inside webpack configuration
if (!isServer) {
  if (!config.resolve.fallback) {
    config.resolve.fallback = {};
  }
  
  // Provide empty mock implementations for Node.js built-in modules
  Object.assign(config.resolve.fallback, {
    fs: false,
    path: false,
    os: false,
    crypto: false, // Using ESM dynamic import instead of require.resolve
    stream: false,
    buffer: false,
    // More modules...
  });
}
```

### 2. Webpack Configuration for Remotion

In `src/remotion/webpack-override.mjs`, we've added similar fallbacks:

```js
// Add polyfills for Node.js modules and handle node built-ins
return {
  ...withTailwind,
  resolve: {
    ...withTailwind.resolve,
    fallback: {
      ...withTailwind.resolve?.fallback,
      crypto: 'crypto-browserify',
      fs: false,
      path: false,
      // More modules...
    }
  }
};
```

### 3. Component Code Sanitization

In `src/server/workers/generateComponentCode.ts`, we've added code to remove any imports of Node.js built-in modules from LLM-generated components:

```js
function removeNodeBuiltInImports(code: string): string {
  // Create a regex pattern for all Node built-ins
  const builtInsPattern = NODE_BUILT_INS.join('|');
  
  // Match different import styles
  const importPatterns = [
    // ES Module imports
    new RegExp(`import\\s+(?:\\*\\s+as\\s+\\w+|[\\w\\{\\}\\s,]+)\\s+from\\s+['"](?:${builtInsPattern})(?:/[^'"]*)?['"];?`, 'g'),
    // Require style
    new RegExp(`(?:const|let|var)\\s+(?:\\w+|\\{[^}]*\\})\\s*=\\s*require\\(['"](?:${builtInsPattern})(?:/[^'"]*)?['"]\\);?`, 'g'),
    // Dynamic imports
    new RegExp(`import\\(['"](?:${builtInsPattern})(?:/[^'"]*)?['"]\\)`, 'g')
  ];
  
  // Replace each pattern with a comment
  importPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, (match) => {
      return `// Removed Node.js module: ${match.trim()}`;
    });
  });
  
  return sanitized;
}
```

### 4. Making Shared Code Isomorphic (Works in Browser and Node)

For code like the logger that needs to work in both environments, we've implemented environment checks:

```js
// Check if we're running on the server or in the browser
const isServer = typeof window === 'undefined';

if (isServer) {
  // Server-side code that can use fs, path, etc.
  const logsDir = path.join(process.cwd(), 'logs');
  if (fs.existsSync(logsDir)) {
    // Use Node.js APIs safely
  }
} else {
  // Browser-safe code without Node.js APIs
  // Use browser-compatible alternatives
}
```

This approach was applied to `src/lib/logger.ts` to create a version that works in both environments.

### 5. Added Browser-Compatible Polyfills

We've installed polyfill packages as dev dependencies:

```
npm install --save-dev crypto-browserify stream-browserify buffer
```

## Best Practices

When creating components for Remotion:

1. **Avoid Node.js APIs**: Don't use `fs`, `path`, or other Node.js-specific modules in components
2. **Use browser APIs**: Use `fetch` instead of Node.js `http`/`https` modules
3. **Use UUID instead of crypto**: For generating IDs, use the `uuid` package instead of `crypto.randomUUID()`
4. **Check LLM output**: When using LLMs to generate components, validate that they don't include Node.js imports
5. **Make shared code isomorphic**: Use environment checks (`typeof window === 'undefined'`) for code used in both server and browser

## Troubleshooting

If you encounter "Module not found" errors:

1. Check the error message to identify which module is causing the issue
2. Add the module to the `fallback` configuration in both webpack configurations
3. Install a browser-compatible polyfill if one exists (e.g., `crypto-browserify` for `crypto`)
4. Add the module to the `NODE_BUILT_INS` list in `generateComponentCode.ts` to remove it from generated code
5. For shared code used in both environments, add an environment check to conditionally use Node.js APIs 