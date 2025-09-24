import { MediaPlanService } from "../media-plan.service";

const PROJECT_ID = "fa164d69-521e-45fc-8ea2-c2385810f0d8";
const LEGACY_PROJECT_ID = "0ce700db-f091-497c-8cc0-09b3b5fa582e";
const LEGACY_ASSET_URL = `https://pub-example.r2.dev/projects/${LEGACY_PROJECT_ID}/images/dashboard.png`;

type MediaLibraryItem = {
  id: string;
  url: string;
  scope: "project" | "user";
  requiresLink?: boolean;
  originalName?: string;
  mimeType?: string | null;
  tags?: string[];
  sourceProjectId?: string | null;
};

const createContext = (images: MediaLibraryItem[]) => ({
  sceneHistory: [],
  conversationContext: "",
  recentMessages: [],
  imageContext: {
    currentImages: [],
    currentVideos: [],
    recentImagesFromChat: [],
    recentVideosFromChat: [],
  },
  webContext: undefined,
  sceneList: [],
  assetContext: undefined,
  templateContext: undefined,
  mediaLibrary: {
    images,
    videos: [],
    meta: {
      projectImageCount: images.filter((i) => i.scope === "project").length,
      userImageCount: images.filter((i) => i.scope === "user").length,
      projectVideoCount: 0,
      userVideoCount: 0,
    },
  },
}) as any;

const createToolSelection = () => ({
  toolName: "addScene",
  reasoning: "",
  mediaPlan: {
    imagesOrdered: ["asset-1"],
    videosOrdered: [],
  },
}) as any;

describe("MediaPlanService.resolvePlan", () => {
  const service = new MediaPlanService();

  it("allows project-linked assets even when the storage path encodes a different project id", () => {
    const context = createContext([
      {
        id: "asset-1",
        url: LEGACY_ASSET_URL,
        scope: "project",
        requiresLink: false,
        originalName: "dashboard.png",
        mimeType: "image/png",
        tags: ["kind:ui"],
        sourceProjectId: LEGACY_PROJECT_ID,
      },
    ]);

    const result = service.resolvePlan(
      createToolSelection(),
      context,
      "animate this",
      undefined,
      { projectId: PROJECT_ID }
    );

    expect(result.imageUrls).toEqual([LEGACY_ASSET_URL]);
    expect(result.skippedPlanUrls).toBeUndefined();
  });

  it("skips unlinked user-library assets with mismatched project ids", () => {
    const context = createContext([
      {
        id: "asset-1",
        url: LEGACY_ASSET_URL,
        scope: "user",
        requiresLink: true,
        originalName: "dashboard.png",
        mimeType: "image/png",
        tags: ["kind:ui"],
        sourceProjectId: LEGACY_PROJECT_ID,
      },
    ]);

    const result = service.resolvePlan(
      createToolSelection(),
      context,
      "animate this",
      undefined,
      { projectId: PROJECT_ID }
    );

    expect(result.imageUrls).toBeUndefined();
    expect(result.skippedPlanUrls).toEqual([LEGACY_ASSET_URL]);
  });
});
