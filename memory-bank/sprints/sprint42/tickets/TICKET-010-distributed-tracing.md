# TICKET-010: Add Distributed Tracing

## Overview
Implement distributed tracing to track requests across all services, providing visibility into performance bottlenecks and errors in our motion graphics generation pipeline.

## Current State

### Problem Areas
1. **No visibility** into where time is spent (brain vs tools vs database)
2. **Hard to debug** complex generation flows
3. **Performance bottlenecks** are invisible
4. **Error tracking** lacks context

## Implementation Plan

### Step 1: OpenTelemetry Setup

Create `/src/lib/tracing/setup.ts`:
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

export function initializeTracing() {
  // Only enable in production or when explicitly enabled
  if (process.env.NODE_ENV !== 'production' && !process.env.ENABLE_TRACING) {
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'bazaar-vid',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version,
    }),
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Too noisy
        },
      }),
    ],
  });

  sdk.start();
  
  console.log('Tracing initialized');
}
```

### Step 2: Trace Context Propagation

Create `/src/lib/tracing/context.ts`:
```typescript
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export const tracer = trace.getTracer('bazaar-vid', '1.0.0');

/**
 * Wrap async operations with tracing
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const span = tracer.startSpan(name);
  
  if (attributes) {
    span.setAttributes(attributes);
  }

  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add trace ID to response headers
 */
export function addTraceHeaders(headers: Headers): void {
  const span = trace.getActiveSpan();
  if (span) {
    const traceId = span.spanContext().traceId;
    headers.set('X-Trace-Id', traceId);
  }
}
```

### Step 3: Instrument Generation Pipeline

Update `/src/server/api/routers/generation.ts`:
```typescript
import { withSpan, tracer } from '~/lib/tracing/context';

generateScene: publicProcedure
  .input(generateSceneSchema)
  .mutation(async ({ input, ctx }) => {
    return withSpan('generation.generateScene', async () => {
      const span = trace.getActiveSpan();
      span?.setAttributes({
        'project.id': input.projectId,
        'user.message.length': input.userMessage.length,
        'has.images': !!input.userContext?.imageUrls,
      });

      // Brain decision phase
      const decision = await withSpan('brain.makeDecision', async () => {
        return orchestrator.decide({
          prompt: input.userMessage,
          imageUrls: input.userContext?.imageUrls,
          projectId: input.projectId,
          userId: ctx.userId,
        });
      }, {
        'prompt.length': input.userMessage.length,
        'image.count': input.userContext?.imageUrls?.length || 0,
      });

      // Tool execution phase
      const toolResult = await withSpan(`tool.${decision.toolName}`, async () => {
        return executeToolFromDecision(
          decision,
          input.projectId,
          ctx.userId,
          scenes
        );
      }, {
        'tool.name': decision.toolName,
        'tool.confidence': decision.confidence,
      });

      // Database operations
      await withSpan('db.saveResults', async () => {
        // Save to database
      });

      return toolResult;
    });
  }),
```

### Step 4: Instrument AI Services

Update `/src/server/services/ai/client.ts`:
```typescript
import { withSpan } from '~/lib/tracing/context';

export class TracedOpenAIClient {
  async generateStructured(options: GenerateOptions) {
    return withSpan('ai.generateStructured', async () => {
      const startTime = Date.now();
      
      const span = trace.getActiveSpan();
      span?.setAttributes({
        'ai.model': options.model,
        'ai.prompt.length': options.prompt.length,
        'ai.temperature': options.temperature || 0.7,
      });

      try {
        const result = await openai.chat.completions.create(options);
        
        span?.setAttributes({
          'ai.tokens.prompt': result.usage?.prompt_tokens,
          'ai.tokens.completion': result.usage?.completion_tokens,
          'ai.tokens.total': result.usage?.total_tokens,
          'ai.duration.ms': Date.now() - startTime,
        });

        return result;
      } catch (error) {
        span?.recordException(error as Error);
        throw error;
      }
    });
  }
}
```

### Step 5: Create Performance Dashboard

Create `/src/app/admin/tracing/page.tsx`:
```tsx
export default function TracingDashboard() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Performance Tracing</h1>
      
      {/* Trace List */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1">
          <h2 className="text-lg font-semibold mb-4">Recent Traces</h2>
          <div className="space-y-2">
            {traces.map(trace => (
              <TraceCard
                key={trace.id}
                trace={trace}
                onClick={() => setSelectedTrace(trace.id)}
                selected={selectedTrace === trace.id}
              />
            ))}
          </div>
        </div>

        {/* Trace Details */}
        <div className="col-span-2">
          {selectedTrace && (
            <TraceViewer traceId={selectedTrace} />
          )}
        </div>
      </div>
    </div>
  );
}

