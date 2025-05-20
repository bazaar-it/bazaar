Dynamic Remotion Component Loading: Structure, Build, and Integration Guide

1. Component Structure for Dynamic Remotion Components

Dynamic Remotion components should be defined as standalone React components (usually functional components) without using Remotion’s <Composition> wrapper. In a Remotion Player context, you pass the component itself to the player, not a <Composition> element ￼. This means your dynamic component file should simply export a React component (e.g. a React.FC) and not call registerRoot or define any <Composition> tags internally.

Export and Global Registration: It’s recommended to default-export the component (and optionally also provide a named export) so that React’s lazy import/Suspense can load it correctly ￼. For example, if your component is DynamicVideo, do:

const DynamicVideo: React.FC = () => {
  return <h1>Hello from DynamicVideo!</h1>;
};

// Register globally for script-injection usage:
window.__REMOTION_COMPONENT = DynamicVideo;
export default DynamicVideo;

In the Bazaar-Vid system, the component is also assigned to a known global variable. Setting window.__REMOTION_COMPONENT = DynamicVideo; ensures that when the script is loaded dynamically, the host can grab the component from this global. This is crucial if using script injection (discussed below). The global registration should happen after defining the component (as shown above).

Avoiding Duplicate React/Remotion Instances: Dynamic components should not bundle their own copy of React or Remotion. In practice, you can still write import React from 'react' and import Remotion hooks/components in your source for type safety, but these imports will be marked as externals during bundling. This ensures the component uses the host application’s React and Remotion instances at runtime, avoiding conflicts (e.g. multiple React roots or context mismatches). In other words, the component should treat react, react-dom, and remotion as peer dependencies provided by the host. The code should not attempt to initialize ReactDOM or call ReactDOM.render – Remotion’s Player will handle rendering. Simply export the React component.

Props and Defaults: If your component expects props or uses Remotion’s input props, define a props interface for the component. You can provide default props via static default parameters or handle undefined props internally – remember that in the Remotion Player (unlike Remotion Studio), you can directly pass props at runtime, so default props are less critical. If certain composition metadata (duration, fps, dimensions) are inherent to the component, you might choose to document or enforce them (see Validation section), since the Player needs those values explicitly. However, do not use <Composition> inside your component to set those – instead, supply durationInFrames, fps, etc. to the <Player> when embedding it.

No Remotion Root/Composition Calls: In a static Remotion project, you’d normally register compositions in a Root file. In this dynamic setup, that’s not needed – the <Player> will wrap your component with the necessary Remotion context. So your component file should only contain the component itself (and any helper sub-components), without any calls to registerRoot or <Composition>.

2. esbuild Configuration for Compatible Bundles

To compile dynamic components so they work with Remotion Player, you need to bundle them with the right settings. Key requirements: bundle the code as a single file, target the browser, and ensure it’s either an ES module (for dynamic import) or a self-executing script (for direct injection) with external libraries handled properly.

Important esbuild options and settings:
	•	Bundle and Platform: Enable bundling (bundle: true) so that all the component’s own dependencies are included in one file. Set platform: 'browser' (and an appropriate target, e.g. ES2020) to produce browser-compatible code.
	•	Output Format: For the Bazaar-Vid use case, we recommend IIFE format (format: 'iife') – this wraps the code in a self-invoking function. An IIFE is ideal for script injection because it executes immediately and can attach the component to window without requiring further imports. In contrast, if you plan to use dynamic import(), an ESM format (format: 'esm') bundle can be used. However, pure ESM output requires addressing module imports of React/Remotion at runtime (via import maps or bundling those libraries). In practice, using IIFE with externals is simpler for our needs. (If using ESM, you would likely have to bundle React/Remotion into the file or configure an import map, which is not ideal due to duplication and complexity.)
	•	Externalizing React/Remotion: Mark React, React-DOM, and Remotion as external in esbuild so they are not bundled. This prevents shipping a second copy of these libraries. For example: external: ['react', 'react-dom', 'remotion']. Without special handling, esbuild will leave these as runtime imports/require calls (depending on format). In an IIFE or CJS bundle, that means it will output require('react') which fails in a browser (since require isn’t available) ￼. To fix this, use a plugin to replace those imports with global references. The esbuild-plugin-external-global is designed for this ￼. For instance:

