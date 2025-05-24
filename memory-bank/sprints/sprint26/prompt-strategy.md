# Bazaar Video MVP – “One Perfect Scene” Architecture & Implementation Guide

## 1  Purpose of this document

A single, self‑contained reference for **Cursor‑IDE agent** (and any other engineers) that captures all design discussions to date and specifies **what to implement now** and **why**.

> **Scope:** MVP that reliably generates **one high‑quality Remotion scene** from a user prompt, plus a tight iteration loop ("make it red"). Multi‑scene planning is intentionally deferred.

---

## 2  Core principles we’re enforcing

| # | Principle                   | Rationale                                                                                                                   |
| - | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1 | **User intent is king**     | If the prompt is explicit (fonts, colours, timings) we follow it verbatim—no template overrides.                            |
| 2 | **Start simple, ship fast** | Nail one scene ➜ confidence ➜ extend.                                                                                       |
| 3 | **Lean prompts**            | Avoid token bloat, latency, cost. No dumping the full template library into every call.                                     |
| 4 | **Deterministic iteration** | A user change should touch only the targeted scene; no global re‑writes.                                                    |
| 5 | **Extendable design**       | Today: heuristic classifier + one generator. Tomorrow: swap classifier for LLM Router, split generators, add scene planner. |

---

## 3  High‑level flow (MVP)

```text
User prompt ─▶ promptInspector (TS heuristics)
               ├── high‑specificity → LLM: generateComponentCode (strict)
               └── low‑specificity  → getRelevantSnippet()
                                        ↓
                             LLM: generateComponentCode (guided)
                               ↓
                        Scene ❶ code returned → Remotion Player
```

### 3.1  Iteration loop

1. UI lets user focus a scene (single card).
2. Chat input prepends hidden tag `@scene(<id>)`.
3. Backend calls **same** generateComponentCode with an *edit* system prompt, previous code + new instruction.

---

## 4  Detailed component specs

### 4.1  `promptInspector.ts`

\| Goal | Cheaply classify prompt specificity & derive a keyword hint |
\| Inputs | Raw user prompt (string) |
\| Outputs | `{ specificity: 'high' | 'low', hint?: string }` |

#### Initial heuristic rules

* **High‑specificity** if any of:

  * ≥ 2 hex colours (`/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g`)
  * Font keywords (Arial, Helvetica, …)
  * Explicit duration or frame count (`\b\d+\s*(s|sec|seconds|frames)\b`)
  * Mentions of exact easing/timing functions
  * Contains “scene 1”, “scene 2” *and* explicit durations ➜ still treat as single scene for now.
* **Low‑specificity** otherwise.
* **hint** = first keyword match in `['logo','bubble','text','slide','fade','rotate','bounce']` (for snippet retrieval).

### 4.2  `getRelevantSnippet(prompt: string): string | undefined`

* Look up **animationTemplates KB** (minimal JSON/TS file).
* Return max **40 tokens** (≈250 chars) code‑only snippet.
* Only when `specificity==='low'` and a hint matched.

### 4.3  LLM call – `generateComponentCode`

| Setting                      | Behaviour                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **System prompt**            | “You are a Remotion coder. Follow ESM rules (window\.Remotion).” + **If edit mode**: include previous code diff guidance. |
| **Assistant msg (optional)** | One snippet from 4.2 (for vague prompts).                                                                                 |
| **User msg**                 | Raw prompt **or** `@scene(id) New instruction …`.                                                                         |
| **Response format**          | Code fenced TSX. No markdown when `response_format=json_object`.                                                          |

### 4.4  Scene editing

* Hidden tag example: `@scene(scene-001) make the background #ff0000`.
* Backend extracts tag, fetches old code, swaps system prompt to **edit** variant.

### 4.5  UI contract

* **Initial run:** user prompt ⇒ runs flow above, renders Scene 1.
* **Focus & edit:** clicking a scene card sets `selectedSceneId` and indicates selection visually.
* **If no scene selected** and user types a vague edit → UI asks user to select.

---

## 5  Implementation checklist (est. 4 hrs)

1. **promptInspector.ts** (1 h)
2. **animationTemplates.ts KB** (ready ‑ trim snippets to 40 tokens)
3. **getRelevantSnippet.ts** util (0.5 h)
4. **Refactor generateComponentCode route** to assemble prompt per rules (1 h)
5. **UI tweak** for scene focus & tag injection (1 h)
6. **Smoke tests**: explicit vs vague, edit loop (0.5 h)

---

## 6  Future‑proofing roadmap (not for MVP)

* Swap `promptInspector` for LLM Router to handle complex multi‑scene prompts.
* Re‑introduce **planScenes** service once multi‑scene is required.
* Split generator into specialised templates if needed (text‑only, heavy animation, etc.).
* Asset fetcher + style generator can plug in unchanged.

---

## 7  Risks & mitigations

| Risk                                   | Impact                           | Mitigation                                                          |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| Heuristic misclassifies a prompt       | Wrong prompt assembly → bad code | Unit tests + allow user to override with `/force exact` keyword     |
| Snippet bias overrides vague user idea | Moderate                         | Keep snippet ≤40 tokens & exclude props not in user prompt          |
| Edit loop confusion                    | High                             | UI enforcement of scene focus, include old code diff in edit prompt |

