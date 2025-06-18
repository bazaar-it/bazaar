import { db } from "~/server/db";
import { metrics } from "~/server/db/schema";

/**
 * Record a metric with the given name, value, and optional tags
 * 
 * @param name Metric name (e.g., 'component_build_duration_ms')
 * @param value Numeric value for the metric
 * @param tags Optional key-value pairs to categorize the metric
 */
export async function recordMetric(
  name: string, 
  value: number, 
  tags?: Record<string, string>
): Promise<void> {
  try {
    await db.insert(metrics).values({
      name,
      value,
      tags,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error(`Error recording metric ${name}:`, error);
    // Don't throw - metrics should never break the main application flow
  }
}

/**
 * Measure the execution time of a function and record it as a metric
 * 
 * @param name Metric name prefix (will append '_duration_ms')
 * @param fn Function to measure
 * @param tags Optional tags to include with the metric
 * @returns The result of the function
 */
export async function measureDuration<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = performance.now();
  let success = false;
  
  try {
    const result = await fn();
    success = true;
    return result;
  } finally {
    const duration = performance.now() - start;
    await recordMetric(
      `${name}_duration_ms`,
      duration,
      { ...tags, success: success ? "true" : "false" }
    );
  }
}