import { externalGlobalPlugin } from 'esbuild-plugin-external-global';
esbuild.build({
  entryPoints: ['DynamicVideo.tsx'],
  outfile: 'DynamicVideo.bundle.js',
  format: 'iife',
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  external: ['react', 'react-dom', 'remotion'],
  plugins: [
    externalGlobalPlugin({
      'react': 'window.React',
      'react-dom': 'window.ReactDOM',
      'remotion': 'window.Remotion',
    })
  ]
});

In the above config, any import React from 'react' in the source becomes references to window.React in the output, and similarly for Remotion. This way, the host environment must provide window.React, window.ReactDOM, and window.Remotion (we’ll ensure that in integration). The snippet also sets a JSX factory to use the React global – we specify jsxFactory: 'React.createElement' and jsxFragment: 'React.Fragment' to avoid esbuild injecting its own React import for JSX. (Using the classic JSX runtime is one strategy; alternatively, with the modern JSX runtime you’d externalize 'react/jsx-runtime' as well, but mapping that to a global is non-trivial, so the classic runtime is simpler here.)

	•	Default Export Preservation: Ensure that the default export is preserved in the bundle. esbuild by default will keep the ESM export if format is esm, or convert to a property on window.__REMOTION_COMPONENT if using an IIFE globalName. In our case, since we manually assign the component to the global in code, we don’t need a special globalName for the bundle. The code window.__REMOTION_COMPONENT = ... will run as part of the IIFE, registering the component. (If you opted not to manually set the global in code, you could use esbuild’s globalName option to assign the module exports to a global. However, explicitly setting it in the source as we do is straightforward and clear.)
	•	Minification and Size: (Optional) You can enable minification or tree-shaking, but typically the component code is small relative to React/Remotion. Since we aren’t bundling React/Remotion, the dynamic component bundle should be lightweight. Just make sure to include all code the component needs (if it imports other libraries like date-fns or lodash, those will be bundled in).
	•	ESM format caveat: If you choose format: 'esm' for dynamic import, do not mark React/Remotion as external unless you have a way to supply them as modules. Marking them external in ESM will leave import statements like import {...} from 'react' in the output, which the browser cannot resolve without an import map or loader. One workaround would be bundling those as well (not recommended) or configuring a public CDN path for them. Due to these complexities, the IIFE + externalGlobals approach is often easier for remote components.

In summary, use IIFE format with externals mapped to globals for script injection. This yields a one-file script that, when loaded, immediately defines window.__REMOTION_COMPONENT to your component. The Remotion docs indirectly support this approach – they note that when using a lazy-loaded component, a default export is needed ￼, which we’ve ensured by default-exporting our component. By configuring esbuild as above, the output JS will be tailored for the Remotion Player environment.

3. Runtime Integration in the Remotion Player

There are two main ways to load the remote component at runtime: using Remotion’s dynamic import (lazy component) feature, or by manual script injection. Bazaar-Vid currently uses script injection with a global, but we’ll outline both approaches:
	•	Using <Player lazyComponent={...}>: Remotion’s <Player> supports a lazyComponent prop, which should be a function that returns a dynamic import() Promise ￼. This allows Remotion to lazy-load the component via React.Suspense. For example:

import { Player } from '@remotion/player';
import { useCallback } from 'react';

const VideoPlayer = () => {
  const remoteUrl = "https://my-cdn.com/components/DynamicVideo.mjs";
  // Use useCallback to avoid creating a new function on each render
  const lazyComp = useCallback(() => import(remoteUrl), [remoteUrl]);
  
  return (
    <Player 
      lazyComponent={lazyComp}
      durationInFrames={150} 
      compositionWidth={1280}
      compositionHeight={720}
      fps={30}
      inputProps={{ title: "Hello!" }}
    />
  );
};

