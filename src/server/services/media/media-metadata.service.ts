import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { db } from "~/server/db";
import { assets } from "~/server/db/schema";
import { eq } from "drizzle-orm";

type MediaMetadata = {
  kind: 'logo' | 'ui' | 'product' | 'photo' | 'illustration' | 'chart' | 'code' | 'text-only' | 'unknown';
  detectedText?: string[];
  brandText?: string | null;
  dominantColors?: string[];
  layout?: 'dashboard' | 'screenshot' | 'hero' | 'banner' | 'mobile-ui' | 'icon' | 'code-editor' | 'other';
  hints?: { embedRecommended?: boolean; recreateRecommended?: boolean };
  confidence?: number;
};

const SYSTEM = `You analyze a single image and return compact JSON only.
Fields: kind (logo|ui|product|photo|illustration|chart|code|text-only|unknown), detectedText[], brandText, dominantColors[#hex], layout (dashboard|screenshot|hero|banner|mobile-ui|icon|code-editor|other), hints{embedRecommended,recreateRecommended}, confidence (0..1).

Recommendation rules:
- embedRecommended=true for: logos, photos, illustrations, hero images, product shots (display image as-is)
- recreateRecommended=true for: UI screenshots, dashboards, charts, interfaces, code snippets, text-heavy designs, anything that looks like an app/website interface (rebuild as animated components)

Special cases:
- Code snippets/editors → kind:code, layout:code-editor, recreateRecommended=true
- Text-only with code → kind:code, recreateRecommended=true (animate the code)
- Screenshots of apps/websites → kind:ui, recreateRecommended=true
- Marketing/hero images with text → kind:photo, embedRecommended=true

Set only ONE recommendation per image based on primary use case.
Keep arrays short (<=5). Do not add extra fields.`;

export class MediaMetadataService {
  private analysisInFlight = new Map<string, Promise<void>>();

  private hasUsefulTags(tags?: string[] | null): boolean {
    if (!Array.isArray(tags) || tags.length === 0) return false;
    return tags.some((tag) => tag.startsWith('hint:') || tag.startsWith('kind:') || tag.startsWith('layout:'));
  }

  private async waitWithTimeout(promise: Promise<void>, timeoutMs?: number): Promise<void> {
    if (!timeoutMs || timeoutMs <= 0) {
      await promise;
      return;
    }

    await Promise.race([
      promise,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  }

  async ensureAnalyzed(
    assetId: string,
    url: string,
    options?: { timeoutMs?: number; force?: boolean }
  ): Promise<void> {
    const { timeoutMs, force = false } = options ?? {};

    if (!force) {
      const existing = await db.query.assets.findFirst({
        where: eq(assets.id, assetId),
        columns: { id: true, tags: true },
      });

      if (this.hasUsefulTags(existing?.tags)) {
        return;
      }
    }

    let promise = this.analysisInFlight.get(assetId);
    if (!promise) {
      const run = this.performAnalysis(assetId, url).finally(() => {
        this.analysisInFlight.delete(assetId);
      });
      promise = run;
      this.analysisInFlight.set(assetId, promise);
    }

    await this.waitWithTimeout(promise, timeoutMs);
  }

  async analyzeAndTag(assetId: string, url: string): Promise<void> {
    await this.ensureAnalyzed(assetId, url);
  }

  private async performAnalysis(assetId: string, url: string): Promise<void> {
    console.log('🔍 [MediaMetadata] Starting analysis for asset:', assetId);
    console.log('🔍 [MediaMetadata] Image URL:', url);

    try {
      const existing = await db.query.assets.findFirst({
        where: eq(assets.id, assetId),
        columns: { id: true, tags: true, mimeType: true, type: true }
      });

      if (!existing) {
        throw new Error('Asset not found when tagging');
      }

      const isSvg = (existing.mimeType && existing.mimeType.toLowerCase() === 'image/svg+xml') || /\.svg(\?|$)/i.test(url);
      if (isSvg) {
        console.log('🔍 [MediaMetadata] Skipping AI analysis for SVG; tagging heuristically');
        const kindTag = existing.type === 'logo' ? 'kind:logo' : 'kind:icon';
        const svgTags = [kindTag, 'hint:embed'];
        const merged = Array.from(new Set([...(existing.tags || []), ...svgTags]));
        await db.update(assets)
          .set({ tags: merged, updatedAt: new Date() })
          .where(eq(assets.id, assetId));
        console.log('✅ [MediaMetadata] Tagged SVG asset with', svgTags);
        return;
      }

      const model = getModel('promptEnhancer');
      console.log('🔍 [MediaMetadata] Using model:', model.provider, model.model);

      const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
        { type: 'text', text: 'Analyze this image and return compact JSON.' },
        { type: 'image_url', image_url: { url } },
      ];

      console.log('🔍 [MediaMetadata] Sending image to AI for analysis...');
      const res = await AIClientService.generateResponse(
        model,
        [{ role: 'user', content }],
        { role: 'system', content: SYSTEM },
        { responseFormat: { type: 'json_object' }, priority: 1 }
      );

      const raw = res?.content ?? '{}';
      console.log('🔍 [MediaMetadata] Raw AI response:', raw);

      const meta = JSON.parse(raw) as MediaMetadata;
      console.log('🔍 [MediaMetadata] Parsed metadata:', meta);

      const tags: string[] = [];
      if (meta.kind) {
        tags.push(`kind:${meta.kind}`);
        console.log('🔍 [MediaMetadata] Detected kind:', meta.kind);
      }
      if (meta.layout) {
        tags.push(`layout:${meta.layout}`);
        console.log('🔍 [MediaMetadata] Detected layout:', meta.layout);
      }
      if (meta.dominantColors) {
        tags.push(...meta.dominantColors.slice(0, 3).map((c) => `color:${c}`));
        console.log('🔍 [MediaMetadata] Detected colors:', meta.dominantColors.slice(0, 3));
      }
      if (meta.detectedText && meta.detectedText.length > 0) {
        tags.push('hasText');
        console.log('🔍 [MediaMetadata] Text detected in image');
      }
      if (meta.hints?.embedRecommended) {
        tags.push('hint:embed');
        console.log('🔍 [MediaMetadata] AI recommends: EMBED');
      }
      if (meta.hints?.recreateRecommended) {
        tags.push('hint:recreate');
        console.log('🔍 [MediaMetadata] AI recommends: RECREATE');
      }

      console.log('🔍 [MediaMetadata] Generated tags:', tags);

      const merged = Array.from(new Set([...(existing.tags || []), ...tags]));
      console.log('🔍 [MediaMetadata] Merged tags (old + new):', merged);

      await db.update(assets)
        .set({
          tags: merged,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));

      console.log('✅ [MediaMetadata] Successfully tagged asset', assetId, 'with tags:', merged);
    } catch (err) {
      console.error('❌ [MediaMetadata] Failed to analyze/tag asset', assetId, err);
      throw err;
    }
  }
}

export const mediaMetadataService = new MediaMetadataService();
