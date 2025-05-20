Dynamically Loading Remotion Components in Remotion Player

1. Exporting Dynamic Remotion Components for the Player

When loading a Remotion composition dynamically, export the React component as an ES module export (ideally the default export). This allows Remotion’s Player (which uses React.lazy under the hood) to import it properly. In fact, Remotion’s docs note that if you use the lazyComponent prop (for dynamic loading), the component must be the default export of the module ￼. This is due to a restriction of React Suspense (React.lazy expects the module’s default export to be the component). For example, in your dynamic scene file MyScene.tsx you should write:

// MyScene.tsx
import { Sequence } from 'remotion';
import React from 'react';

// Define your component normally
const MyScene: React.FC = () => {
  return <Sequence>...your scene...</Sequence>;
};

// Export it as the default export for Remotion Player
export default MyScene;

On the client, you would then use the Player’s lazyComponent prop to import this module dynamically. For instance:

import { Player } from '@remotion/player';
import { useCallback } from 'react';

const lazyComp = useCallback(() => import('./MyScene.js'), []); 
// ^ Returns a promise that resolves to the module with default export

<Player 
  lazyComponent={lazyComp} 
  durationInFrames={...} fps={...} 
  compositionWidth={...} compositionHeight={...}
/>

This approach ensures Remotion can load the component via ESM. Do not manually attach the component to a global like window.__REMOTION_COMPONENT – that hack is not needed or recommended. The Remotion Player will get the component from the module’s export automatically once the dynamic import resolves. In summary, expose your dynamic composition as a normal ES module (with a default export), and use Player’s lazyComponent to load it. This pattern is the officially supported way to dynamically supply a composition to Remotion Player ￼.

2. Compiling Remotion .tsx Files to JavaScript for Browser Use

To serve user-authored Remotion scenes dynamically, you’ll compile the .tsx files into browser-friendly JavaScript. Using a bundler like esbuild is a common choice since it’s fast and easily handles JSX/TSX. Here are best practices for this compilation step:
	•	Bundle as an ES Module (ESM format): Compile the code to ESM so that it can be loaded via dynamic import() in the browser. For example, with esbuild you’d set format: 'esm' (and platform: 'browser') so the output is an ES module. This avoids Node-style requires in the bundle. Using ESM output is crucial because it allows the code to be loaded with <script type="module"> or dynamic import without wrappers. If you were to output CommonJS or an IIFE, the module wouldn’t be directly import-able via the Player’s lazy loader. In short, choose ESM for the output format when compiling dynamic Remotion components.
	•	Include or externalize dependencies appropriately: When bundling, decide which imports to bundle into the output and which to leave as externals. For example, you likely want to avoid bundling React or Remotion itself into every dynamic composition, to prevent duplicate large libraries and ensure the dynamic component uses the same React/Remotion context as the host app. In esbuild, you can mark certain packages as external (e.g. react, react-dom, remotion) so they won’t be bundled. This keeps your user’s code bundle small and avoids version conflicts (Remotion advises using one React instance across your app). However, if you mark them external, the output will contain bare imports like import React from 'react', which a browser won’t resolve on its own. You’ll need a strategy to handle those (see section 3 below). If you prefer simplicity, you can bundle all code (so the output has no imports at all), but bundling React/Remotion in each component can lead to multiple copies and context issues. The best practice is to externalize core libraries and ensure the browser can provide them (via global variables or import maps as discussed next).
	•	Use appropriate ESNext syntax target: Choose a build target that matches your runtime environment (e.g. ES2018+ if your users have modern browsers). Remotion itself targets modern browsers, so using a modern syntax target is fine. The compiled code should preserve JSX as React.createElement calls or similar, which esbuild will handle with the JSX loader. Ensure the JSX factory is configured (esbuild usually defaults to React’s JSX transform automatically for .tsx).
	•	Example esbuild config: For example, an esbuild call might look like:

