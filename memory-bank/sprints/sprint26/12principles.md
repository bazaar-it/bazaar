Below is a self-contained reference you can drop into docs/animation/12-principles.md.
It explains every principle, shows how to recognise (and test for) it in motion-graphics code, and lists concrete Do / Don’t guidelines you can wire into prompts or QA rubrics.

⸻

TL;DR — why the 12 principles still matter

Disney’s Illusion of Life (1981) distilled decades of hand-drawn craft into twelve heuristics that make motion feel believable, readable and appealing. Modern motion-graphics frameworks—whether key-frame curves in After Effects or code-driven systems like Remotion—still succeed or flop based on the same ideas. Each principle below is framed with:
	•	Definition – what the principle achieves.
	•	Modern example – gif/UX pattern or CSS/Remotion snippet.
	•	Do / Don’t – quick rules you can codify in LLM prompts or automated lint checks.
	•	Quick test – heuristics you can bake into a vision rubric or JS unit test.

⸻

1 · Squash & Stretch

What / Why

Changing an object’s volume-preserving shape on impact or acceleration sells weight and elasticity.  ￼

Code cue

spring({ fps, frame, damping: 10, mass: 0.2 })   // then scaleX / scaleY oppositely

✔︎ Do
	•	Exaggerate first pass; dial back later.
	•	Tie stretch factor to velocity (v/fps).

✖︎ Don’t
	•	Change volume (scale x and y) unless it’s a balloon.
	•	Apply on every frame—reserve for impacts.

Quick test

Vision rubric: “Does the object’s longer axis align with motion on impact?” rate 1-5.

⸻

2 · Anticipation

Pre-movement signals the direction or action to come, priming the viewer’s brain  ￼.
Pattern: 6-12 frames of reverse motion or hold before the main action.

⸻

3 · Staging

Clear presentation of the idea; one focal point, readable silhouette  ￼.

Do:
	•	Use contrast (size, colour) to isolate the hero element.
	•	Fade or blur background props during key actions.

Don’t:
	•	Let multiple elements compete for attention in the same beat.

⸻

4 · Straight-Ahead vs Pose-to-Pose
	•	Straight-ahead: simulate chaos (fire, hair) frame-by-frame.
	•	Pose-to-pose: plan key poses, let in-betweens ease between them  ￼.

Remotion tip: keep key-poses in a JSON array and let interpolate() fill frames.

⸻

5 · Follow-Through & Overlapping Action

Bodies don’t stop on a dime; secondary parts arrive later (coat tails, dog ears)  ￼.

Do:
	•	Offset child layers by 3-8 frames (frame - offset).
	•	Lower damping for secondary spring() calls.

⸻

6 · Slow-In & Slow-Out (Ease)

Most motion starts + ends gently; linear looks robotic  ￼.

Use cubic-bezier(0.4, 0, 0.2, 1) for “standard material ease”.

⸻

7 · Arcs

Natural limbs move along curves, not straight lines  ￼.
Test: sample the centre-of-mass path; deviation from fitted circle < 15 px over 720p frame.

⸻

8 · Secondary Action

Adds richness without stealing focus (hair flip during jump)  ￼.
Rule: secondary amplitude ≤ 25 % of primary.

⸻

9 · Timing (Frames & Spacing)

Number of frames = perceived mass + emotion  ￼.
Heavy object drop: fewer frames, but closer spacing near impact.

⸻

10 · Exaggeration

Push posing / timing 110–150 % then retreat ~20 % for realism  ￼.

⸻

11 · Solid Drawing (a.k.a. Solid Posing in 3-D & UI)

Maintain perspective, volumes, weight through poses  ￼.
In vector / CSS: keep stroke widths constant with scale-compensation.

⸻

12 · Appeal

Design choices that make a scene watchable and charismatic  ￼.
Checklist: clear proportions, asymmetry, rhythm, enough negative space.

⸻

Putting it to work in code-gen

Prompt token	Maps to principle	Guard-rail test
“rubber-band bounce”	Squash & Stretch + Slow-Out	peak scaleX ≈ 1.3, scaleY ≈ 0.7
“windswept hair”	Follow-Through & Overlap	child layer delay > 3 frames
“hero focus”	Staging	non-hero layers opacity < 0.3 during action

Automate these tests in a Remotion server-render pass; fail builds scoring < 3 on any mandatory principle using the GPT-Vision rubric for subjective checks.

⸻

Sources consulted
	1.	Wikipedia – canonical summaries of all 12 principles  ￼ ￼ ￼ ￼ ￼ ￼ ￼
	2.	Pluralsight Animation Guide – modern motion-graphics examples  ￼
	3.	Envato Tuts+ – practical dos/don’ts for UX micro-interactions  ￼
	4.	Animation Mentor blog – Appeal deep-dive  ￼
	5.	Toon Boom Learn Portal – Secondary Action tutorial  ￼
	6.	Pixune Studios – Solid Drawing for digital rigs  ￼

(additional sources shown inline)