/**
 * RFC-6902 JSON-Patch operation list – the subset we care about for MVP.
 * Later you can switch to `import { Operation } from "fast-json-patch"`
 * if you install that lib, the shape is identical.
 */
import { z } from "zod";

// Based on RFC 6902 JSON Patch standard
export const operationSchema = z.object({
  op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
  path: z.string().startsWith("/"),
  value: z.unknown().optional(),
  from: z.string().startsWith("/").optional(),
});

export const jsonPatchSchema = z.array(operationSchema);

export type JsonPatchOperation = z.infer<typeof operationSchema>;
export type JsonPatch = z.infer<typeof jsonPatchSchema>;