import type { ContextPacket, ToolSelectionResult } from "~/lib/types/ai/brain.types";

type ImageDirective = { url: string; action: 'embed' | 'recreate'; target?: any };

function isValidAction(x: any): x is 'embed' | 'recreate' {
  return x === 'embed' || x === 'recreate';
}

function hasMediaLibrary(context: ContextPacket): context is ContextPacket & {
  mediaLibrary: NonNullable<ContextPacket['mediaLibrary']>
} {
  return !!context.mediaLibrary && Array.isArray(context.mediaLibrary.images) && Array.isArray(context.mediaLibrary.videos);
}

function isMediaPlan(x: unknown): x is NonNullable<ToolSelectionResult['mediaPlan']> {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.imagesOrdered) || Array.isArray(o.videosOrdered) || Array.isArray(o.unmet) || typeof o.rationale === 'string';
}

export class MediaPlanService {
  resolvePlan(
    toolSelection: ToolSelectionResult,
    context: ContextPacket,
    prompt: string,
    userCtx?: { imageUrls?: string[]; videoUrls?: string[] }
  ): {
    imageUrls?: string[];
    videoUrls?: string[];
    imageDirectives?: ImageDirective[];
    imageAction?: 'embed' | 'recreate';
    suppressed: boolean;
    reason?: string;
  } {
    const result: {
      imageUrls?: string[];
      videoUrls?: string[];
      imageDirectives?: ImageDirective[];
      imageAction?: 'embed' | 'recreate';
      suppressed: boolean;
      reason?: string;
    } = { suppressed: false };

    // Quick exits
    if (!toolSelection) return { suppressed: true, reason: 'No toolSelection' };
    const plan = toolSelection.mediaPlan;
    if (!isMediaPlan(plan)) return { suppressed: true, reason: 'No mediaPlan in selection' };
    if (!hasMediaLibrary(context)) return { suppressed: true, reason: 'No mediaLibrary in context' };

    // Build ID → URL map
    const idToUrl = new Map<string, string>();
    for (const a of context.mediaLibrary.images) idToUrl.set(a.id, a.url);
    for (const a of context.mediaLibrary.videos) idToUrl.set(a.id, a.url);

    // Map ordered IDs → URLs; allow direct URLs if the plan accidentally included them
    const mapIdsToUrls = (ids?: string[]) =>
      (ids || [])
        .map((id) => idToUrl.get(id) || (typeof id === 'string' && id.startsWith('http') ? id : undefined))
        .filter((u): u is string => !!u);

    const plannedImages = mapIdsToUrls(plan.imagesOrdered);
    const plannedVideos = mapIdsToUrls(plan.videosOrdered);

    // Map directives (optional)
    const mappedDirectives: ImageDirective[] | undefined = Array.isArray((plan as any).imageDirectives)
      ? (plan as any).imageDirectives
          .map((d: any) => {
            const u = typeof d?.url === 'string' ? (idToUrl.get(d.url) || (d.url.startsWith('http') ? d.url : undefined)) : undefined;
            return u && isValidAction(d?.action) ? { url: u, action: d.action as 'embed' | 'recreate', target: d.target } : undefined;
          })
          .filter((x: any): x is ImageDirective => !!x)
      : undefined;

    // Merge with user attachments
    const isHttp = (u: any) => typeof u === 'string' && /^https?:\/\//i.test(u);
    const attachmentsImages = (userCtx?.imageUrls || []).filter(isHttp);
    const attachmentsVideos = (userCtx?.videoUrls || []).filter(isHttp);
    const mergedImages = Array.from(new Set([...(plannedImages || []), ...attachmentsImages]));
    const mergedVideos = Array.from(new Set([...(plannedVideos || []), ...attachmentsVideos]));

    // Suppression rule: if it's not an edit and there's no explicit media intent and no attachments, drop planned media
    const isEdit = toolSelection.toolName === 'editScene';
    const p = (prompt || '').toLowerCase();
    const mediaIntent = /\b(image|images|screenshot|screenshots|photo|photos|logo|icon|background|overlay|ui)\b/.test(p)
      || /use\s+(my|the|previous|this|that)\b/.test(p)
      || /\bembed\b/.test(p);
    const hasAttachments = attachmentsImages.length > 0 || attachmentsVideos.length > 0;

    if (!isEdit && !mediaIntent && !hasAttachments && (mergedImages.length || mergedVideos.length)) {
      return { suppressed: true, reason: 'Plain add without media intent; suppressing plan' };
    }

    // Heuristic: for editScene, if any planned asset is UI-like (kind:ui or layout:*), prefer recreate
    if (isEdit) {
      try {
        const plannedIds = (plan.imagesOrdered || []).filter(Boolean);
        const tagsOfPlanned = plannedIds
          .map((id) => context.mediaLibrary.images.find((a) => a.id === id)?.tags || [])
          .flat()
          .map((t) => String(t));
        const hasUiLike = tagsOfPlanned.some((t) => t.startsWith('kind:ui') || t.startsWith('layout:'));
        if (hasUiLike) result.imageAction = 'recreate';
      } catch {}
    }

    // Fallback to Brain-provided action if valid
    if (!result.imageAction && isValidAction((toolSelection as any).imageAction)) {
      result.imageAction = (toolSelection as any).imageAction as 'embed' | 'recreate';
    }

    result.imageUrls = mergedImages.length ? mergedImages : undefined;
    result.videoUrls = mergedVideos.length ? mergedVideos : undefined;
    result.imageDirectives = mappedDirectives && mappedDirectives.length ? mappedDirectives : undefined;
    return result;
  }
}

export const mediaPlanService = new MediaPlanService();

