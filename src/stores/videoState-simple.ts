import { create } from 'zustand';
import { VideoProject, SceneDescription } from '~/lib/types';
import { randomUUID } from 'crypto';

interface VideoState {
  projects: Record<string, VideoProject>;
  selectedSceneId: string | null;
  selectedProjectId: string | null;

  // Direct update methods - no complex refresh mechanisms
  setProject: (projectId: string, project: VideoProject) => void;
  updateScene: (projectId: string, sceneId: string, scene: Partial<SceneDescription>) => void;
  addScene: (projectId: string, scene: SceneDescription) => void;
  deleteScene: (projectId: string, sceneId: string) => void;
  setSelectedScene: (sceneId: string | null) => void;
  setSelectedProject: (projectId: string | null) => void;
  updateProject: (projectId: string, updates: Partial<VideoProject>) => void;
}

export const useVideoState = create<VideoState>((set) => ({
  projects: {},
  selectedSceneId: null,
  selectedProjectId: null,

  // Simple, direct project setter
  setProject: (projectId: string, project: VideoProject) => {
    console.log('[VideoState-Simple] Setting project:', projectId);
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: project
      }
    }));
  },

  // Direct scene update - trust the data from backend
  updateScene: (projectId: string, sceneId: string, updatedScene: Partial<SceneDescription>) => {
    console.log('[VideoState-Simple] Updating scene:', sceneId);
    set((state) => {
      const project = state.projects[projectId];
      if (!project?.props?.scenes) return state;

      const sceneIndex = project.props.scenes.findIndex(s => s.id === sceneId);
      if (sceneIndex === -1) return state;

      // Update the scene directly
      const newScenes = [...project.props.scenes];
      newScenes[sceneIndex] = {
        ...newScenes[sceneIndex],
        ...updatedScene
      };

      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            props: {
              ...project.props,
              scenes: newScenes
            }
          }
        }
      };
    });
  },

  // Add new scene
  addScene: (projectId: string, scene: SceneDescription) => {
    console.log('[VideoState-Simple] Adding scene:', scene.id);
    set((state) => {
      const project = state.projects[projectId];
      if (!project?.props) return state;

      const scenes = project.props.scenes || [];
      
      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            props: {
              ...project.props,
              scenes: [...scenes, scene],
              durationInFrames: scenes.reduce((sum, s) => sum + (s.duration || 0), 0) + (scene.duration || 0)
            }
          }
        }
      };
    });
  },

  // Delete scene
  deleteScene: (projectId: string, sceneId: string) => {
    console.log('[VideoState-Simple] Deleting scene:', sceneId);
    set((state) => {
      const project = state.projects[projectId];
      if (!project?.props?.scenes) return state;

      const newScenes = project.props.scenes.filter(s => s.id !== sceneId);
      
      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            props: {
              ...project.props,
              scenes: newScenes,
              durationInFrames: newScenes.reduce((sum, s) => sum + (s.duration || 0), 0)
            }
          }
        }
      };
    });
  },

  // Selection management
  setSelectedScene: (sceneId: string | null) => {
    set({ selectedSceneId: sceneId });
  },

  setSelectedProject: (projectId: string | null) => {
    set({ selectedProjectId: projectId });
  },

  // Update project metadata
  updateProject: (projectId: string, updates: Partial<VideoProject>) => {
    set((state) => {
      const project = state.projects[projectId];
      if (!project) return state;

      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...project,
            ...updates
          }
        }
      };
    });
  }
}));

// Simple selectors
export const getProject = (projectId: string) => 
  useVideoState.getState().projects[projectId];

export const getScene = (projectId: string, sceneId: string) => {
  const project = getProject(projectId);
  return project?.props?.scenes?.find(s => s.id === sceneId);
};

export const getScenes = (projectId: string) => {
  const project = getProject(projectId);
  return project?.props?.scenes || [];
};