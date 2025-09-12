import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { db } from "~/server/db";
import { assets } from "~/server/db/schema";
import { eq } from "drizzle-orm";

type MediaMetadata = {
  kind: 'logo' | 'ui' | 'product' | 'photo' | 'illustration' | 'chart' | 'code' | 'text-only' | 'unknown';
  detectedText?: string[];
  brandText?: string | null;
  dominantColors?: string[]; // hex
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
  async analyzeAndTag(assetId: string, url: string): Promise<void> {
    console.log('🔍 [MediaMetadata] Starting analysis for asset:', assetId);
    console.log('🔍 [MediaMetadata] Image URL:', url);
    
    try {
      const model = getModel('promptEnhancer'); // fast/cheap model
      console.log('🔍 [MediaMetadata] Using model:', model.provider, model.model);
      
      const content: any = [
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

      // Do not hard-enforce hints here; the Brain may override based on user intent.

      // Derive compact tags for phase 1 (no schema change)
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
        tags.push(...meta.dominantColors.slice(0, 3).map(c => `color:${c}`));
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

      // Append tags (dedup) without using db.raw (Neon-safe)
      const existing = await db.query.assets.findFirst({
        where: eq(assets.id, assetId),
        columns: { id: true, tags: true }
      });

      if (!existing) {
        console.error('🔍 [MediaMetadata] Asset not found in DB:', assetId);
        throw new Error('Asset not found when tagging');
      }

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
    }
  }
}

export const mediaMetadataService = new MediaMetadataService();
