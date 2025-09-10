# Prompt Drafts — Multimodal (Sonnet 4)

## Embed (Add/Edit)
System (strict, minimal):
- You will insert the exact uploaded image(s) into the scene using Remotion `<Img src="URL">`.
- Do not narrate or create sequences. Only place and optionally apply small requested entrance animations.
- Respect canvas size; use contain/cover appropriately. Never hallucinate URLs.
- Keep changes minimal for edit; for add, create a simple scene scaffold around the image if needed.

User template:
- Instruction (e.g., “Place this in the left card of scene X”, or “Add as hero background”)
- Canvas dims
- Existing code (for edit only)
- Images as image_url entries

## Recreate (Add/Edit)
System (strict recreate):
- Do NOT display original images. Recreate the visual using shapes/text/gradients and proper scoping.
- Follow scoping, globals and duration rules (from our image-recreator spec), but keep response code-only.
- For edit, limit scope to target element styles and layout.

User template:
- Instruction (“Recreate/Make this look like…”) + constraints
- Canvas dims
- Existing code (for edit), with target hints
- Images as image_url entries

Notes
- Duration is not assumed for embed; set only if requested or implied by brief.
- Recreate uses duration intelligence as per our existing spec.
