# Multi-Scene Template Infrastructure (Sprint 124)

## Current State Review
- **Creation modal** (`CreateTemplateModal`): admin-only but limited to selecting a single scene; `templates.create` mutation expects one `sceneId`.
- **Storage** (`templates` table): stores only one scene's TSX/JS and duration. There is no child table for additional scenes.
- **Application** (`generation.addTemplate`): inserts one new scene into the target project using the provided TSX/JS payload.
- **Visibility**: Templates are filtered by `isActive`/`isOfficial`; there is no concept of multi-scene category or admin-only gallery rows.

This setup blocks turning an entire project (with multiple scenes) into a reusable template and prevents admins from browsing multi-scene starters.

## Requirements (Admin-Only)
1. **Project → Template Export**
   - Admin can select multiple scenes—or choose "Select all" to convert the whole project—when creating a template.
   - Scene ordering, durations, names, and compiled JS must be preserved.

2. **Data Model Enhancements**
   - Add `template_scenes` table storing `{ id, templateId, order, name, description?, duration, tsxCode, jsCode, jsCompiledAt, compilationError, createdAt, updatedAt }`.
   - Extend `templates` table with:
     - `adminOnly boolean DEFAULT false`.
     - `sceneCount integer DEFAULT 1`.
     - `totalDuration integer` (sum of child durations) for quick previews.
   - Keep existing `tsxCode`/`duration` fields populated with the first child scene so single-scene flows keep working.

3. **Creation Pipeline Updates**
   - `templates.create` (adminProcedure) accepts `sceneIds: string[]`.
   - For each selected scene:
     - Clone TSX/JS/duration/order into `template_scenes`.
     - Ensure compiled JS stored; if missing, trigger compilation via `sceneCompiler` before persisting.
   - Persist `sceneCount`, `totalDuration`, and `adminOnly` flag from modal.
   - Retain existing validation (project ownership, admin gating).

4. **Browsing & Category Filter**
   - Add `multi-scene` virtual category. Templates with `sceneCount > 1` belong to it.
   - Only admins see the multi-scene filter pill and any `adminOnly` templates.
   - Non-admins continue to see single-scene templates as today.

5. **Applying Templates**
   - Update `generation.addTemplate`:
     - Accept `{ templateId }` (server fetches child scenes).
     - Sequentially compile and insert each `template_scenes` record into the project, preserving stored order.
     - Return the array of newly created scenes so the client can update Zustand in one shot.
   - Maintain compatibility with registry templates (single-scene inline payload).

6. **Example Seed (Admin Only)**
   - Add a 4-scene "Product Launch Story" template with the following beats:
     1. Hook (hero headline + brand colors).
     2. Problem framing (pain point copy).
     3. Solution walkthrough (UI showcase).
     4. Proof & CTA (testimonial + CTA overlay).
   - Restrict template to admins via `adminOnly` flag so we can iterate safely.

7. **Visibility Guardrails**
   - Creation modal entry points remain admin-only.
   - Template list hides `adminOnly` entries and the multi-scene category for non-admins.
   - Mobile + desktop template panels respect the same gating.

## API Surface Summary
| Endpoint | Change |
| --- | --- |
| `templates.create` | Accept `sceneIds[]`, persist admin-only multi-scene data, return template metadata including `sceneCount` |
| `templates.getAll` | Include `sceneCount`, `totalDuration`, `adminOnly`; filter based on `ctx.session.user.isAdmin` |
| `templates.getWithScenes` (new) | Admin-protected query returning ordered child scenes for preview/editor tooling |
| `generation.addTemplate` | Accept template ID, clone multiple scenes, return array of inserted scenes |

## Frontend Workstream
- **CreateTemplateModal**
  - Replace single-select list with checkbox list + "Select project" shortcut.
  - Display selected count, ordering, and total duration preview.
  - Add `Admin only` toggle surfaced only to admins.

- **TemplatesPanelG/TemplatesPanelMobile**
  - Merge DB metadata for `sceneCount`, `totalDuration`, `adminOnly`.
  - If template is multi-scene, show badge (e.g., `4 scenes · 28s`).
  - Hide multi-scene category/filter for non-admin users.
  - When admin applies template, call new mutation and update VideoState with returned scenes array.

## Risks & Mitigations
- **Migration Safety**: New table + columns require careful Drizzle SQL review. Follow migration guidelines (dev branch, manual SQL verification).
- **Compilation Load**: Applying multi-scene templates triggers multiple compilations; keep server loop sequential with progress logging.
- **State Sync**: Ensure Zustand updates on client can ingest an array of scenes to avoid re-fetch loops.
- **Permission Leakage**: Double-check all UI entry points and API routes use `adminProcedure` / admin checks before exposing multi-scene data.

## Implementation Sequence
1. Schema migrations (`template_scenes`, new columns, defaults).
2. Backend updates (create/get/addTemplate flows + new query).
3. Frontend modal refactor + multi-scene badges/filter + admin gating.
4. Seed 4-scene admin-only template with fixtures.
5. QA checklist (creation, browsing, application, admin visibility) and telemetry updates.

## Next Steps
- Align with user on schema naming & seed template content.
- After approval, implement migrations + backend changes.
- Follow with frontend work and seed data, then validate end-to-end.


## Implementation Notes (2025-09-29)
- Added `template_scene` table with per-scene TSX/JS, duration, and order data plus `adminOnly/sceneCount/totalDuration` columns on `templates`.
- `templates.create` now accepts multiple scene IDs, persists them inside a transaction, and records the first scene's TSX/JS for backwards compatibility.
- `templates.getAll` filters admin-only and multi-scene entries unless the requester is an admin; new `templates.getWithScenes` returns ordered child scenes.
- `generation.addTemplate` supports multi-scene cloning, compiles each scene sequentially, enforces admin-only gating, and returns an array of created scenes.
- Desktop + mobile template panels expose an admin-only `Multi-scene` filter, show scene-count/duration badges, and batch update Zustand with the returned scenes.
- Admins can select multiple scenes in `CreateTemplateModal`, toggle admin-only visibility, and see duration summaries before saving.
- Added `scripts/seed-admin-multiscene-template.ts` and `npm run seed:multi-template` to seed a four-scene OrbitFlow demo template (admin-only).
