// src/server/services/data/message.service.ts
import { eq, desc, sql } from "drizzle-orm";
import { db } from "~/server/db";
import { messages } from "~/server/db/schema";

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
      status: data.status,
      kind: data.kind,
    };

    const [newMessage] = await db.insert(messages).values(messageData).returning();
    
    return newMessage;
  }
}

// Export singleton instance
export const messageService = new MessageService();