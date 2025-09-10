import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { db } from "~/server/db";
import { assets } from "~/server/db/schema";
import { eq } from "drizzle-orm";

type MediaMetadata = {
  kind: 'logo' | 'ui' | 'product' | 'photo' | 'illustration' | 'chart' | 'text-only' | 'unknown';
  detectedText?: string[];
  brandText?: string | null;
  dominantColors?: string[]; // hex
  layout?: 'dashboard' | 'screenshot' | 'hero' | 'banner' | 'mobile-ui' | 'icon' | 'other';
  hints?: { embedRecommended?: boolean; recreateRecommended?: boolean };
  confidence?: number;
};

const SYSTEM = `You analyze a single image and return compact JSON only.
Fields: kind (logo|ui|product|photo|illustration|chart|text-only|unknown), detectedText[], brandText, dominantColors[#hex], layout, hints{embedRecommended,recreateRecommended}, confidence (0..1).
Keep arrays short (<=5). Do not add extra fields.`;

export class MediaMetadataService {
  async analyzeAndTag(assetId: string, url: string): Promise<void> {
    try {
      const model = getModel('promptEnhancer'); // fast/cheap model
      const content: any = [
        { type: 'text', text: 'Analyze this image and return compact JSON.' },
        { type: 'image_url', image_url: { url } },
      ];
      const res = await AIClientService.generateResponse(
        model,
        [{ role: 'user', content }],
        { role: 'system', content: SYSTEM },
        { responseFormat: { type: 'json_object' }, priority: 1 }
      );
      const raw = res?.content ?? '{}';
      const meta = JSON.parse(raw) as MediaMetadata;

      // Derive compact tags for phase 1 (no schema change)
      const tags: string[] = [];
      if (meta.kind) tags.push(`kind:${meta.kind}`);
      if (meta.layout) tags.push(`layout:${meta.layout}`);
      if (meta.dominantColors) tags.push(...meta.dominantColors.slice(0, 3).map(c => `color:${c}`));
      if (meta.detectedText && meta.detectedText.length > 0) tags.push('hasText');
      if (meta.hints?.embedRecommended) tags.push('hint:embed');
      if (meta.hints?.recreateRecommended) tags.push('hint:recreate');

      // Append tags (dedup) without using db.raw (Neon-safe)
      const existing = await db.query.assets.findFirst({
        where: eq(assets.id, assetId),
        columns: { id: true, tags: true }
      });

      if (!existing) throw new Error('Asset not found when tagging');

      const merged = Array.from(new Set([...(existing.tags || []), ...tags]));

      await db.update(assets)
        .set({
          tags: merged,
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));

      console.log('[MediaMetadata] Tagged asset', assetId, merged);
    } catch (err) {
      console.warn('[MediaMetadata] Failed to analyze/tag asset', assetId, err);
    }
  }
}

export const mediaMetadataService = new MediaMetadataService();
