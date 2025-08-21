/**
 * Figma Integration Type Definitions
 */

// Catalog types (unified with GitHub)
export type CatalogSource = 'github' | 'figma';
export type UICategoryKey = 'core' | 'auth' | 'commerce' | 'interactive' | 'content' | 'custom';

export interface CatalogItem {
  name: string;
  category: UICategoryKey;
  score: number;
  source: CatalogSource;
  
  // GitHub fields
  path?: string;
  repo?: string;
  
  // Figma fields
  fileKey?: string;
  nodeId?: string;
  previewUrl?: string;
  instances?: number; // Fan-in signal
}

export type UICatalog = Record<UICategoryKey, CatalogItem[]>;

// Figma API Types
export interface FigmaUser {
  id: string;
  email: string;
  handle: string;
  img_url?: string;
}

export interface FigmaTeam {
  id: string;
  name: string;
}

export interface FigmaProject {
  id: string;
  name: string;
}

export interface FigmaFile {
  key: string;
  name: string;
  thumbnail_url?: string;
  last_modified: string;
}

// Figma Node Types
export type FigmaNodeType = 
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'TEXT'
  | 'VECTOR'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'LINE'
  | 'BOOLEAN_OPERATION';

export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  locked?: boolean;
  children?: FigmaNode[];
  
  // Positioning
  absoluteBoundingBox?: Rectangle;
  relativeTransform?: Transform;
  size?: Vector;
  constraints?: {
    vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
    horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
  };
  
  // Styling
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  effects?: Effect[];
  opacity?: number;
  blendMode?: BlendMode;
  
  // Component-specific
  componentId?: string;
  componentProperties?: Record<string, any>;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Transform {
  [0]: [number, number, number];
  [1]: [number, number, number];
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'IMAGE';
  visible?: boolean;
  opacity?: number;
  color?: Color;
  gradientStops?: GradientStop[];
  scaleMode?: string;
}

export interface GradientStop {
  position: number;
  color: Color;
}

export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius?: number;
  color?: Color;
  offset?: Vector;
  spread?: number;
}

export type BlendMode = 
  | 'NORMAL'
  | 'MULTIPLY'
  | 'SCREEN'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT';

// Frame Node (important for components)
export interface FrameNode extends FigmaNode {
  type: 'FRAME';
  children: FigmaNode[];
  background?: Paint[];
  clipsContent?: boolean;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH';
}

// Component Node
export interface ComponentNode extends FigmaNode {
  type: 'COMPONENT';
  children: FigmaNode[];
  componentPropertyDefinitions?: Record<string, ComponentPropertyDefinition>;
}

// Instance Node
export interface InstanceNode extends FigmaNode {
  type: 'INSTANCE';
  componentId: string;
  componentProperties?: Record<string, any>;
  children: FigmaNode[];
}

// Text Node
export interface TextNode extends FigmaNode {
  type: 'TEXT';
  characters: string;
  style?: TypeStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<number, TypeStyle>;
}

export interface TypeStyle {
  fontFamily?: string;
  fontPostScriptName?: string;
  fontWeight?: number;
  fontSize?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  lineHeightUnit?: 'PIXELS' | 'FONT_SIZE_%' | 'INTRINSIC_%';
}

export interface ComponentPropertyDefinition {
  type: 'VARIANT' | 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP';
  defaultValue: any;
  variantOptions?: string[];
}

// File Response
export interface FigmaFileResponse {
  document: FigmaNode;
  components: Record<string, ComponentNode>;
  componentSets: Record<string, any>;
  styles: Record<string, any>;
  name: string;
  lastModified: string;
  version: string;
  thumbnailUrl?: string;
}

// Nodes Response (selective fetch)
export interface FigmaNodesResponse {
  nodes: Record<string, {
    document: FigmaNode;
    components?: Record<string, ComponentNode>;
    styles?: Record<string, any>;
  }>;
}

// Images Response
export interface FigmaImagesResponse {
  err?: string | null;
  images: Record<string, string>; // nodeId -> temporary URL
}

// Component Catalog (for storage)
export interface FigmaComponentCatalog {
  fileKey: string;
  fileName: string;
  lastIndexed: Date;
  categories: UICatalog;
}

// Motion Hints (for future plugin)
export interface MotionHints {
  enter?: {
    animation: 'slide' | 'fade' | 'scale' | 'rotate';
    direction?: 'up' | 'down' | 'left' | 'right';
    duration?: number;
    delay?: number;
    easing?: string;
  };
  exit?: MotionHints['enter'];
  hover?: MotionHints['enter'];
  stagger?: {
    delay: number;
    order: 'top-to-bottom' | 'left-to-right' | 'random';
  };
}

// Webhook Types
export interface FigmaWebhookPayload {
  event_type: 'FILE_UPDATE' | 'FILE_DELETE' | 'LIBRARY_PUBLISH';
  passcode: string;
  timestamp: string;
  file_key?: string;
  file_name?: string;
}

// OAuth Types
export interface FigmaOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: string;
}

// Request Queue Types
export interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

// Conversion Options
export interface ConversionOptions {
  format?: 'landscape' | 'portrait' | 'square';
  preserveAspectRatio?: boolean;
  includeMotionHints?: boolean;
  rasterizeComplexEffects?: boolean;
}

// Design Tokens
export interface DesignTokens {
  colors: Record<string, string>;
  typography: Record<string, TypeStyle>;
  spacing?: Record<string, number>;
  shadows?: Record<string, Effect>;
}