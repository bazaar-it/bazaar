"use client";

import FilesPanel from './FilesPanel';

// Define the project interface to match what's coming from the database
interface ProjectData {
  id: string;
  name?: string;
  title?: string;
  [key: string]: any; // For other properties
}

interface ProjectsPanelProps {
  projects?: ProjectData[];
  currentProjectId?: string;
}

// ProjectsPanel is a specialized version of FilesPanel that only shows the projects tab
export default function ProjectsPanel({ projects = [], currentProjectId }: ProjectsPanelProps) {
  // Transform projects to match FileItem format if they're not already in that format
  const adaptedProjects = projects.map(project => ({
    id: project.id,
    name: project.name || project.title || "Untitled Project",
    type: 'project' as const,
    isActive: project.id === currentProjectId
  }));

  return (
    <FilesPanel 
      projects={adaptedProjects} 
      currentProjectId={currentProjectId}
    />
  );
} 