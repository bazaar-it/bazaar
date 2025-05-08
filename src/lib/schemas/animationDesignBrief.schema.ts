// /src/lib/schemas/animationDesignBrief.schema.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

const easingOptions = [
  'linear',
  'easeInSine', 'easeOutSine', 'easeInOutSine',
  'easeInQuad', 'easeOutQuad', 'easeInOutQuad',
  'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
  'easeInQuart', 'easeOutQuart', 'easeInOutQuart',
  'easeInQuint', 'easeOutQuint', 'easeInOutQuint',
  'easeInExpo', 'easeOutExpo', 'easeInOutExpo',
  'easeInCirc', 'easeOutCirc', 'easeInOutCirc',
  'easeInBack', 'easeOutBack', 'easeInOutBack',
  'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
  'easeInBounce', 'easeOutBounce', 'easeInOutBounce',
  'spring',
] as const;

export const layoutSchema = z.object({
  x: z.union([z.number(), z.string()]).describe('X position (pixels or percentage string like \"50%\")'),
  y: z.union([z.number(), z.string()]).describe('Y position (pixels or percentage string like \"50%\")'),
  width: z.union([z.number(), z.string()]).optional().describe('Width (pixels or percentage string)'),
  height: z.union([z.number(), z.string()]).optional().describe('Height (pixels or percentage string)'),
  opacity: z.number().min(0).max(1).optional().default(1).describe('Opacity (0 to 1)'),
  rotation: z.number().optional().default(0).describe('Rotation in degrees'),
  scale: z.number().optional().default(1).describe('Scale factor'),
  backgroundColor: z.string().optional().describe('Background color (e.g., hex, rgba)'),
  zIndex: z.number().int().optional().describe('Stacking order of the element (higher values are on top)'),
}).describe('Defines the initial visual layout and styling of an element.');

export const animationPropertySchema = z.object({
  property: z.string().describe('CSS-like property to animate (e.g., \"opacity\", \"x\", \"backgroundColor\")'),
  from: z.union([z.string(), z.number(), z.boolean()]).describe('Starting value of the property'),
  to: z.union([z.string(), z.number(), z.boolean()]).describe('Ending value of the property'),
}).describe('Defines a single property being animated from a start to an end value.');

export const animationSchema = z.object({
  animationId: z.string().describe('Identifier for this animation definition'),
  animationType: z.string().describe('Type of animation (e.g., \"fadeIn\", \"slideInLeft\", \"customProperty\", \"pulse\")'),
  trigger: z.enum(['onLoad', 'onClick', 'onHover', 'afterPrevious', 'withPrevious']).optional().default('onLoad').describe('Event or condition that triggers the animation'),
  startAtFrame: z.number().int().min(0).describe('Frame number (relative to scene start or trigger) when the animation begins'),
  durationInFrames: z.number().int().min(1).describe('Duration of the animation in frames'),
  delayInFrames: z.number().int().min(0).optional().default(0).describe('Delay in frames before the animation starts after being triggered'),
  easing: z.string().optional().default('easeInOutCubic').describe('Easing function for the animation'),
  propertiesAnimated: z.array(animationPropertySchema).optional().default([]).describe('Array of properties to be animated'),
  pathData: z.string().optional().describe('SVG path data for path-based animations (e.g., \"M10 10 H 90 V 90 H 10 Z\")'),
  controlPoints: z.array(z.object({ x: z.number(), y: z.number() })).optional().describe('Control points for complex curve-based animations'),
  repeat: z.object({
    count: z.union([z.number().int().min(1), z.literal('infinite')]).describe('Number of times to repeat, or \"infinite\"'),
    direction: z.enum(['normal', 'reverse', 'alternate']).optional().default('normal').describe('Direction of repetition'),
  }).optional().describe('Settings for repeating the animation'),
}).describe('Defines a single animation sequence for an element.');

export const elementSchema = z.object({
  elementId: z.string().describe('Identifier for this element within the scene'),
  elementType: z.enum(['text', 'image', 'video', 'shape', 'audio', 'customComponent']).describe('Type of the element'),
  name: z.string().optional().describe('Descriptive name for the element (e.g., \"Headline Text\", \"Background Image\")'),
  content: z.string().optional().describe('Text content for \"text\" elements'),
  assetUrl: z.string().optional().describe('URL for \"image\", \"video\", or \"audio\" elements'),
  shapeType: z.enum(['rectangle', 'circle', 'ellipse', 'line', 'triangle', 'polygon', 'star']).optional().describe('Specific shape type for \"shape\" elements'),
  componentName: z.string().optional().describe('Name of the custom Remotion component for \"customComponent\" type'),
  initialLayout: layoutSchema.describe('Initial layout and styling of the element at the start of its appearance'),
  animations: z.array(animationSchema).optional().default([]).describe('Array of animations to be applied to this element'),
}).describe('Defines a visual or auditory element within the scene and its animations.');

