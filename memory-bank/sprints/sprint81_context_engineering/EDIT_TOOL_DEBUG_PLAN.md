# Edit Tool Truncation - Debugging Plan

## Step 1: Enhanced Logging

First, let's add comprehensive logging to understand exactly where and when truncation occurs.

### 1.1 Update Edit Tool with Debug Logging

```typescript
// src/tools/edit/edit.ts

private async performEdit(input: EditToolInput): Promise<EditToolOutput> {
  try {
    // ... existing code ...

    // ADD: Log request size
    const requestSize = JSON.stringify({ messageContent, systemPrompt }).length;
    console.log(`📊 [EDIT TOOL DEBUG] Request size: ${requestSize} chars (${(requestSize/1024).toFixed(2)}KB)`);
    
    // ADD: Time the AI call
    const startTime = Date.now();
    
    const response = await AIClientService.generateResponse(
      modelConfig,
      [{ role: "user", content: messageContent }],
      { role: 'system', content: systemPrompt },
      { responseFormat: { type: "json_object" } }
    );
    
    const responseTime = Date.now() - startTime;
    
    const content = response?.content;
    if (!content) {
      throw new Error("No response from AI editor");
    }
    
    // ENHANCED DEBUG LOGGING
    console.log(`📏 [EDIT TOOL DEBUG] Response details:`, {
      size: content.length,
      sizeKB: (content.length / 1024).toFixed(2),
      sizeMB: (content.length / 1024 / 1024).toFixed(3),
      responseTime: `${responseTime}ms`,
      model: modelConfig.model,
      provider: modelConfig.provider,
      truncated: content.endsWith('...') || content.endsWith('\\') || !this.looksComplete(content),
      lastChars: content.slice(-100),
      hasValidJSON: this.isValidJSON(content)
    });
    
    // ADD: Check for common truncation patterns
    if (this.detectTruncation(content)) {
      console.error(`🚨 [EDIT TOOL DEBUG] TRUNCATION DETECTED!`);
      console.error(`Last 200 chars: "${content.slice(-200)}"`);
      
      // Save truncated response for analysis
      await this.saveTruncatedResponse(content, input);
    }
  }
}

private looksComplete(content: string): boolean {
  // Check if response appears complete
  const trimmed = content.trim();
  return trimmed.endsWith('}') || trimmed.endsWith('"}');
}

private isValidJSON(content: string): boolean {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

private detectTruncation(content: string): boolean {
  // Common truncation indicators
  const truncationPatterns = [
    /\\\s*$/,           // Ends with backslash
    /"\s*$/,            // Ends with unclosed quote
    /,\s*$/,            // Ends with comma
    /:\s*$/,            // Ends with colon
    /\[\s*$/,           // Ends with unclosed array
    /\{\s*$/,           // Ends with unclosed object
    /\\n\s*$/,          // Ends mid-escape sequence
    /[^}]\s*$/          // Doesn't end with closing brace
  ];
  
  return truncationPatterns.some(pattern => pattern.test(content));
}

private async saveTruncatedResponse(content: string, input: EditToolInput): Promise<void> {
  // Save to temp file for analysis
  const debugDir = '/tmp/edit-tool-debug';
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `truncated-${timestamp}.json`;
  
  const debugData = {
    timestamp,
    inputPrompt: input.userPrompt,
    codeLength: input.tsxCode.length,
    responseLength: content.length,
    responseLast1000: content.slice(-1000),
    fullResponse: content,
    model: 'current-model',
    truncationPoint: this.findTruncationPoint(content)
  };
  
  // Log to console for immediate visibility
  console.log(`🔍 [EDIT TOOL DEBUG] Truncation analysis:`, {
    ...debugData,
    fullResponse: undefined // Don't log full response to console
  });
}

private findTruncationPoint(content: string): number {
  // Try to find where JSON structure breaks
  let depth = 0;
  let inString = false;
  let escape = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i-1] : '';
    
    if (!escape) {
      if (char === '"' && prevChar !== '\\') inString = !inString;
      if (!inString) {
        if (char === '{' || char === '[') depth++;
        if (char === '}' || char === ']') depth--;
      }
      if (char === '\\') escape = true;
    } else {
      escape = false;
    }
  }
  
  // If depth isn't 0, we likely hit truncation
  return depth !== 0 ? content.length : -1;
}
```

### 1.2 Add Debug Mode to AI Client

