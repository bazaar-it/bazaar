# Bazaar-Vid Logging System

## Overview

Bazaar-Vid implements a comprehensive structured logging system using Winston. This system provides both console output for development and rotating log files for production monitoring and debugging.

The system is designed to provide clear visibility into the video generation pipeline, with special focus on the critical steps of scene planning, component generation, and component building—areas where diagnostic information is essential for troubleshooting.

## Log Files

All logs are stored in the `/logs` directory at the project root. The logging system implements daily log rotation with the following files:

- `combined-%DATE%.log` - Contains all log messages (debug, info, warn, error)
- `error-%DATE%.log` - Contains only error-level messages
- `components-%DATE%.log` - Contains logging specific to component generation

The %DATE% placeholder is replaced with the current date in YYYY-MM-DD format.

## Log Format

### Console Output

Console logs are formatted with colors and timestamps for readability:

```
2024-05-08T14:32:45.678Z [debug]: [COMPONENT:START][JOB:abc-123] Starting component generation
```

### File Output

File logs are stored in JSON format for easier parsing and analysis:

```json
{
  "timestamp": "2024-05-08T14:32:45.678Z",
  "level": "debug",
  "message": "[COMPONENT:START][JOB:abc-123] Starting component generation",
  "component": true,
  "jobId": "abc-123"
}
```

## Specialized Loggers

The system provides specialized logger objects for different parts of the pipeline:

### componentLogger

For tracking component generation steps:

```typescript
componentLogger.start(jobId, "Starting component generation");
componentLogger.plan(jobId, "Planning component structure");
componentLogger.prompt(jobId, "Sending LLM prompt");
componentLogger.llm(jobId, "Received LLM response");
componentLogger.parse(jobId, "Parsing component code");
componentLogger.error(jobId, "Error generating component");
componentLogger.complete(jobId, "Component generation complete");
```

### buildLogger

For tracking component build and compilation steps:

```typescript
buildLogger.start(jobId, "Starting build process");
buildLogger.compile(jobId, "Compiling TypeScript code");
buildLogger.upload(jobId, "Uploading to R2 storage");
buildLogger.error(jobId, "Error during build");
buildLogger.warn(jobId, "Warning during compilation");
buildLogger.complete(jobId, "Build complete");
```

### scenePlannerLogger

For tracking the scene planning pipeline:

```typescript
scenePlannerLogger.start(planId, "Processing scene plan");
scenePlannerLogger.adb(planId, sceneId, "Generating Animation Design Brief");
scenePlannerLogger.component(planId, sceneId, "Starting component generation");
scenePlannerLogger.db(planId, "Saving to database");
scenePlannerLogger.error(planId, "Error in scene planning");
scenePlannerLogger.complete(planId, "Scene planning complete");
```

### animationDesignerLogger

For tracking Animation Design Brief generation:

```typescript
animationDesignerLogger.start(sceneId, "Starting ADB generation");
animationDesignerLogger.data(sceneId, "Preparing ADB data");
animationDesignerLogger.validation(sceneId, "Validating ADB structure");
animationDesignerLogger.error(sceneId, "Error in ADB generation");
animationDesignerLogger.complete(sceneId, "ADB generation complete");
```

### chatLogger

For tracking chat and LLM interactions:

```typescript
chatLogger.start(messageId, "Starting chat processing");
chatLogger.stream(messageId, "Streaming response");
chatLogger.tool(messageId, toolName, "Processing tool call");
chatLogger.error(messageId, "Error in chat processing");
chatLogger.complete(messageId, "Chat processing complete");
```

## Log Context and Tags

All logs include context tags to help with filtering and analysis:

1. **Job/Process Identifiers**: Every log line includes identifiers like jobId, planId, sceneId, or messageId
2. **Stage Tags**: `[COMPONENT:START]`, `[BUILD:COMPILE]`, `[PIPELINE:ADB]`, etc.
3. **Timing Information**: Many logs include duration metrics for performance analysis
4. **Type Tags**: Error logs often include a type tag like `[TYPE:VALIDATION]` to categorize the error

## Usage in Development

During development, you'll primarily use the console logs, which are formatted for readability.

## Usage in Production

In production, logs are available for inspection in the `/logs` directory. You can use tools like `grep`, `jq`, or log analysis platforms to parse and analyze the JSON-formatted log files.

Example analysis:

```bash
# Find all errors related to component ABC-123
grep -l "ABC-123" logs/error-*.log | xargs cat | jq 'select(.component == true)'

# Find all components that took longer than 5 seconds to generate
cat logs/components-*.log | jq 'select(.duration > 5000)'
```

## Implementation Details

The logging system is implemented in `src/lib/logger.ts` using the Winston logging library with the `winston-daily-rotate-file` package for log rotation.

The logger configuration includes:
- Log levels based on NODE_ENV (debug in development, info in production)
- Color-coded console output
- JSON-formatted file output
- 14-day retention for log files
- 20MB maximum file size before rotation

## Future Improvements

Planned improvements to the logging system:

1. **Distributed Tracing**: Add trace IDs to connect logs across multiple requests
2. **Log Aggregation**: Integrate with a centralized logging service
3. **Performance Metrics**: Add more detailed timing metrics for bottleneck analysis
4. **Alert System**: Configure alerts for critical errors 