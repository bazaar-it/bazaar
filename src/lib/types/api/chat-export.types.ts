// Chat Export Types

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    imageUrls?: string[];
    hasError?: boolean;
  };
}

export interface ConversationMetrics {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  scenesCreated: number;
  errorsEncountered: number;
  exportCount: number;
  sessionDuration: number; // in minutes
  avgGenerationTime: number; // in seconds
  totalIterations: number;
  editCount: number;
}

export interface ConversationExport {
  projectId: string;
  projectTitle: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  createdAt: Date;
  lastActivity: Date;
  messages: ChatMessage[];
  metrics: ConversationMetrics;
}

export interface ChatExportFilters {
  startDate?: Date | null;
  endDate?: Date | null;
  format: 'json' | 'csv' | 'jsonl';
  includeUserInfo: boolean;
  anonymize: boolean;
}

export interface ChatAnalytics {
  totalConversations: number;
  averageLength: number;
  topPhrases: Array<{ text: string; count: number }>;
  topIntents: Array<{ intent: string; count: number }>;
  errorRate: number;
  peakUsageHours: number[];
  successPatterns?: {
    avgMessagesToExport: number;
    avgSceneCount: number;
    commonPatterns: string[];
  };
}

export type AnalyticsTimeframe = '24h' | '7d' | '30d' | 'all';