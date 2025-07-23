# Test Cases for Edit Tool Truncation

## Test 1: Large Scene Edit Request

To trigger truncation, use this prompt in the chat when editing a scene:

```
Please make this scene much more complex:
1. Add 20 different animated elements with detailed keyframes
2. Create 10 nested components with props and state
3. Add comprehensive inline documentation explaining every line
4. Include complex mathematical calculations for animations
5. Add extensive styling with many CSS-in-JS objects
6. Create multiple helper functions with TypeScript types
7. Add error handling and validation for all props
8. Include performance optimizations and memoization
9. Add accessibility attributes to all elements
10. Create a detailed animation timeline with 50+ keyframes
```

## Test 2: Multiple Reference Scenes

Edit a scene while referencing 3-4 other large scenes:

```
Make this scene match the style of scenes 1, 2, and 3, combining:
- The color palette from scene 1
- The animation patterns from scene 2
- The layout structure from scene 3
- Add all the text elements from all three scenes
- Merge all the animations into one complex timeline
```

## Test 3: Complex Refactoring

```
Refactor this entire scene:
- Split every element into its own component
- Add TypeScript interfaces for all props
- Create a state management system with reducers
- Add unit tests as comments
- Include performance monitoring
- Add internationalization support
- Create theme variants (light/dark/high-contrast)
```

## Expected Debug Output

When truncation occurs, you should see:

```
📊 [EDIT TOOL DEBUG] Request size: X chars (X.XX KB)
🔍 [AI CLIENT DEBUG] OpenAI Request: {
  model: "xxx",
  requestSizeKB: "XX.XX",
  maxTokens: 16000
}
📏 [EDIT TOOL DEBUG] Response details: {
  size: 23847,
  sizeKB: "23.29",
  truncated: true,
  hasValidJSON: false
}
🚨 [EDIT TOOL DEBUG] TRUNCATION DETECTED!
Last 200 chars: "...truncated content..."
```

## Data Collection Points

1. **Request Size**: How large was the request sent to AI?
2. **Response Size**: Exact byte count where truncation occurs
3. **Response Time**: How long before truncation (timeout?)
4. **Truncation Pattern**: What characters appear at the end?
5. **Model Used**: Which AI model was used?
6. **Finish Reason**: Did AI report 'length' or normal completion?

## Infrastructure Tests

### Test API Route Limits

Create a test endpoint to verify infrastructure limits:

```typescript
// src/app/api/test-size/route.ts
export async function GET(request: Request) {
  const size = parseInt(request.nextUrl.searchParams.get('size') || '10000');
  
  // Generate response of specific size
  const response = 'x'.repeat(size);
  
  return new Response(response, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': size.toString(),
    },
  });
}
```

Test with:
- 10KB: `/api/test-size?size=10240`
- 20KB: `/api/test-size?size=20480`
- 30KB: `/api/test-size?size=30720`
- 50KB: `/api/test-size?size=51200`
- 100KB: `/api/test-size?size=102400`

## Monitoring Commands

Watch logs during testing:

```bash
# In one terminal
npm run dev

# In another terminal, watch for debug output
npm run dev 2>&1 | grep -E "(EDIT TOOL DEBUG|AI CLIENT DEBUG|TRUNCATION)"
```

## Expected Findings

Based on the existing error (23KB truncation), we expect to find:

1. **Vercel Limit**: Likely hitting response streaming buffer limit
2. **CloudFlare**: Possible 100MB limit but with buffering issues
3. **Next.js**: API routes may have default body size limits
4. **Node.js**: Default highWaterMark buffer size (16KB)

## Next Steps After Data Collection

1. If truncation is consistent at ~23KB, it's likely a buffer issue
2. If truncation varies, it might be timeout-related
3. If AI reports 'length' finish reason, increase maxTokens
4. If infrastructure limit confirmed, implement chunking solution