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
  anonymize: boolean,
  includeMetadata: boolean = true,
  includeIds: boolean = true
): ConversationExport[] {
  const metricsMap = new Map(metrics.map(m => [m.projectId, m]));
  const conversationsMap = new Map<string, ConversationExport>();

  messages.forEach(msg => {
    let conversation = conversationsMap.get(msg.projectId);
    
    if (!conversation) {
      const projectMetrics = metricsMap.get(msg.projectId);
      conversation = {
        projectId: includeIds ? msg.projectId : '',
        projectTitle: msg.projectTitle,
        userId: includeIds ? (anonymize ? hashUserId(msg.userId) : msg.userId) : '',
        userName: anonymize ? undefined : msg.userName,
        userEmail: anonymize ? undefined : msg.userEmail,
        createdAt: msg.projectCreatedAt,
        lastActivity: msg.messageCreatedAt,
        messages: [],
        metrics: includeMetadata ? {
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
        } : {
          totalMessages: 0,
          userMessages: 0,
          assistantMessages: 0,
          scenesCreated: 0,
          errorsEncountered: 0,
          exportCount: 0,
          sessionDuration: 0,
          avgGenerationTime: 0,
          totalIterations: 0,
          editCount: 0,
        }
      };
      conversationsMap.set(msg.projectId, conversation);
    }

    // Update last activity
    if (msg.messageCreatedAt > conversation.lastActivity) {
      conversation.lastActivity = msg.messageCreatedAt;
    }

    // Add message
    const messageData: ChatMessage = {
      id: includeIds ? msg.messageId : '',
      role: msg.messageRole as 'user' | 'assistant' | 'system',
      content: anonymize ? anonymizeContent(msg.messageContent) : msg.messageContent,
      timestamp: msg.messageCreatedAt,
    };
    
    // Only include metadata if requested
    if (includeMetadata) {
      messageData.metadata = {
        imageUrls: msg.messageImageUrls || undefined,
        hasError: msg.messageContent.includes('error') || msg.messageContent.includes('failed'),
      };
    }
    
    conversation.messages.push(messageData);

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

export function formatAsCSV(conversations: ConversationExport[], includeUserInfo: boolean = false): string {
  const flatData = conversations.flatMap(conv => 
    conv.messages.map(msg => {
      const data: any = {
        projectId: conv.projectId,
        projectTitle: conv.projectTitle,
        messageRole: msg.role,
        messageContent: msg.content.substring(0, 500), // Truncate for CSV
        timestamp: msg.timestamp.toISOString(),
      };
      
      if (includeUserInfo) {
        data.userId = conv.userId;
        data.userName = conv.userName || 'Anonymous';
        data.userEmail = conv.userEmail || '';
      }
      
      if (msg.metadata) {
        data.hasImages = !!msg.metadata.imageUrls?.length;
        data.hasError = msg.metadata.hasError || false;
      }
      
      if (conv.metrics) {
        data.scenesCreated = conv.metrics.scenesCreated;
        data.sessionDurationMinutes = conv.metrics.sessionDuration;
      }
      
      return data;
    })
  );

  const fields = ['projectId', 'projectTitle'];
  if (includeUserInfo) {
    fields.push('userId', 'userName', 'userEmail');
  }
  fields.push('messageRole', 'messageContent', 'timestamp');
  if (conversations[0]?.messages[0]?.metadata) {
    fields.push('hasImages', 'hasError');
  }
  if (conversations[0]?.metrics) {
    fields.push('scenesCreated', 'sessionDurationMinutes');
  }

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