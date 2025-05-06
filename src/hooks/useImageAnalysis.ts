// src/hooks/useImageAnalysis.ts
"use client";

/**
 * Hook to analyze an image and return tags.
 * Stub implementation: resolves to an empty list after a delay.
 */
export function useImageAnalysis() {
  const analyzeImage = async (url: string): Promise<string[]> => {
    // TODO: integrate vision API for real analysis
    return new Promise(resolve => setTimeout(() => resolve([]), 1000));
  };
  return { analyzeImage };
}
