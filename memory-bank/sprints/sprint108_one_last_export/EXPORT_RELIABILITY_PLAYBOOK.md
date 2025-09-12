# Export Reliability Playbook (Sprint 108)

Goal: Make export reliably produce a downloadable MP4 every time, with clear user feedback and graceful degradation for fonts, icons, and assets. Whatever renders in our Remotion player should render in Lambda.

## Principles
- No surprises: Export always ends with a file or a precise, actionable error.
- No hidden network at render time: Inline, prehost, or fail fast.
- Determinism over cleverness: Preprocess enforces invariants; runtime is minimal.
- Belt-and-suspenders: Preprocess and composition both guarantee component execution.
- Transparency: Provide an export report summarizing fallbacks and warnings.

## Architecture Overview
```
TSX (DB) → Preprocess (compile, sanitize, inline) → Validated JS
→ Lambda site (MainCompositionSimple) → Render → S3 public output
→ UI download + Export Report
```

## Lambda Constraints (What Must Be True)
- No `export` statements inside scene code
- No `window`/`document`/`navigator` usage unless explicitly stubbed
- No `delayRender()` from scene code
- No ad-hoc network fetches from scene code
- All icons, fonts, and assets resolvable without runtime HTTP failures
- The evaluated code must return a React component function/element

## Preprocess: Enforce Invariants (Server)
1. Compile TSX→JS via Sucrase
2. Icon pipeline (Hybrid inliner)
   - Local @iconify-json → Iconify HTTP API → Placeholder
   - AST replaces:
     - `<IconifyIcon icon="set:name" />`
     - `React.createElement(IconifyIcon, {icon: "set:name"})`
     - `IconifyIcon({icon: "set:name"})` and `window.IconifyIcon({...})`
   - Dynamic names go through injected `__INLINE_ICON_MAP` runtime helper
   - Post-validate: Zero `IconifyIcon` or `window.IconifyIcon` references remain
3. Fonts
   - Prefer @remotion/fonts in the deployed site (module-scope registration). Avoid CSS @import.
   - If CSS fonts are kept, host assets under the deployed site’s origin. No external HTTP.
4. Assets (images/video/audio)
   - If URL is http(s) and not our R2 domain, optionally mirror to R2 before render
   - Validate content-type and reachability (HEAD)
   - Replace known avatar shims to public R2 URLs
5. Sanitize scene code
   - Remove `export` statements
   - Replace `window.React` and `window.Remotion` destructures with scoped params
   - Ban/flag constructs: `delayRender(`, `document.`, `navigator.`, raw `fetch(`, unknown `window.*`
   - Fail-fast in strict mode (RENDER_STRICT=1), otherwise degrade and report
6. Guarantee component execution
   - Ensure `const Component = ...` exists
   - Append `return Component;` to the end of jsCode
7. Produce metadata
   - Per-scene report: icons inlined, placeholders used, remote assets mirrored, font families seen, bans triggered

## Composition: Deterministic Execution (Lambda site)
- `MainCompositionSimple` only
  - Registered in `src/remotion/index.tsx`
  - Executes scene code via `new Function(…executableCode…)`
  - After execution, explicitly `return Component;` as fallback
  - Per-scene `SceneErrorBoundary` containment
- Durations sourced from DB; `calculateMetadata` matches sum of frames
- No font loaders that call `delayRender`; rely on @remotion/fonts (preferred) or CSS hosting

## Lambda Rendering Config
- `renderMediaOnLambda` with:
  - `codec: 'h264'`, `imageFormat: 'jpeg'`, `audioCodec: 'aac'`
  - `frameRange` for exact total frames
  - `maxRetries: 3`, `privacy: 'public'`, `downloadBehavior`
  - `outName: renders/${projectId}-${Date.now()}.mp4`
- Environment
  - `REMOTION_FUNCTION_NAME`, `REMOTION_BUCKET_NAME`, `AWS_REGION`, `REMOTION_SERVE_URL`
  - After site deploy: update `REMOTION_SERVE_URL` and restart app
- S3 ACL
  - Run `npm run setup:s3-public` once after deploying functions to enable public reads

## User Feedback & Reporting
- Real-time progress UI
  - Rendering started: show job id, estimated duration
  - Progress: overall percent from `getRenderProgress`
  - Completion: auto-download MP4
- On fallback/partial support
  - Display an “Export Report” with:
    - Icons: inlined vs placeholders, names
    - Fonts: registered families, missing mapped to fallback
    - Assets: mirrored vs direct, failures
    - Any banned constructs removed or neutralized
  - Attach JSON report alongside output (S3 key under the same folder)
- On failure
  - Precise reason (e.g., “Found delayRender in scene 2”)
  - Short remediation

## Asset Strategy (Production)
- Icons: Always inline to SVG; dynamic names use injected map
- Fonts: Use @remotion/fonts; pre-register at module scope
- Images/Video: Mirror to R2 or verify host reachability and content-type; prefer `staticFile` for bundled assets
- Audio: aac, public URL or R2; trim and playbackRate handled at composition; validate duration

## Validation Matrix (Pre-flight Checks)
- Code
  - [x] No `export` or `IconifyIcon` leftovers
  - [x] `return Component;` present
  - [x] No banned tokens (`delayRender`, `document.`, `navigator.`, `fetch(`) unless explicitly allowed
- Assets
  - [x] All URLs resolvable (HEAD OK) or mirrored to R2
  - [x] Allowed MIME types
- Fonts
  - [x] All families used are either registered via @remotion/fonts or will fall back to Inter

## Observability
- Log counts:
  - icons: requested, inlined, placeholders
  - fonts: families detected, missing mapped
  - assets: mirrored, remote direct, failures
- Store per-export report in DB and S3
- Alert on POST-VALIDATION failures

## Deployment Process
1. Deploy site: `npx remotion lambda sites create` (or update)
2. Update `.env.local` `REMOTION_SERVE_URL` to the new site
3. Restart app
4. Smoke test: run “canary export” composition with icons, fonts, image, audio

## Canary Export (Smoke Test)
- 5s @ 1920x1080, 30fps
- Contents: 1 SVG icon (Iconify), 1 Google Font text, 1 image (R2), 1 audio blip (R2)
- Pass criteria: MP4 renders, no placeholders, no delays, report contains zero errors

## Failure Modes & Remedies
- React #130 from Iconify → Fixed by inlining + post-validation
- Undefined Component return → Preprocess + runtime explicit return
- delayRender timeout → Forbid delayRender in scenes; ensure site has no font loaders that delay
- HTTP 403/404 on assets → Mirror to R2 or fail fast with actionable error

## Roadmap (nice-to-haves)
- Strict mode toggle (RENDER_STRICT) to preemptively fail builds
- Asset mirroring service with cache and URL rewriting
- UI badges surfacing export support status (icons/fonts)
- CI job to run the canary export on site deploy

## Action Items (Implementation)
- Enforce banned tokens in preprocess with clear errors and scene pointers
- Migrate font loading in site to @remotion/fonts (remove CSS fonts)
- Add export report generation and persistence (DB + S3 JSON)
- Implement optional asset mirroring to R2 with URL rewrite

This playbook captures what “perfectly reliable” export means for us and how to get there with concrete code hooks and ops steps.

