// src/app/projects/[id]/edit/panels/UploadsPanel.tsx
"use client";

import FilesPanel from './FilesPanel';

interface UploadsPanelProps {
  projectId: string;
}

// UploadsPanel is a specialized version of FilesPanel that automatically opens the uploads tab
export default function UploadsPanel({ projectId }: UploadsPanelProps) {
  return (
    <FilesPanel 
      currentProjectId={projectId}
      initialTab="uploads"
    />
  );
} 