```typescript
// src/server/services/ai/aiClient.service.ts

export interface AIClientOptions {
  responseFormat?: { type: "json_object" };
  debug?: boolean; // ADD THIS
}

private static async callOpenAI(
  config: ModelConfig, 
  messages: AIMessage[], 
  options?: AIClientOptions
): Promise<AIResponse> {
  const client = this.getOpenAIClient();
  
  try {
    // Log request details in debug mode
    if (options?.debug) {
      const requestSize = JSON.stringify(messages).length;
      console.log(`🔍 [AI CLIENT DEBUG] OpenAI Request:`, {
        model: config.model,
        messageCount: messages.length,
        requestSizeKB: (requestSize / 1024).toFixed(2),
        maxTokens: config.maxTokens,
        hasResponseFormat: !!options.responseFormat
      });
    }
    
    const response = await client.chat.completions.create({
      model: config.model,
      messages: messages as any,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens,
      ...(options?.responseFormat && { response_format: options.responseFormat }),
    });
    
    // Log response details in debug mode
    if (options?.debug) {
      const responseContent = response.choices[0]?.message?.content || '';
      console.log(`🔍 [AI CLIENT DEBUG] OpenAI Response:`, {
        contentLength: responseContent.length,
        contentLengthKB: (responseContent.length / 1024).toFixed(2),
        finishReason: response.choices[0]?.finish_reason,
        usage: response.usage,
        truncated: response.choices[0]?.finish_reason === 'length'
      });
      
      // Check if response was cut off due to max_tokens
      if (response.choices[0]?.finish_reason === 'length') {
        console.error(`🚨 [AI CLIENT DEBUG] Response hit max_tokens limit (${config.maxTokens})`);
      }
    }
    
    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      }
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`OpenAI API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

## Step 2: Test Cases for Debugging

Create specific test cases to trigger truncation:

```typescript
// Test 1: Generate a very large scene
const testLargeEdit = {
  userPrompt: "Add 50 animated elements with complex interactions and detailed styling",
  tsxCode: "// existing small scene",
  expectedSize: ">30KB"
};

// Test 2: Complex refactor
const testComplexRefactor = {
  userPrompt: "Refactor this to use 20 separate components with detailed props and types",
  tsxCode: "// large existing scene",
  expectedSize: ">40KB"
};

// Test 3: Add extensive comments
const testWithComments = {
  userPrompt: "Add detailed inline documentation to every line explaining the animation math",
  tsxCode: "// complex animation scene",
  expectedSize: ">25KB"
};
```

## Step 3: Infrastructure Investigation

### 3.1 Check Vercel Limits

```bash
# Check function size and timeout
cat vercel.json

# Check if we're hitting Vercel's response size limits
# Vercel Hobby: 10MB response limit
# Vercel Pro: 10MB response limit  
# Vercel Enterprise: 10MB response limit
```

### 3.2 Check Next.js API Route Config

```typescript
// Check if API route has size limits
// src/app/api/generate-stream/route.ts or similar

export const maxDuration = 60; // seconds
export const dynamic = 'force-dynamic';
// ADD: Check if we need to configure body size limit
```

### 3.3 Network Layer Investigation

- Check CloudFlare settings if using CF
- Check if any reverse proxies have limits
- Check Node.js buffer limits

## Step 4: Temporary Workarounds While Debugging

### 4.1 Increase AI Model Token Limits

```typescript
// In models.config.ts, temporarily increase limits
{
  id: 'edit-scene-high-limit',
  model: 'gpt-4o',
  provider: 'openai',
  maxTokens: 16384, // Increase from 8192
  temperature: 0.4,
}
```

### 4.2 Add Response Validation

```typescript
// Detect and retry on truncation
if (this.detectTruncation(content)) {
  console.warn('🔄 [EDIT TOOL] Truncation detected, retrying with instructions to be concise');
  
  const retryMessage = `${messageContent}

IMPORTANT: Your previous response was truncated. Please provide a more concise response:
- Focus only on the essential changes
- Remove unnecessary whitespace and comments
- Use shorter variable names if needed`;

  const retryResponse = await AIClientService.generateResponse(
    modelConfig,
    [{ role: "user", content: retryMessage }],
    { role: 'system', content: systemPrompt },
    { responseFormat: { type: "json_object" }, debug: true }
  );
  
  return this.parseResponse(retryResponse.content);
}
```

## Step 5: Data Collection Plan

1. **Run debug version for 24 hours**
   - Collect all truncation events
   - Log response sizes
   - Track which models/prompts cause issues

2. **Analyze patterns**
   - Average response size that causes truncation
   - Specific prompt types that generate large responses
   - Model-specific behaviors

3. **Test infrastructure limits**
   - Create endpoint that returns known sizes
   - Test 10KB, 20KB, 30KB, 50KB, 100KB responses
   - Identify exact truncation point

## Expected Outcomes

After debugging, we should know:
1. **Exact truncation threshold** (e.g., 23.5KB)
2. **Where truncation occurs** (AI model, network, Node.js)
3. **Which prompts cause large responses**
4. **Infrastructure limitations**

This data will inform the design of Option 2 (Response Chunking with Storage).