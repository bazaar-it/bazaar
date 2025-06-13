import { z } from "zod";

/**
 * Base MCP Tool interface following Model Context Protocol patterns
 */
export interface MCPTool<TInput = unknown, TOutput = unknown> {
  /** Tool name for LLM function calling */
  name: string;
  
  /** Tool description for LLM context */
  description: string;
  
  /** Input schema for validation */
  inputSchema: z.ZodSchema<TInput>;
  
  /** Execute the tool with validated input */
  run(input: TInput): Promise<MCPResult<TOutput>>;
}

/**
 * Standardized result format for all MCP tools
 */
export interface MCPResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    executionTime: number;
    toolName: string;
    timestamp: string;
  };
}

/**
 * Tool execution context
 */
export interface MCPContext {
  userId: string;
  projectId: string;
  sessionId: string;
  userContext?: Record<string, unknown>;
}

/**
 * Base tool implementation with common functionality
 */
export abstract class BaseMCPTool<TInput, TOutput> implements MCPTool<TInput, TOutput> {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: z.ZodSchema<TInput>;
  
  async run(input: TInput): Promise<MCPResult<TOutput>> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedInput = this.inputSchema.parse(input);
      
      // Execute tool logic
      const result = await this.execute(validatedInput);
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result,
        metadata: {
          executionTime,
          toolName: this.name,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        success: false,
        error: {
          code: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof z.ZodError ? { issues: error.issues } : undefined,
        },
        metadata: {
          executionTime,
          toolName: this.name,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
  
  /**
   * Tool-specific execution logic - implemented by subclasses
   */
  protected abstract execute(input: TInput): Promise<TOutput>;
} 