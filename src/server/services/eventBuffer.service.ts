/**
 * src/server/services/eventBuffer.service.ts
 * Provides a buffer for streaming events with support for client reconnection
 */

import { randomUUID } from "crypto";
import type { 
  BufferedEvent,
  ClientConnection,
  EventBufferConfig,
  StreamEvent, 
  ToolCallState
} from "~/types/chat";
import { StreamEventType } from "~/types/chat";

// Default configuration values
const DEFAULT_CONFIG: EventBufferConfig = {
  maxBufferSize: 200,         // Maximum events to buffer per message
  bufferExpiryMs: 5 * 60000,  // Expire buffered events after 5 minutes
  reconnectWindowMs: 30000    // Allow reconnection within 30 seconds
};

/**
 * Service to buffer events for client reconnection scenarios
 */
export class EventBufferService {
  private eventBuffers = new Map<string, BufferedEvent[]>();
  private toolCallStates = new Map<string, ToolCallState>();
  private clientConnections = new Map<string, ClientConnection>();
  private config: EventBufferConfig;
  
  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout;

  constructor(config?: Partial<EventBufferConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Adds a new event to the buffer for a specific message
   * 
   * @param messageId - Assistant message ID to buffer for
   * @param event - The event to buffer
   * @returns The generated event ID
   */
  public bufferEvent(messageId: string, event: StreamEvent): string {
    // Generate an ID for this event
    const eventId = randomUUID();
    
    // Create the buffered event
    const bufferedEvent: BufferedEvent = {
      id: eventId,
      messageId,
      timestamp: Date.now(),
      event,
      processed: false
    };
    
    // Get or create the message's event buffer
    if (!this.eventBuffers.has(messageId)) {
      this.eventBuffers.set(messageId, []);
    }
    
    const buffer = this.eventBuffers.get(messageId)!;
    
    // Add the event to the buffer
    buffer.push(bufferedEvent);
    
    // If the buffer exceeds max size, remove oldest events
    if (buffer.length > this.config.maxBufferSize) {
      const excessCount = buffer.length - this.config.maxBufferSize;
      // Remove oldest events but keep important ones like tool_result
      const eventsToRemove = buffer
        .slice(0, buffer.length - 1) // Don't consider the event we just added
        .filter(e => !this.isImportantEvent(e.event))
        .slice(0, excessCount);
      
      for (const event of eventsToRemove) {
        const index = buffer.findIndex(e => e.id === event.id);
        if (index !== -1) {
          buffer.splice(index, 1);
        }
      }
    }
    
    // If this is a final event, mark all events as processed
    if (this.isFinalEvent(event)) {
      for (const bufferedEvent of buffer) {
        bufferedEvent.processed = true;
      }
    }
    
    return eventId;
  }

  /**
   * Registers a client connection for a specific message
   * 
   * @param clientId - Unique identifier for the client
   * @param messageId - Assistant message ID the client is subscribed to
   * @returns The client connection object
   */
  public registerClient(clientId: string, messageId: string): ClientConnection {
    const connection: ClientConnection = {
      clientId,
      messageId,
      lastEventTime: Date.now(),
      isActive: true
    };
    
    this.clientConnections.set(clientId, connection);
    return connection;
  }

  /**
   * Marks a client as disconnected
   * 
   * @param clientId - Client ID to mark as disconnected
   */
  public markDisconnected(clientId: string): void {
    const connection = this.clientConnections.get(clientId);
    if (connection) {
      connection.isActive = false;
      connection.disconnectedAt = Date.now();
    }
  }

  /**
   * Handles client reconnection
   * 
   * @param clientId - Client ID that is reconnecting
   * @param lastEventId - Optional ID of the last event client received
   * @returns Missed events to replay, or null if reconnection failed
   */
  public handleReconnection(
    clientId: string, 
    lastEventId?: string
  ): { events: BufferedEvent[]; reconnectEvent: StreamEvent } | null {
    const connection = this.clientConnections.get(clientId);
    if (!connection) {
      return null; // No previous connection found
    }

    // Check if reconnection window has expired
    if (connection.disconnectedAt) {
      const reconnectWindow = Date.now() - connection.disconnectedAt;
      if (reconnectWindow > this.config.reconnectWindowMs) {
        return null; // Reconnection window expired
      }
    }
    
    // Get the buffer for this message
    const buffer = this.eventBuffers.get(connection.messageId);
    if (!buffer || buffer.length === 0) {
      return null; // No events to replay
    }
    
    // Find the index of the last event the client received
    let startIndex = 0;
    if (lastEventId) {
      const lastEventIndex = buffer.findIndex(e => e.id === lastEventId);
      if (lastEventIndex !== -1) {
        startIndex = lastEventIndex + 1;
      }
    }
    
    // Get all events that occurred after the last event received
    const missedEvents = buffer.slice(startIndex);
    
    // Update connection state
    connection.isActive = true;
    connection.lastEventId = lastEventId;
    connection.lastEventTime = Date.now();
    delete connection.disconnectedAt;
    
    // Create reconnected event
    const reconnectEvent: StreamEvent = {
      type: "reconnected",
      missedEvents: missedEvents.length,
      lastEventId
    };
    
    return {
      events: missedEvents,
      reconnectEvent
    };
  }

  /**
   * Stores the current state of tool calls to support reconnections
   * 
   * @param messageId - Assistant message ID
   * @param toolCallState - Current state of tool calls
   */
  public storeToolCallState(messageId: string, toolCallState: ToolCallState): void {
    this.toolCallStates.set(messageId, {
      ...toolCallState,
      timestamp: Date.now()
    });
  }

  /**
   * Retrieves stored tool call state for message
   * 
   * @param messageId - Assistant message ID
   * @returns Stored tool call state, or null if not found
   */
  public getToolCallState(messageId: string): ToolCallState | null {
    return this.toolCallStates.get(messageId) || null;
  }

  /**
   * Cleans up old buffers and inactive connections
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Clean up expired event buffers
    for (const [messageId, buffer] of this.eventBuffers.entries()) {
      if (buffer.length === 0) {
        this.eventBuffers.delete(messageId);
        continue;
      }
      
      // Check if the buffer has expired
      const oldestEvent = buffer[0];
      if (oldestEvent && now - oldestEvent.timestamp > this.config.bufferExpiryMs) {
        // If all events are processed, remove the buffer
        if (buffer.every(e => e.processed)) {
          this.eventBuffers.delete(messageId);
        }
        // Otherwise, only remove processed events
        else {
          const newBuffer = buffer.filter(e => !e.processed);
          this.eventBuffers.set(messageId, newBuffer);
        }
      }
    }
    
    // Clean up expired tool call states
    for (const [messageId, state] of this.toolCallStates.entries()) {
      if (now - state.timestamp > this.config.bufferExpiryMs) {
        // Only remove completed or error states
        if (state.status === 'completed' || state.status === 'error') {
          this.toolCallStates.delete(messageId);
        }
      }
    }
    
    // Clean up expired connections
    for (const [clientId, connection] of this.clientConnections.entries()) {
      if (!connection.isActive) {
        const disconnectTime = connection.disconnectedAt || connection.lastEventTime;
        if (now - disconnectTime > this.config.reconnectWindowMs) {
          this.clientConnections.delete(clientId);
        }
      }
    }
  }
  
  /**
   * Check if an event should be preserved in the buffer
   * Important events include tool results and errors
   */
  private isImportantEvent(event: StreamEvent): boolean {
    if ('type' in event) {
      return event.type === 'tool_result' || 
             event.type === 'error' ||
             event.type === 'finalized';
    }
    return false;
  }
  
  /**
   * Check if an event indicates stream completion
   */
  private isFinalEvent(event: StreamEvent): boolean {
    if ('type' in event) {
      return event.type === 'finalized' || event.type === 'error';
    }
    return false;
  }
  
  /**
   * Cleanup resources (for server shutdown)
   */
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Singleton instance for application-wide use
export const eventBufferService = new EventBufferService(); 