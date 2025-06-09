// src/types/chat-events.ts

export type DeltaEvent = {
  type: 'delta';
  content: string;
};

export type ToolStartEvent = {
  type: 'tool_start';
  name: string;
};

export type SceneStatusEvent = {
  type: 'sceneStatus';
  sceneId: string;
  status: string;
  jobId?: string;
};

export type FinalizedEvent = {
  type: 'finalized';
  status: 'success' | 'error';
};

export type ChatEvent =
  | DeltaEvent
  | ToolStartEvent
  | SceneStatusEvent
  | FinalizedEvent;
