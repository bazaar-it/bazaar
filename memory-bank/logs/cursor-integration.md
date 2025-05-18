# Log Agent Integration with Cursor

This document provides examples of how to integrate the Log Agent with the Cursor editor through function calls. This allows developers to query logs, view issues, and manage log runs directly from the editor.

## Function Definitions

Below are examples of function definitions that can be added to your Cursor configuration to interact with the Log Agent.

### 1. Log Query

```json
{
  "name": "log_query",
  "description": "Ask a question about logs to get insights or analysis",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The question or query about the logs (e.g., 'What errors occurred during startup?')"
      },
      "run_id": {
        "type": "string",
        "description": "Optional run ID to query (default: latest)"
      }
    },
    "required": ["query"]
  }
}
```

### 2. Clear Logs

```json
{
  "name": "log_clear",
  "description": "Clear logs and start a new run for fresh testing",
  "parameters": {
    "type": "object",
    "properties": {
      "run_id": {
        "type": "string",
        "description": "Optional custom run ID for the new run"
      }
    }
  }
}
```

### 3. View Issues

```json
{
  "name": "log_issues",
  "description": "Get a list of detected issues from the logs",
  "parameters": {
    "type": "object",
    "properties": {
      "run_id": {
        "type": "string",
        "description": "Optional run ID to fetch issues from (default: latest)"
      },
      "level": {
        "type": "string",
        "description": "Optional filter by level (error, warn, info)"
      },
      "limit": {
        "type": "number",
        "description": "Maximum number of issues to return"
      }
    }
  }
}
```

### 4. View Raw Logs

```json
{
  "name": "log_raw",
  "description": "View raw log entries with filtering",
  "parameters": {
    "type": "object",
    "properties": {
      "run_id": {
        "type": "string",
        "description": "Optional run ID (default: latest)"
      },
      "filter": {
        "type": "string",
        "description": "Optional regex pattern to filter logs"
      },
      "source": {
        "type": "string",
        "description": "Optional source to filter by"
      },
      "limit": {
        "type": "number",
        "description": "Maximum number of logs to return"
      }
    }
  }
}
```

## Implementation Examples

### JavaScript Implementation

Here are examples of how to implement these functions in your Cursor extension:

```javascript
async function log_query({ query, run_id = 'latest' }) {
  const response = await fetch('http://localhost:3002/qna', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, runId: run_id })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to query logs: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.answer;
}

async function log_clear({ run_id = null }) {
  const data = run_id ? { newRunId: run_id } : {};
  
  const response = await fetch('http://localhost:3002/control/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to clear logs: ${response.statusText}`);
  }
  
  const result = await response.json();
  return `Started new log run: ${result.newRunId}`;
}

async function log_issues({ run_id = 'latest', level = null, limit = 10 }) {
  const params = new URLSearchParams();
  params.append('runId', run_id);
  if (level) params.append('level', level);
  params.append('limit', limit.toString());
  
  const response = await fetch(`http://localhost:3002/issues?${params}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.issues.length === 0) {
    return "No issues found in the logs.";
  }
  
  return result.issues.map((issue, i) => 
    `${i+1}. [${issue.level.toUpperCase()}] ${issue.summary} (${issue.count} occurrences)`
  ).join('\n');
}

async function log_raw({ run_id = 'latest', filter = null, source = null, limit = 20 }) {
  const params = new URLSearchParams();
  params.append('runId', run_id);
  if (filter) params.append('filter', filter);
  if (source) params.append('source', source);
  params.append('limit', limit.toString());
  
  const response = await fetch(`http://localhost:3002/raw?${params}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.logs.length === 0) {
    return "No logs found matching criteria.";
  }
  
  return result.logs.map(log => 
    `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.level.toUpperCase()}: ${log.message}`
  ).join('\n');
}
```

## Usage Examples

Here are examples of using these function calls within Cursor:

1. **Ask about errors in logs**:
   ```
   Ask the Log Agent to analyze errors: What were the last errors in initialization?
   Function: log_query
   Query: "What errors occurred during initialization and what might be causing them?"
   ```

2. **Start a fresh test run**:
   ```
   Clear the logs before my next test
   Function: log_clear
   ```

3. **Check for error patterns**:
   ```
   Check if there are any connection issues
   Function: log_issues
   Level: "error"
   ```

4. **View raw logs from a service**:
   ```
   Show me recent logs from the TaskProcessor
   Function: log_raw
   Filter: "TaskProcessor"
   Limit: 30
   ```

## Integration Workflow

A typical workflow for using the Log Agent with Cursor might look like:

1. Start the Log Agent service
2. Run your application
3. When an issue occurs, use Cursor to analyze logs:
   ```
   Function: log_query
   Query: "What went wrong in the last 5 minutes?"
   ```
4. Make code changes based on insights
5. Clear logs and start a new run:
   ```
   Function: log_clear
   ```
6. Test again to see if issues are resolved

This iterative loop helps to quickly identify and fix issues during development. 