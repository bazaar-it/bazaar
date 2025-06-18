# TICKET-005: Add Monitoring and Telemetry

## Priority: LOW
## Status: TODO
## Estimated: 2 hours
## Depends on: TICKET-001, TICKET-002, TICKET-003

## Objective
Implement telemetry to track validation failures, dependency usage, and generation success rates to inform future improvements.

## Background
Without telemetry, we're flying blind on:
- Which validation rules fail most often
- Which dependencies AI tries to use
- Success rate improvements from validation
- User prompt patterns

## Implementation Details

### 1. Create Telemetry Service
**Location**: `src/lib/codegen/telemetry.ts`

```typescript
export interface CodeGenEvent {
  type: 'generation_attempt' | 'validation_failure' | 'generation_success' | 'retry_attempt';
  timestamp: Date;
  projectId?: string;
  metadata: Record<string, any>;
}

export interface ValidationFailureEvent extends CodeGenEvent {
  type: 'validation_failure';
  metadata: {
    errors: Array<{
      type: string;
      message: string;
    }>;
    attemptNumber: number;
    promptLength: number;
    detectedDeps: string[];
  };
}

export interface GenerationSuccessEvent extends CodeGenEvent {
  type: 'generation_success';
  metadata: {
    validated: boolean;
    retryCount: number;
    dependencies: string[];
    codeLength: number;
    generationTimeMs: number;
    modelUsed: string;
  };
}

class CodeGenTelemetry {
  private events: CodeGenEvent[] = [];
  private readonly MAX_EVENTS = 1000;
  
  track(event: CodeGenEvent) {
    // In-memory for now, could send to analytics service
    this.events.push(event);
    
    // Prevent memory leak
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Telemetry] ${event.type}`, event.metadata);
    }
  }
  
  // Analytics queries
  getValidationFailureRate(timeWindow: number = 3600000): number {
    const cutoff = new Date(Date.now() - timeWindow);
    const recent = this.events.filter(e => e.timestamp > cutoff);
    
    const attempts = recent.filter(e => e.type === 'generation_attempt').length;
    const failures = recent.filter(e => e.type === 'validation_failure').length;
    
    return attempts > 0 ? failures / attempts : 0;
  }
  
  getTopValidationErrors(limit: number = 5): Array<{error: string, count: number}> {
    const errors = new Map<string, number>();
    
    this.events
      .filter((e): e is ValidationFailureEvent => e.type === 'validation_failure')
      .forEach(event => {
        event.metadata.errors.forEach(error => {
          const key = `${error.type}: ${error.message}`;
          errors.set(key, (errors.get(key) || 0) + 1);
        });
      });
    
    return Array.from(errors.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
  
  getDependencyUsage(): Record<string, number> {
    const usage = new Map<string, number>();
    
    this.events
      .filter((e): e is GenerationSuccessEvent => e.type === 'generation_success')
      .forEach(event => {
        event.metadata.dependencies.forEach(dep => {
          usage.set(dep, (usage.get(dep) || 0) + 1);
        });
      });
    
    return Object.fromEntries(usage);
  }
  
  getAverageRetryCount(): number {
    const successes = this.events.filter(
      (e): e is GenerationSuccessEvent => e.type === 'generation_success'
    );
    
    if (successes.length === 0) return 0;
    
    const totalRetries = successes.reduce((sum, e) => sum + e.metadata.retryCount, 0);
    return totalRetries / successes.length;
  }
  
  // Export for analysis
  exportEvents(): CodeGenEvent[] {
    return [...this.events];
  }
  
  // Admin endpoint data
  getAnalyticsSummary() {
    return {
      totalEvents: this.events.length,
      failureRate: this.getValidationFailureRate(),
      topErrors: this.getTopValidationErrors(),
      dependencyUsage: this.getDependencyUsage(),
      averageRetries: this.getAverageRetryCount(),
      timeWindow: '1 hour'
    };
  }
}

export const telemetry = new CodeGenTelemetry();
```

### 2. Integrate with Code Generator
**Location**: Update `src/tools/add/add_helpers/CodeGeneratorNEW.ts`

```typescript
import { telemetry } from '~/lib/codegen/telemetry';

async generateCodeDirect(input: {
  userPrompt: string;
  functionName: string;
  projectId: string;
}): Promise<CodeGenerationOutput> {
  const startTime = Date.now();
  let retryCount = 0;
  
  // Track attempt
  telemetry.track({
    type: 'generation_attempt',
    timestamp: new Date(),
    projectId: input.projectId,
    metadata: {
      promptLength: input.userPrompt.length,
      functionName: input.functionName
    }
  });
  
  try {
    // ... existing code ...
    
    // After validation
    if (!validation.ok) {
      telemetry.track({
        type: 'validation_failure',
        timestamp: new Date(),
        projectId: input.projectId,
        metadata: {
          errors: validation.errors,
          attemptNumber: 1,
          promptLength: input.userPrompt.length,
          detectedDeps: validation.metadata?.detectedDeps || []
        }
      });
      
      // ... retry logic ...
      retryCount = 1;
    }
    
    // Track success
    telemetry.track({
      type: 'generation_success',
      timestamp: new Date(),
      projectId: input.projectId,
      metadata: {
        validated: validation.ok,
        retryCount,
        dependencies: validation.metadata?.detectedDeps || [],
        codeLength: code.length,
        generationTimeMs: Date.now() - startTime,
        modelUsed: getModel('codeGenerator').model
      }
    });
    
    return { code, metadata: { ... } };
  } catch (error) {
    // Track failure
    // ...
  }
}
```

### 3. Add Analytics Endpoint
**Location**: `src/app/api/admin/analytics/route.ts`

```typescript
import { telemetry } from '~/lib/codegen/telemetry';
import { requireAdmin } from '~/server/auth/admin';

export async function GET(request: Request) {
  // Check admin auth
  await requireAdmin(request);
  
  const summary = telemetry.getAnalyticsSummary();
  
  return Response.json({
    success: true,
    data: summary
  });
}
```

### 4. Create Dashboard Component
**Location**: `src/app/admin/analytics/page.tsx`

Simple dashboard to view:
- Validation failure rate
- Most common errors
- Dependency usage stats
- Average retry count

## Benefits

1. **Data-driven decisions** - Know which rules to adjust
2. **Quality metrics** - Track improvement over time
3. **Dependency insights** - See what users actually need
4. **Performance monitoring** - Generation time tracking

## Privacy Considerations
- No user content stored
- Only metadata and error types
- Project IDs for grouping only
- Configurable retention period

## Success Criteria
- [ ] Telemetry service implemented
- [ ] Integration with code generator
- [ ] Basic analytics endpoint
- [ ] No performance impact (<1ms)
- [ ] Useful insights generated

## Future Enhancements
- Send to external analytics service
- Real-time alerting on high failure rates
- A/B testing different prompts
- User-specific success rates