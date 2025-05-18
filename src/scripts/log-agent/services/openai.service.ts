// src/scripts/log-agent/services/openai.service.ts
import OpenAI from 'openai';
import CircuitBreaker from 'opossum';
import { config } from '../config.js';
import { LogEntry, QnaRequest, QnaResponse } from '../types.js';

// Create OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Metrics for tracking token usage
const metrics = {
  promptTokens: 0,
  completionTokens: 0,
};

// Circuit breaker options
const breakerOptions = {
  timeout: config.openai.timeout,
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30 seconds
};

/**
 * OpenAI service for log analysis
 * Uses circuit breaker pattern for resilience
 */
export class OpenAIService {
  private readonly client = openai;
  private readonly breaker: CircuitBreaker;

  constructor() {
    // Create circuit breaker for OpenAI calls
    this.breaker = new CircuitBreaker(this.makeOpenAIRequest.bind(this), breakerOptions);
    
    // Add listeners
    this.breaker.on('open', () => {
      console.warn('⚠️ OpenAI circuit breaker opened - API may be down');
    });
    
    this.breaker.on('close', () => {
      console.info('✅ OpenAI circuit breaker closed - API is back up');
    });
    
    this.breaker.on('halfOpen', () => {
      console.info('OpenAI circuit breaker is half-open - testing API');
    });
  }

  /**
   * Get the current token usage metrics
   * @returns Object with prompt and completion token counts
   */
  getMetrics() {
    return { ...metrics };
  }

  /**
   * Reset the token usage metrics
   */
  resetMetrics() {
    metrics.promptTokens = 0;
    metrics.completionTokens = 0;
  }

  /**
   * Make a request to OpenAI API with error handling
   * @param prompt The system prompt
   * @param userMessage The user message
   * @returns The assistant's response
   */
  private async makeOpenAIRequest(prompt: string, userMessage: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      });
      
      // Update metrics
      if (response.usage) {
        metrics.promptTokens += response.usage.prompt_tokens;
        metrics.completionTokens += response.usage.completion_tokens;
      }
      
      return response.choices[0]?.message?.content || 'No response from OpenAI';
    } catch (error: any) {
      console.error('OpenAI API Error:', error.message);
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }

  /**
   * Analyze logs with OpenAI
   * @param request The QnA request
   * @param logs The logs to analyze
   * @returns The QnA response with analysis
   */
  async analyzeLogs(request: QnaRequest, logs: LogEntry[]): Promise<QnaResponse> {
    const startTime = Date.now();
    const initialMetrics = { ...metrics };
    
    // Prepare log data for OpenAI
    const logText = logs.map(log => {
      const meta = log.metadata ? ` | ${JSON.stringify(log.metadata)}` : '';
      return `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}${meta}`;
    }).join('\n');
    
    // Create system prompt
    const systemPrompt = `You are a log analysis assistant for the Bazaar-Vid application. 
Your task is to analyze log data and provide helpful insights.

The logs may contain information about:
- Agent communication
- Task processing
- Scene planning
- Video rendering
- Error conditions

Focus on identifying:
1. Error patterns
2. Unusual behaviors
3. Process flows
4. Performance issues
5. Specific answers to user queries

Be concise but thorough in your analysis.`;

    try {
      // Make request through circuit breaker
      const answer = await this.breaker.fire(systemPrompt, `Query: ${request.query}\n\nLogs:\n${logText}`);
      
      // Calculate token usage for this request
      const tokenUsage = {
        prompt: metrics.promptTokens - initialMetrics.promptTokens,
        completion: metrics.completionTokens - initialMetrics.completionTokens,
        total: (metrics.promptTokens - initialMetrics.promptTokens) + 
               (metrics.completionTokens - initialMetrics.completionTokens),
      };
      
      return {
        answer,
        runId: request.runId,
        tokenUsage,
      };
    } catch (error: any) {
      console.error('Log analysis failed:', error.message);
      
      // Fallback to simple analysis when OpenAI is unavailable
      return {
        answer: this.fallbackAnalysis(request, logs),
        runId: request.runId,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
      };
    }
  }

  /**
   * Simple fallback analysis when OpenAI is unavailable
   * @param request The QnA request
   * @param logs The logs to analyze
   * @returns Basic analysis text
   */
  private fallbackAnalysis(request: QnaRequest, logs: LogEntry[]): string {
    // Count by log level
    const levelCounts = logs.reduce((counts, log) => {
      counts[log.level] = (counts[log.level] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    // Extract error messages
    const errors = logs
      .filter(log => log.level === 'error')
      .map(log => log.message)
      .slice(0, 5);
    
    // Count by source
    const sourceCounts = logs.reduce((counts, log) => {
      if (log.source) {
        counts[log.source] = (counts[log.source] || 0) + 1;
      }
      return counts;
    }, {} as Record<string, number>);
    
    return `[FALLBACK ANALYSIS - OpenAI unavailable]

Query: ${request.query}

Basic Log Statistics:
- Total logs: ${logs.length}
- Log levels: ${JSON.stringify(levelCounts)}
- Sources: ${JSON.stringify(sourceCounts)}

${errors.length > 0 ? `Top Errors:
${errors.map(err => `- ${err}`).join('\n')}` : 'No errors found in logs.'}

Note: This is a basic fallback analysis. OpenAI analysis is currently unavailable.`;
  }
}

// Export singleton instance
export const openaiService = new OpenAIService(); 