In this pattern, the remote URL must point to an ESM bundle of the component (with a default export). The Remotion Player will call lazyComp() to fetch the module and then render it. Make sure to only use this in a browser context – e.g., if using Next.js, wrap this component in a dynamic(() => Promise.resolve(VideoPlayer), { ssr: false }) or ensure it only runs client-side (because import(remoteUrl) should not run during SSR). You should also configure CORS on the storage (R2) to allow cross-origin module fetching (e.g., setting Access-Control-Allow-Origin: * on the .mjs file responses), otherwise the browser will block the import. With this method, you do not need window.__REMOTION_COMPONENT at all – the module’s default export is used directly by the Player.
Pros: This approach is clean – Remotion handles loading state (you can supply a fallback via React Suspense if desired) and you get type-safe imports. Cons: It requires CORS configuration and that the bundle be a valid ESM. It also may be trickier to handle errors (you’d need try/catch around the import or an error boundary around the Player if the import fails).

	•	Using Script Injection and Global Component: This is the approach the Bazaar-Vid system currently uses. The idea is to load the compiled component as a plain script, then retrieve the component from a known global. Here’s how to integrate it:
	1.	Inject the Script: In your Next.js app (client-side), create a <script> tag pointing to the component’s URL. For example:

useEffect(() => {
  const script = document.createElement('script');
  script.src = remoteUrl;            // URL of the bundled JS (IIFE format)
  script.async = true;
  script.onload = () => {
    // After load, the script has set window.__REMOTION_COMPONENT
    const comp = window.__REMOTION_COMPONENT;
    setLoadedComp(() => comp);
  };
  script.onerror = () => {
    console.error("Failed to load remote component script.");
    setLoadError(true);
  };
  document.body.appendChild(script);
  return () => {
    // Cleanup old script tag if component or URL changes
    document.body.removeChild(script);
    delete window.__REMOTION_COMPONENT;
  };
}, [remoteUrl]);

We append the script to the DOM. When it loads, the code inside (our IIFE bundle) runs and executes window.__REMOTION_COMPONENT = DynamicVideo. We then grab that component and store it in state (loadedComp). If the script fails to load, handle the error (e.g., set an error state or fallback UI).

	2.	Render the Player with the Component: Once the component is loaded, you can render the Remotion Player:

{loadedComp ? (
  <Player 
    component={loadedComp} 
    durationInFrames={150}
    compositionWidth={1280}
    compositionHeight={720}
    fps={30}
    inputProps={{ title: "Hello!" }}
  />
) : loadError ? (
  <div>Failed to load video component.</div>
) : (
  <div>Loading video...</div>
)}

Here we use the component prop of <Player> to directly pass the loaded React component (as opposed to using lazyComponent). This assumes window.__REMOTION_COMPONENT was set correctly. We supply the required video specs (duration, dimensions, fps) to the Player – these might be known from metadata or user input. In a dynamic system, you might fetch these values alongside the component (for example, store them in your database when the user uploads a component, or have the component file export them).
Important: Ensure that window.React, window.ReactDOM, and window.Remotion are set in the global scope before loading the remote script. In Next.js, you can do this in an _app.js or a useEffect on the top-level component:

useEffect(() => {
  window.React = React;
  window.ReactDOM = require('react-dom');
  window.Remotion = require('remotion');
}, []);

