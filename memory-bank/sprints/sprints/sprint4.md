Sprint 4 –  Editor polish & landing flow


(goal: the product already feels like a minimalist AI video editor)
	1.	Landing flow
	•	Unauth home → marketing; auth home → /projects
	•	Prompt + optional image upload → project.createFromLanding → redirect; initial prompt auto-fires first chat message.
	2.	Editor polish
	•	Flex-row layout (chat w-1/3, player w-2/3, stack on sm).
	•	Chat bubbles, scrolling, typing indicator, toasts.
	3.	Remotion primitives
	•	BackgroundColorScene, ShapeScene (circle/square), TransitionScene (fade/slide).
	•	Extend Zod schema & LLM prompt.

❶ Landing-page → project flow

**Server Component: / route**
- Hero headline, short copy, screenshot
- Single prompt textarea: “Describe your video idea…”
- Optional image upload: `<input type="file" accept="image/*">`
  - Store in an S3-like bucket or local `/public` as a stub
Acceptance Criteria: Landing page renders with no JS errors

**Server Action: POST /app/_actions/create-project.ts**
1. Creates project row (DEFAULT_PROJECT_PROPS) under logged-in user.
2. Persists the initial prompt + asset URL in patches (type ="initialPrompt").
3. Redirects to /projects/[id]/edit (not Dashboard).
Acceptance Criteria: Redirect works and project opens with chat auto-populated by the user’s landing-page prompt.

**Editor Auto-Fire First Message**
When ChatInterface first mounts and finds an initialPrompt patch, immediately:
- Call chat.sendMessage with it
- Mark it handled (delete or flag)
Acceptance Criteria: After redirection, the first AI response appears without user re-typing.


⸻

❷ Layout & UI polish

Use 21st.dev design tokens – font sizes, spacing, colours.
	•	Editor page becomes flex‐row (chat w-1/3, player w-2/3) with responsive fallback to stacked on md < 768 px.
	•	Chat bubbles: user = indigo background, AI = slate background, subtle timestamps.
	•	🟢 Streaming feel: animate dots “…” while mutation pending.

⸻

❸ Remotion component library v0.2

**New/Updated File** | **Responsibility**
--- | ---
`src/remotion/components/scenes/ShapeScene.tsx` | Renders circle / square / triangle using `<AbsoluteFill>` + `interpolate(frame)` for fade / scale. Accepts `{ shapeType,color,animation }`.
`src/remotion/components/scenes/TransitionScene.tsx` | Wrapper that cross-fades prev → next sequences; accepts `{ type:‘fade’ }`.
`DynamicVideo.tsx` | Support "shape" and "transition" in `scene.type`.
`Zod schema` | Extend `sceneSchema` with new union members and data fields.
`Constants` | Add `SHAPES = ['circle','square','triangle']`, `TRANSITIONS = ['fade','slide']`.

**Unit Test** | `npm run test-remotion` renders first 50 frames in node + pixel diff to ensure no crash.

⸻

❹ Chat→patch prompts

Refine the system prompt passed to GPT so it knows about the two new scene types, their expected data keys and valid enums.

⸻

❺ Cosmetic backlog for Sprint 4 (medium priority)
	•	Replace tail-end "Untitled Video" title in default props with "My first video".
	•	Add favicon + meta tags.
	•	Button-hover transitions (scale-105, 200 ms).
	•	Dark-mode switch (Next themes optional).

⸻
