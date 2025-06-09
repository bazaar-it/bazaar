// src/hooks/useTimelineValidation.ts
"use client";

import type { TimelineItemUnion } from '~/lib/types/video/timeline';

// Mirror server-side Zod rules from inputPropsSchema:
const MIN_DURATION = 1;
const MIN_START = 0;

/**
 * Validate that a duration (in frames) is an integer within [MIN_DURATION, maxDuration]
 */
export function validateDuration(
  duration: number,
  maxDuration: number
): boolean {
  return (
    Number.isInteger(duration) &&
    duration >= MIN_DURATION &&
    duration <= maxDuration
  );
}

/**
 * Validate that row index is within [0, maxRows)
 */
export function validateRow(
  row: number,
  maxRows: number
): boolean {
  return Number.isInteger(row) && row >= 0 && row < maxRows;
}

/**
 * Validate that start frame is an integer within [MIN_START, maxDuration - duration]
 */
export function validateStart(
  start: number,
  duration: number,
  maxDuration: number
): boolean {
  return (
    Number.isInteger(start) &&
    start >= MIN_START &&
    start + duration <= maxDuration
  );
}

/**
 * Ensure newItem does not overlap existing items on the same row
 */
export function validateOverlap(
  items: TimelineItemUnion[],
  newItem: TimelineItemUnion
): boolean {
  return items.every(item => {
    if (item.id === newItem.id) return true;
    if (item.row !== newItem.row) return true;
    const newStart = newItem.from;
    const newEnd = newItem.from + newItem.durationInFrames;
    const oldStart = item.from;
    const oldEnd = item.from + item.durationInFrames;
    return newEnd <= oldStart || newStart >= oldEnd;
  });
}
