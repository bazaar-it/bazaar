// src/config/feedbackFeatures.ts
export interface FeedbackFeatureOption {
  id: string;
  label: string;
  description?: string; // Optional: for tooltips or more info
}

export const feedbackFeatureOptions: FeedbackFeatureOption[] = [
  { id: 'github_integration', label: 'GitHub Integration (better code analysis)' },
  { id: 'mp4_export', label: 'MP4 Export Functionality' },
  { id: 'image_upload', label: 'Image Upload and Rendering' },
  { id: 'animation_templates', label: 'Enhanced Animation Templates' },
  { id: 'hubspot_integration', label: 'HubSpot Integration' },
  // Add more features here as they become relevant for feedback
];
