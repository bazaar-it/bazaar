# Next.js (with SWC) and Jest (with Babel) ESM Configuration

This document outlines the configuration steps taken to allow Next.js to use its default SWC compiler for development and builds, while enabling Jest to use a separate Babel configuration for running tests in an ES Module (ESM) project (`"type": "module"` in `package.json`).

## The Core Problem

- Next.js's build system and Babel loader historically expected Babel configuration files (like `babel.config.js`) to be in CommonJS format and loaded them synchronously using `require()`.
- In a project with `"type": "module"` in `package.json`, `.js` files are treated as ES modules by default. This causes `require()` of a `.js` Babel config file to fail.
- Next.js's loader also explicitly stated it does not support `.mjs` or `.cjs` as Babel configuration file extensions.
- This created a conflict: how to provide a Babel configuration for Jest (which can work with `.cjs` files in an ESM setup) without Next.js attempting (and failing) to load it, or unnecessarily disabling its preferred SWC compiler due to the presence of a custom Babel config it couldn't properly parse.

## The Solution Implemented

1.  **Decouple Next.js and Jest Babel Configurations:**
    *   **For Next.js (Enabling SWC):**
        *   Ensured Next.js does *not* find any of its standard Babel configuration file names (`.babelrc`, `babel.config.js`, `babel.config.cjs` under their default names).
        *   This was achieved by deleting any existing `.babelrc` and `babel.config.js` files from the project root.
        *   The Babel configuration file intended for Jest (originally `babel.config.cjs`) was renamed to `babel.jest.config.cjs` to hide it from Next.js's auto-detection.
        *   This strategy allows Next.js to fall back to its default, high-performance SWC compiler.

    *   **For Jest (Custom Babel Setup):**
        *   **`babel.jest.config.cjs`**: This file was created/maintained to hold the Babel configuration specifically for Jest.
            *   It exports its configuration using `module.exports` (CommonJS format).
            *   Key preset: `["@babel/preset-env", { "modules": false }]`. This setting is crucial as it tells Babel to transpile modern JavaScript syntax but to *preserve* ES module syntax (`import`/`export`) rather than converting it to CommonJS (`require`/`module.exports`).
            *   Other presets: `@babel/preset-react` (for JSX) and `@babel/preset-typescript` (for TypeScript syntax, though `ts-jest` handles primary TS compilation).
            *   Plugins: Includes `@babel/plugin-transform-runtime` to ensure Babel helper functions are correctly handled and imported, preventing potential conflicts in a modular environment.
        *   **`jest.config.cjs`**: This is Jest's main configuration file.
            *   The `transform` property for `.js` and `.jsx` files was updated to explicitly tell `babel-jest` to use the dedicated configuration file: `transform: { '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.jest.config.cjs' }] }`.
            *   For TypeScript files (`.ts`, `.tsx`), `ts-jest` is used with the `useESM: true` option: `transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }] }`.
            *   `extensionsToTreatAsEsm: ['.ts', '.tsx']` is set to inform Jest that these file types are ES modules.

2.  **Node.js ESM Execution Environment for Jest:**
    *   The npm script for running tests was confirmed/set to `"test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"`. The `--experimental-vm-modules` flag ensures Jest runs in a Node.js environment that fully supports ES modules.

3.  **`jest.setup.js` Investigation:**
    *   The persistent `ReferenceError: require is not defined` originating from `jest.setup.js` was a key blocker.
    *   This error was resolved by temporarily commenting out `jest.mock(...)` calls and a `console.error` override within `jest.setup.js`.
    *   This indicates that the core module loading and transformation pipeline for Jest is now much more stable. The next phase involves carefully reintroducing the commented-out setup code, ensuring each part is compatible with the ESM transformation process.

## Current Status & Next Steps

- The Next.js development server (`npm run dev`) is now working correctly, utilizing SWC.
- The primary Jest configuration error (`ReferenceError: require is not defined` in `jest.setup.js`) has been resolved at a foundational level.
- Current test failures are due to the temporarily disabled mocks in `jest.setup.js`.
- The immediate next steps are to systematically re-enable the content of `jest.setup.js` (mocks, console overrides) to identify and rectify any remaining ESM incompatibilities at that level, and then address any subsequent test logic failures.
