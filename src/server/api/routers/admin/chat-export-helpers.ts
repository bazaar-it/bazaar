import { parse } from 'json2csv';
import crypto from 'crypto';
import type { ConversationExport, ChatMessage, ConversationMetrics } from '~/lib/types/api/chat-export.types';

interface RawMessage {
  messageId: string;
  messageContent: string;
  messageRole: string;
  messageSequence: number;
  messageCreatedAt: Date;
  messageImageUrls: string[] | null;
  projectId: string;
  projectTitle: string;
  projectCreatedAt: Date;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  sceneCount: number;
}

interface IterationMetric {
  projectId: string;
  avgGenerationTime: number;
  totalIterations: number;
  editCount: number;
}

export function groupAndEnrichConversations(
  messages: RawMessage[],
  metrics: IterationMetric[],
  anonymize: boolean
): ConversationExport[] {
  const metricsMap = new Map(metrics.map(m => [m.projectId, m]));
  const conversationsMap = new Map<string, ConversationExport>();

  messages.forEach(msg => {
    let conversation = conversationsMap.get(msg.projectId);
    
    if (!conversation) {
      const projectMetrics = metricsMap.get(msg.projectId);
      conversation = {
        projectId: msg.projectId,
        projectTitle: msg.projectTitle,
        userId: anonymize ? hashUserId(msg.userId) : msg.userId,
        userName: anonymize ? undefined : msg.userName,
        userEmail: anonymize ? undefined : msg.userEmail,
        createdAt: msg.projectCreatedAt,
        lastActivity: msg.messageCreatedAt,
        messages: [],
        metrics: {
          totalMessages: 0,
          userMessages: 0,
          assistantMessages: 0,
          scenesCreated: msg.sceneCount,
          errorsEncountered: 0,
          exportCount: 0, // TODO: Get from exports table
          sessionDuration: 0, // Will calculate
          avgGenerationTime: projectMetrics?.avgGenerationTime || 0,
          totalIterations: projectMetrics?.totalIterations || 0,
          editCount: projectMetrics?.editCount || 0,
        }
      };
      conversationsMap.set(msg.projectId, conversation);
    }

    // Update last activity
    if (msg.messageCreatedAt > conversation.lastActivity) {
      conversation.lastActivity = msg.messageCreatedAt;
    }

    // Add message
    conversation.messages.push({
      id: msg.messageId,
      role: msg.messageRole as 'user' | 'assistant' | 'system',
      content: anonymize ? anonymizeContent(msg.messageContent) : msg.messageContent,
      timestamp: msg.messageCreatedAt,
      metadata: {
        imageUrls: msg.messageImageUrls || undefined,
        hasError: msg.messageContent.includes('error') || msg.messageContent.includes('failed'),
      }
    });

    // Update metrics
    conversation.metrics.totalMessages++;
    if (msg.messageRole === 'user') conversation.metrics.userMessages++;
    if (msg.messageRole === 'assistant') conversation.metrics.assistantMessages++;
    if (msg.messageContent.includes('error')) conversation.metrics.errorsEncountered++;
  });

  // Calculate session durations
  conversationsMap.forEach(conv => {
    const duration = conv.lastActivity.getTime() - conv.createdAt.getTime();
    conv.metrics.sessionDuration = Math.round(duration / 1000 / 60); // minutes
  });

  return Array.from(conversationsMap.values());
}

export function formatAsCSV(conversations: ConversationExport[]): string {
  const flatData = conversations.flatMap(conv => 
    conv.messages.map(msg => ({
      projectId: conv.projectId,
      projectTitle: conv.projectTitle,
      userId: conv.userId,
      userName: conv.userName || 'Anonymous',
      messageRole: msg.role,
      messageContent: msg.content.substring(0, 500), // Truncate for CSV
      timestamp: msg.timestamp.toISOString(),
      hasImages: !!msg.metadata?.imageUrls?.length,
      hasError: msg.metadata?.hasError || false,
      scenesCreated: conv.metrics.scenesCreated,
      sessionDurationMinutes: conv.metrics.sessionDuration,
    }))
  );

  const fields = [
    'projectId', 'projectTitle', 'userId', 'userName',
    'messageRole', 'messageContent', 'timestamp',
    'hasImages', 'hasError', 'scenesCreated', 'sessionDurationMinutes'
  ];

  return parse(flatData, { fields });
}

export function formatAsJSONL(conversations: ConversationExport[]): string {
  return conversations
    .map(conv => JSON.stringify(conv))
    .join('\n');
}

export function formatAsJSON(conversations: ConversationExport[]): object {
  return {
    metadata: {
      exportDate: new Date(),
      totalProjects: conversations.length,
      totalMessages: conversations.reduce((sum, c) => sum + c.metrics.totalMessages, 0),
      totalUsers: new Set(conversations.map(c => c.userId)).size,
    },
    conversations,
  };
}

function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8);
}

function anonymizeContent(content: string): string {
  return content
    .replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]');
}