function TraceCard({ trace, onClick, selected }: TraceCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border rounded cursor-pointer transition-colors",
        selected ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium">{trace.operation}</p>
          <p className="text-sm text-gray-500">{trace.timestamp}</p>
        </div>
        <div className="text-right">
          <p className={cn(
            "text-sm font-medium",
            trace.duration > 1000 ? "text-red-600" : "text-green-600"
          )}>
            {trace.duration}ms
          </p>
          {trace.hasError && (
            <span className="text-xs text-red-600">Error</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TraceViewer({ traceId }: { traceId: string }) {
  const { data: trace } = api.admin.getTrace.useQuery({ traceId });
  
  if (!trace) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Trace Timeline</h2>
      
      {/* Waterfall Chart */}
      <div className="bg-gray-50 p-4 rounded">
        {trace.spans.map(span => (
          <SpanBar key={span.id} span={span} totalDuration={trace.duration} />
        ))}
      </div>

      {/* Span Details */}
      <div className="mt-6">
        <h3 className="font-medium mb-2">Operation Breakdown</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="pb-2">Operation</th>
              <th className="pb-2">Duration</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {trace.spans.map(span => (
              <tr key={span.id}>
                <td className="py-1">{span.name}</td>
                <td className="py-1">{span.duration}ms</td>
                <td className="py-1">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    span.status === 'ok' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  )}>
                    {span.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Step 6: Custom Metrics Collection

Create `/src/lib/tracing/metrics.ts`:
```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('bazaar-vid', '1.0.0');

// Create metrics
export const sceneGenerationDuration = meter.createHistogram('scene_generation_duration', {
  description: 'Duration of scene generation in milliseconds',
  unit: 'ms',
});

export const aiTokenUsage = meter.createCounter('ai_token_usage', {
  description: 'Total AI tokens used',
});

export const toolExecutionCounter = meter.createCounter('tool_executions', {
  description: 'Number of tool executions',
});

// Usage in code
export function recordSceneGeneration(duration: number, attributes: Record<string, any>) {
  sceneGenerationDuration.record(duration, attributes);
}

export function recordAIUsage(tokens: number, model: string) {
  aiTokenUsage.add(tokens, { model });
}
```

### Step 7: Error Tracking Integration

```typescript
// Integrate with existing error handling
export function captureError(error: Error, context?: Record<string, any>) {
  const span = trace.getActiveSpan();
  
  if (span) {
    span.recordException(error);
    span.setAttributes({
      'error.type': error.constructor.name,
      'error.message': error.message,
      ...context,
    });
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }

  // Also send to error tracking service
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: {
        traceId: span?.spanContext().traceId,
      },
      extra: context,
    });
  }
}
```

## Testing Plan

### 1. Trace Propagation Tests
```typescript
it('propagates trace context through generation pipeline', async () => {
  const traceId = await withSpan('test', async () => {
    const span = trace.getActiveSpan();
    return span?.spanContext().traceId;
  });

  expect(traceId).toBeDefined();
});
```

### 2. Performance Tests
```typescript
it('adds minimal overhead to requests', async () => {
  // Measure without tracing
  const baselineTime = await measureGenerationTime();
  
  // Enable tracing
  initializeTracing();
  
  // Measure with tracing
  const tracedTime = await measureGenerationTime();
  
  // Should add < 5% overhead
  expect(tracedTime).toBeLessThan(baselineTime * 1.05);
});
```

## Deployment Strategy

### 1. Development
- Tracing disabled by default
- Enable with `ENABLE_TRACING=true`
- Use Jaeger for local testing

### 2. Production
- Send traces to managed service (Datadog/New Relic)
- Sample 10% of requests initially
- Increase sampling for errors

### Environment Variables
```env
# Development
ENABLE_TRACING=true
OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Production
OTLP_ENDPOINT=https://otlp.datadog.com/v1/traces
OTLP_HEADERS=DD-API-KEY=your-api-key
TRACE_SAMPLING_RATE=0.1
```

## Success Criteria

- [ ] P95 latency visibility for all operations
- [ ] Error traces include full context
- [ ] < 5% performance overhead
- [ ] Identify top 3 performance bottlenecks
- [ ] Dashboard shows real-time metrics

## Dependencies

- OpenTelemetry SDK
- OTLP exporter
- Trace visualization service
- No changes to existing code logic

## Time Estimate

- OpenTelemetry setup: 1 hour
- Pipeline instrumentation: 2 hours
- Dashboard creation: 1 hour
- Testing and tuning: 1 hour
- **Total: 5 hours**