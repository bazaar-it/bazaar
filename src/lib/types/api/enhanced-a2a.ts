import type { 
  Message, 
  Artifact, 
  TaskStatus,
  Part,
  TextPart,
  StructuredAgentMessage
} from '~/lib/types/api/a2a';

/**
 * A type that combines properties from different message types
 * for use in the enhanceMessage function
 */
export type MessageLike = {
  id: string;
  createdAt: string | Date;
  parts?: Part[];
  payload?: Record<string, any>;
  sender?: string;
  recipient?: string;
  type?: string;
  status?: string;
  processedAt?: string | Date;
  correlationId?: string;
};

/**
 * Enhanced A2A Message with guaranteed fields for component compatibility
 */
export interface EnhancedA2AMessage extends Omit<Message, 'parts'> {
  createdAt: string;
  payload?: Record<string, any>;
  parts: Array<Part & { text?: string }>;
  
  // Additional fields needed for MessageDetailModal
  sender?: string;
  recipient?: string;
  type?: string;
  status?: string;
  processedAt?: string | Date;
  correlationId?: string;
}

/**
 * Enhanced Artifact with contentType always available
 */
export interface EnhancedArtifact extends Artifact {
  contentType: string; // Either from mimeType or explicitly set
}

/**
 * Enhanced TaskStatus with updatedAt always present and typed artifacts
 */
export interface EnhancedTaskStatus extends Omit<TaskStatus, 'artifacts'> {
  updatedAt: string;
  artifacts?: EnhancedArtifact[];
}

/**
 * Type adapters for converting between standard and enhanced types
 */
/**
 * Enhances a basic Message or StructuredAgentMessage into an EnhancedA2AMessage
 * with all fields guaranteed to be present for UI components
 */
export const enhanceMessage = (message: MessageLike): EnhancedA2AMessage => {
  // Ensure createdAt is a string
  const createdAt = typeof message.createdAt === 'string' 
    ? message.createdAt 
    : message.createdAt instanceof Date 
      ? message.createdAt.toISOString() 
      : new Date().toISOString();

  // Extract text from parts if available
  const textContent = message.parts?.find((part: Part) => part.type === 'text' && (part as TextPart).text !== undefined)
    ? (message.parts.find((part: Part) => part.type === 'text') as TextPart).text
    : '';

  return {
    id: message.id,
    createdAt,
    // Add payload and ensure parts are present
    payload: message.payload || {
      content: textContent,
      parts: message.parts || []
    },
    parts: message.parts || [],
    
    // Include additional fields if they exist in the source message
    ...(message.sender !== undefined && { sender: message.sender }),
    ...(message.recipient !== undefined && { recipient: message.recipient }),
    ...(message.type !== undefined && { type: message.type }),
    ...(message.status !== undefined && { status: message.status }),
    ...(message.processedAt !== undefined && { 
      processedAt: typeof message.processedAt === 'string' 
        ? message.processedAt 
        : message.processedAt instanceof Date 
          ? message.processedAt.toISOString() 
          : undefined 
    }),
    ...(message.correlationId !== undefined && { correlationId: message.correlationId })
  };
};

export const enhanceArtifact = (artifact: Artifact): EnhancedArtifact => {
  return {
    ...artifact,
    contentType: artifact.mimeType
  };
};

export const enhanceTaskStatus = (status: TaskStatus): EnhancedTaskStatus => {
  return {
    ...status,
    updatedAt: status.updatedAt || new Date().toISOString(),
    artifacts: status.artifacts?.map(enhanceArtifact)
  };
}; 