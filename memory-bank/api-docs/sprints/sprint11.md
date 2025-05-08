# Sprint 11: Fixing OpenAI Tool Call Streaming

## Overview

The chat system is not executing tools properly when a user submits a prompt. The LLM begins correctly (showing "using tool planscene") but never actually executes the tool. This causes the scene planning to remain empty and prevents the video generation pipeline from working properly.

## Root Cause Analysis

The core issue is in how we parse tool calls from OpenAI's streaming API response. Our current implementation uses manual string accumulation and JSON parsing:

```javascript
let streamedContent = "";
let toolCalls: any[] = [];
let inToolCallJson = false;
let toolCallBuffer = "";
let toolCallIndex = -1;
```

This manual approach fails to properly reconstruct complete tool call objects, especially with OpenAI's updated streaming format for function calling. While the system identifies tool invocation (showing "using tool planscene"), it never successfully builds a complete tool call object for execution.

## Flow of Events (Current Implementation)

1. **ChatPanel.tsx**: User submits a prompt, triggering `handleSubmit` which calls `initiateChat` mutation
2. **chat.ts Router**: `initiateChat` saves the user message, creates a placeholder assistant message with "pending" status
3. **ChatPanel.tsx**: Receives assistant message ID and triggers `streamResponse` mutation
4. **chat.ts & chatOrchestration.service.ts**: `streamResponse` checks if the message is already processed, marks it as streaming, and delegates to `processUserMessage`
5. **Stream Processing**: The OpenAI stream is processed, attempting to parse text content and tool calls
6. **Tool Execution Failure**: The current manual parsing approach fails to construct complete tool call objects, preventing execution

## Implementation Plan

### Ticket 1: Refactor Stream Processing in `chatOrchestration.service.ts`

**Files to Change:**
- `/src/server/services/chatOrchestration.service.ts`

**Changes:**
1. Replace manual JSON parsing with structured data handling using OpenAI's `delta.tool_calls`
2. Implement tool call accumulation by index across stream chunks
3. Use proper TypeScript types from the OpenAI SDK for more reliable parsing
4. Add detection for when tool calls are complete based on `finish_reason: "tool_calls"`

**Implementation Details:**
```typescript
// Initialize an accumulator for tool calls by index
const accumulatedToolCalls: Record<number, any> = {};

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta;
  
  // Handle tool call deltas in a structured way
  if (delta.tool_calls) {
    for (const toolCallDelta of delta.tool_calls) {
      // Create or update the tool call at this index
      if (toolCallDelta.index !== undefined) {
        if (!accumulatedToolCalls[toolCallDelta.index]) {
          accumulatedToolCalls[toolCallDelta.index] = {
            id: toolCallDelta.id || `call_${toolCallDelta.index}`,
            type: toolCallDelta.type || "function",
            function: {
              name: toolCallDelta.function?.name || "",
              arguments: ""
            }
          };
        }
        
        // Append function arguments if present
        if (toolCallDelta.function?.arguments) {
          accumulatedToolCalls[toolCallDelta.index].function.arguments += 
            toolCallDelta.function.arguments;
        }
      }
    }
  }

  // Process text content deltas
  if (delta.content) {
    // Handle text content
  }
  
  // Check if the stream is complete due to tool calls
  if (chunk.choices[0]?.finish_reason === "tool_calls") {
    // Execute accumulated tool calls
    const toolCalls = Object.values(accumulatedToolCalls);
    for (const toolCall of toolCalls) {
      await executeToolCall(toolCall, emitter);
    }
  }
}
```

**Why This Change:**
- OpenAI SDK provides structured `delta.tool_calls` data which is much more reliable than manual JSON parsing
- Accumulating by index ensures we correctly reconstruct multi-chunk tool calls
- Execution triggered by `finish_reason` ensures we don't execute incomplete tools

### Ticket 2: Enhance Error Logging and Debugging

**Files to Change:**
- `/src/server/services/chatOrchestration.service.ts`

