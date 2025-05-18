# Log Agent

The Log Agent is a standalone service that analyzes logs from the Bazaar-Vid application in real-time. It identifies patterns, detects issues, and provides insights through both automated rules and on-demand LLM-powered analysis.

## Core Features

- **Real-time log ingestion** from Winston logger
- **Automatic issue detection** using regex patterns
- **Deep log analysis** with OpenAI
- **Issue tracking and notification**
- **Simple CLI and editor integration**

## Architecture

The Log Agent runs as a separate service on port 3002 and consists of several key components:

1. **Express Server**: Handles API requests for log ingestion and querying
2. **Redis Storage**: Stores logs and issues with runId segmentation
3. **Analysis Worker**: Processes logs in the background using BullMQ
4. **Pattern Matching**: Detects common issues using regex patterns
5. **OpenAI Integration**: Provides deep analysis capabilities

```
┌─────────────────┐      ┌───────────────┐      ┌─────────────────┐
│  Main App       │      │  Log Agent    │      │  Redis          │
│  (Bazaar-Vid)   │─────▶│  (Port 3002)  │◄────▶│  Storage        │
└─────────────────┘      └───────────────┘      └─────────────────┘
        │                        │                      ▲
        │                        │                      │
        ▼                        ▼                      │
┌─────────────────┐      ┌───────────────┐      ┌─────────────────┐
│  Winston        │      │  Express API  │      │  Analysis       │
│  Log Transport  │      │  Endpoints    │      │  Worker         │
└─────────────────┘      └───────────────┘      └─────────────────┘
                                │                      │
                                │                      │
                                ▼                      ▼
                         ┌───────────────┐      ┌─────────────────┐
                         │  CLI Tools    │      │  OpenAI         │
                         │  & Editor     │      │  API            │
                         │  Integration  │      └─────────────────┘
                         └───────────────┘
```

## Getting Started

### Running the Log Agent

The Log Agent can be run in several ways:

1. **Using npm scripts**:
   ```bash
   # Start the log agent
   npm run log:agent
   
   # Start with hot reloading for development
   npm run log:dev
   ```

2. **Using the startup script**:
   ```bash
   chmod +x scripts/start-log-agent.sh
   ./scripts/start-log-agent.sh
   ```

3. **Using Docker**:
   ```bash
   cd src/scripts/log-agent
   docker-compose up -d
   ```

### Environment Variables

Configure the Log Agent with these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_AGENT_PORT` | Port for the server | `3002` |
| `LOG_AGENT_REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `OPENAI_API_KEY` | OpenAI API key for analysis | Required for LLM features |
| `LOG_AGENT_OPENAI_MODEL` | OpenAI model to use | `gpt-4o-mini` |
| `LOG_AGENT_MAX_TOKENS` | Max tokens for analysis | `7000` |
| `LOG_AGENT_ISSUE_THRESHOLD` | Min count before notification | `3` |

## Using the CLI

The Log Agent comes with a powerful command-line interface:

```bash
# Clear logs and start a new run
npm run log:clear

# Ask a question about the logs
npm run log:ask "What errors occurred in the last task run?"

# View raw logs
npm run log:logs

# List detected issues
npm run log:issues

# Start interactive mode
npm run log:interactive
```

## API Endpoints

The Log Agent exposes these HTTP endpoints:

- `POST /ingest`: Receive log batches
- `POST /qna`: Ask questions about logs
- `GET /raw`: View raw logs with filtering
- `GET /issues`: List detected issues
- `POST /control/clear`: Clear logs and start new run
- `GET /health`: Check server health
- `GET /metrics`: View performance metrics

## Integrating with Bazaar-Vid

### Winston Transport

To send logs from Bazaar-Vid to the Log Agent, use the custom transport:

```typescript
import { createLogger } from 'winston';
import { createLogAgentTransport } from './scripts/log-agent/logger-transport';

const logger = createLogger({
  // ...other options
  transports: [
    // ...other transports
    createLogAgentTransport({
      agentUrl: 'http://localhost:3002',
      source: 'main-app',
      runId: 'latest',
    }),
  ],
});
```

### Editor Integration

The Log Agent is designed to be used with Cursor/Windsurf via the CLI tools. You can create tool definitions in your editor to:

1. Query logs
2. Clear runs
3. View issues

## How It Works

### RunId Segmentation

The Log Agent uses `runId` to segment logs, allowing developers to:

1. Start a new run for each test session
2. Query logs from specific runs
3. Track issues across different runs

The special value `latest` can be used to refer to the most recent run.

### Issue Detection

Issues are detected using regex patterns that match common errors:

- Connection failures
- Task processor errors
- Agent initialization issues
- Database connection problems
- TypeErrors and SyntaxErrors
- Timeouts and performance issues

When an issue is detected, it's fingerprinted to avoid duplication, and only notified after reaching a threshold count (default: 3).

### Deep Analysis

For deeper insights, the Log Agent uses OpenAI to analyze logs based on natural language queries. This provides:

- Context-aware explanations
- Root cause analysis
- Recommendations for fixes
- Answers to specific questions

## Troubleshooting

### Common Issues

1. **Can't connect to Redis**:
   - Ensure Redis is running (`redis-cli ping`)
   - Check the connection URL

2. **OpenAI analysis not working**:
   - Verify `OPENAI_API_KEY` is set correctly
   - Check for rate limits or API outages

3. **Log Agent not receiving logs**:
   - Verify the transport is configured correctly
   - Check network connectivity between services

## Future Enhancements

Potential improvements for the Log Agent:

1. **Web UI** for log visualization
2. **Log retention policies** for efficient storage
3. **More sophisticated pattern matching** including ML-based anomaly detection
4. **Historical trend analysis** across multiple runs
5. **Integration with issue tracking systems** for automatic ticket creation

## Reference

### File Structure

```
src/scripts/log-agent/
├── config.ts               # Configuration
├── types.ts                # Type definitions
├── server.ts               # Express server
├── cli.ts                  # CLI commands
├── logger-transport.ts     # Winston transport
├── Dockerfile              # Container definition
├── docker-compose.yml      # Docker setup
└── services/
    ├── redis.service.ts    # Redis operations
    ├── worker.service.ts   # Background processing
    ├── pattern.service.ts  # Regex pattern matching
    ├── openai.service.ts   # LLM integration
    └── notification.service.ts # Alert system
```

### Key Concepts

- **LogEntry**: Individual log message with metadata
- **LogBatch**: Group of logs sent together
- **Issue**: Detected problem with fingerprint and count
- **RunId**: Identifier for a specific execution or test
- **LogPattern**: Regex rule for identifying issues 