This makes the host’s React/Remotion available to the remote script. (Do this only on the client side, as it depends on window.)
With script injection, no special CORS headers are needed (the script is loaded as a regular script, not via XHR/fetch). One thing to watch out for is double-loading or caching: if you inject the same script URL multiple times, the browser may cache it. If the user updates their component and you re-use the URL, consider adding a cache-busting query param or a unique filename per version.

	•	Ensuring Proper Registration: In both methods, the remote bundle must properly register the component. For lazy import, it means a correct default export (React Suspense will look for module.default). For script injection, it means setting the known global variable. If those are done as per section 1 and 2, the integration should find the component.
	•	Concurrency and Multiple Components: If your application may load multiple different components at the same time, the script injection method in its simplest form can conflict because it uses a single global (__REMOTION_COMPONENT). For example, if you tried to load two different scripts simultaneously, each would overwrite that global. In such cases, you’d need to differentiate them (e.g., have each script use a unique global name or a callback registration instead). One pattern is to have the script call a function like window.__registerRemotionComponent(component) with an ID, rather than a fixed global. For Bazaar-Vid, if only one component is loaded at once, this isn’t an issue. Just be aware that symbol redefinition (global name collisions) can happen if you reuse the same global for multiple loads – the latest script wins, and earlier references could break. A simple mitigation is to always wait for one component to unload before loading another, or use distinct keys (like window.__REMOTION_COMPONENT_123 keyed by an ID).
	•	Rendering and Remotion Context: The Remotion Player will internally wrap your component with the necessary context providers (for timeline, video config, etc.). If your component uses Remotion hooks like useVideoConfig() or components like <Sequence> or <AbsoluteFill>, they will work as long as you did not bundle Remotion separately. Since our bundler setup externalizes Remotion, the component will use the host’s Remotion context. This allows dynamic components to seamlessly use Remotion features (audio, video, sequences, etc.). If you ever see issues like hooks failing or useVideoConfig() returning undefined, it’s a sign that there might be two Remotion contexts (likely from a duplicate Remotion import). Ensuring a single shared Remotion instance (via externals as above) avoids this.

4. Validation and Debugging of Dynamic Components

When accepting dynamically generated components (e.g. from an LLM or user input), it’s important to validate them before deploying and to have debugging strategies for runtime issues. Here are guidelines for validation and common issues:

Build-Time Validation:
	•	Default Export Check: Verify that the compiled module has a default export that is a React component. If using the lazy import method, this is crucial – React will error if module.default isn’t a valid component. You can programmatically check the source (e.g., does the TypeScript AST contain an ExportDefaultDeclaration) or simply attempt to import the module in a test context and see if default exists. Remotion’s documentation explicitly notes the need for a default export when using lazy components ￼. If a user forgets to export default, you should reject or fix the component (for example, if there’s exactly one named component export, you could automatically treat it as default, but it’s safer to enforce an explicit default).
	•	Global Registration Check: If using script injection, ensure the code contains window.__REMOTION_COMPONENT assignment. This could be done via static code analysis (e.g., searching the output text for that substring) or by a convention in the generation step (our guidelines for the LLM should always include it). If the global is not set, the host won’t know the component was loaded.
	•	No <Composition> Usage: As mentioned, the component should not include any <Composition> or Remotion <Folder> in its code. Such usage would indicate the component was written for a static Remotion project (which could cause duplicate registration or simply do nothing useful in the Player). A static analysis step can search for Composition import or JSX usage in the source and flag it. (The Remotion docs note that in Player usage, you pass the component directly and do not wrap it in <Composition> ￼.)
	•	Dependencies and Imports: Scan for any disallowed imports. Ideally the component should only import from React, Remotion, and maybe utility libraries. If it imports a heavy library or performs a dynamic import of its own, consider whether that’s safe. Also ensure no imports of Node-specific modules (like fs, which would break in a browser). If using a sandboxed LLM to generate code, you might restrict it to certain allowed imports.
	•	Type Checking: If possible, run TypeScript type-checking on the component code with the React/Remotion types available. This can catch obvious mistakes (e.g., using a Remotion hook incorrectly). Type-checking ensures the component matches the expected signature (e.g., no invalid JSX return types, props shape is an object, etc.). It’s not foolproof for runtime, but helps quality.
	•	Bundle Analysis: After compiling with esbuild, inspect the bundle (perhaps using source-maps or by analyzing the AST). Confirm that React/Remotion are indeed not bundled. If you accidentally bundled them, the file size will be much larger and you risk runtime issues. Also ensure the bundle doesn’t contain require( calls (unless you expect them) – a stray require('react') means the external-global plugin wasn’t applied correctly. The StackOverflow example we discussed showed the error “Dynamic require of ‘react’ is not supported” when this happens ￼. Our config prevents that by replacing require('react') with window.React references.

Runtime Debugging:
	•	Logging and Error Boundaries: Wrap your <Player> in an error boundary or use Remotion’s onError callback (if available) to catch rendering errors. If the dynamic component throws an error during render (e.g., due to a coding bug), the Player might just go blank. Having an error boundary can capture it and show a message. Also consider logging console.error from the remote script load failure. For instance, if the script URL is wrong or the user’s code had a syntax error that prevents execution, the onerror handler in script injection will fire. Log these errors for analysis.
	•	Blank Screen Issues: A common scenario is the Player appears but no content is shown:
	•	Check Player props: Ensure durationInFrames, fps, compositionWidth, and compositionHeight are provided and make sense. If any of these are missing or zero, the Player might not render frames. A blank screen with controls disabled often points to a missing duration or the component immediately unmounting. Always supply a duration > 0 and valid width/height.
	•	Default export or global missing: If using lazy import and the screen is blank, open the browser console – if you see an error like “Element type is invalid”, it likely means the module didn’t provide a proper component. This could happen if the default export wasn’t set. If using script injection and nothing happens, check that window.__REMOTION_COMPONENT is set (you can manually inspect window.__REMOTION_COMPONENT in the dev console). If it’s undefined, the script either didn’t execute or did not set the variable. This could be due to a syntax error in the bundle (check the network tab to see if the JS loaded fully) or not assigning to the exact global name expected. Double-check that the global name in the script and the one the host expects match exactly.
	•	React context issues: If the component loads but you get runtime errors like “Invalid hook call” or “could not find Remotion root”, it suggests multiple React or Remotion instances. This means the externals config might have failed and the remote code brought its own React/Remotion. The fix is to correctly externalize those and ensure the host provides them. In dev mode, you can verify by searching the loaded script for the word React. You should see references to window.React but not a full copy of the React library. If you do see the React source in the bundle, your external config might not be applied.
	•	Double execution / Symbol redefinition: If you navigate or hot-reload, the script might load again and reassign window.__REMOTION_COMPONENT. This typically isn’t a problem (it simply replaces the old component reference), but it could lead to unexpected behavior if the old component is still mounted. For instance, if you had two <Player> instances using two different components sequentially with the same global, the first Player might suddenly start rendering the new component if it references the global directly. Our approach of copying the global into state (setLoadedComp) avoids that: once we store the component in state, the Player uses that reference (which doesn’t change even if the global is overwritten later). So, a tip is to not rely on the global directly after load – use it to grab the component once, then work with the local variable. This way, subsequent script loads won’t affect an already-mounted Player.
	•	If you do need multiple different videos on screen at once, consider altering the architecture: for example, have each script set window.__REMOTION_COMPONENT_<id> and retrieve each accordingly, or use the dynamic import approach which isolates modules.
	•	Static Analysis for Remotion Compatibility: You can implement a simple static check on the code to ensure it calls window.__REMOTION_COMPONENT = ... exactly once, has one default export, and the component’s name matches (though name matching isn’t strictly required). You might also check that the component is a function component (e.g., starts with capital letter and is a function or arrow). While class components would technically work, most Remotion examples use functional components with hooks. If your LLM might output class components, ensure they still work with Remotion (they should, but hooks like useVideoConfig() obviously can only be called in functional components).
	•	Guidelines for LLM Code Generation: To ensure the AI generates compatible code, instruct it with the rules we’ve discussed:
	•	Always define a top-level React component (functional) and default export it.
	•	Set window.__REMOTION_COMPONENT to that component.
	•	Use JSX/TSX normally for the component’s content. It can import from 'remotion' (for things like <AbsoluteFill />, <Sequence />, etc.) and 'react' as needed – we will handle externals. The LLM should not include script tags, ReactDOM.render, or anything outside the component’s scope.
	•	Avoid using <Composition> or assuming a Remotion Studio environment. The component should behave like any React component that renders visuals for the given duration.
	•	If the LLM is to include timing logic (for animations), it can use Remotion hooks like useCurrentFrame() or interpolate(). Those are fine as long as it imports them from ‘remotion’.
	•	Encourage the LLM to produce self-contained visuals (e.g., not fetch external data or depend on global mutable state) unless such behavior is explicitly wanted. This keeps the component side-effect-free and portable.
	•	The output from the LLM can include TypeScript types for props – that’s good for our compile step. Just ensure any complex types are serializable if they go into inputProps (Remotion Player allows non-serializable props, unlike the Remotion renderer, but it’s still best to keep props simple).

Troubleshooting Common Issues:
	•	Blank Player with no errors: Check that you provided the Player with correct video specs (duration, fps, etc.). If those are correct, ensure the component isn’t immediately returning nothing (maybe due to a prop condition). Use React DevTools or console.log in the component to see if it’s rendering. Also verify that the component isn’t unmounting itself via a  that covers no frames, etc.
	•	“Component is not a function” or “Element type is invalid” errors: This usually means the Player tried to render something that isn’t a React component. For lazy loading, this can happen if you passed lazyComponent={() => import(url)} but the module didn’t default-export a component (e.g., maybe it only had a named export). Ensure the default export is present. For script injection, if you see window.__REMOTION_COMPONENT is not set or is not a function, the script likely didn’t run properly or had an error. Open the browser dev console network tab to see if the script was fetched; if it was, check for any syntax errors (the console would log an error if the script threw one). Common mistakes include forgetting a closing brace in the code or using features not supported by the chosen target (ensure esbuild target is modern enough for the code the LLM produces, or include necessary polyfills).
	•	Multiple React copies / Hooks failing: If you see errors about “Invalid hook call” or “Hooks can only be called inside the body of a function component” when using a valid component, it might indicate the component is using a different React than the one Remotion’s Player is using. This can happen if the bundle accidentally inlined React. The fix is to adjust the bundler config to treat React as external. If that was done, ensure the host actually set window.React before the component script ran. If not, the component code might have thrown when trying to access window.React. Always initialize the globals first, as described.
	•	Symbol redefinition / global collisions: If you load a new component and the old one is still visible, you might inadvertently replace the global. Solve this by isolating each load (unmount the old Player before mounting a new one, or use separate globals). In development, HMR (hot module reload) or Fast Refresh in Next.js might also re-inject scripts – consider adding logic to not double-inject the same URL if it’s already loaded, or to remove the old script.
	•	Validating output before storage: Before you upload the compiled JS to R2 (or serve it), you might run a quick test in a headless browser or Node DOM emulator. For example, you could use JSDOM in Node to create a window with a dummy window.React = { createElement: ... } etc., then load the script to see if it runs without throwing. This is advanced, but it could catch gross errors in the bundle. Alternatively, integrate a small test that uses <Player> with the new component in a staging environment to ensure it actually renders a frame.

References:
	•	Remotion Player documentation on passing components vs. compositions ￼ and using the lazyComponent prop ￼.
	•	Remotion documentation noting that dynamic (lazy) components must use a default export ￼.
	•	Stack Overflow discussion of esbuild externals causing require('react') in output and the solution using an external-global plugin ￼ ￼. These build steps ensure the dynamic component uses the host’s React/Remotion instances.

By following the above guidelines for component structure, build configuration, and integration, Bazaar-Vid can safely load user-generated Remotion components on the fly. This setup allows for flexible, plug-in video logic while maintaining the stability of the Remotion Player environment.