**Changes:**
1. Add detailed logging at each stage of stream processing
2. Track and log all tool call fragments to help debug parsing issues
3. Add timing metrics to identify performance bottlenecks
4. Create structured error reporting for all tool execution failures

**Implementation Details:**
```typescript
// Add timing metadata
const startTime = Date.now();
console.log(`[${assistantMessageId}] Starting stream processing`);

// Log tool call progress
if (delta.tool_calls) {
  console.log(`[${assistantMessageId}] Received tool call delta: ${JSON.stringify(delta.tool_calls)}`);
}

// Log tool call execution
console.log(`[${assistantMessageId}] Executing tool: ${toolCall.function.name}`);

// Log completion
const duration = Date.now() - startTime;
console.log(`[${assistantMessageId}] Stream completed in ${duration}ms`);
```

**Why This Change:**
- Improved logging makes it easier to diagnose future stream parsing issues
- Debugging specific message IDs allows tracing the entire conversation flow
- Performance metrics help identify slow points in the streaming pipeline

### Ticket 3: Add Tool Call Event Buffer with Reconnection Support

**Files to Change:**
- `/src/server/services/chatOrchestration.service.ts`
- `/src/types/chat.ts`

**Changes:**
1. Create a more robust tool call buffering system
2. Add support for reconnection and resuming tool call parsing
3. Enhance event types to better represent tool call status
4. Add safeguards to prevent duplicate tool executions

**Implementation Details:**
```typescript
// Add to chat.ts
export interface ToolCallAccumulator {
  id?: string;
  index: number;
  name?: string;
  arguments: string;
  complete: boolean;
}

// In chatOrchestration.service.ts
const toolCallBuffer = new Map<number, ToolCallAccumulator>();

// Store partially accumulated tool calls in case of reconnection
const saveToolCallState = async (messageId: string, buffer: Map<number, ToolCallAccumulator>) => {
  // Save to DB or memory cache
};

// Restore tool call state on reconnection
const restoreToolCallState = async (messageId: string) => {
  // Restore from DB or memory cache
};
```

**Why This Change:**
- Better handling of connection drops and reconnections
- Prevents duplicate tool executions when streams are reestablished
- Provides clearer tracking of tool call state

### Ticket 4: Implement API Retry and Connection Resilience

**Files to Change:**
- `/src/server/services/chatOrchestration.service.ts`
- `/src/server/lib/openai.ts`

**Changes:**
1. Add configurable retry logic for OpenAI API calls
2. Implement exponential backoff for failed requests
3. Add recovery mechanisms for stream interruptions
4. Create fallbacks for streaming failures

**Implementation Details:**
```typescript
// In openai.ts
const retryableOpenAICall = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`OpenAI API call failed (attempt ${i+1}/${maxRetries}):`, error);
      lastError = error;
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, i) * (0.5 + Math.random() * 0.5);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// Usage in chatOrchestration.service.ts
const stream = await retryableOpenAICall(() => 
  openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: apiMessages,
    stream: true,
    tools: CHAT_TOOLS,
  })
);
```

**Why This Change:**
- Improves resilience against transient API failures
- Reduces user-facing errors during high-load periods
- Graceful degradation when API connectivity is unstable

### Ticket 5: Update Client-Side Stream Handling

**Files to Change:**
- `/src/app/projects/[id]/edit/panels/ChatPanel.tsx`

**Changes:**
1. Update client-side event handling for more reliable tool status updates
2. Add visual feedback for tool execution progress
3. Improve reconnection logic for dropped streams
4. Implement optimistic updates for better UX

**Implementation Details:**
```typescript
// Update the handler for 'tool_start' events
case "tool_start":
  // Tool execution started
  updateMessage(projectId, activeMessageId, {
    status: "tool_calling",
    content: `Using tool: ${event.name}...`,
    toolName: event.name,
    toolStartTime: Date.now()
  });
  break;
  
// Add tracking for tool execution time
case "tool_result":
  // Calculate execution time if we have a start time
  const toolMessage = getMessageById(activeMessageId);
  const executionTime = toolMessage?.toolStartTime 
    ? Math.round((Date.now() - toolMessage.toolStartTime) / 100) / 10
    : null;
  
  // Update with execution time for better UX
  updateMessage(projectId, activeMessageId, {
    status: event.success ? "success" : "error",
    kind: "tool_result",
    content: event.finalContent,
    jobId: event.jobId || null,
    executionTime
  });
  break;
```

