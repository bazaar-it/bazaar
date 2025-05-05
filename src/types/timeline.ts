// src/types/timeline.ts
/**
 * Type definitions for the Timeline component
 */

/**
 * Enum for different types of timeline items
 */
export enum TimelineItemType {
  VIDEO = "video",
  AUDIO = "audio",
  TEXT = "text",
  IMAGE = "image",
  CUSTOM = "custom",
}

/**
 * Base interface for all timeline items
 */
export interface TimelineItem {
  id: number;
  type: TimelineItemType;
  from: number; // Start frame
  durationInFrames: number;
  row: number; // Vertical position in timeline
}

/**
 * Video item properties
 */
export interface VideoItem extends TimelineItem {
  type: TimelineItemType.VIDEO;
  src: string;
  startTime?: number; // Time offset within the source video
  thumbnail?: string;
}

/**
 * Audio item properties
 */
export interface AudioItem extends TimelineItem {
  type: TimelineItemType.AUDIO;
  src: string;
  startTime?: number;
  volume?: number;
}

/**
 * Text item properties
 */
export interface TextItem extends TimelineItem {
  type: TimelineItemType.TEXT;
  content: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

/**
 * Image item properties
 */
export interface ImageItem extends TimelineItem {
  type: TimelineItemType.IMAGE;
  src: string;
}

/**
 * Custom component item properties
 */
export interface CustomItem extends TimelineItem {
  type: TimelineItemType.CUSTOM;
  componentId: string;
  name: string;
  outputUrl: string;
}

/**
 * Union type for all timeline items
 */
export type TimelineItemUnion = VideoItem | AudioItem | TextItem | ImageItem | CustomItem;

/**
 * Timeline context state interface
 */
export interface TimelineContextState {
  items: TimelineItemUnion[];
  selectedItemId: number | null;
  currentFrame: number;
  durationInFrames: number;
  zoomLevel: number;
  scrollPosition: number;
  minDuration: number; // Minimum duration for any timeline item
  maxRows: number; // Maximum number of rows/tracks in timeline
  invalidDragOperation: boolean; // Flag to indicate if current drag operation is invalid
}

/**
 * Timeline actions for modifying the timeline
 */
export interface TimelineActions {
  setItems: (items: TimelineItemUnion[]) => void;
  setSelectedItemId: (id: number | null) => void;
  selectItem: (id: number | null) => void; // Alias for setSelectedItemId for better readability
  setCurrentFrame: (frame: number) => void;
  updateItem: (item: TimelineItemUnion) => void;
  addItem: (item: TimelineItemUnion) => void;
  removeItem: (id: number) => void;
  setDurationInFrames: (duration: number) => void;
  setZoomLevel: (level: number) => void;
  setScrollPosition: (position: number) => void;
  handleWheelZoom: (e: WheelEvent, clientX: number) => void;
  setGhostPosition: (position: GhostPosition) => void;
  setIsDragging: (dragging: boolean) => void;
  setPlayerRef: (ref: any) => void;
  seekToFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
}

/**
 * Information about current drag operation
 */
export interface DragInfo {
  itemId: number;
  dragType: 'move' | 'resize-left' | 'resize-right';
  startX: number;
  startFrame: number;
  startDuration: number;
  startRow: number;
  offsetX: number;
  pixelsPerFrame: number;
  currentFrame?: number;
  currentDuration?: number;
  currentRow?: number;
}

/**
 * Position and dimensions of ghost element during drag
 */
export interface GhostPosition {
  left: number;
  width: number;
  row?: number;
}