await esbuild.build({
  entryPoints: ['src/RemotionScene.tsx'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/RemotionScene.js',
  platform: 'browser',
  external: ['react', 'react-dom', 'remotion'],  // treat these as externals
  loader: { '.tsx': 'tsx' }
});

This produces an ESM bundle RemotionScene.js ready to be loaded in the browser. It bundles your scene code and any project-specific dependencies, but leaves React and Remotion as imports (to avoid duplicating them). You can adjust externals based on what you want to share vs. bundle. If you face errors about “Dynamic require of ‘react’ is not supported” in the browser, it means the output tried to require something (likely because of using CJS format or leaving externals in an IIFE). The remedy is to stick to ESM format (as above) so that externals remain as static import statements ￼ ￼ (which can then be resolved at runtime via an import map or global variables).

	•	Serving the bundle: Once compiled, ensure it’s accessible to the browser (e.g., upload to Cloudflare R2 and serve via a public URL or CDN). The served file should have the correct MIME type (application/javascript) so it can be imported as a module. Then the Player’s lazyComponent can point to that URL (if using a full URL in an import, remember to enable CORS on the R2 bucket so the module can be fetched by the browser). Often, you might import it by a relative path if it’s served on the same domain or use a function that fetches the text and uses import() via a Blob if cross-origin is an issue. But generally, hosting the compiled JS and doing import("<public_url_to_JS>") works when configured correctly.

In summary, compile your .tsx scenes into a single JavaScript file in ESM format. Use bundling to resolve local imports, and decide which libraries to exclude. This will produce a module that can be dynamically imported into the browser at runtime for the Remotion Player to render.

3. Handling Module Imports and Dependencies at Runtime

Module imports inside your Remotion scene must be handled so that they work in a runtime context. There are two main considerations: avoiding multiple React/Remotion copies and ensuring the browser can resolve the imports.
	•	Avoid multiple React/Remotion instances: All dynamic compositions should use the same React and Remotion runtime as the host app. If you bundle React or remotion into your scene, you risk running a separate React copy inside the composition. This can cause issues (e.g., context mismatches where hooks like useCurrentFrame() might not communicate with the Player’s timing context if a different Remotion instance is used). The preferred approach is to mark these core libraries as external during bundling and rely on the host app’s versions. This way, your compiled scene module will import React and import {…} from 'remotion' rather than include them. But as noted, a browser doesn’t natively know how to fetch 'react' or 'remotion' imports, so you need to bridge that gap.
	•	Providing externals to the module: If you’ve left imports like react or remotion as externals, you should ensure they are available at runtime. There are a couple of strategies:
	•	Use import maps or module-aware hosting: Modern browsers support import maps which can redirect module specifiers to specific URLs. Your host page could include an import map mapping "react" to a CDN URL or to a path where React is hosted, and similarly for "remotion". This would allow the dynamic module’s import React from 'react' to resolve. For example:

<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.2.0",
    "remotion": "/libs/remotion.bundle.js"
  }
}
</script>

This would direct the browser to use the provided URLs when the dynamic module requests those imports. Ensure the versions match your app (to avoid conflicts).

	•	Expose globals and transform imports to use them: Another approach is to include React and Remotion via traditional <script> tags (or via your bundler for the main app) and attach them to window. For instance, you could do window.React = React in your app, and configure your scene compilation to replace import React from 'react' with using the global React object. A custom esbuild plugin or a two-step build can transform imports into global references. This is essentially what UMD bundles do. If you compile your scene as an IIFE/UMD expecting globals (with something like esbuild’s format: 'iife' and globalName options, plus externals turned into globals), the output script could simply assume window.React and window.Remotion exist. However, using an IIFE bundle means you cannot use dynamic import() directly (you’d have to load it via a script tag and then retrieve the global, which is less elegant). If sticking with ESM, a similar effect is achieved with import maps as described above, so that’s generally cleaner for modules.

	•	Prefer ESM and import maps for modular approach: In modern setups, using ESM for dynamic code and configuring the environment to supply known dependencies is a robust solution. If that’s not feasible, you might opt to fully bundle all dependencies (so the module has no imports at all). This ensures the code runs standalone, but it means bundling (and possibly duplicating) large libraries like React. This is usually only acceptable for small demo codes or if you absolutely cannot coordinate host and module dependencies. The recommended approach remains to share the main app’s libraries with the dynamic module rather than duplicate them.
	•	Summary: Direct imports in your scene code should either be bundled or transformed for runtime. Do not leave bare imports that the browser can’t resolve. Either provide an import map for them or compile them out. Crucially, ensure that the React and Remotion that the scene uses at runtime are the same instances as those in the Player host. This will guarantee that context and hooks (like useCurrentFrame, sequences, etc.) work correctly across the dynamic boundary. Remotion’s documentation emphasizes not using <Composition> in the Player and instead sharing the component directly ￼, which implies the component must integrate with the Player’s runtime – something you get by sharing the Remotion/React context rather than isolating it.

4. Validating Compiled Components Before Storage

Before storing the compiled scene code (e.g. in Cloudflare R2), it’s wise to verify that the bundle is well-formed and will work in Remotion Player. Here are some best practices for validation:
	•	Static structure checks: Ensure the output file indeed has an ESM default export which is a React component. You can do a quick check by searching the bundle for an export default line or by programmatically importing it in a Node context. For example, in a Node script (or using a headless browser in CI), do:

const module = await import('file://path/to/compiled/RemotionScene.js');
const Comp = module.default;
if (typeof Comp !== 'function') {
  throw new Error("Compiled scene does not have a default-exported component");
}

