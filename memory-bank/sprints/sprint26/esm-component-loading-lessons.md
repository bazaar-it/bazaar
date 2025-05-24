# ESM Component Loading – Sprint 25 → 26 **Single Source of Truth**

> **Purpose**  Capture everything we tried, why it failed or succeeded, and the exact pattern we have now standardised on. This replaces all prior scratch‑notes, so link to this doc from future tickets.

---

## 0  Requirements Recap

| Requirement                          | Why it matters                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Single React & Remotion instance** | Context objects must be identical between host app and dynamic component, otherwise hooks and providers break. |
| **Browser‑side dynamic ESM import**  | Components are generated after deploy time, so they must be fetched at runtime, not bundled by webpack.        |
| **Source‑map preservation**          | Debuggable stack‑traces in Monaco and browser devtools.                                                        |
| **Works in local dev (no R2)**       | Devs can paste code into Monaco and click *Compile* without the full pipeline.                                 |

---

## 1  What We Tried & Why We Pivoted

### 1.1 Import Maps

```html
<script type="importmap">
{
  "imports": {
    "react":    "https://esm.sh/react@18.2.0",
    "remotion": "https://esm.sh/remotion@4.0.290"
  }
}
</script>
```

| ✅ Pros                             | ❌ Cons                                             |
| ---------------------------------- | -------------------------------------------------- |
| Bare specifiers resolve in browser | **Duplicate React / Remotion** ⇒ provider mismatch |
| No extra build step                | External CDN latency, version drift                |
|                                    | No control over sub‑path tree‑shaking              |

### 1.2 Global‑registration (`window.__REMOTION_COMPONENT`)

```ts
import React from 'react';
import { useCurrentFrame } from 'remotion';
window.__REMOTION_COMPONENT = MyComponent;
```

| ✅ Pros                                 | ❌ Cons                                        |
| -------------------------------------- | --------------------------------------------- |
| Familiar, worked with Remotion v3 docs | Still duplicates React/Remotion               |
| No dynamic import needed               | Only one component at a time (global clobber) |
|                                        | Accidental side‑effects at module scope       |

### 1.3 Runtime `<script type="module">` Injection

```ts
const s = document.createElement('script');
s.type = 'module';
s.src = url;
document.head.appendChild(s);
```

| ✅ Pros                   | ❌ Cons                               |
| ------------------------ | ------------------------------------ |
| True ESM execution       | Cannot capture exports synchronously |
| Straightforward fallback | Same React duplication problem       |

### 1.4 **Window\.Remotion pattern** (Sprint‑26 dev fallback)

```ts
/* generated component */
const { AbsoluteFill, useCurrentFrame } = window.Remotion;
export default function Demo() { /* … */ }
```

| ✅ Pros                                      | ❌ Cons                                                                |
| ------------------------------------------- | --------------------------------------------------------------------- |
| **Works in Monaco** with zero build tooling | No source‑maps, raw TS→JS via Sucrase in browser                      |
| Instantly validates LLM output              | Hooks must be pulled off the global, un‑idiomatic Remotion code       |
| Great for local prototyping                 | Does not scale to production bundle (no tree‑shaking, larger payload) |

### 1.5 ⭐ **Final winner – esbuild + external‑global plugin**

Pipeline:

1. **Host app** exposes globals once: `window.React`, `window.ReactDOM`, `window.ReactJSX`, `window.Remotion`.
2. **Build worker** (server‑side) runs `esbuild` with `externalGlobalPlugin` that rewrites every `import 'react'` to `window.React`, every `import 'remotion/*'` to `window.Remotion`.
3. Worker bundles to `<sceneId>.mjs` + `.mjs.map`, uploads to R2 (public, immutable).
4. Front‑end does `import(/* webpackIgnore: true */ bundleUrl)` inside `React.lazy`.
5. Remotion `<Player lazyComponent={lazyComponent} …/>` renders seamlessly.

| ✅ What it solves                                     |
| ---------------------------------------------------- |
| Single instance of React/Remotion (no context split) |
| Tree‑shaken, tiny bundles (<120 KB gzipped)          |
| Source‑maps survive ⇒ breakpoint debugging           |
| Plain idiomatic Remotion code for the LLM            |

---

## 2  Current Canonical Patterns

### 2.1 Host‑side globals (React 18)

```ts
// GlobalDependencyProvider.tsx (runs once per page)
useEffect(() => {
  window.React      = React;
  window.ReactDOM   = ReactDOM;
  import('react/jsx-runtime').then(j => (window.ReactJSX = j));
  window.Remotion   = RemotionLib; // whole library incl. sub‑paths
}, []);
```

### 2.2 Build worker

```ts
import { build } from 'esbuild';
import { externalGlobalPlugin } from 'esbuild-plugin-external-global';

export async function buildComponent(sceneId: string, code: string) {
  const outfile = `/tmp/${sceneId}.mjs`;
  await build({
    stdin: { contents: code, loader: 'ts', resolveDir: process.cwd() },
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    sourcemap: 'external',
    plugins: [
      externalGlobalPlugin({
        react: 'window.React',
        'react-dom': 'window.ReactDOM',
        'react/jsx-runtime': 'window.ReactJSX',
        remotion: 'window.Remotion',
      }),
    ],
  });
  return uploadToR2(`components/${sceneId}.mjs`, outfile); // util omitted
}
```

### 2.3 Generated component **template** (LLM sees this)

```ts
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

export default function {{COMPONENT_NAME}}(props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  /* {{COMPONENT_IMPLEMENTATION}} */
  return <AbsoluteFill />;
}
```

### 2.4 Dynamic import in frontend

```ts
const Scene = lazy(() => import(/* webpackIgnore: true */ bundleUrl));
```

---

## 3  Guard‑rails & CI checks

1. **Lint rule** – fail build if generated code contains `import React`.
2. **Unit test** – parse bundle, assert no duplicate `React` in module graph.
3. **Size budget** – warn if any component bundle > 150 KB.

---

## 4  Fallback & Local Dev Strategy

* **Flag:** `NEXT_PUBLIC_ESBUILD_DYNAMIC="false"` → skip build worker, inject window\.Remotion fallback template (Sprint‑26 pattern). Ideal when offline or R2 unavailable.
* Monaco still supports live editing with `AbsoluteFill` destructure pattern.

---

## 5  Open Questions / Future Work

| Topic                                                 | Owner    | Note                                      |
| ----------------------------------------------------- | -------- | ----------------------------------------- |
| Caching built `.mjs` in Cloudflare R2 + Cache‑Control | Ops      | avoid rebuild chatter                     |
| Move worker to Vercel background function             | Platform | so main API stays fast                    |
| Sandbox execution (future security)                   | EngSec   | run dynamic code in iframe w/ postMessage |

---

## 6  TL;DR for new contributors

> **Use the esbuild external‑global pipeline.** *Never* load React or Remotion twice. If something doesn’t render, check for duplicate React in `window` or missing globals.
