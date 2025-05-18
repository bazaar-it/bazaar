// src/lib/services/mcp-tools/log-agent.ts

import { env } from "../../../env.js";
import { z } from "zod";
import ky from "ky";

const BASE = env.LOG_AGENT_URL;

/* ------------------------------------------------------------------ *
 *  log_query  – Ask the Log Agent a question about recent logs
 * ------------------------------------------------------------------ */
export const logQueryTool = {
  name: "log_query",
  description:
    "Natural-language query over the latest Bazaar-Vid logs (via Log Agent).",
  inputSchema: z.object({
    runId: z.string().optional().describe("Defaults to 'latest'"),
    question: z.string().min(5, "Ask a real question 😄")
  }),
  outputSchema: z.object({
    answer: z.string()
  }),
  /** @tool log_query */
  execute: async ({ runId = "latest", question }: { runId?: string; question: string }) => {
    try {
      const res: { answer: string } = await ky
        .post(`${BASE}/qna`, { json: { runId, query: question } })
        .json();
      return res;
    } catch (error) {
      console.error("Error querying logs:", error);
      return { answer: `Failed to query logs: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
};

/* ------------------------------------------------------------------ *
 *  log_clear – Flush logs / start fresh RunId
 * ------------------------------------------------------------------ */
export const logClearTool = {
  name: "log_clear",
  description: "Clear Redis logs and start a new run (returns new runId).",
  inputSchema: z.object({
    callbackUrl: z.string().url().optional()
  }),
  outputSchema: z.object({
    runId: z.string()
  }),
  /** @tool log_clear */
  execute: async ({ callbackUrl }: { callbackUrl?: string }) => {
    try {
      return await ky.post(`${BASE}/control/clear`, { json: { callbackUrl } }).json();
    } catch (error) {
      console.error("Error clearing logs:", error);
      throw new Error(`Failed to clear logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/* ------------------------------------------------------------------ *
 *  log_issues – List detected issues for current run
 * ------------------------------------------------------------------ */
export const logIssuesTool = {
  name: "log_issues",
  description: "Structured list of deduped issues the Log Agent has found.",
  inputSchema: z.object({
    runId: z.string().optional()
  }),
  outputSchema: z.object({
    issues: z.array(
      z.object({
        fingerprint: z.string(),
        count: z.number(),
        message: z.string()
      })
    )
  }),
  /** @tool log_issues */
  execute: async ({ runId = "latest" }: { runId?: string }) => {
    try {
      return await ky.get(`${BASE}/issues`, { searchParams: { runId } }).json();
    } catch (error) {
      console.error("Error fetching issues:", error);
      return { issues: [] };
    }
  }
};
