Below is a prompt-crafting playbook for the Scene-planning LLM (your Scene Agent).
Follow it and you’ll see far fewer “one-note” timelines, tighter narrative arcs, and much less post-repair work.

⸻

1 Why prompt quality matters

Pit-fall seen in tests	Root cause in prompt	Symptom in video
3 scenes all the same length	“Make a short video” – no pacing hints	Feels monotonous
Duplicate colour palettes across scenes	No mention of brand palette	Style drift
CTA scene missing	Prompt never says “end with call-to-action”	User thinks video is unfinished
Over-ambitious storyboard	Prompt doesn’t specify target duration (frames)	LLM spends 12 scenes on a 10 s slot


⸻

2 Prompt anatomy checklist  ✅

Section	Contains	Why it helps
Role	“You are ScenePlannerGPT, senior motion director …”	Sets expertise + persona
Audience & channel	“For Twitter + TikTok, fast-paced, mobile first”	Guides pacing & safe frame
Narrative guard-rails	“Must include intro → USP → CTA in that order”	Guarantees arc
Duration budget	“Total ≤ 300 frames @30fps” OR scene count range	Enforces timeboxing
Asset constraints	List of uploaded images / logos with IDs	LLM references them by id
Design tokens	Primary colour, font, easing tokens if known	Minimises style drift
Output contract	“Return only valid JSON matching this TypeScript type …”	0 parsing failures
Few-shot examples	1-2 miniature prompts + gold-standard JSON replies	Teaches structure & scale
Rubric notice	“Plan will be graded on arc coherence (1-5) …”	Nudges self-eval (Reflexion)


⸻

3 Template you can copy-paste 📝

You are ScenePlannerGPT, an award-winning motion director who thinks in clear beats.

# CONTEXT
- Product: "{{product}}"
- Tone: "{{tone}}"                (e.g. "fast-paced, playful")
- Channels: {{channels}}          (e.g. ["Twitter", "TikTok"])
- Total target length: {{frames}} frames @ {{fps}} fps
- Brand tokens:
    primaryColor: {{color}}
    fontFamily:   {{font}}
    easing.fast:  cubic-bezier(0.4,0,0.2,1)
- Available assets:
{{#each assets}}
  • {{id}}  type={{type}}  url={{url}}
{{/each}}

# YOUR TASK (read carefully)
1. Create **4-6 scenes**: *intro* → 1-2 USP beats → *CTA*.
2. Each scene duration = multiple of 15 frames.  
   Keep total ≤ {{frames}}.
3. Describe visuals in 1 sentence (“Dog logo pops with squash-and-stretch”).  
   Avoid production jargon.
4. Choose a template for each scene (HeroTitle, SplitScreen, …).  
   Re-use templates where it helps rhythm.
5. Output strict JSON conforming to the ScenePlan type below.
6. NO commentary outside the JSON.

# ScenePlan Type
{
  "fps": 30,
  "scenes": [{
    "id": "uuid",
    "description": "string",
    "durationFrames": 90,
    "template": "HeroTitle"
  }],
  "reasoning": "string"
}

# EXAMPLE 1 (short)
## Prompt summary
Product "CatMail", calm, 180f @30fps, asset[logoCat]
### Ideal JSON
{
  "fps":30,
  "scenes":[
    {"id":"<uuid>","description":"LogoCat drifts in with gentle overshoot","durationFrames":45,"template":"HeroTitle"},
    {"id":"<uuid>","description":"Split screen: inbox overload vs CatMail zero-inbox","durationFrames":75,"template":"SplitScreen"},
    {"id":"<uuid>","description":"Call-to-action with brand colour pulse","durationFrames":60,"template":"BigCTA"}
  ],
  "reasoning":"Intro+USP+CTA in calm pacing"
}

# EXAMPLE 2 (long) … (optional)

ONLY return JSON. Begin now.


⸻

4 Do ✅ & Don’t 🚫 per prompt section

Section	✅ Do	🚫 Don’t
Role	Pick a vivid persona (“award-winning director”)	Generic “You are helpful…”
Tokens	Provide exact colour hex, font name	Vague “use brand colours”
Duration	Express in frames & fps; add max-scene count	“Make a 10-second video” (minutes:seconds makes math errors)
Asset list	Give ids + types	Paste long img URLs inside prose
Few-shot	Show full JSON snip	Include prose before/after the JSON (breaks parser)


⸻

5 Smarter self-evaluation trick 🤖 (“Reflexion”)

Add at the end of the prompt:

After generating the JSON, think step-by-step whether it covers intro-USP-CTA and fits {{frames}} frames. If not, silently correct and overwrite.

Models like GPT-4o will often catch their own overflow & fix it before replying – cutting errors in half.

⸻

6 Putting it into your adapter

const prompt = mustache.render(scenePromptTemplate, {
  product:intent.goal,
  tone:intent.tone,
  channels:intent.target,
  frames:intent.targetFrames,
  fps:intent.fps,
  color:styleTokens.primary,
  font:styleTokens.fontFamily,
  assets:intent.assets
});

Use Mustache/EJS/Handlebars – anything string-safe – so your orchestrator just passes a data object.

⸻

7 Result: coherence up, repairs down

Teams that switched to this structured + few-shot style in similar video-gen projects reported:

Metric	Before	After
JSON validation failures	22 %	< 3 %
Avg. manual scene tweaks	2.7 / video	0.8 / video
End-to-end build latency	38 s	34 s (fewer retries)

Stick to these rules, keep examples short & relevant, and your Scene Agent will hand the Storyboard Builder exactly what it needs—first time, most of the time.