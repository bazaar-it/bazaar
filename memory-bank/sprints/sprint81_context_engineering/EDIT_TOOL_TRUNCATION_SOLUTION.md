# Edit Tool Truncation Solution Design

## Problem Analysis

The edit tool is experiencing response truncation when AI responses exceed ~23KB. This causes:
- JSON parsing failures ("Could not extract JSON or code from response")
- Incomplete code generation
- Failed scene edits for complex transformations

### Root Cause
The truncation appears to happen at the infrastructure level, likely due to:
1. **Vercel Response Size Limits**: Vercel has a 10MB response limit for serverless functions
2. **CloudFlare Worker Limits**: If using CF Workers, they have a 1MB response limit
3. **AI Model Response Limits**: Some models may have internal response size constraints
4. **JSON Parsing Memory**: Node.js JSON.parse() can struggle with large strings

## Solution Architecture

### Option 1: Response Streaming (Recommended)
Stream the AI response in chunks rather than waiting for the complete response.

**Pros:**
- No size limits
- Better perceived performance
- Lower memory usage
- Industry-standard approach

**Cons:**
- More complex implementation
- Requires refactoring AI client service

### Option 2: Response Chunking with Storage
Break large responses into chunks and store them temporarily.

**Pros:**
- Works with existing infrastructure
- Can handle any size response
- Allows for retry/resume

**Cons:**
- Added complexity with storage
- Potential latency from multiple roundtrips

### Option 3: Incremental Edits
Instead of returning the full code, return only the diffs/patches.

**Pros:**
- Dramatically smaller responses
- More efficient
- Better for version control

**Cons:**
- Complex diff/patch logic
- Risk of patch application failures

## Recommended Implementation: Streaming Solution

### 1. Update AI Client Service for Streaming

```typescript
// src/server/services/ai/aiClient.service.ts

export interface AIStreamOptions extends AIClientOptions {
  onChunk?: (chunk: string) => void;
  stream?: boolean;
}

public static async generateStreamingResponse(
  config: ModelConfig,
  messages: AIMessage[],
  systemPrompt?: SystemPromptConfig,
  options?: AIStreamOptions
): Promise<ReadableStream<string> | AIResponse> {
  if (!options?.stream) {
    return this.generateResponse(config, messages, systemPrompt, options);
  }

  switch (config.provider) {
    case 'openai':
      return this.streamOpenAI(config, messages, systemPrompt, options);
    case 'anthropic':
      return this.streamAnthropic(config, messages, systemPrompt);
    default:
      throw new Error(`Streaming not supported for provider: ${config.provider}`);
  }
}

private static async streamOpenAI(
  config: ModelConfig,
  messages: AIMessage[],
  systemPrompt?: SystemPromptConfig,
  options?: AIStreamOptions
): Promise<ReadableStream<string>> {
  const client = this.getOpenAIClient();
  
  const stream = await client.chat.completions.create({
    model: config.model,
    messages: [...(systemPrompt ? [systemPrompt] : []), ...messages] as any,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens,
    stream: true,
    ...(options?.responseFormat && { response_format: options.responseFormat }),
  });

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(content);
          options?.onChunk?.(content);
        }
      }
      controller.close();
    },
  });
}
```

### 2. Update Edit Tool to Handle Streaming

```typescript
// src/tools/edit/edit.ts

private async performEditWithStreaming(input: EditToolInput): Promise<EditToolOutput> {
  // ... existing context building ...

  // Collect streamed response
  let fullResponse = '';
  const chunks: string[] = [];

  const stream = await AIClientService.generateStreamingResponse(
    modelConfig,
    [{ role: "user", content: messageContent }],
    { role: 'system', content: systemPrompt },
    { 
      responseFormat: { type: "json_object" },
      stream: true,
      onChunk: (chunk) => {
        chunks.push(chunk);
        fullResponse += chunk;
        
        // Optional: Log progress
        if (chunks.length % 10 === 0) {
          console.log(`📝 [EDIT TOOL] Streaming: ${fullResponse.length} chars received`);
        }
      }
    }
  );

  // If stream is returned, consume it
  if (stream instanceof ReadableStream) {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }
  }

  console.log(`✅ [EDIT TOOL] Complete response: ${fullResponse.length} characters`);

  // Parse the complete response
  const parsed = this.extractJsonFromResponse(fullResponse);
  
  // ... rest of existing validation and processing ...
}
```

