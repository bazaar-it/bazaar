// AI API Monitoring and Alerting Service
// Tracks API usage, errors, and performance metrics

import { db } from "~/server/db";
import { apiUsageMetrics } from "~/server/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

interface APIMetric {
  provider: 'anthropic' | 'openai';
  model: string;
  success: boolean;
  responseTime: number;
  tokenCount?: number;
  errorType?: string;
  errorMessage?: string;
  userId?: string;
  projectId?: string;
  toolName?: string;
}

interface AlertThreshold {
  errorRatePercent: number;
  responseTimeMs: number;
  requestsPerMinute: number;
  consecutiveErrors: number;
}

interface HealthStatus {
  provider: string;
  status: 'healthy' | 'degraded' | 'critical';
  errorRate: number;
  avgResponseTime: number;
  requestsLastHour: number;
  alerts: Alert[];
}

interface Alert {
  severity: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AIMonitoringService {
  private static instance: AIMonitoringService;
  private metrics: APIMetric[] = [];
  private alerts: Alert[] = [];
  private webhookUrl?: string;
  
  // Default thresholds
  private thresholds: AlertThreshold = {
    errorRatePercent: 10,
    responseTimeMs: 10000,
    requestsPerMinute: 100,
    consecutiveErrors: 5,
  };
  
  // In-memory tracking for real-time analysis
  private recentErrors: Map<string, number> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  
  private constructor() {
    // Initialize webhook URL from environment
    this.webhookUrl = process.env.MONITORING_WEBHOOK_URL;
    
    // Start periodic metric flush
    this.startMetricFlush();
  }
  
  static getInstance(): AIMonitoringService {
    if (!AIMonitoringService.instance) {
      AIMonitoringService.instance = new AIMonitoringService();
    }
    return AIMonitoringService.instance;
  }
  
  // Record API call metrics
  async recordMetric(metric: APIMetric): Promise<void> {
    // Add to in-memory buffer
    this.metrics.push(metric);
    
    // Check for immediate alerts
    this.checkForAlerts(metric);
    
    // Flush to database if buffer is large
    if (this.metrics.length >= 100) {
      await this.flushMetrics();
    }
  }
  
  // Record API call start (returns a function to call on completion)
  startTracking(provider: 'anthropic' | 'openai', model: string, metadata?: {
    userId?: string;
    projectId?: string;
    toolName?: string;
  }): (success: boolean, error?: Error, tokenCount?: number) => Promise<void> {
    const startTime = Date.now();
    
    return async (success: boolean, error?: Error, tokenCount?: number) => {
      const responseTime = Date.now() - startTime;
      
      await this.recordMetric({
        provider,
        model,
        success,
        responseTime,
        tokenCount,
        errorType: error ? error.constructor.name : undefined,
        errorMessage: error ? error.message : undefined,
        ...metadata,
      });
    };
  }
  
  // Check for alert conditions
  private checkForAlerts(metric: APIMetric): void {
    const key = `${metric.provider}:${metric.model}`;
    
    // Track consecutive errors
    if (!metric.success) {
      const currentErrors = (this.recentErrors.get(key) || 0) + 1;
      this.recentErrors.set(key, currentErrors);
      
      // Check consecutive error threshold
      if (currentErrors >= this.thresholds.consecutiveErrors) {
        this.createAlert({
          severity: 'critical',
          message: `${currentErrors} consecutive errors for ${key}`,
          timestamp: new Date(),
          metadata: {
            provider: metric.provider,
            model: metric.model,
            lastError: metric.errorMessage,
          },
        });
      }
    } else {
      // Reset error count on success
      this.recentErrors.delete(key);
    }
    
    // Check response time
    if (metric.responseTime > this.thresholds.responseTimeMs) {
      this.createAlert({
        severity: 'warning',
        message: `Slow response time: ${metric.responseTime}ms for ${key}`,
        timestamp: new Date(),
        metadata: {
          provider: metric.provider,
          model: metric.model,
          responseTime: metric.responseTime,
        },
      });
    }
  }
  
  // Create and possibly send alert
  private async createAlert(alert: Alert): Promise<void> {
    const key = alert.message;
    const lastAlert = this.lastAlertTime.get(key) || 0;
    const cooldown = 300000; // 5 minutes
    
    // Prevent alert spam
    if (Date.now() - lastAlert < cooldown) {
      return;
    }
    
    this.alerts.push(alert);
    this.lastAlertTime.set(key, Date.now());
    
    // Log alert
    console[alert.severity === 'critical' ? 'error' : 'warn'](
      `[AI Monitoring] ${alert.severity.toUpperCase()}: ${alert.message}`,
      alert.metadata
    );
    
    // Send webhook if configured
    if (this.webhookUrl && alert.severity !== 'warning') {
      await this.sendWebhook(alert);
    }
  }
  
  // Send alert via webhook
  private async sendWebhook(alert: Alert): Promise<void> {
    if (!this.webhookUrl) return;
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 AI API Alert: ${alert.message}`,
          severity: alert.severity,
          timestamp: alert.timestamp,
          metadata: alert.metadata,
        }),
      });
      
      if (!response.ok) {
        console.error('[AI Monitoring] Failed to send webhook:', response.statusText);
      }
    } catch (error) {
      console.error('[AI Monitoring] Error sending webhook:', error);
    }
  }
  
  // Flush metrics to database
  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    const metricsToFlush = [...this.metrics];
    this.metrics = [];
    
    try {
      // Batch insert metrics
      await db.insert(apiUsageMetrics).values(
        metricsToFlush.map(m => ({
          provider: m.provider,
          model: m.model,
          success: m.success,
          responseTime: m.responseTime,
          tokenCount: m.tokenCount,
          errorType: m.errorType,
          errorMessage: m.errorMessage,
          userId: m.userId,
          projectId: m.projectId,
          toolName: m.toolName,
          timestamp: new Date(),
        }))
      );
    } catch (error) {
      console.error('[AI Monitoring] Failed to flush metrics:', error);
      // Re-add metrics to buffer on failure
      this.metrics.unshift(...metricsToFlush);
    }
  }
  
  // Start periodic metric flush
  private startMetricFlush(): void {
    setInterval(() => {
      this.flushMetrics().catch(console.error);
    }, 60000); // Flush every minute
  }
  
  // Get health status for all providers
  async getHealthStatus(): Promise<Record<string, HealthStatus>> {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    // Query recent metrics from database
    const recentMetrics = await db.select({
      provider: apiUsageMetrics.provider,
      model: apiUsageMetrics.model,
      success: apiUsageMetrics.success,
      responseTime: apiUsageMetrics.responseTime,
      errorType: apiUsageMetrics.errorType,
    })
    .from(apiUsageMetrics)
    .where(gte(apiUsageMetrics.timestamp, oneHourAgo));
    
    // Group by provider
    const providerMetrics = new Map<string, typeof recentMetrics>();
    for (const metric of recentMetrics) {
      const key = metric.provider;
      if (!providerMetrics.has(key)) {
        providerMetrics.set(key, []);
      }
      providerMetrics.get(key)!.push(metric);
    }
    
    // Calculate health status
    const healthStatus: Record<string, HealthStatus> = {};
    
    for (const [provider, metrics] of providerMetrics) {
      const total = metrics.length;
      const errors = metrics.filter(m => !m.success).length;
      const errorRate = total > 0 ? (errors / total) * 100 : 0;
      const avgResponseTime = total > 0 
        ? metrics.reduce((sum, m) => sum + m.responseTime, 0) / total 
        : 0;
      
      // Determine status
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (errorRate > 20 || avgResponseTime > 15000) {
        status = 'critical';
      } else if (errorRate > 10 || avgResponseTime > 10000) {
        status = 'degraded';
      }
      
      // Get recent alerts for this provider
      const providerAlerts = this.alerts.filter(a => 
        a.metadata?.provider === provider && 
        a.timestamp.getTime() > oneHourAgo.getTime()
      );
      
      healthStatus[provider] = {
        provider,
        status,
        errorRate,
        avgResponseTime,
        requestsLastHour: total,
        alerts: providerAlerts,
      };
    }
    
    return healthStatus;
  }
  
  // Get detailed metrics for a time period
  async getMetrics(startTime: Date, endTime: Date, filters?: {
    provider?: string;
    model?: string;
    userId?: string;
    projectId?: string;
  }): Promise<APIMetric[]> {
    const conditions = [
      gte(apiUsageMetrics.timestamp, startTime),
      sql`${apiUsageMetrics.timestamp} <= ${endTime}`,
    ];
    
    if (filters?.provider) {
      conditions.push(eq(apiUsageMetrics.provider, filters.provider as any));
    }
    if (filters?.model) {
      conditions.push(eq(apiUsageMetrics.model, filters.model));
    }
    if (filters?.userId) {
      conditions.push(eq(apiUsageMetrics.userId, filters.userId));
    }
    if (filters?.projectId) {
      conditions.push(eq(apiUsageMetrics.projectId, filters.projectId));
    }
    
    const metrics = await db.select()
      .from(apiUsageMetrics)
      .where(and(...conditions));
    
    return metrics.map(m => ({
      provider: m.provider as 'anthropic' | 'openai',
      model: m.model,
      success: m.success,
      responseTime: m.responseTime,
      tokenCount: m.tokenCount || undefined,
      errorType: m.errorType || undefined,
      errorMessage: m.errorMessage || undefined,
      userId: m.userId || undefined,
      projectId: m.projectId || undefined,
      toolName: m.toolName || undefined,
    }));
  }
  
  // Get aggregated statistics
  async getStatistics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    totalTokens: number;
    topErrors: Array<{ error: string; count: number }>;
    requestsByProvider: Record<string, number>;
    requestsByModel: Record<string, number>;
  }> {
    const timeRanges = {
      hour: 3600000,
      day: 86400000,
      week: 604800000,
    };
    
    const startTime = new Date(Date.now() - timeRanges[timeRange]);
    const metrics = await this.getMetrics(startTime, new Date());
    
    const totalRequests = metrics.length;
    const successCount = metrics.filter(m => m.success).length;
    const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 100;
    const avgResponseTime = totalRequests > 0 
      ? metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests 
      : 0;
    const totalTokens = metrics.reduce((sum, m) => sum + (m.tokenCount || 0), 0);
    
    // Count errors
    const errorCounts = new Map<string, number>();
    for (const metric of metrics.filter(m => !m.success)) {
      const error = metric.errorType || 'Unknown';
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    }
    
    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Count by provider and model
    const requestsByProvider: Record<string, number> = {};
    const requestsByModel: Record<string, number> = {};
    
    for (const metric of metrics) {
      requestsByProvider[metric.provider] = (requestsByProvider[metric.provider] || 0) + 1;
      requestsByModel[metric.model] = (requestsByModel[metric.model] || 0) + 1;
    }
    
    return {
      totalRequests,
      successRate,
      avgResponseTime,
      totalTokens,
      topErrors,
      requestsByProvider,
      requestsByModel,
    };
  }
  
  // Update alert thresholds
  updateThresholds(thresholds: Partial<AlertThreshold>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
  
  // Clear old alerts
  clearOldAlerts(olderThan: Date): void {
    this.alerts = this.alerts.filter(a => a.timestamp > olderThan);
  }
}

// Export singleton instance
export const aiMonitoring = AIMonitoringService.getInstance();