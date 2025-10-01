import { useVideoState } from "~/stores/videoState";
import { api } from "~/trpc/react";
import { analytics } from "~/lib/utils/analytics";

export type SceneSyncUtils = ReturnType<typeof api.useUtils>;

interface BaseSyncContext {
  projectId: string;
  utils: SceneSyncUtils;
  source?: string;
  projectRevision?: number;
}

interface ScenePayload {
  id: string;
  name?: string | null;
  duration?: number | null;
  order?: number | null;
  tsxCode?: string | null;
  jsCode?: string | null;
  props?: unknown;
  layoutJson?: unknown;
  revision?: number | null;
  projectRevision?: number | null;
  [key: string]: unknown;
}

function log(operation: string, projectId: string, sceneId?: string, extra?: Record<string, unknown>) {
  console.log(`[SceneSync] ${operation}`, {
    projectId,
    sceneId,
    ...extra,
  });
}

function applyProjectRevision(projectId: string, revision?: number) {
  if (typeof revision !== 'number') return;
  const { setProjectRevision } = useVideoState.getState();
  setProjectRevision(projectId, revision);
}

function track(operation: string, status: 'success' | 'failure', projectId: string, source?: string, durationMs?: number, error?: unknown) {
  if (typeof window === 'undefined') return;
  const context: Record<string, unknown> = {
    operation,
    status,
    project_id: projectId,
  };
  if (source) context.source = source;
  if (typeof durationMs === 'number') context.duration_ms = Math.round(durationMs);
  if (error instanceof Error) context.error = error.message;
  analytics.featureUsed('scene_sync', context);
}

function refreshPreview(projectId: string) {
  const { updateAndRefresh } = useVideoState.getState();
  updateAndRefresh(projectId, (props) => ({ ...props }));
}

async function invalidateScenes(utils: SceneSyncUtils, projectId: string) {
  await utils.generation.getProjectScenes.invalidate({ projectId });
}

export const sceneSyncHelpers = {
  async syncSceneCreated({ projectId, utils, scene, source, projectRevision }: BaseSyncContext & { scene?: ScenePayload | null }) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      log("scene.created", projectId, scene?.id, { source });
      await invalidateScenes(utils, projectId);
      applyProjectRevision(projectId, projectRevision);
      refreshPreview(projectId);
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      track('scene.created', 'success', projectId, source, end - start);
    } catch (error) {
      track('scene.created', 'failure', projectId, source, undefined, error);
      throw error;
    }
  },

  async syncSceneUpdated({ projectId, utils, scene, source, projectRevision }: BaseSyncContext & { scene: ScenePayload }) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const { updateScene } = useVideoState.getState();
      const payload = projectRevision !== undefined ? { ...scene, projectRevision } : scene;
      updateScene(projectId, scene.id, payload);
      log("scene.updated", projectId, scene.id, { source, revision: payload.revision });
      await invalidateScenes(utils, projectId);
      applyProjectRevision(projectId, projectRevision);
      refreshPreview(projectId);
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      track('scene.updated', 'success', projectId, source, end - start);
    } catch (error) {
      track('scene.updated', 'failure', projectId, source, undefined, error);
      throw error;
    }
  },

  async syncSceneDeleted({ projectId, utils, sceneId, source, projectRevision }: BaseSyncContext & { sceneId: string }) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const { deleteScene } = useVideoState.getState();
      deleteScene(projectId, sceneId);
      log("scene.deleted", projectId, sceneId, { source });
      await invalidateScenes(utils, projectId);
      applyProjectRevision(projectId, projectRevision);
      refreshPreview(projectId);
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      track('scene.deleted', 'success', projectId, source, end - start);
    } catch (error) {
      track('scene.deleted', 'failure', projectId, source, undefined, error);
      throw error;
    }
  },

  async syncSceneRestored({ projectId, utils, scene, source, projectRevision }: BaseSyncContext & { scene: ScenePayload }) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const { updateScene } = useVideoState.getState();
      const payload = projectRevision !== undefined ? { ...scene, projectRevision } : scene;
      updateScene(projectId, scene.id, payload);
      log("scene.restored", projectId, scene.id, { source, revision: payload.revision });
      await invalidateScenes(utils, projectId);
      applyProjectRevision(projectId, projectRevision);
      refreshPreview(projectId);
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      track('scene.restored', 'success', projectId, source, end - start);
    } catch (error) {
      track('scene.restored', 'failure', projectId, source, undefined, error);
      throw error;
    }
  },

  async syncScenesChanged({ projectId, utils, source, projectRevision }: BaseSyncContext) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      log("scenes.changed", projectId, undefined, { source });
      await invalidateScenes(utils, projectId);
      applyProjectRevision(projectId, projectRevision);
      refreshPreview(projectId);
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      track('scenes.changed', 'success', projectId, source, end - start);
    } catch (error) {
      track('scenes.changed', 'failure', projectId, source, undefined, error);
      throw error;
    }
  },
};