export const colorPaletteSchema = z.object({
  primary: z.string().optional().describe('Primary color (hex, rgba, etc.)'),
  secondary: z.string().optional().describe('Secondary color'),
  accent: z.string().optional().describe('Accent color'),
  background: z.string().describe('Background color for the scene/canvas'),
  textPrimary: z.string().optional().describe('Primary text color'),
  textSecondary: z.string().optional().describe('Secondary text color'),
  customColors: z.record(z.string()).optional().describe('Record of additional custom named colors'),
}).describe('Defines the color palette for the scene.');

export const typographyStyleSchema = z.object({
  fontFamily: z.string().optional().describe('Font family (e.g., \"Arial\", \"Roboto\")'),
  fontSize: z.union([z.number().min(1), z.string()]).optional().describe('Font size (e.g., 16, \"1.5em\")'),
  fontWeight: z.union([z.number().min(100).max(900), z.enum(['normal', 'bold', 'lighter', 'bolder'])]).optional().describe('Font weight (e.g., 400, \"bold\")'),
  lineHeight: z.union([z.number(), z.string()]).optional().describe('Line height (e.g., 1.5, \"150%\")'),
  letterSpacing: z.union([z.number(), z.string()]).optional().describe('Letter spacing (e.g., 0.5, \"0.05em\")'),
  color: z.string().optional().describe('Text color for this specific typography style'),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional().describe('Text alignment'),
}).describe('Defines a specific typographic style.');

export const typographySchema = z.object({
  defaultFontFamily: z.string().optional().describe('Default font family for the scene if not overridden'),
  heading1: typographyStyleSchema.optional().describe('Style for H1 headings'),
  heading2: typographyStyleSchema.optional().describe('Style for H2 headings'),
  body: typographyStyleSchema.optional().describe('Style for body text'),
  caption: typographyStyleSchema.optional().describe('Style for captions or smaller text'),
  customStyles: z.record(typographyStyleSchema).optional().describe('Record of additional custom named text styles'),
}).describe('Defines typographic styles for the scene.');

export const audioTrackSchema = z.object({
  trackId: z.string().describe('Identifier for the audio track'),
  url: z.string().optional().describe('URL of the audio file'),
  source: z.string().optional().describe('Source path of the audio file (alternative to url)'),
  volume: z.number().min(0).max(1).optional().default(1).describe('Volume (0 to 1)'),
  startAtFrame: z.number().int().min(0).optional().default(0).describe('Frame number (relative to scene start) when the audio begins playing'),
  startFrame: z.number().int().min(0).optional().describe('Alternative name for startAtFrame'),
  endFrame: z.number().int().optional().describe('Frame number when the audio should end'),
  loop: z.boolean().optional().default(false).describe('Whether the audio should loop'),
}).describe('Defines an audio track to be played in the scene')
.transform(data => {
  // Handle alternative field names
  return {
    ...data,
    startAtFrame: data.startAtFrame ?? data.startFrame ?? 0,
    url: data.url ?? data.source,
  };
});

export const animationDesignBriefSchema = z.object({
  briefVersion: z.string().default('1.0.0').describe('Version of the Animation Design Brief schema used'),
  sceneId: z.string().describe('Identifier for the scene this brief describes'),
  sceneName: z.string().optional().describe('User-friendly name for the scene (e.g., \"Introduction Sequence\")'),
  scenePurpose: z.string().describe('The main goal or message of this scene (e.g., \"Introduce Product X\", \"Highlight Feature Y\")'),
  overallStyle: z.string().describe('Overall artistic style and mood (e.g., \"energetic and vibrant\", \"minimalist and clean\", \"cinematic and dramatic\")'),
  durationInFrames: z.number().int().min(1).describe('Total duration of the scene in frames'),
  dimensions: z.object({
    width: z.number().int().min(1).describe('Canvas width in pixels'),
    height: z.number().int().min(1).describe('Canvas height in pixels'),
  }).describe('Dimensions of the scene canvas'),
  colorPalette: colorPaletteSchema.describe('Color palette for the scene'),
  typography: typographySchema.optional().describe('Typographic styles for the scene'),
  audioTracks: z.array(audioTrackSchema).optional().default([]).describe('Array of audio tracks to be used in the scene'),
  elements: z.array(elementSchema).min(1).describe('Array of elements that make up the scene'),
  notes: z.string().optional().describe('Any additional notes or specific instructions for the animation designer or LLM.'),
}).describe('A comprehensive brief detailing the design and animation for a single Remotion scene.');

// Infer TypeScript type from the Zod schema
export type AnimationDesignBrief = z.infer<typeof animationDesignBriefSchema>;
export type SceneElement = z.infer<typeof elementSchema>;
export type Animation = z.infer<typeof animationSchema>;
export type AnimationProperty = z.infer<typeof animationPropertySchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type ColorPalette = z.infer<typeof colorPaletteSchema>;
export type Typography = z.infer<typeof typographySchema>;
export type TypographyStyle = z.infer<typeof typographyStyleSchema>;
export type AudioTrack = z.infer<typeof audioTrackSchema>;