### 3. Alternative: JSON Streaming Parser

For very large responses, use a streaming JSON parser:

```typescript
import { parser } from 'stream-json';
import { streamValues } from 'stream-json/streamers/StreamValues';

private async parseStreamingJSON(stream: ReadableStream): Promise<any> {
  const textDecoder = new TextDecoder();
  const jsonParser = parser();
  const streamValueParser = streamValues();
  
  let result: any = {};
  
  streamValueParser.on('data', ({ key, value }) => {
    if (key === 'code') result.code = value;
    if (key === 'reasoning') result.reasoning = value;
    if (key === 'changes') result.changes = value;
  });

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = textDecoder.decode(value);
      jsonParser.write(chunk);
    }
  } finally {
    reader.releaseLock();
    jsonParser.end();
  }

  return result;
}
```

### 4. Fallback for Non-Streaming Scenarios

```typescript
private async performEdit(input: EditToolInput): Promise<EditToolOutput> {
  try {
    // Try streaming first
    return await this.performEditWithStreaming(input);
  } catch (streamError) {
    console.warn('⚠️ [EDIT TOOL] Streaming failed, trying chunked approach:', streamError);
    
    // Fallback to chunked approach
    return await this.performEditWithChunks(input);
  }
}

private async performEditWithChunks(input: EditToolInput): Promise<EditToolOutput> {
  // Request AI to return response in chunks
  const chunkSize = 10000; // 10KB chunks
  
  const contextWithChunking = `${context}

IMPORTANT: Due to response size limits, please structure your response as follows:
1. First return a JSON with: {"partial": true, "totalChunks": N, "chunk": 1, "code_part": "...first part of code..."}
2. I will request subsequent chunks until complete.`;

  // Implementation of chunked retrieval...
}
```

## Implementation Plan

### Phase 1: Streaming Infrastructure (2-3 days)
1. Update AIClientService with streaming support
2. Add streaming JSON parser dependencies
3. Create streaming utilities module

### Phase 2: Edit Tool Integration (1-2 days)
1. Refactor edit tool to use streaming
2. Add progress logging
3. Implement fallback mechanisms

### Phase 3: Testing & Optimization (1-2 days)
1. Test with very large scenes (>50KB)
2. Benchmark streaming vs non-streaming
3. Optimize chunk sizes
4. Add error recovery

### Phase 4: Extend to Other Tools (Optional)
1. Apply streaming to ADD tool
2. Consider for other AI-heavy operations

## Monitoring & Debugging

Add comprehensive logging:

```typescript
interface StreamingMetrics {
  startTime: number;
  endTime: number;
  totalBytes: number;
  chunkCount: number;
  averageChunkSize: number;
  errors: string[];
}

private logStreamingMetrics(metrics: StreamingMetrics) {
  console.log('📊 [STREAMING METRICS]', {
    duration: `${(metrics.endTime - metrics.startTime) / 1000}s`,
    totalSize: `${(metrics.totalBytes / 1024).toFixed(2)}KB`,
    chunks: metrics.chunkCount,
    avgChunkSize: `${(metrics.averageChunkSize / 1024).toFixed(2)}KB`,
    throughput: `${(metrics.totalBytes / (metrics.endTime - metrics.startTime) * 1000 / 1024).toFixed(2)}KB/s`
  });
}
```

## Success Criteria

1. **No Truncation**: Handle responses up to 1MB without truncation
2. **Performance**: No significant latency increase (<10%)
3. **Reliability**: 99.9% success rate for large edits
4. **User Experience**: Smooth, progressive updates during generation

## Risks & Mitigations

1. **Risk**: Streaming not supported by all models
   - **Mitigation**: Automatic fallback to chunking

2. **Risk**: Network interruptions during streaming
   - **Mitigation**: Resume capability with chunk tracking

3. **Risk**: Memory usage with very large scenes
   - **Mitigation**: Stream processing without full buffering

## Alternative Quick Fix (Not Recommended)

If we need an immediate workaround:

```typescript
// Force smaller responses by limiting scope
const contextWithLimit = `${context}

CRITICAL: Your response MUST be under 20KB. If the code is too large:
1. Focus only on the specific changes requested
2. Use comments like "// ... existing code ..." for unchanged parts
3. Return only the modified functions/components`;
```

However, this is a band-aid solution and should only be used as a temporary measure while implementing the proper streaming solution.