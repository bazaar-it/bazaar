// src/lib/services/mcp-tools/scene-tools.ts
// -----------------------------------------------------------------------------
// Scene‑level MCP tools for Bazaar‑Vid
// -----------------------------------------------------------------------------
// These four tools – addScene, editScene, deleteScene, askSpecify – encapsulate
// ALL storyboard‑mutation intents that the Brain LLM may need when orchestrating
// a video project.  Each tool follows the standard MCP pattern used elsewhere
// in the codebase: Zod‑validated input/output, typed wrapper with the generic
// makeMcpTool<TIn, TOut>() helper, and a thin service layer that defers to a
// domain‑specific “scene service”.  The implementation here is scaffolding –
// the TODO blocks should be filled in by dedicated agents once the domain logic
// is ready (e.g. scene synthesis, natural‑language diffing, etc.).
// -----------------------------------------------------------------------------
// design goals
// -----------------------------------------------------------------------------
// 1. *Single responsibility*.  Each tool performs exactly one mutation.
// 2. *Deterministic contracts*.  Every output is machine‑readable so downstream
//    steps (code generation, renderer) can trust the shape.
// 3. *Incremental*.  Complex changes (e.g. editing existing scene) return a
//    minimal *patch* rather than re‑posting the full storyboard.
// 4. *LLM‑friendly*.  Field descriptions guide the Brain LLM when serialising
//    JSON.
// -----------------------------------------------------------------------------

import { z } from "zod";
import {
  makeMcpTool,
  MCPResult,
  success,
  failure,
} from "~/lib/services/mcp-tools/base";

// -----------------------------------------------------------------------------
// Re‑usable atoms
// -----------------------------------------------------------------------------

export const SceneIdSchema = z.string().uuid().describe("UUID of a scene");

// The *minimal* spec for a scene.  We deliberately keep it coarse – the actual
// component tree is generated later by the Component Generator.
export const SceneSpecSchema = z.object({
  /** Ordered list of Remotion component identifiers (e.g. "Title", "ImageGrid") */
  components: z.array(z.string()).min(1),
  /** Arbitrary key‑value map of design tokens (Tailwind classes, etc.) */
  style: z.record(z.any()).optional(),
  /** Text blocks to render; order matters */
  text: z.array(z.string()).optional(),
  /** High‑level motion descriptors (used by Motion Agent later) */
  motions: z
    .array(
      z.object({
        target: z.string().describe("Component key or global"),
        type: z.string().describe("e.g. fadeIn, slideUp"),
        at: z.string().describe("CSS‑like time expression, e.g. '0.5s'"),
        duration: z.string().optional(),
      })
    )
    .optional(),
});

// -----------------------------------------------------------------------------
// 1. addScene
// -----------------------------------------------------------------------------

const addSceneInput = z.object({
  /** Bazaar project / session ID so the service can persist the scene */
  sessionId: z.string(),
  /** Raw user prompt that triggered the add */
  userPrompt: z.string(),
  /** Optional context blob packed by the Brain LLM */
  userContext: z.record(z.any()).optional(),
});

const addSceneOutput = z.object({
  sceneId: SceneIdSchema,
  sceneSpec: SceneSpecSchema,
});

type AddSceneInput = z.infer<typeof addSceneInput>;
type AddSceneOutput = z.infer<typeof addSceneOutput>;

export const addSceneTool = makeMcpTool<AddSceneInput, AddSceneOutput>({
  name: "add_scene",
  description:
    "Create a brand‑new scene from a raw user prompt and optional context.",
  inputSchema: addSceneInput,
  outputSchema: addSceneOutput,
  async run({ input, logger }): Promise<MCPResult<AddSceneOutput>> {
    try {
      // TODO: Replace with actual domain service call
      const sceneId = crypto.randomUUID();
      const sceneSpec: z.infer<typeof SceneSpecSchema> = {
        components: ["HeroTitle"],
        text: [input.userPrompt],
      };

      // TODO: persist to DB if needed

      return success({ sceneId, sceneSpec });
    } catch (err) {
      logger.error("add_scene failed", err);
      return failure("INTERNAL_ERROR", (err as Error).message);
    }
  },
});

