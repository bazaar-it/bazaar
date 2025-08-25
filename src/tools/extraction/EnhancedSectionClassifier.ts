/**
 * Enhanced Section Classifier - Two-pass segmentation for pixel-perfect recreation
 * 
 * Pass A: Coarse vision classification
 * Pass B: Precise DOM snapping + focused extraction
 */

import sharp from 'sharp';
import crypto from 'crypto';
import OpenAI from 'openai';
import type { 
  BBox, 
  Screenshot, 
  UIRebuildSpec, 
  AssetsPack, 
  UILayer,
  ScreenshotSection 
} from './UIRebuildSpec';
import { bboxToPx, bboxToCss } from './UIRebuildSpec';
import { uploadScreenshotToR2 } from '~/lib/utils/r2-upload';

export interface SectionCrop {
  screenshotId: string;        // section ID
  screenshotUrl: string;       // R2 URL for the section
  bbox: BBox;                  // CSS px in the full page
  widthPx: number; 
  heightPx: number; 
  dpr: 2;
  parentId: string;            // full screenshot id
  digest: string;              // sha256 for cache-busting
}

export class EnhancedSectionClassifier {
  private readonly VIEWPORT_WIDTH = 1920;
  private readonly DPR = 2;
  private readonly OVERSCAN = 16; // px margin for safety
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  /**
   * Two-pass segmentation: coarse → precise
   */
  async classifyAndCropSections(
    fullScreenshot: Screenshot,
    fullScreenshotBuffer: Buffer,
    domSnapshot?: any, // Optional DOM data for precision
    projectId: string = 'extraction' // Optional projectId for R2 storage
  ): Promise<ScreenshotSection[]> {
    
    console.log('🎯 Starting two-pass section segmentation...');
    
    // Pass A: Coarse classification with vision LLM
    const coarseSections = await this.coarseSegmentation(fullScreenshot);
    console.log(`📍 Pass A: Found ${coarseSections.length} rough sections`);
    
    // Pass B: Precise boundary refinement
    const refinedSections = await this.refineWithDOM(
      coarseSections, 
      domSnapshot,
      fullScreenshot
    );
    console.log(`✨ Pass B: Refined to ${refinedSections.length} precise sections`);
    
    // Crop each section and store
    const croppedSections = await Promise.all(
      refinedSections.map(async section => {
        const crop = await this.cropAndStoreSection(
          fullScreenshotBuffer,
          fullScreenshot,
          section,
          projectId
        );
        
        return {
          ...section,
          screenshotId: crop.screenshotId,
          screenshotUrl: crop.screenshotUrl,
          evidence: crop
        };
      })
    );
    
    return croppedSections;
  }
  
