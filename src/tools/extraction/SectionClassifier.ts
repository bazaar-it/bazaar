/**
 * Section Classifier - Identifies UI regions for targeted generation
 * 
 * This solves the problem of LLMs being overwhelmed by full screenshots.
 * Instead, we identify regions first, then generate each section separately.
 */

export interface ScreenshotSection {
  id: string;
  type: 'hero' | 'timeline' | 'features' | 'testimonials' | 'cta' | 'custom';
  verticalPosition: {
    start: number;  // Approximate pixel from top
    end: number;    // Approximate pixel from top
  };
  description: string;
  keyElements: string[];
  suggestedDuration: number; // For scene generation
  confidence: number;
}

export class SectionClassifier {
  
  /**
   * Analyze full screenshot and identify distinct sections
   * This is what LLMs CAN do well - classification, not pixel-perfect extraction
   */
  async classifySections(
    fullScreenshotUrl: string,
    pageHeight: number
  ): Promise<ScreenshotSection[]> {
    
    // This is achievable with current LLMs
    const prompt = `
    Analyze this website screenshot and identify distinct visual sections.
    
    The page is ${pageHeight}px tall. Estimate the vertical position of each section.
    
    For each distinct section you see, provide:
    1. Section type (hero/timeline/features/testimonials/cta)
    2. Approximate vertical position (e.g., 0-500px, 500-1200px)
    3. Brief description of what's in this section
    4. Key visual elements (headlines, cards, buttons, etc.)
    
    Be generous with boundaries - better to include too much than cut off content.
    
    Return as JSON array of sections, ordered from top to bottom.
    `;
    
    // Call GPT-4V or similar
    const response = await this.callVisionAPI(fullScreenshotUrl, prompt);
    
    return this.validateAndEnhanceSections(response, pageHeight);
  }
  
  /**
   * Crop screenshot to specific section
   * This gives us focused images for better generation
   */
  async extractSectionScreenshot(
    fullScreenshotBuffer: Buffer,
    section: ScreenshotSection
  ): Promise<string> {
    // Using sharp or canvas to crop
    const sharp = require('sharp');
    
    const cropped = await sharp(fullScreenshotBuffer)
      .extract({
        left: 0,
        top: section.verticalPosition.start,
        width: 1920, // Full width
        height: section.verticalPosition.end - section.verticalPosition.start
      })
      .toBuffer();
    
    // Upload to R2 and return URL
    return await this.uploadToR2(cropped, `section_${section.id}.png`);
  }
  
  /**
   * Smart section-to-scene mapping
   */
  mapSectionsToScenes(
    sections: ScreenshotSection[],
    storyArc: any
  ): Array<{ scene: any; section: ScreenshotSection; croppedImageUrl: string }> {
    
    const mappings = [];
    
    for (const scene of storyArc.scenes) {
      // Find best matching section for this scene
      const matchedSection = this.findBestSectionMatch(scene, sections);
      
      if (matchedSection) {
        mappings.push({
          scene,
          section: matchedSection,
          croppedImageUrl: matchedSection.screenshotUrl
        });
      }
    }
    
    return mappings;
  }
  
  private findBestSectionMatch(scene: any, sections: ScreenshotSection[]) {
    // Smart matching based on scene requirements
    if (scene.emotionalBeat === 'problem' && sections.find(s => s.type === 'hero')) {
      return sections.find(s => s.type === 'hero');
    }
    
    if (scene.title.includes('Feature') && sections.find(s => s.type === 'features')) {
      return sections.find(s => s.type === 'features');
    }
    
    // Add more matching logic
    return sections[0]; // Fallback
  }
  
  private validateAndEnhanceSections(
    sections: any[],
    pageHeight: number
  ): ScreenshotSection[] {
    // Ensure sections cover the full page
    // Fill gaps if needed
    // Validate boundaries
    
    return sections.map((s, i) => ({
      id: `section_${i}`,
      type: s.type || 'custom',
      verticalPosition: {
        start: Math.max(0, s.verticalStart || 0),
        end: Math.min(pageHeight, s.verticalEnd || 500)
      },
      description: s.description,
      keyElements: s.keyElements || [],
      suggestedDuration: this.calculateDuration(s.type),
      confidence: s.confidence || 0.8
    }));
  }
  
  private calculateDuration(sectionType: string): number {
    // Frames at 30fps
    const durations: Record<string, number> = {
      hero: 90,      // 3 seconds
      timeline: 150, // 5 seconds
      features: 120, // 4 seconds
      testimonials: 90,
      cta: 60        // 2 seconds
    };
    return durations[sectionType] || 90;
  }
  
  private async callVisionAPI(imageUrl: string, prompt: string) {
    // Actual implementation would call GPT-4V
    // For now, mock response
    return [
      {
        type: 'hero',
        verticalStart: 0,
        verticalEnd: 400,
        description: 'Header with navigation and main headline',
        keyElements: ['nav menu', 'headline', 'cta button']
      },
      {
        type: 'timeline',
        verticalStart: 400,
        verticalEnd: 1000,
        description: '30-day implementation timeline with 3 cards',
        keyElements: ['timeline title', 'day 0 card', 'day 5 card', 'day 30 card']
      }
    ];
  }
  
  private async uploadToR2(buffer: Buffer, filename: string): Promise<string> {
    // Use existing R2 upload logic
    return `https://r2.dev/sections/${filename}`;
  }
}

// Example usage in the extraction pipeline:
export async function enhancedExtractionPipeline(url: string) {
  // 1. Get full screenshot (existing)
  const fullScreenshot = await captureFullPageScreenshot(url);
  
  // 2. Classify sections (NEW)
  const classifier = new SectionClassifier();
  const sections = await classifier.classifySections(
    fullScreenshot.url,
    fullScreenshot.height
  );
  
  // 3. Crop each section (NEW)
  const sectionScreenshots = [];
  for (const section of sections) {
    const croppedUrl = await classifier.extractSectionScreenshot(
      fullScreenshot.buffer,
      section
    );
    sectionScreenshots.push({
      ...section,
      screenshotUrl: croppedUrl
    });
  }
  
  // 4. Generate scenes with focused images (BETTER!)
  const scenes = [];
  for (const section of sectionScreenshots) {
    // Your existing add tool, but with focused image!
    const sceneCode = await generateSceneFromImage({
      image: section.screenshotUrl,  // Just this section!
      type: section.type,
      content: section.keyElements
    });
    scenes.push(sceneCode);
  }
  
  return scenes;
}