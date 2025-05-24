BAZAAR-302  “MVP Scene-First Refactor”

	
Owner	Cursor IDE Agent
Goal	Ship the one-prompt → one-scene → iterate loop that honors user intent with lean LLM prompts, stores the scene in Postgres, and supports targeted edits via @scene(id).
Effort	1–2 dev-days
Risk	Medium (LLM prompt refactor & small DB migration)
Depends on	Existing Generate page UI shell & Remotion Player


⸻

0 SUCCESS CRITERIA (Definition of Done)

Area	Must-have to close 302
Prompt handling	analyzePrompt() classifies specificity & returns optional patternHint, requestedDurationSec.
LLM call	generateComponentCode builds messages:• High-specificity ⇒ no snippets.• Low-specificity ⇒ one snippet from getTemplateSnippet.System prompt always contains “follow user exactly” (high) or generic Remotion guidelines (low).
Storage	New scenes table (see §2.1) inserted/updated on every generation/edit.
Edit loop	Chat message auto-prepends @scene(sceneId) when a scene card is focused; backend detects it and regenerates only that scene’s code.
Preview	Browser compiles the fresh TSX from Postgres via Blob + import(); no R2 round-trip.
Tests	• Unit tests for analyzePrompt (≥10 cases).• Smoke tests A/B/C (high-spec, low-spec, edit) pass.
UX	If user types a short edit with no scene selected → toast “Select a scene…”.
Docs	docs/prompt-flow.md updated with the 2-step model.


⸻

1 CODE & FILE TASKS

#	File / Location	Action
1	src/app/projects/[id]/generate/utils/promptInspector.ts	ADD (already drafted – just ensure patternHint?: string).
2	src/app/projects/[id]/generate/utils/getTemplateSnippet.ts	ADD (already drafted).
3	src/server/db/migrations/XXXXXXXX_add_scenes.sql	ADD migration for table in §2.1.
4	src/server/db/schema.ts	ADD scenes table + relation.
5	src/server/api/routers/generation.ts	REFactor generateComponentCode:• call analyzePrompt.• build messages as per DoD.• on success upsertScene(projectId, code, props).• if @scene(id) pattern → fetch old code & run edit prompt variant.
6	src/app/projects/[id]/generate/GenerateVideoClient.tsx (or EditorLayout)	UPDATE• maintain selectedSceneId.• auto-tag outgoing msg.• isLikelyEdit() util.
7	src/app/projects/[id]/generate/components/SceneCard.tsx	Ensure click sets selection.
8	Tests folder	Jest / Vitest tests for utilities and smoke flow.


⸻

2 TECH SPECS

2.1 scenes table (Drizzle)

export const scenes = createTable('scene', (d) => ({
  id:        d.uuid().primaryKey().defaultRandom(),
  projectId: d.uuid().notNull().references(() => projects.id, { onDelete: 'cascade' }),
  order:     d.integer().notNull().default(0),
  name:      d.varchar({ length: 255 }).default('Scene'),
  tsxCode:   d.text().notNull(),
  props:     d.jsonb(),   // optional SceneProps snapshot
  createdAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).$onUpdate(() => new Date()),
}));

Helper: upsertScene(projectId, sceneId?, code, props) (insert or update by id).

2.2 Runtime compile for preview

const blob = new Blob([scene.tsxCode], { type: 'text/javascript' });
const url  = URL.createObjectURL(blob);
const { default: SceneComp } = await import(/* @vite-ignore */ url);

No R2 upload until “Publish”.

2.3 Prompt building logic

const insight = analyzePrompt(userPrompt);

const msgs = [
  {
    role: 'system',
    content:
      insight.specificity === 'high'
        ? `You are a Remotion component coder. FOLLOW THE USER SPECS EXACTLY.
           Use window.Remotion, ESM-compatible.`
        : `You are a Remotion component coder. Generate an engaging animation.
           Use window.Remotion, ESM-compatible.`,
  },
];

if (insight.specificity === 'low' && insight.patternHint) {
  const snippet = getTemplateSnippet(insight.patternHint);
  if (snippet) msgs.push({ role: 'assistant', content: snippet });
}

msgs.push({ role: 'user', content: userPrompt });

Edit mode: detect @scene(id) via regex and swap system prompt to:

You are editing an existing Remotion component (provided below). Apply ONLY this change: "<edit instruction>".


⸻

3 ROLL-OUT PLAN

Phase	What
Dev	Complete tasks 1-8, run unit & smoke tests locally.
Preview env	Deploy to Vercel branch preview; test with real OpenAI key.
QA checklist	• High-spec prompt renders first try.• Snippet appears only for low-spec.• “make it red” modifies correct scene.• DB rows created/updated.
Merge → main	Tag v0.3.0-scene-first.


⸻

4 LOOK-AHEAD TICKETS

BAZAAR-303  “Publish & R2 Pipeline”

| Goal | Compile Scene bundle → upload to Cloudflare R2 → return public JS URL.Trigger only on “Publish” button or auto-publish flag. |
| Key Work | • Vite/ESBuild bundler function in a serverless job.• S3-compatible upload util.• Add publishedAt, outputUrl columns to scenes.• Build queue & retries (reuse customComponentJob or new lightweight job). |
| Effort | 1–2 days |

BAZAAR-304  “Add Scene & Basic Storyboard”

| Goal | Allow user to append additional scenes and play them sequentially. |
| Key Work | • “Add Scene” button → creates blank scene row (order+1).• Update Remotion Composition to stitch all scenes in order.• promptInspector stays per-scene; multi-scene planning postponed.• UI: vertical Scene list with drag-to-reorder (optional). |
| Effort | 2–3 days |

⸻

5 OPEN QUESTIONS (parked for 303/304)
	1.	Concurrent edits across tabs? – use row updatedAt check in future.
	2.	Scene props vs. raw code diff storage? – revisit after user feedback.
	3.	Versioning & rollback? – could leverage existing patches table.

⸻

READY TO IMPLEMENT 302

Everything in this ticket is fully aligned with prior discussions and the Gemini doc.
If the Cursor agent has started work, cross-check with this DoD & task list; any divergence, sync back here.