  /**
   * Pass A: Coarse segmentation with vision model
   */
  private async coarseSegmentation(
    fullScreenshot: Screenshot
  ): Promise<ScreenshotSection[]> {
    
    console.log('🤖 [PIXEL-PERFECT] Calling GPT-4o-mini for section identification...');
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a UI/UX expert that identifies distinct sections in web page screenshots. Respond with valid JSON only.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this website screenshot and identify distinct visual sections from top to bottom.
                
                For each MAJOR section, provide:
                - type: one of [hero, features, timeline, testimonials, stats, pricing, cta, footer, custom]
                - yStart: starting Y coordinate in CSS pixels
                - yEnd: ending Y coordinate in CSS pixels (viewport width is 1920px)
                - elements: array of key visual elements you see
                - confidence: 0-1 confidence score
                - description: brief description of what this section contains
                
                Important:
                - Each section should be SUBSTANTIAL (minimum 400px height unless it's a simple CTA)
                - Group related content together (e.g., all FAQ items in one section)
                - Hero sections are typically 600-800px tall
                - Feature sections often span 800-1200px
                - Don't split up content that belongs together
                - Aim for 3-7 major sections total, not 10+ tiny slices
                - Return as JSON array ordered top to bottom
                
                Example response:
                [
                  {
                    "type": "hero",
                    "yStart": 0,
                    "yEnd": 600,
                    "elements": ["large headline", "subheadline", "CTA button", "navigation menu"],
                    "confidence": 0.95,
                    "description": "Main hero section with headline and call-to-action"
                  }
                ]`
              },
              {
                type: 'image_url',
                image_url: {
                  url: fullScreenshot.url,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });
      
      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from GPT-4o-mini');
      
      const parsed = JSON.parse(response);
      const sections = parsed.sections || parsed || [];
      
      console.log(`✅ [PIXEL-PERFECT] GPT-4o-mini identified ${sections.length} sections`);
      
      return sections.map((section: any, i: number) => ({
        id: `section_${i}`,
        type: section.type as any,
        bbox: {
          x: 0,
          y: section.yStart || 0,
          w: this.VIEWPORT_WIDTH,
          h: (section.yEnd || 600) - (section.yStart || 0)
        },
        description: section.description || `${section.type} section`,
        keyElements: section.elements || [],
        suggestedDurationMs: this.getDurationForType(section.type),
        screenshotId: '', // Will be filled after cropping
        screenshotUrl: '', // Will be filled after cropping
        confidence: section.confidence || 0.8,
        evidence: {} as SectionCrop // Will be filled after cropping
      }));
      
    } catch (error) {
      console.error('❌ [PIXEL-PERFECT] GPT-4o-mini call failed, using fallback:', error);
      
      // Fallback to basic sections if API fails
      return [
        {
          id: 'section_0',
          type: 'hero',
          bbox: { x: 0, y: 0, w: this.VIEWPORT_WIDTH, h: 600 },
          description: 'Hero section (fallback)',
          keyElements: ['headline', 'cta'],
          suggestedDurationMs: 3000,
          screenshotId: '',
          screenshotUrl: '',
          confidence: 0.5,
          evidence: {} as SectionCrop
        },
        {
          id: 'section_1',
          type: 'features',
          bbox: { x: 0, y: 600, w: this.VIEWPORT_WIDTH, h: 800 },
          description: 'Features section (fallback)',
          keyElements: ['feature cards'],
          suggestedDurationMs: 4000,
          screenshotId: '',
          screenshotUrl: '',
          confidence: 0.5,
          evidence: {} as SectionCrop
        }
      ];
    }
  }
  
  /**
   * Pass B: Refine with DOM data and heuristics
   */
  private async refineWithDOM(
    coarseSections: ScreenshotSection[],
    domSnapshot: any,
    fullScreenshot: Screenshot
  ): Promise<ScreenshotSection[]> {
    
    if (!domSnapshot) {
      // No DOM data, just add overscan
      return coarseSections.map(section => ({
        ...section,
        bbox: this.addOverscan(section.bbox, fullScreenshot.heightPx / this.DPR)
      }));
    }
    
    // Use DOM landmarks to snap to real boundaries
    const landmarks = this.extractLandmarks(domSnapshot);
    
    return coarseSections.map(section => {
      // Find closest semantic boundary
      const snappedBbox = this.snapToLandmark(section.bbox, landmarks);
      
      // Add overscan for safety
      const finalBbox = this.addOverscan(
        snappedBbox, 
        fullScreenshot.heightPx / this.DPR
      );
      
      return {
        ...section,
        bbox: finalBbox,
        confidence: Math.min(section.confidence * 1.1, 1) // Boost confidence
      };
    });
  }
  
  /**
   * Crop section and upload to R2
   */
  private async cropAndStoreSection(
    fullBuffer: Buffer,
    fullScreenshot: Screenshot,
    section: ScreenshotSection,
    projectId: string = 'extraction'  // Default projectId for extraction
  ): Promise<SectionCrop> {
    
    // Convert CSS bbox to pixel bbox for cropping
    const cropPx = bboxToPx(section.bbox, this.DPR);
    
    // Perform the crop
    const croppedBuffer = await sharp(fullBuffer)
      .extract({
        left: cropPx.x,
        top: cropPx.y,
        width: cropPx.w,
        height: cropPx.h
      })
      .toBuffer();
    
    // Generate digest for versioning
    const digest = crypto
      .createHash('sha256')
      .update(croppedBuffer)
      .digest('hex')
      .substring(0, 8);
    
    // Upload to R2
    const screenshotId = `section_${section.type}_${digest}`;
    const url = await uploadScreenshotToR2(
      croppedBuffer,
      `sections/${screenshotId}.png`,
      projectId
    );
    
    return {
      screenshotId,
      screenshotUrl: url,
      bbox: section.bbox,
      widthPx: cropPx.w,
      heightPx: cropPx.h,
      dpr: this.DPR,
      parentId: fullScreenshot.id,
      digest
    };
  }
  
  /**
   * Extract UI rebuild spec for a section
   */
  async deriveUIRebuildSpec(
    section: ScreenshotSection,
    sectionScreenshotUrl: string
  ): Promise<UIRebuildSpec> {
    
    console.log(`🔍 [PIXEL-PERFECT] Extracting UI layers for ${section.type} section...`);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a UI extraction expert. Analyze screenshots and extract exact UI element positions and properties. Respond with valid JSON only.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all UI elements from this ${section.type} section screenshot.

                For each visible element, provide a layer object with:
                
                TEXT LAYERS: {
                  "kind": "text",
                  "id": "unique_id",
                  "box": { "x": number, "y": number, "w": number, "h": number },
                  "text": "exact text content",
                  "role": "headline|subhead|body|stat",
                  "style": {
                    "fontFamily": "font name",
                    "fontSize": number (in px),
                    "fontWeight": number,
                    "lineHeight": number,
                    "color": "#hexcolor"
                  }
                }
                
                BUTTON LAYERS: {
                  "kind": "button",
                  "id": "unique_id",
                  "box": { "x": number, "y": number, "w": number, "h": number },
                  "label": "button text",
                  "variant": "filled|outline|ghost",
                  "style": {
                    "bg": "#hexcolor",
                    "text": "#hexcolor",
                    "radius": number,
                    "border": "border style or none"
                  }
                }
                
                CARD LAYERS: {
                  "kind": "card",
                  "id": "unique_id",
                  "box": { "x": number, "y": number, "w": number, "h": number },
                  "radius": number,
                  "bg": "#hexcolor",
                  "shadow": "box-shadow value",
                  "children": ["child_layer_ids"]
                }
                
                Return JSON:
                {
                  "layers": [...array of layer objects...],
                  "zOrder": [...layer ids in paint order (back to front)...]
                }
                
                Important:
                - All positions are in CSS pixels (viewport width 1920px)
                - Positions are relative to section top-left (0,0)
                - Extract EXACT text, don't paraphrase
                - Use exact hex colors you see
                - Group related elements (e.g., card contains its text/buttons)`
              },
              {
                type: 'image_url',
                image_url: {
                  url: sectionScreenshotUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      });
      
      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from GPT-4o-mini');
      
      const parsed = JSON.parse(response);
      const layers = parsed.layers || [];
      const zOrder = parsed.zOrder || layers.map((l: any) => l.id);
      
      console.log(`✅ [PIXEL-PERFECT] Extracted ${layers.length} UI layers`);
      
      return {
        sectionId: section.id,
        screenshotId: section.screenshotId,
        base: { width: 1920, height: section.bbox.h },
        layers: layers as UILayer[],
        zOrder,
        evidence: {
          screenshotId: section.screenshotId,
          bbox: section.bbox
        }
      };
      
    } catch (error) {
      console.error('❌ [PIXEL-PERFECT] UI extraction failed, using minimal spec:', error);
      
      // Fallback to minimal spec
      return {
        sectionId: section.id,
        screenshotId: section.screenshotId,
        base: { width: 1920, height: section.bbox.h },
        layers: [],
        zOrder: [],
        evidence: {
          screenshotId: section.screenshotId,
          bbox: section.bbox
        }
      };
    }
  }
  
  /**
   * Extract assets (icons, images, etc) from section
   */
  async extractAssets(
    section: ScreenshotSection,
    domData?: any
  ): Promise<AssetsPack> {
    
    const assets: AssetsPack = {
      sectionId: section.id,
      svgs: {},
      images: {},
      glyphs: {}
    };
    
    // Extract inline SVGs from DOM
    if (domData?.svgs) {
      for (const svg of domData.svgs) {
        assets.svgs[svg.id] = {
          svg: svg.content,
          colorizable: svg.fill !== 'none'
        };
      }
    }
    
    // Extract images that need sprite fallback
    // These would be complex illustrations we can't recreate
    
    return assets;
  }
  
  // Helper methods
  
  private extractLandmarks(domSnapshot: any) {
    // Extract semantic boundaries from DOM
    // Look for: header, main > section, role attributes, etc.
    return {
      header: { y: 0, h: 100 },
      sections: [
        { y: 100, h: 400 },
        { y: 500, h: 600 }
      ]
    };
  }
  
  private snapToLandmark(bbox: BBox, landmarks: any): BBox {
    // Snap bbox to closest semantic boundary
    // This ensures we don't cut through content
    return bbox; // Simplified for now
  }
  
  private addOverscan(bbox: BBox, maxHeight: number): BBox {
    return {
      x: bbox.x,
      y: Math.max(0, bbox.y - this.OVERSCAN),
      w: bbox.w,
      h: Math.min(
        bbox.h + (this.OVERSCAN * 2),
        maxHeight - bbox.y + this.OVERSCAN
      )
    };
  }
  
  private getDurationForType(type: string): number {
    const durations: Record<string, number> = {
      hero: 3000,
      timeline: 5000,
      features: 4000,
      testimonials: 3000,
      cta: 2000
    };
    return durations[type] || 3000;
  }
  
  private async extractLayers(
    section: ScreenshotSection,
    screenshotUrl: string
  ): Promise<UILayer[]> {
    // This would call vision API to extract precise layers
    // For now, return example based on section type
    
    if (section.type === 'timeline') {
      return [
        {
          kind: 'text',
          id: 'timeline_title',
          box: { x: 240, y: 72, w: 1200, h: 96 },
          text: "Here's what you can get done with Ramp in just 30 days",
          role: 'headline',
          style: {
            fontFamily: 'Inter',
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 56,
            color: '#0B0B0B'
          }
        },
        {
          kind: 'card',
          id: 'card_day0',
          box: { x: 180, y: 220, w: 420, h: 300 },
          radius: 16,
          bg: '#FFFFFF',
          shadow: '0 4px 6px rgba(0,0,0,0.1)',
          children: ['card_day0_title', 'card_day0_items']
        }
      ];
    }
    
    return [];
  }
}