// -----------------------------------------------------------------------------
// 2. editScene – returns a PATCH object describing the change
// -----------------------------------------------------------------------------

const editSceneInput = z.object({
  sessionId: z.string(),
  sceneId: SceneIdSchema,
  userPrompt: z.string(),
  userContext: z.record(z.any()).optional(),
});

const editSceneOutput = z.object({
  sceneId: SceneIdSchema,
  patch: SceneSpecSchema.partial(),
});

type EditSceneInput = z.infer<typeof editSceneInput>;
type EditSceneOutput = z.infer<typeof editSceneOutput>;

export const editSceneTool = makeMcpTool<EditSceneInput, EditSceneOutput>({
  name: "edit_scene",
  description:
    "Modify an existing scene.  Returns only the fields that changed (patch).",
  inputSchema: editSceneInput,
  outputSchema: editSceneOutput,
  async run({ input, logger }): Promise<MCPResult<EditSceneOutput>> {
    try {
      // TODO: fancy diffing based on NL → patch generation
      const patch: EditSceneOutput["patch"] = {
        text: [input.userPrompt],
      };

      // TODO: persist patch to DB

      return success({ sceneId: input.sceneId, patch });
    } catch (err) {
      logger.error("edit_scene failed", err);
      return failure("INTERNAL_ERROR", (err as Error).message);
    }
  },
});

// -----------------------------------------------------------------------------
// 3. deleteScene – trivial metadata mutation
// -----------------------------------------------------------------------------

const deleteSceneInput = z.object({
  sessionId: z.string(),
  sceneId: SceneIdSchema,
});

const deleteSceneOutput = z.object({
  sceneId: SceneIdSchema,
  status: z.literal("DELETED"),
});

type DeleteSceneInput = z.infer<typeof deleteSceneInput>;
type DeleteSceneOutput = z.infer<typeof deleteSceneOutput>;

export const deleteSceneTool = makeMcpTool<DeleteSceneInput, DeleteSceneOutput>({
  name: "delete_scene",
  description: "Remove a scene from the storyboard by ID.",
  inputSchema: deleteSceneInput,
  outputSchema: deleteSceneOutput,
  async run({ input, logger }): Promise<MCPResult<DeleteSceneOutput>> {
    try {
      // TODO: soft‑delete in DB (keep ordering stable)

      return success({ sceneId: input.sceneId, status: "DELETED" });
    } catch (err) {
      logger.error("delete_scene failed", err);
      return failure("INTERNAL_ERROR", (err as Error).message);
    }
  },
});

// -----------------------------------------------------------------------------
// 4. askSpecify – conversational helper, not a mutation
// -----------------------------------------------------------------------------
// This tool is special: It *returns a follow‑up question* that the Brain LLM
// should send back to the user, then await the user’s answer before continuing.
// It exists mainly to keep the orchestration logic symmetric (everything is a
// tool), and to record that the agent requested clarification.

const askSpecifyInput = z.object({
  sessionId: z.string(),
  /** Natural‑language question the LLM wants to ask (may be overridden) */
  draftQuestion: z.string(),
});

const askSpecifyOutput = z.object({
  question: z.string(),
});

type AskSpecifyInput = z.infer<typeof askSpecifyInput>;
type AskSpecifyOutput = z.infer<typeof askSpecifyOutput>;

export const askSpecifyTool = makeMcpTool<AskSpecifyInput, AskSpecifyOutput>({
  name: "ask_specify",
  description:
    "Ask the user a clarifying question when the instruction is ambiguous.",
  inputSchema: askSpecifyInput,
  outputSchema: askSpecifyOutput,
  async run({ input }): Promise<MCPResult<AskSpecifyOutput>> {
    // Right now it’s pass‑through; we could enrich, translate, etc.
    return success({ question: input.draftQuestion });
  },
});

// -----------------------------------------------------------------------------
// Register all scene tools for auto‑discovery (optional convenience)
// -----------------------------------------------------------------------------

export const sceneTools = [
  addSceneTool,
  editSceneTool,
  deleteSceneTool,
  askSpecifyTool,
];