---

## 8  Reference test cases

1. **High specific:**

   ```text
   One scene, 3 s, white bg, black Arial 48px text “Hi”, fade‑in.
   ```

   *Expect:* No snippet; generated code uses fade opacity frames.
2. **Vague prompt:**

   ```text
   Make a cool bubble animation.
   ```

   *Expect:* Bubble snippet injected; code uses interpolate scale.
3. **Edit loop:**
   *User:* (focus scene‑001) `make it red` → background turns #ff0000 only in that scene.

---

## 9  Hand‑off notes for Cursor IDE agent

* **Implement sections 5.1‑5.5 in order.**
* Testing scripts live under `tests/mvp/`.
* Keep all new prompts under **300 tokens** end‑to‑end.
* No other refactors during this sprint.

> When these tasks are green, we ship the MVP and only then revisit multi‑scene planning.
Below is the re-polished “Implementation Specification” (formerly “MVP-One-Scene-Architecture”).
I have:
	•	Adopted the same object names (PromptInsight, patternHint) the Gemini doc uses.
	•	Added the explicit “JSON-only safeguard” section (wording identical).
	•	Merged Gemini’s six-item action list & estimates (now Section 9).
	•	Kept all crisp, engineer-ready language and code-level hints.

Send this side-by-side with the Gemini narrative doc.
The two now share terminology and contain no contradictions.

⸻

Implementation Specification – “One-Perfect-Scene” MVP

1 . Scope

Deliver a first production slice that turns one user prompt → one high-quality Remotion scene, with rock-solid iterative edits.
Multi-scene logic, asset fetchers, etc. come later.

2 . Core Pipeline (two calls, zero template spam)

Stage	Responsibility	Notes
promptInspector.ts (sync code)	Parse raw prompt → PromptInsight = { specificity:'high' | 'low', requestedDurationSec?, patternHint? }	Start with regex heuristics (hex colors, \b\d+ sec\b, known fonts, verbs like “fade in”, “explode”, “bounce”).
generateComponentCode (single LLM call per scene)	Build messages dynamically:  • System: lean baseline + branch logic below. • Assistant (optional): getTemplateSnippet(patternHint) → ≤ 40-token snippet (only when specificity === 'low'). • User: either raw prompt (initial) or edit cmd (prefixed by @scene(id)).	One scene ⇒ one call; edits reuse same route with “edit” system prompt.

System-prompt variants
	•	High-specificity: append CRITICAL: follow all user specifications exactly.
	•	Low-specificity: no extra line; rely on example snippet to guide style.
	•	Edit mode: "You are editing an existing component…" + previous code + user delta.

3 . Template snippet retrieval

getTemplateSnippet.ts

export function getTemplateSnippet(patternHint: string | undefined): string | null {
  if (!patternHint) return null;
  // simple mapping; extend later
  if (patternHint.includes('bubble')) return BUBBLE_SNIPPET;   // ≤ 40 tokens
  if (patternHint.includes('logo'))  return LOGO_REVEAL_SNIPPET;
  return null;
}

No imports, no comments inside snippets.

4 . Iterative edits via @scene(id)
	•	UI silently prepends the tag when a scene card is focused.
	•	Backend strips the tag, retrieves previous code, feeds it + edit text to the “edit” system-prompt.
	•	If no focus and message is ambiguous, UI asks user to pick a scene.

5 . JSON-only safeguard  (matches Gemini §6)

Whenever response_format:{type:'json_object'} is set (future planners, etc.), strip all markdown & code blocks from system prompts to prevent malformed JSON.

6 . Data structures (excerpt)

export interface PromptInsight {
  specificity: 'high' | 'low';
  requestedDurationSec?: number;
  patternHint?: string;
}

export interface SceneProps {
  // legacy
  title?: string; text?: string;
  // animation
  animationType?: 'expand'|'rotate'|'fade'|'slide'|'bounce'|'explode'|'reveal'|'none';
  primaryColor?: string; secondaryColor?: string;
  // …
}

7 . Success criteria (MVP)
	•	Prompt “One 3-second scene, white bg, black Arial 48px text ‘Hi’, fade-in” → exact code, no snippet injected.
	•	Prompt “Cool bubble animation” → snippet injected, bubble visuals present.
	•	Edit loop: focus scene → “make it red” → only that scene updates.

8 . Future evolution

promptInspector can be swapped for an LLM “Router” once multi-scene planning lands; no UI or contract changes required.

9 . Action list (≈ 4 hrs)  — identical to Gemini
	1.	promptInspector.ts – regex classifier & unit tests (1 h)
	2.	getTemplateSnippet.ts – retrieval utility (30 m)
	3.	Refactor generateComponentCode – dynamic messages + edit mode (45 m)
	4.	UI tagging & ambiguity toast for @scene(id) (1 h)
	5.	JSON-only prompt audit (15 m)
	6.	Smoke tests A-C (30 m)

⸻

Feel free to forward both documents. If any wording tweaks are still needed, just tell me!