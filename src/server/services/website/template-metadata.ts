/**
 * Template metadata for server-side use
 * This avoids importing actual Remotion components in server code
 */

export interface TemplateMetadata {
  id: string;
  name: string;
  duration: number;
  category?: string;
}

// Server-safe template metadata (no Remotion imports)
export const TEMPLATE_METADATA: TemplateMetadata[] = [
  // Text animations
  { id: 'FastText', name: 'Fast Text', duration: 150, category: 'text' },
  { id: 'GradientText', name: 'Gradient Text', duration: 150, category: 'text' },
  { id: 'DarkBGGradientText', name: 'Dark BG Gradient Text', duration: 150, category: 'text' },
  { id: 'MorphingText', name: 'Morphing Text', duration: 240, category: 'text' },
  { id: 'WordFlip', name: 'Word Flip', duration: 150, category: 'text' },
  { id: 'CarouselText', name: 'Carousel Text', duration: 300, category: 'text' },
  { id: 'TypingTemplate', name: 'Typing Template', duration: 150, category: 'text' },
  { id: 'GlitchText', name: 'Glitch Text', duration: 150, category: 'text' },
  
  // Transitions
  { id: 'FadeIn', name: 'Fade In', duration: 90, category: 'transition' },
  { id: 'ScaleIn', name: 'Scale In', duration: 60, category: 'transition' },
  { id: 'SlideIn', name: 'Slide In', duration: 60, category: 'transition' },
  { id: 'WipeIn', name: 'Wipe In', duration: 90, category: 'transition' },
  { id: 'DrawOn', name: 'Draw On', duration: 150, category: 'transition' },
  
  // Effects
  { id: 'ParticleExplosion', name: 'Particle Explosion', duration: 120, category: 'effect' },
  { id: 'FloatingParticles', name: 'Floating Particles', duration: 300, category: 'effect' },
  { id: 'FloatingElements', name: 'Floating Elements', duration: 300, category: 'effect' },
  { id: 'PulsingCircles', name: 'Pulsing Circles', duration: 150, category: 'effect' },
  { id: 'WaveAnimation', name: 'Wave Animation', duration: 180, category: 'effect' },
  { id: 'HighlightSweep', name: 'Highlight Sweep', duration: 150, category: 'effect' },
  
  // Data viz
  { id: 'GrowthGraph', name: 'Growth Graph', duration: 150, category: 'data' },
  { id: 'TeslaStockGraph', name: 'Tesla Stock Graph', duration: 300, category: 'data' },
  { id: 'Today1Percent', name: 'Today 1 Percent', duration: 90, category: 'data' },
  
  // App/UI
  { id: 'AppJiggle', name: 'App Jiggle', duration: 120, category: 'app' },
  { id: 'DualScreenApp', name: 'Dual Screen App', duration: 240, category: 'app' },
  { id: 'MobileApp', name: 'Mobile App', duration: 180, category: 'app' },
  { id: 'AppDownload', name: 'App Download', duration: 150, category: 'app' },
  
  // Backgrounds
  { id: 'DarkForestBG', name: 'Dark Forest BG', duration: 150, category: 'background' },
  { id: 'BlueBG', name: 'Blue BG', duration: 150, category: 'background' },
  { id: 'FlareBG', name: 'Flare BG', duration: 150, category: 'background' },
  
  // Branding
  { id: 'LogoTemplate', name: 'Logo Template', duration: 90, category: 'brand' },
  { id: 'HeroTemplate', name: 'Hero Template', duration: 150, category: 'brand' },
  { id: 'PromptIntro', name: 'Prompt Intro', duration: 150, category: 'brand' },
];

// Get template metadata by ID
export function getTemplateMetadata(templateId: string): TemplateMetadata | undefined {
  return TEMPLATE_METADATA.find(t => t.id === templateId);
}

// Get templates by category
export function getTemplatesByCategory(category: string): TemplateMetadata[] {
  return TEMPLATE_METADATA.filter(t => t.category === category);
}