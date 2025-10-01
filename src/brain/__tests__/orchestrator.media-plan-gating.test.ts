import type { ContextPacket, ToolSelectionResult } from "~/lib/types/ai/brain.types";
import { shouldResolveMediaPlan } from "../utils/shouldResolveMediaPlan";

const buildBaseContext = (overrides: Partial<ContextPacket> = {}): ContextPacket => {
  const base: ContextPacket = {
    sceneHistory: [],
    conversationContext: "",
    recentMessages: [],
    imageContext: {},
    webContext: undefined,
    sceneList: [],
    assetContext: undefined,
    templateContext: undefined,
    mediaLibrary: {
      images: [],
      videos: [],
      meta: {
        projectImageCount: 0,
        userImageCount: 0,
        projectVideoCount: 0,
        userVideoCount: 0,
      },
    },
  };

  return {
    ...base,
    ...overrides,
    mediaLibrary: {
      ...base.mediaLibrary,
      ...overrides.mediaLibrary,
      meta: {
        ...base.mediaLibrary?.meta,
        ...overrides.mediaLibrary?.meta,
      },
    },
  } as ContextPacket;
};

const buildSelection = (mediaPlan: any): ToolSelectionResult => ({
  success: true,
  toolName: "addScene",
  mediaPlan,
});

describe("Orchestrator media plan gating", () => {
  it("skips resolving when plan only references user-library assets and no attachments", () => {
    const context = buildBaseContext();
    const selection = buildSelection({
      imageDirectives: [
        { urlOrId: "asset-user-123", action: "embed" },
      ],
    });

    const shouldResolve = shouldResolveMediaPlan(selection, context, {
      imageCount: 0,
      videoCount: 0,
    });

    expect(shouldResolve).toBe(false);
  });

  it("resolves when directives exist alongside project-linked media", () => {
    const context = buildBaseContext({
      mediaLibrary: {
        images: [],
        videos: [],
        meta: {
          projectImageCount: 1,
          userImageCount: 0,
          projectVideoCount: 0,
          userVideoCount: 0,
        },
      },
    });
    const selection = buildSelection({
      imageDirectives: [
        { urlOrId: "asset-project-456", action: "recreate" },
      ],
    });

    const shouldResolve = shouldResolveMediaPlan(selection, context, {
      imageCount: 0,
      videoCount: 0,
    });

    expect(shouldResolve).toBe(true);
  });

  it("resolves when attachments are provided even without project media", () => {
    const context = buildBaseContext();
    const selection = buildSelection({
      imageDirectives: [
        { urlOrId: "attachment-1", action: "embed" },
      ],
    });

    const shouldResolve = shouldResolveMediaPlan(selection, context, {
      imageCount: 1,
      videoCount: 0,
    });

    expect(shouldResolve).toBe(true);
  });
});