This confirms that the module loads without syntax errors and has the expected export. You might also verify that any named exports you expect (if any) are present, or that no unexpected globals are needed.

	•	Runtime render test (optional): For extra safety, you can attempt to render the component in a test environment. For instance, create a minimal React environment (using JSDOM or a simple ReactDOMServer.renderToString if it doesn’t rely on browser APIs) to mount the component. This can catch errors like referencing document at the top level, etc. If the component is pure and uses Remotion hooks correctly, you could do React.createElement(module.default) and ensure it doesn’t throw. However, full rendering might require the Remotion  context which is complex to simulate outside the browser. A simpler approach is to mount the component in a hidden <Player> in a development build and see if it runs.
	•	Schema or Prop validation: If your use-case involves user-generated scenes with certain interfaces (props schemas, etc.), validate those at compile-time. For example, if you expect a component to define certain prop types or defaultProps, you could statically analyze the AST or use TypeScript’s type checker before compiling. Remotion supports Zod schemas for props (for visual editing) – if relevant, ensure the compiled code includes the schema export or defaultProps if needed.
	•	Consistency checks: Make sure the compiled code is using the correct Remotion and Player version. A mismatch in versions between the dynamic component and the host can cause subtle bugs. It’s best if your compile process uses the same version of remotion as the running Player. If you include a version tag or hash in the bundle, you could verify it matches the current deployment of the Player.

By performing these checks before uploading to R2, you can catch issues early. Essentially, treat the compiled component as you would any build artifact: test that it imports and runs in an isolated context similar to the Remotion Player. This ensures that once it’s stored and later fetched for playback, it will work seamlessly.

5. Component Structure: Client-Side Player vs. Server-Side Rendering

Remotion compositions can be used in two ways – embedded in a web app via <Player> (client-side), or rendered to video via Remotion’s server-side tools (CLI, renderMedia(), or Remotion Lambda). The structure and exports of your component files might differ slightly between these scenarios:
	•	For Remotion Player (client-side): As discussed, you do not use the <Composition> component or Remotion’s registerRoot() at all when embedding with a Player. You simply export the component itself (usually as default), and supply its duration, dimensions, and FPS to the <Player> as props. The Player doesn’t look for a composition ID or a registry – you directly pass the React component to it ￼. This means your dynamic scene file can be just the component definition (plus any helper sub-components). It doesn’t need to call any Remotion registration function on the client. For clarity, your dynamic module might export only the composition component (e.g., MyScene) and perhaps some metadata (you could export constants for duration, etc., or just manage those in the host).
	•	For server-side rendering (Remotion CLI or Lambda): The Remotion rendering pipeline expects to identify compositions by an ID in a Remotion project. Typically, in a Remotion project you have an entry file that calls registerRoot(RootComponent) and inside that root you declare one or more <Composition> elements (each with an id, component, and other config) ￼ ￼. This is necessary so the CLI or Lambda can list available compositions and render a specific one by ID. If you plan to render the same dynamically-created component on the server (e.g., via Lambda), you will need to provide a similar structure. In practice, this could mean generating a small Remotion project on the fly that wraps the dynamic component in a Composition. For example, you might have a template like:

// Root.tsx (dynamically generated or reused template)
import { Composition } from 'remotion';
import MyScene from './MyScene';  // dynamic component

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition 
        id="dynamic-video" 
        component={MyScene} 
        durationInFrames={...} 
        fps={...} 
        width={...} 
        height={...} 
        defaultProps={...} 
      />
    </>
  );
};

And an index.ts that calls registerRoot(RemotionRoot) ￼. This way, if you bundle this for the server (or point Remotion’s CLI to it), the composition is registered and can be rendered by ID ("dynamic-video" in this example). In short, server-side rendering requires the composition to be registered via <Composition> and an ID. The dynamic component itself (MyScene) can remain the same, but the export/structure differs: on the server you do need that wrapper and registration. This is why Remotion’s docs for turning a Player app into a Remotion project advise adding a Root.tsx with <Composition> and an entry file with registerRoot() ￼ ￼.

	•	Choosing structure depending on use-case: If you only ever use the composition in <Player>, keep the file simple (just export the component). If you need both Player preview and server rendering, you might maintain two entry points: one that registers the comp for server use, and one that exports it for client. Another approach is to include both in one file (for example, export the component as default for Player, and also call registerRoot conditionally if in a Node/CLI context). However, mixing them can get tricky, so separating concerns is usually cleaner.
	•	No structural differences in the component’s internal code: Note that aside from registration wrappers, the actual component implementation (the JSX, Remotion sequences, animations, etc.) remains the same. You don’t have to change how you write the video itself – just how you export or wrap it depending on environment. The Remotion Player and the Remotion CLI both ultimately render the same React component; the difference is merely how they discover and instantiate that component (direct vs. via composition registry).

In summary, for client-side embedding you export the component directly, whereas for server-side rendering you need to register it in a Remotion project structure (with <Composition> and registerRoot) ￼ ￼. Keep this in mind if you plan to support both: the composition file itself can be reused, but you’ll likely have separate modules or build targets for the Player vs. the rendering pipeline.

⸻

Sources:
	•	Remotion Documentation – Lazy loading components in Player and default export requirement ￼, Composition vs Player usage ￼, Registering compositions for rendering (registerRoot and Composition) ￼ ￼.