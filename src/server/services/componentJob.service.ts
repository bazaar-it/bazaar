// src/server/services/componentJob.service.ts
import { db } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export async function saveCheckpoint(jobId: string, data: unknown, lastStep?: string) {
  await db
    .update(customComponentJobs)
    .set({ checkpointData: data as any, lastStep })
    .where(eq(customComponentJobs.id, jobId));
}

export async function loadCheckpoint(jobId: string) {
  const job = await db.query.customComponentJobs.findFirst({
    where: eq(customComponentJobs.id, jobId),
  });
  return job?.checkpointData ?? null;
}
