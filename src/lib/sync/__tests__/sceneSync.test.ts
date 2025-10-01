jest.mock('~/trpc/react', () => ({
  api: {
    useUtils: () => ({
      generation: {
        getProjectScenes: {
          invalidate: jest.fn().mockResolvedValue(undefined),
        },
      },
    }),
  },
}));

jest.mock('~/lib/utils/analytics', () => ({
  analytics: {
    featureUsed: jest.fn(),
    projectOpened: jest.fn(),
  },
}));

import { sceneSyncHelpers } from "../sceneSync";
import { useVideoState } from "~/stores/videoState";
import type { InputProps } from "~/lib/types/video/input-props";

describe('sceneSyncHelpers', () => {
  beforeAll(() => {
    (global as any).localStorage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
    };
  });

  beforeEach(() => {
    // Reset store to a clean slate
    useVideoState.setState((state) => ({
      ...state,
      currentProjectId: null,
      projects: {},
      chatHistory: {},
      refreshTokens: {},
      selectedScenes: {},
      lastSyncTime: 0,
      pendingDbSync: {},
      generatingScenes: {},
      undoStacks: {},
      redoStacks: {},
      undoSavedAt: {},
      codeCache: new Map(),
      cacheStats: { hits: 0, misses: 0 },
    }));

    const initialProps: InputProps = {
      meta: {
        title: 'Initial Project',
        duration: 150,
        backgroundColor: '#000000',
        format: 'landscape',
        width: 1920,
        height: 1080,
      },
      scenes: [
        {
          id: 'scene-1',
          type: 'custom',
          start: 0,
          duration: 150,
          order: 0,
          revision: 1,
          data: {
            code: 'const Scene = () => null;',
            name: 'Scene 1',
            componentId: 'scene-1',
            props: {},
          },
        },
      ],
    };

    useVideoState.getState().setProject('test-project', initialProps, { force: true, revision: 1 });
  });

  it('applies scene updates and project revision via syncSceneUpdated', async () => {
    const utils = {
      generation: {
        getProjectScenes: {
          invalidate: jest.fn().mockResolvedValue(undefined),
        },
      },
    } as any;

    await sceneSyncHelpers.syncSceneUpdated({
      projectId: 'test-project',
      utils,
      scene: {
        id: 'scene-1',
        tsxCode: 'const Scene = () => "updated";',
        duration: 200,
        revision: 2,
      },
      source: 'unit-test',
      projectRevision: 3,
    });

    expect(utils.generation.getProjectScenes.invalidate).toHaveBeenCalledWith({ projectId: 'test-project' });

    const state = useVideoState.getState();
    const updatedScene = state.projects['test-project'].props.scenes[0];
    expect(updatedScene.duration).toBe(200);
    expect(updatedScene.revision).toBe(2);
    expect(state.projects['test-project'].revision).toBe(3);
  });
});