**Why This Change:**
- Improves user feedback during tool execution
- Shows execution times to set appropriate expectations
- Better visual indication of progress and success/failure

### Ticket 6: Unit and Integration Tests for Stream Parsing

**Files to Create:**
- `/src/tests/unit/openaiStreamParser.test.ts`
- `/src/tests/integration/toolCallExecution.test.ts`

**Test Coverage:**
1. Unit tests for OpenAI stream chunk parsing
2. Tests for tool call accumulation with fragmented JSON
3. Integration tests for full tool execution flow
4. Test cases for error handling and reconnection logic

**Implementation Details:**
```typescript
// Example unit test
test('accurately accumulates fragmented tool calls', () => {
  const parser = new OpenAIStreamParser();
  
  // First chunk with function name
  parser.processChunk({
    choices: [{
      delta: {
        tool_calls: [{
          index: 0,
          function: { name: "planVideoScenes" }
        }]
      }
    }]
  });
  
  // Second chunk with partial arguments
  parser.processChunk({
    choices: [{
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: '{"scenes":' }
        }]
      }
    }]
  });
  
  // More chunks with more arguments
  // ...
  
  // Final chunk
  parser.processChunk({
    choices: [{
      delta: {
        tool_calls: [{
          index: 0,
          function: { arguments: '}}' }
        }]
      },
      finish_reason: "tool_calls"
    }]
  });
  
  // Verify the accumulated tool call
  const toolCalls = parser.getToolCalls();
  expect(toolCalls.length).toBe(1);
  expect(toolCalls[0].function.name).toBe("planVideoScenes");
  expect(JSON.parse(toolCalls[0].function.arguments)).toHaveProperty("scenes");
});
```

**Why These Tests:**
- Ensures robust handling of various stream formats and edge cases
- Verifies correct reconstruction of fragmented JSON 
- Confirms tools execute properly in realistic scenarios
- Validates error handling and recovery mechanisms

## Testing Approach

1. **Unit Tests**:
   - Test the stream parser component in isolation
   - Validate JSON accumulation with fragments from real API responses
   - Verify tool call detection logic

2. **Integration Tests**:
   - Test the full streaming flow from client to server
   - Verify tool execution when parsing is complete
   - Test reconnection and recovery scenarios

3. **End-to-End Tests**:
   - Create a scene plan through the UI
   - Verify components generate correctly
   - Confirm the full pipeline functions as expected

## Migration Plan

To minimize disruption, we'll implement changes in the following order:

1. First implement and test the new stream parser
2. Update the tool execution logic to use the new parser
3. Add enhanced logging and diagnostics
4. Implement client-side improvements
5. Add safeguards, recovery mechanisms and reconnection logic

## Documentation Updates

We'll update the following documentation:
- `/memory-bank/api-docs/scenePlanning.md` - Update with the new streaming approach
- Update relevant sprint docs with implementation details
- Add debugging guide for stream parsing issues

## Related Tickets

- `BAZAAR-112`: "Scene Planning Never Executes After Prompt"
- `BAZAAR-114`: "Tool Calls Not Executing in Chat Stream"
- `BAZAAR-118`: "Chat Stream Sometimes Disconnects and Loses Progress"

## Time Estimate

Total implementation time: 3-4 days

- Ticket 1 (Core Parser Refactor): 1 day
- Ticket 2 (Logging Enhancements): 0.5 day
- Ticket 3 (Tool Call Buffering): 0.5 day
- Ticket 4 (API Resilience): 0.5 day
- Ticket 5 (Client Updates): 0.5 day
- Ticket 6 (Tests): 1 day
