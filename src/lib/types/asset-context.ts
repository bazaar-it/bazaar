/**
 * Asset Context Types
 * Part of Sprint 81: Context Engineering
 * 
 * These types define the structure for deterministic asset handling
 * to prevent hallucinated placeholders and ensure asset persistence
 */

export interface Asset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'logo';
  dimensions?: { width: number; height: number };
  fileSize: number;
  originalName: string;
  customName?: string;  // User-defined name for easier reference
  referenceNames?: string[];  // Alternative names for matching
  hash?: string;
  tags?: string[];
  uploadedAt: Date;
  usageCount: number;
}

export interface AssetContext {
  projectId: string;
  assets: Asset[];
  logos: Asset[];  // Quick access to logo assets
  recent: Asset[]; // Last 5 uploaded assets
}

export interface AssetMemoryValue {
  asset: Asset;
  metadata?: {
    isLogo?: boolean;
    dominantColors?: string[];
    detectedObjects?: string[];
  };
}

// For validation
export interface AssetValidationResult {
  valid: boolean;
  errors: string[];
  suggestions?: string[];
}