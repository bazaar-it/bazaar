// src/server/services/data/message.service.ts
import { eq, desc, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { messages } from "~/server/db/schema";
import { YouTubeExtractorService } from "~/server/services/media/youtube-extractor.service";
import { youTubeContextStore } from "~/server/services/media/youtube-context.store";

export class MessageService {
  /**
   * Get the next sequence number for a project's messages
   * This ensures proper message ordering even with concurrent requests
   */
  async getNextSequenceNumber(projectId: string): Promise<number> {
    // Use a single query to get the max sequence number
    const result = await db
      .select({ maxSequence: sql<number>`COALESCE(MAX(${messages.sequence}), 0)` })
      .from(messages)
      .where(eq(messages.projectId, projectId));
    
    const maxSequence = result[0]?.maxSequence ?? 0;
    return maxSequence + 1;
  }

  /**
   * Create a message with proper sequence number
   */
  async createMessage(data: {
    projectId: string;
    content: string;
    role: 'user' | 'assistant';
    imageUrls?: string[];
    videoUrls?: string[];
    status?: string;
    kind?: string;
    id?: string;
  }) {
    const sequence = await this.getNextSequenceNumber(data.projectId);
    
    const messageData = {
      id: data.id,
      projectId: data.projectId,
      content: data.content,
      role: data.role,
      sequence,
      createdAt: new Date(),
      imageUrls: data.imageUrls,
      videoUrls: data.videoUrls,
      status: data.status,
      kind: data.kind,
    };

    const [newMessage] = await db.insert(messages).values(messageData).returning();
    
    // Async YouTube URL detection - runs in parallel, doesn't block
    if (data.role === 'user' && newMessage) {
      this.detectAndProcessYouTubeUrls(newMessage.content, newMessage.projectId, newMessage.id)
        .catch(error => {
          console.error('[MessageService] YouTube detection failed:', error);
          // Silent failure - doesn't affect the main flow
        });
    }
    
    return newMessage;
  }

  /**
   * Asynchronously detect and process YouTube URLs
   * This runs in the background without blocking the message creation
   */
  private async detectAndProcessYouTubeUrls(
    content: string,
    projectId: string,
    messageId: string
  ): Promise<void> {
    try {
      const result = await YouTubeExtractorService.processMessageForYouTube(
        content,
        projectId,
        messageId
      );
      
      if (result && result.urls.length > 0) {
        console.log(`[MessageService] Detected ${result.urls.length} YouTube URLs in message ${messageId}`);
        
        // Store in context store for AI to use
        youTubeContextStore.addContext(projectId, {
          urls: result.urls,
          videoIds: result.videoIds,
          messageId
        });
        
        console.log('[MessageService] YouTube URLs stored in context:', result.urls);
        console.log('[MessageService] Video IDs:', result.videoIds);
      }
    } catch (error) {
      // Silent failure - this is a background operation
      console.error('[MessageService] YouTube processing error:', error);
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();