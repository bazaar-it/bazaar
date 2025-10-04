# Story-Centric Template Metadata Enhancements

**Date:** 2025-10-04  
**Context:** After drafting metadata for the first ~30 single-scene templates, we need richer structure so the story planner can assemble coherent arcs (hook → problem → proof → solution → CTA) without hand-tuned rules.

---

## Pain Points Observed
- `categories` / `styles` / `useCases` are freeform strings, so planners cant distinguish `hero` vs `problem` scenes reliably.
- `editability` holds slot names but not structural constraints (e.g., “requires exactly 4 words”, “palette locked”). That info lives in `notes`.
- Template slots arent tagged with narrative roles (`headline`, `stat`, `cta`), so injecting brand copy into the right surfaces requires manual mapping.
- Asset requirements (`requiresExactAssets`) only capture Iconify glyphs; we lack a systematic way to describe logos, masks, or whether replacements are allowed.

## Proposed Schema Extensions

### 1. Normalize Slot Metadata
- Replace `editableTextSlots`, `editableNumericSlots`, etc. with a single `slots: SlotDefinition[]` array.
- **SlotDefinition**
  ```ts
  interface SlotDefinition {
    id: string;
    type: 'text' | 'longText' | 'number' | 'currency' | 'image' | 'icon' | 'color' | 'boolean';
    role: 'headline' | 'subheadline' | 'stat' | 'problem' | 'solution' | 'cta' | 'testimonial' | 'supporting' | 'logo' | 'media' | 'decorative';
    required: boolean;
    editable: boolean; // false if locked (e.g., platform shells)
    limits?: {
      maxChars?: number;
      minChars?: number;
      fixedCount?: number; // e.g., must provide exactly 4 words
      min?: number;
      max?: number;
      aspectRatio?: string;
    };
    defaultValue?: string | number | boolean;
    notes?: string;
  }
  ```
- Benefits: planners/editors can target slots by semantic role rather than positional ids (`word1`).

### 2. Structured Editability & Constraints
- Introduce `constraints` block for template-wide guardrails:
  ```ts
  interface TemplateConstraints {
    paletteLocked?: boolean;
    maxWords?: number;
    minWords?: number;
    requiresExactSequence?: boolean; // e.g., fixed number of tokens
    timingLocks?: string[]; // ['typewriter', 'ripple']
    platformShell?: boolean; // true for X, LinkedIn, NVIDIA, etc.
  }
  ```
- Promotes “notes” to machine-readable rules so validators and planners can enforce them.

### 3. Story Profile Metadata
Add a dedicated block describing narrative intent:
```ts
interface StoryProfile {
  arcRoles: Array<'hook' | 'problem' | 'solution' | 'benefit' | 'proof' | 'cta' | 'brand_shell' | 'transition' | 'intro' | 'outro'>;
  mood?: 'uplifting' | 'urgent' | 'calm' | 'trustworthy' | 'playful' | 'serious';
  contentType: 'headline' | 'paragraph' | 'statistic' | 'testimonial' | 'cta' | 'logo_reveal' | 'media_callout';
  beatHints?: string[]; // e.g., ['best_before_solution']
  pairsWith?: string[]; // arc roles this template flows well after/before
  priority?: number; // weighting when multiple templates satisfy same arc slot
}
```
- Each scene (for multi-scene templates) should inherit or override `storyProfile` so we can mix single- and multi-scene assets interchangeably.

### 4. Controlled Taxonomy
- Convert `categories`, `styles`, `useCases` into enums or reference lists. Example:
  ```ts
  type Category = 'text' | 'ui' | 'logo' | 'animation' | 'multi-scene' | 'hero' | 'quote' | 'stat';
  type Style = 'modern' | 'minimal' | 'gradient' | 'dark' | 'light' | 'platform';
  type UseCase = 'hero' | 'problem' | 'solution' | 'testimonial' | 'cta' | 'social' | 'metric';
  ```
- Prevents “hero scene” vs “hero” duplicates and enables reliable filtering.

### 5. Asset Requirements
- Expand asset metadata beyond Iconify ids:
  ```ts
  interface AssetRequirement {
    id: string; // e.g., 'logos:nvidia'
    type: 'icon' | 'image' | 'video' | 'font';
    required: boolean;
    replaceable: boolean;
    source?: 'iconify' | 'r2' | 'cdn';
  }
  ```
- Allows planners to ensure required brand assets exist before slotting a template; also clarifies when replacements are forbidden.

### 6. Compatibility & Formats
- Add `supports` section to capture layout constraints:
  ```ts
  interface TemplateSupports {
    formats: Array<'landscape' | 'portrait' | 'square'>;
    aspectRatios?: string[];
    recommendedBeats?: Array<'intro' | 'mid' | 'closing'>;
    notAfter?: string[]; // arc roles or template ids this shouldn't follow
  }
  ```

---

## Next Steps
1. **Schema Spec** – Draft TypeScript interfaces reflecting the above and circulate for review (target: tomorrows session).
2. **Backfill Fields** – Update existing JSON drafts to include `storyProfile`, normalized slots, constraints, and asset requirements.
3. **Taxonomy Dictionary** – Define approved values for `category`/`style`/`useCase` before we migrate data to DB.
4. **Planner Integration** – Modify the story planner to score templates based on `storyProfile.arcRoles`, mood, and compatibility hints once the data is populated.
5. **Validator** – Build a lint script ensuring every official template defines the required fields (no missing semantics before migrations).

With these enhancements, the metadata will support cohesive story assembly, reliable guardrails, and scalable curation for future multi-scene paths.
