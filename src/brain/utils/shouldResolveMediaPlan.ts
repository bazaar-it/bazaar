import type { ContextPacket, ToolSelectionResult } from "~/lib/types/ai/brain.types";

export type MediaAttachmentsSummary = {
  imageCount: number;
  videoCount: number;
};

export const shouldResolveMediaPlan = (
  selection: ToolSelectionResult | undefined,
  context: ContextPacket,
  attachments?: MediaAttachmentsSummary
): boolean => {
  if (!selection) return false;

  const plan = selection.mediaPlan;
  if (!plan) return false;

  const planHasImages = Array.isArray(plan.imagesOrdered) && plan.imagesOrdered.length > 0;
  const planHasVideos = Array.isArray(plan.videosOrdered) && plan.videosOrdered.length > 0;
  const planHasDirectives = Array.isArray((plan as any).imageDirectives) && ((plan as any).imageDirectives as unknown[]).length > 0;
  const planHasMapping = plan.mapping ? Object.keys(plan.mapping).length > 0 : false;

  if (planHasImages || planHasVideos) {
    return true;
  }

  const attachmentTotal = (attachments?.imageCount ?? 0) + (attachments?.videoCount ?? 0);
  const projectImageCount = context.mediaLibrary?.meta?.projectImageCount ?? 0;
  const projectVideoCount = context.mediaLibrary?.meta?.projectVideoCount ?? 0;
  const hasProjectMedia = projectImageCount + projectVideoCount > 0;

  if (planHasDirectives) {
    return hasProjectMedia || attachmentTotal > 0;
  }

  if (planHasMapping) {
    return hasProjectMedia || attachmentTotal > 0;
  }

  return false;
};
