/**
 * RFC-6902 JSON-Patch operation list – the subset we care about for MVP.
 * Later you can switch to `import { Operation } from "fast-json-patch"`
 * if you install that lib, the shape is identical.
 */
export type JsonPatch = Array<{
    op: "add" | "remove" | "replace" | "move" | "copy" | "test";
    path: string;
    from?: string;        // only for "move" & "copy"
    value?: unknown;      // not present for "remove"
  }>;