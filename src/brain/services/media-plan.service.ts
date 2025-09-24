import type { ContextPacket, ToolSelectionResult } from "~/lib/types/ai/brain.types";

type ImageDirective = { url: string; action: 'embed' | 'recreate'; target?: any };

type MediaSourceTag =
  | 'plan'
  | 'plan-fallback'
  | 'plan-index'
  | 'plan-skipped'
  | 'plan-unlinked'
  | 'attachment'
  | 'library-match'
  | 'direct-url';

type DebugSourceEntry = {
  url: string;
  sources: MediaSourceTag[];
  details?: string[];
};

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
    userCtx?: { imageUrls?: string[]; videoUrls?: string[] },
    opts?: { requestId?: string; projectId?: string }
  ): {
    imageUrls?: string[];
    videoUrls?: string[];
    imageDirectives?: ImageDirective[];
    imageAction?: 'embed' | 'recreate';
    suppressed: boolean; // kept for compatibility; always false in Simple Mode
    reason?: string;
    skippedPlanUrls?: string[];
    debug?: {
      sourceMap: DebugSourceEntry[];
      plannedImages: string[];
      plannedVideos: string[];
      attachments: { images: string[]; videos: string[] };
      plan?: NonNullable<ToolSelectionResult['mediaPlan']>;
      mappedDirectives?: ImageDirective[];
      skippedPlanUrls?: string[];
    };
  } {
    const result: {
      imageUrls?: string[];
      videoUrls?: string[];
      imageDirectives?: ImageDirective[];
      imageAction?: 'embed' | 'recreate';
      suppressed: boolean;
      reason?: string;
      skippedPlanUrls?: string[];
      debug?: {
        sourceMap: DebugSourceEntry[];
        plannedImages: string[];
        plannedVideos: string[];
        attachments: { images: string[]; videos: string[] };
        plan?: NonNullable<ToolSelectionResult['mediaPlan']>;
        mappedDirectives?: ImageDirective[];
        skippedPlanUrls?: string[];
      };
    } = { suppressed: false };

    // Quick exits
    if (!toolSelection) return { suppressed: false, reason: 'No toolSelection' };
    const requestId = opts?.requestId;
    const shouldLog = process.env.NODE_ENV !== 'production';
    const projectId = opts?.projectId;

    const debugSourceAccumulator = shouldLog
      ? new Map<string, { sources: Set<MediaSourceTag>; details: Set<string> }>()
      : undefined;
    const trackSource = (url: string | undefined, source: MediaSourceTag, detail?: string) => {
      if (!debugSourceAccumulator || !url) return;
      const entry = debugSourceAccumulator.get(url) ?? {
        sources: new Set<MediaSourceTag>(),
        details: new Set<string>(),
      };
      entry.sources.add(source);
      if (detail) entry.details.add(detail);
      debugSourceAccumulator.set(url, entry);
    };

    const plan = toolSelection.mediaPlan;
    if (!plan) {
      if (shouldLog) {
        console.log('[MEDIA_PLAN_RESOLVE]', JSON.stringify({
          type: 'mediaPlan.resolve',
          requestId,
          status: 'no-plan',
          promptPreview: prompt.slice(0, 160),
          tool: toolSelection.toolName,
          attachments: {
            images: userCtx?.imageUrls?.length || 0,
            videos: userCtx?.videoUrls?.length || 0,
          },
        }));
      }
      return { suppressed: false, reason: 'No mediaPlan' };
    }
    if (!hasMediaLibrary(context)) return { suppressed: false, reason: 'No mediaLibrary in context' };

    const trustedUrlSet = new Set<string>();
    const assetsByUrl = new Map<
      string,
      {
        tags?: string[];
        originalName?: string;
        mimeType?: string | null;
        scope?: 'project' | 'user';
        requiresLink?: boolean;
      }
    >();

    const registerAsset = (
      asset: any,
      scope: 'project' | 'user',
    ) => {
      if (!asset || typeof asset.url !== 'string') return;
      const normalizedTags = Array.isArray(asset.tags) ? (asset.tags as string[]) : undefined;
      assetsByUrl.set(asset.url, {
        tags: normalizedTags,
        originalName: asset.originalName,
        mimeType: asset.mimeType ?? null,
        scope,
        requiresLink: scope === 'user' ? true : asset.requiresLink,
      });
      if (scope === 'project' && asset.requiresLink !== true) {
        trustedUrlSet.add(asset.url);
      }
    };

    const isProjectScopedAsset = (url: string | undefined) => {
      if (!url) return false;
      const meta = assetsByUrl.get(url);
      return !!meta && meta.scope === 'project' && meta.requiresLink !== true;
    };

    const isTrustedUrl = (url: string | undefined) => {
      if (!url) return false;
      if (trustedUrlSet.has(url)) return true;
      return isProjectScopedAsset(url);
    };

    // Build ID → URL map
    const idToUrl = new Map<string, string>();
    const userLibraryById = new Map<string, { url: string; scope?: 'project' | 'user'; sourceProjectId?: string | null }>();
    for (const a of context.mediaLibrary.images) {
      if (a.scope === 'user') {
        userLibraryById.set(a.id, { url: a.url, scope: a.scope, sourceProjectId: a.sourceProjectId });
        continue;
      }
      idToUrl.set(a.id, a.url);
      registerAsset(a, 'project');
    }
    for (const a of context.mediaLibrary.videos) {
      if (a.scope === 'user') {
        userLibraryById.set(a.id, { url: a.url, scope: a.scope, sourceProjectId: a.sourceProjectId });
        continue;
      }
      idToUrl.set(a.id, a.url);
      registerAsset(a, 'project');
    }

    for (const a of context.mediaLibrary.images) {
      if (a.scope === 'user') registerAsset(a, 'user');
    }
    for (const a of context.mediaLibrary.videos) {
      if (a.scope === 'user') registerAsset(a, 'user');
    }

    const isHttp = (u: any) => typeof u === 'string' && /^https?:\/\//i.test(u);
    let attachmentsImages = (userCtx?.imageUrls || []).filter(isHttp);
    let attachmentsVideos = (userCtx?.videoUrls || []).filter(isHttp);

    const videoLibraryUrls = new Set<string>();
    for (const v of context.mediaLibrary.videos) {
      videoLibraryUrls.add(v.url);
    }

    const maybeVideo = (url: string) => {
      if (!url) return false;
      if (videoLibraryUrls.has(url)) return true;
      const normalized = url.split('?')[0]?.toLowerCase() ?? '';
      return /(\.(mp4|mov|webm|mkv|m4v|avi|gifv))$/.test(normalized);
    };

    const misclassifiedVideos: string[] = [];
    attachmentsImages = attachmentsImages.filter((url) => {
      if (maybeVideo(url)) {
        misclassifiedVideos.push(url);
        return false;
      }
      return true;
    });

    if (misclassifiedVideos.length) {
      attachmentsVideos = [...attachmentsVideos, ...misclassifiedVideos];
    }

    attachmentsImages.forEach((url, index) => trackSource(url, 'attachment', `attachment-image-${index}`));
    attachmentsVideos.forEach((url, index) => trackSource(url, 'attachment', `attachment-video-${index}`));

    const extractProjectId = (url: string | undefined) => url?.match(/projects\/([^/]+)\//)?.[1];

    const skippedPlanUrls: Array<{ url: string; projectId?: string; scope?: 'project' | 'user'; reason?: string }> = [];
    const skippedUrlSet = new Set<string>();
    const recordSkipped = (url: string | undefined, detail?: { projectId?: string; scope?: 'project' | 'user'; reason?: string }) => {
      if (!url || skippedUrlSet.has(url)) return;
      skippedUrlSet.add(url);
      skippedPlanUrls.push({ url, ...detail });
      trackSource(url, 'plan-skipped', detail?.reason ? `skipped-${detail.reason}` : 'skipped');
    };

    const canUsePlanUrl = (url: string | undefined, options?: { projectScoped?: boolean }) => {
      if (!url) return false;
      if (options?.projectScoped) return true;
      if (isTrustedUrl(url)) return true;
      if (!projectId) return true;
      const planProjectId = extractProjectId(url);
      if (planProjectId && planProjectId !== projectId) {
        recordSkipped(url, { projectId: planProjectId, scope: 'project', reason: 'project-mismatch' });
        trackSource(url, 'plan-skipped', `skipped-project:${planProjectId}`);
        return false;
      }
      return true;
    };

    const resolveToken = (
      token: string | undefined,
      kind: 'image' | 'video'
    ): { url?: string; projectScoped?: boolean } => {
      if (!token) return {};
      const mapped = idToUrl.get(token);
      if (mapped) return { url: mapped, projectScoped: true };

      const userAsset = userLibraryById.get(token);
      if (userAsset) {
        const inferredProject = userAsset.sourceProjectId ?? extractProjectId(userAsset.url);
        recordSkipped(userAsset.url, {
          projectId: inferredProject && inferredProject !== projectId ? inferredProject : undefined,
          scope: 'user',
          reason: 'requires-linking',
        });
        trackSource(userAsset.url, 'plan-unlinked', inferredProject ? `unlinked-project:${inferredProject}` : 'scope:user');
        return {};
      }
      if (token.startsWith('http')) return { url: token, projectScoped: isProjectScopedAsset(token) };

      const placeholderMatch = token.match(/^(image|video)_(\d+)$/i);
      if (placeholderMatch) {
        const indexFragment = placeholderMatch[2];
        if (!indexFragment) return {};
        const index = Number.parseInt(indexFragment, 10) - 1;
        if (!Number.isNaN(index) && index >= 0) {
          if (kind === 'image') {
            const candidate = attachmentsImages[index];
            if (typeof candidate === 'string') {
              return { url: candidate, projectScoped: isProjectScopedAsset(candidate) };
            }
          }
          if (kind === 'video') {
            const candidate = attachmentsVideos[index];
            if (typeof candidate === 'string') {
              return { url: candidate, projectScoped: isProjectScopedAsset(candidate) };
            }
          }
        }
      }

      return {};
    };

    // Map ordered IDs → URLs; allow direct URLs if the plan accidentally included them
    const fallbackTokenMap = new Map<string, string>();
    if (Array.isArray(plan.imagesOrdered)) {
      plan.imagesOrdered.forEach((token: string, index: number) => {
        const attachment = attachmentsImages[index];
        if (attachment) fallbackTokenMap.set(token, attachment);
      });
    }
    if (Array.isArray(plan.videosOrdered)) {
      plan.videosOrdered.forEach((token: string, index: number) => {
        const attachment = attachmentsVideos[index];
        if (attachment) fallbackTokenMap.set(token, attachment);
      });
    }

    const extractFromPlan = (
      ids: string[] | undefined,
      kind: 'image' | 'video'
    ): string[] => {
      const results: string[] = [];
      (ids || []).forEach((id, idx) => {
        const resolved = resolveToken(id, kind);
        const resolvedUrl = resolved.url;
        if (resolvedUrl) {
          if (idToUrl.get(id) === resolvedUrl) {
            trustedUrlSet.add(resolvedUrl);
          }
          const fromLibrary = idToUrl.has(id);
          if (!canUsePlanUrl(resolvedUrl, { projectScoped: resolved.projectScoped })) return;
          trackSource(
            resolvedUrl,
            'plan',
            fromLibrary ? `mapped-from-library:${id}` : `plan-token:${id}`
          );
          results.push(resolvedUrl);
          return;
        }

        const fallback = fallbackTokenMap.get(id);
        if (fallback) {
          const meta = assetsByUrl.get(fallback);
          if (meta?.scope === 'project' && meta.requiresLink !== true) {
            trustedUrlSet.add(fallback);
          }
          if (!canUsePlanUrl(fallback, { projectScoped: isProjectScopedAsset(fallback) })) return;
          trackSource(fallback, 'plan-fallback', `fallback-token:${id}`);
          results.push(fallback);
          return;
        }

        const byIndex = kind === 'image' ? attachmentsImages[idx] : attachmentsVideos[idx];
        if (byIndex) {
          const meta = assetsByUrl.get(byIndex);
          if (meta?.scope === 'project' && meta.requiresLink !== true) {
            trustedUrlSet.add(byIndex);
          }
          if (!canUsePlanUrl(byIndex, { projectScoped: isProjectScopedAsset(byIndex) })) return;
          trackSource(byIndex, 'plan-index', `index:${idx}|token:${id}`);
          results.push(byIndex);
          return;
        }

        if (id.startsWith('http')) {
          if (!canUsePlanUrl(id, { projectScoped: isProjectScopedAsset(id) })) return;
          trackSource(id, 'direct-url', `direct-token:${id}`);
          results.push(id);
        }
      });
      return results;
    };

    const plannedImages = extractFromPlan(plan.imagesOrdered, 'image');
    const plannedVideos = extractFromPlan(plan.videosOrdered, 'video');

    // Map directives (optional)
    const mappedDirectives: ImageDirective[] | undefined = Array.isArray((plan as any).imageDirectives)
      ? (plan as any).imageDirectives
          .map((d: any) => {
            const token = typeof d?.urlOrId === 'string' ? d.urlOrId : (typeof d?.url === 'string' ? d.url : undefined);
            const resolvedInfo = resolveToken(token, 'image');
            return resolvedInfo.url && isValidAction(d?.action)
              ? { url: resolvedInfo.url, action: d.action as 'embed' | 'recreate', target: d.target }
              : undefined;
          })
          .filter((x: any): x is ImageDirective => !!x)
      : undefined;

    // Merge with user attachments
    let mergedImages = Array.from(new Set([...(plannedImages || []), ...attachmentsImages]));
    let mergedVideos = Array.from(new Set([...(plannedVideos || []), ...attachmentsVideos]));

    // Simple Mode fallback: ONLY when exactly one attachment is present and the Brain omitted media
    const totalAttachments = attachmentsImages.length + attachmentsVideos.length;
    if (totalAttachments === 1 && mergedImages.length === 0 && mergedVideos.length === 0) {
      mergedImages = attachmentsImages;
      mergedVideos = attachmentsVideos;
      // Optional: derive a minimal imageAction for UI-like attachments if none set by Brain
      try {
        const tagsOfAttachments = attachmentsImages
          .map((u) => context.mediaLibrary.images.find((a) => a.url === u)?.tags || [])
          .flat()
          .map((t) => String(t));
        if (!result.imageAction && tagsOfAttachments.some((t) => t.startsWith('kind:ui') || t.startsWith('layout:'))) {
          result.imageAction = 'recreate';
        }
      } catch {}
    }

    // Derive overall imageAction if not explicitly provided by the Brain
    if (!result.imageAction && mappedDirectives && mappedDirectives.length) {
      if (mappedDirectives.some(d => d.action === 'recreate')) result.imageAction = 'recreate';
      else if (mappedDirectives.every(d => d.action === 'embed')) result.imageAction = 'embed';
    }
    // Fallback to Brain-provided action if valid
    if (!result.imageAction && isValidAction((toolSelection as any).imageAction)) {
      result.imageAction = (toolSelection as any).imageAction as 'embed' | 'recreate';
    }

    result.imageUrls = mergedImages.length ? mergedImages : undefined;
    result.videoUrls = mergedVideos.length ? mergedVideos : undefined;
    result.imageDirectives = mappedDirectives && mappedDirectives.length ? mappedDirectives : undefined;

    const hasResolvedImages = (result.imageUrls?.length || 0) > 0;

    const attachmentInfo = (result.imageUrls || []).map((url) => {
      const asset = assetsByUrl.get(url);
      const tags = Array.isArray(asset?.tags) ? (asset!.tags as string[]) : [];
      const normalizedTags = tags.map((tag) => tag.toLowerCase());
      const originalName = (assetsByUrl.get(url)?.originalName || url).toLowerCase();
      const isLogo = normalizedTags.some((tag) => tag.startsWith('kind:logo')) || originalName.includes('logo');
      const isUI = normalizedTags.some((tag) => tag.startsWith('kind:ui') || tag.startsWith('layout:') || tag.includes('hint:recreate'))
        || /ui|dashboard|screen|mockup|app/.test(originalName);
      const isPhoto = normalizedTags.some((tag) => tag.startsWith('kind:photo') || tag.includes('hint:embed'))
        || (!isUI && /background|hero|photo|image/.test(originalName))
        || (!isUI && !originalName.includes('ui') && /\.(jpg|jpeg)/.test(originalName));
      return { url, tags: normalizedTags, isUI, isPhoto, isLogo };
    });

    const hasUIAsset = attachmentInfo.some((info) => info.isUI);
    const hasPhotoAsset = attachmentInfo.some((info) => info.isPhoto);
    const hasLogoAsset = attachmentInfo.some((info) => info.isLogo);

    if (!result.imageAction && hasResolvedImages) {
      try {
        if (hasUIAsset && !hasPhotoAsset) {
          result.imageAction = 'recreate';
        } else if ((hasPhotoAsset || hasLogoAsset) && !hasUIAsset) {
          result.imageAction = 'embed';
        }
      } catch {}
    }

    if (result.imageAction === 'recreate' && (hasPhotoAsset || hasLogoAsset) && !hasUIAsset) {
      result.imageAction = 'embed';
    }

    if (!result.imageAction && hasResolvedImages && typeof toolSelection.reasoning === 'string') {
      const reason = toolSelection.reasoning.toLowerCase();
      if (reason.includes('recreate')) {
        result.imageAction = 'recreate';
      } else if (reason.includes('embed') || reason.includes('background') || reason.includes('logo')) {
        result.imageAction = 'embed';
      }
    }

    if (!result.imageAction) {
      const inferFromName = (url: string) => {
        const normalized = url.split('?')[0]?.toLowerCase() ?? '';
        return {
          isUI:
            /ui|dashboard|screen|interface|mockup|figma|wireframe|prototype/.test(normalized) ||
            normalized.endsWith('.fig'),
          isPhoto:
            /\.jpe?g$/.test(normalized) ||
            (!/ui|screen|mockup/.test(normalized) && /photo|avatar|portrait|background/.test(normalized)),
        };
      };

      const inferred = attachmentsImages.map(inferFromName);
      const inferredUI = hasUIAsset || inferred.some((info) => info.isUI);
      const inferredPhoto = hasPhotoAsset || inferred.some((info) => info.isPhoto);
      const inferredLogo = hasLogoAsset;

      if (inferredUI && !inferredPhoto) {
        result.imageAction = 'recreate';
      } else if (inferredPhoto && !inferredUI) {
        result.imageAction = 'embed';
      } else if (inferredLogo && !inferredUI) {
        result.imageAction = 'embed';
      } else if (inferredUI && inferredPhoto) {
        // Mixed signals – default to recreate to preserve UI editability
        result.imageAction = 'recreate';
      } else if ((result.imageUrls?.length || attachmentsImages.length || attachmentsVideos.length) > 0) {
        // Final safety net: prefer embed for unknown assets to avoid breaking photos/logos
        result.imageAction = 'embed';
      }
    }

    if (hasResolvedImages && !result.imageDirectives) {
      const directives = attachmentInfo.map((info) => {
        let action: 'embed' | 'recreate' = result.imageAction || 'recreate';
        if (info.isUI && !info.isPhoto) action = 'recreate';
        if ((info.isPhoto || info.isLogo) && !info.isUI) action = 'embed';
        return { url: info.url, action };
      });
      if (directives.length) {
        result.imageDirectives = directives;
      }
    }

    const debugSourceMap: DebugSourceEntry[] | undefined = debugSourceAccumulator
      ? Array.from(debugSourceAccumulator.entries()).map(([url, meta]) => ({
          url,
          sources: Array.from(meta.sources),
          details: meta.details.size ? Array.from(meta.details) : undefined,
        }))
      : undefined;

    if (debugSourceMap || shouldLog) {
      result.debug = {
        sourceMap: debugSourceMap ?? [],
        plannedImages,
        plannedVideos,
        attachments: { images: attachmentsImages, videos: attachmentsVideos },
        plan: plan ? { ...plan } : undefined,
        mappedDirectives: mappedDirectives,
        skippedPlanUrls: skippedPlanUrls.map((entry) => entry.url),
      };
    }

    if (skippedPlanUrls.length) {
      result.skippedPlanUrls = skippedPlanUrls.map(entry => entry.url);
    }

    if (shouldLog) {
      try {
        const summary = {
          type: 'mediaPlan.resolve',
          requestId,
          status: 'resolved',
          tool: toolSelection.toolName,
          plan: {
            imagesOrdered: plan.imagesOrdered?.length || 0,
            videosOrdered: plan.videosOrdered?.length || 0,
            directives: Array.isArray((plan as any).imageDirectives)
              ? (plan as any).imageDirectives.length
              : 0,
            rationale: (plan as any).rationale || null,
          },
          mapped: {
            images: plannedImages.length,
            videos: plannedVideos.length,
            directives: mappedDirectives?.length || 0,
            imageAction: result.imageAction || (toolSelection as any).imageAction || null,
          },
          attachments: {
            images: userCtx?.imageUrls?.length || 0,
            videos: userCtx?.videoUrls?.length || 0,
            mergedImages: result.imageUrls?.length || 0,
            mergedVideos: result.videoUrls?.length || 0,
          },
          sourceMap: debugSourceMap ?? [],
          skippedPlanUrls: skippedPlanUrls.map(entry => ({
            url: entry.url,
            projectId: entry.projectId,
            scope: entry.scope,
            reason: entry.reason,
          })),
          suppressed: result.suppressed,
          reason: result.reason || null,
        };
        console.log('[MEDIA_PLAN_RESOLVE]', JSON.stringify(summary));
      } catch (err) {
        console.warn('[MediaPlanService] Failed to log media plan resolution:', err);
      }
    }

    return result;
  }
}

export const mediaPlanService = new MediaPlanService();
