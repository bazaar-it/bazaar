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
  },  'gradient-text': {
    name: 'Gradient Text',
    supportedFormats: ['portrait', 'square'] as VideoFormat[],
    reason: 'Gradient text with responsive layout, optimized for portrait and square'
  },  'dot-dot-dot': {
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
    supportedFormats: ['landscape'] as VideoFormat[],
    reason: 'Text animation, optimized for landscape'
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
    supportedFormats: ['portrait', 'square'] as VideoFormat[],
    reason: 'Rotating text, works better in portrait and square'
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
  'tesla-stock-graph': {
    name: 'Tesla Stock Graph',
    supportedFormats: ['landscape', 'square'] as VideoFormat[],
    reason: 'Stock chart needs horizontal space for timeline'
  },
  'dual-screen-app': {
    name: 'Dual Screen App',
    supportedFormats: ['portrait', 'square'] as VideoFormat[],
    reason: 'Better suited for portrait and square formats'
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
    supportedFormats: ['portrait', 'square'] as VideoFormat[],
    reason: 'Sign-in button, optimized for mobile formats'
  },
  'github-sign-in': {
    name: 'GitHub Sign In',
    supportedFormats: ['portrait', 'square'] as VideoFormat[],
    reason: 'Sign-in button, optimized for mobile formats'
  },
  'google-sign-in': {
    name: 'Google Sign In',
    supportedFormats: ['portrait', 'square'] as VideoFormat[],
    reason: 'Sign-in button, optimized for mobile formats'
  },

  // Audio/visual templates (format agnostic)
  'audio-animation': {
    name: 'Audio Animation',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Audio visualizer, adapts to any format'
  },
  'flare-bg': {
    name: 'Flare BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Background gradient template adapts perfectly to all aspect ratios'
  },
  'pink-bg': {
    name: 'Pink BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Pink gradient background template adapts perfectly to all aspect ratios'
  },
  'summer-bg': {
    name: 'Summer BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Summer yellow-green gradient background template adapts perfectly to all aspect ratios'
  },
  'dark-forest-bg': {
    name: 'Dark Forest BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Dark forest black-to-green gradient background template adapts perfectly to all aspect ratios'
  },
  'blue-bg': {
    name: 'Blue BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Blue gradient background template adapts perfectly to all aspect ratios'
  },
  'space-grey-bg': {
    name: 'Space Grey BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Space grey gradient background template adapts perfectly to all aspect ratios'
  },
  'insta-bg': {
    name: 'Insta BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Instagram-style 3-color gradient background template adapts perfectly to all aspect ratios'
  },
  'sunrise-bg': {
    name: 'Sunrise BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Sunrise blue-to-orange gradient background template adapts perfectly to all aspect ratios'
  },
  'fruit-bg': {
    name: 'Fruit BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Fruit cyan-to-orange gradient background template adapts perfectly to all aspect ratios'
  },
  'bahamas-bg': {
    name: 'Bahamas BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Bahamas cyan-to-blue gradient background template adapts perfectly to all aspect ratios'
  },
  'cool-sky-bg': {
    name: 'Cool Sky BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Cool sky 3-color blue-to-white gradient background template adapts perfectly to all aspect ratios'
  },
  'vibey-bg': {
    name: 'Vibey BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Vibey magenta-to-cyan gradient background template adapts perfectly to all aspect ratios'
  },
  'vibes-bg-gradient': {
    name: 'Rainbow BG',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Background gradient template with vibrant color transitions adapts to all formats'
  },
  'today-1-percent': {
    name: 'Today, 1%',
    supportedFormats: ['landscape'] as VideoFormat[],
    reason: 'Optimized specifically for landscape format with fixed positioning for text elements'
  },
  'keyboard': {
    name: 'Keyboard',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Keyboard typing animation adapts well to all video formats'
  },
  'dark-bg-gradient-text': {
    name: 'Dark BG Gradient Text',
    supportedFormats: ['landscape', 'portrait'] as VideoFormat[],
    reason: 'Text-based template with animated gradient effects, optimized for landscape and portrait'
  },
  'fast-text': {
    name: 'Fast Text',
    supportedFormats: ['landscape', 'portrait', 'square'] as VideoFormat[],
    reason: 'Advanced typography animation with multiple text effects, dynamic sizing adapts perfectly to all aspect ratios'
  },};

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