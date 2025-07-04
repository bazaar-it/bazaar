// Script to analyze templates and determine their format compatibility
// This is a temporary analysis script to help determine which formats each template supports

import { type VideoFormat } from '../app/projects/new/FormatSelector';

// Template analysis results based on manual review
export const templateFormatAnalysis = {
  // Text-based templates that work well in all formats
  'knowscode': {
    name: 'Knows Code',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Text-based with centered content, scales well to all formats'
  },
  'prompt-intro': {
    name: 'Prompt Intro',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Centered text animation, works in all formats'
  },
  'blue-gradient-text': {
    name: 'Blue Gradient Text',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Simple text animation, adaptable to any format'
  },
  'gradient-text': {
    name: 'Gradient Text',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Centered gradient text, works everywhere'
  },
  'generating': {
    name: 'Generating',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Loading animation, centered content'
  },
  'dot-dot-dot': {
    name: 'Dot Dot Dot',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Simple animation, works in all formats'
  },
  'placeholders': {
    name: 'Placeholders',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Flexible placeholder animation'
  },
  'word-flip': {
    name: 'Word Flip',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Text animation, adaptable'
  },
  'morphing-text': {
    name: 'Morphing Text',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Text morphing, works in all formats'
  },
  'highlight-sweep': {
    name: 'Highlight Sweep',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Text highlight effect, adaptable'
  },
  'carousel-text': {
    name: 'Carousel Text',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Rotating text, centered'
  },
  'draw-on': {
    name: 'Draw On',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Drawing animation, scalable'
  },
  'wipe-in': {
    name: 'Wipe In',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Transition effect, works everywhere'
  },
  'scale-in': {
    name: 'Scale In',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Scaling animation, format agnostic'
  },
  'slide-in': {
    name: 'Slide In',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Sliding animation, adaptable'
  },
  'fade-in': {
    name: 'Fade In',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Fade effect, works in all formats'
  },

  // Mobile-specific templates (work best in portrait)
  'mobile-app': {
    name: 'Mobile App',
    supportedFormats: ['portrait'] as VideoFormat[],
    reason: 'Shows a phone mockup, designed specifically for portrait'
  },

  // Landscape-optimized templates (work best in landscape, okay in square)
  'fintech-ui': {
    name: 'Fintech UI',
    supportedFormats: ['landscape', 'square'] as VideoFormat[],
    reason: 'Dashboard layout with multiple panels, needs horizontal space'
  },
  'growth-graph': {
    name: 'Growth Graph',
    supportedFormats: ['landscape', 'square'] as VideoFormat[],
    reason: 'Horizontal graph visualization, better in landscape'
  },
  'tesla-stock-graph': {
    name: 'Tesla Stock Graph',
    supportedFormats: ['landscape', 'square'] as VideoFormat[],
    reason: 'Stock chart needs horizontal space for timeline'
  },
  'dual-screen-app': {
    name: 'Dual Screen App',
    supportedFormats: ['landscape'] as VideoFormat[],
    reason: 'Shows two phone screens side by side, requires landscape'
  },
  'coding': {
    name: 'Coding',
    supportedFormats: ['landscape', 'square'] as VideoFormat[],
    reason: 'Code editor layout, better with horizontal space'
  },
  'prompt-ui': {
    name: 'Prompt UI',
    supportedFormats: ['landscape', 'square'] as VideoFormat[],
    reason: 'UI interface, designed for horizontal layouts'
  },
  'cursor-click-scene': {
    name: 'Cursor Click Scene',
    supportedFormats: ['landscape', 'square'] as VideoFormat[],
    reason: 'Desktop interaction, better in landscape'
  },

  // Sign-in templates (work in all formats but better in portrait/square for mobile)
  'apple-sign-in': {
    name: 'Apple Sign In',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Sign-in button, works in all formats but great for mobile'
  },
  'github-sign-in': {
    name: 'GitHub Sign In',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Sign-in button, adaptable to all formats'
  },
  'google-sign-in': {
    name: 'Google Sign In',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Sign-in button, works everywhere'
  },

  // Audio/visual templates (format agnostic)
  'audio-animation': {
    name: 'Audio Animation',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Audio visualizer, adapts to any format'
  },
};

// Helper function to get supported formats for a template
export function getTemplateSupportedFormats(templateId: string): VideoFormat[] {
  const analysis = templateFormatAnalysis[templateId as keyof typeof templateFormatAnalysis];
  return analysis?.supportedFormats ?? ['landscape']; // Default to landscape if not found
}

// Helper function to check if a template supports a specific format
export function doesTemplateSupport(templateId: string, format: VideoFormat): boolean {
  const supportedFormats = getTemplateSupportedFormats(templateId);
  return supportedFormats.includes(format);
}