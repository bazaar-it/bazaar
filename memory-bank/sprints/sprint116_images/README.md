# Sprint 116 — Images (First Principles Plan)

Objective: Remove the separate “image recreator” path and design a single, clear, multimodal image workflow baked into add/edit, powered by Sonnet 4 (multimodal) and lightweight, always-on media metadata. No “storytelling” for embed; deterministic behavior for embed vs recreate across add/edit, including multi‑image prompts.

Contents:
- use-cases.md — Exhaustive use cases (add/edit × embed/recreate; single/multi-image)
- design.md — Architecture, data contracts, decision tree, tool I/O
- prompt-drafts.md — Minimal, robust multimodal prompts (embed vs recreate)
- TODO.md — Concrete implementation tasks
- progress.md — Running log

---

Key Principles
- Single brain, fewer tools: Brain decides action; Sonnet 4 does the heavy multimodal lifting.
- Intent is explicit: Brain returns `imageAction` per asset (embed or recreate) and target scene/element for edits.
- Upload-time metadata: Cheap, async analysis tags every asset for durable semantics (logo/ui/photo/colors/text).
- Deterministic over clever: No “sequential storytelling” for embed; recreate means reference-only code, embed means exact <Img> placement.
- First-class multi-image: Per-asset directives so one image can be recreated while another is embedded in the same request.

Deliverables
- Removal plan for the legacy image tool (soft-deprecated already)
- Add/Edit tool paths that branch on `imageAction`
- Multimodal prompt specs that are short, strict, and resilient
- Evaluations for typical and edge workflows

---

Current Status (WIP)
- Brain now emits `imageAction` (embed|recreate); prompt updated to stop recommending a separate image tool.
- AddTool image path uses modular prompts (technical base + embed/recreate modes). Embed is minimal; recreate is reference-only.
- EditTool prepends technical base + mode; branching logic for actual insert vs style transfer is the next implementation step.
- Upload route triggers MediaMetadataService (async) to tag assets (kind/layout/colors/hasText/hints) without blocking prompts.
- Planner flow adjusted to call AddTool with `imageAction: 'recreate'` instead of the legacy tool.
- Hard-deletion of the legacy image tool/prompt and type cleanup are planned in TODO.
