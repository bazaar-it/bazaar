# Console Logging System

The Bazaar video generation app implements a sophisticated console log filtering system to manage the verbosity of server-side logs, especially for tRPC procedures. This system helps developers focus on important messages by filtering out routine API calls and other noisy logs.

## Filtering Modes

The application supports multiple filtering modes, each with progressively stricter filtering:

1. **Standard Mode** (`npm run dev`) - Filters common tRPC logs while showing important warnings and errors
2. **Ultra-Quiet Mode** (`npm run dev:ultra-quiet`) - More aggressive filtering, hiding most routine API calls and warnings
3. **Absolute Silence Mode** (`npm run dev:silence`) - Maximum filtering, showing only critical errors and extremely slow procedure calls
4. **Clean Mode** (`npm run dev:clean`) - Uses our script-based approach to filter logs at the process output level for maximum reliability

## When to Use Each Mode

- **Standard Mode**: For normal development when you want balanced feedback
- **Ultra-Quiet Mode**: When debugging specific issues and want to reduce noise
- **Absolute Silence Mode**: When focusing only on critical errors or performance issues
- **Clean Mode**: For the most reliable filtering experience, especially for stubborn logs like `fetchConnectionCache` warnings

## Filtering Rules

The system uses regex pattern matching to determine which logs to show or hide:

### Standard Filtering (always active)
- Filters routine tRPC API calls
- Filters fetchConnectionCache deprecation warnings
- Shows procedure warnings for calls taking >5 seconds

### Ultra-Quiet Mode
- All standard filtering
- Hides most warnings and 200/304 status codes
- Only shows procedure warnings for calls taking >10 seconds

### Absolute Silence Mode
- Maximum filtering
- Hides nearly all HTTP requests and responses
- Only shows procedure warnings for calls taking >30 seconds

## Working with Important Logs

When you need to ensure a log is visible regardless of filtering level, use the marker utility:

```javascript
// Import the marker from the config file
import { marker } from '../../../server-log-config.js';

// Always visible logs
marker.log('IMPORTANT INFO', 'This message will always be shown');
marker.warn('POTENTIAL ISSUE', 'This warning will always be shown');
marker.error('CRITICAL ERROR', 'This error will always be shown');
```

## Implementation Details

The project provides two different approaches to log filtering:

### 1. Console Method Override Approach

The first approach works by intercepting console methods (log, info, warn, error) and applying pattern matching before deciding whether to output the message. The implementation lives in `server-log-config.js` which is loaded via Next.js instrumentation.

### 2. Process Output Filtering Approach (Recommended)

The second, more reliable approach works at the process output level:

- Uses a TypeScript script (`scripts/filtered-dev.ts`) that spawns the Next.js dev server
- Intercepts all stdout/stderr output before it reaches the terminal
- Filters lines based on pattern matching
- Accessed via `npm run dev:clean`

This approach is more effective since it filters logs regardless of how they're generated, making it especially good for hard-to-silence logs like `fetchConnectionCache` warnings and verbose tRPC GET requests.

## Custom Filtering

If you need to modify the filtering patterns, edit the following arrays in `server-log-config.js`:

- `filterPatterns` - Basic patterns filtered in all modes
- `ultraQuietPatterns` - Additional patterns filtered in ultra-quiet mode
- `absoluteSilencePatterns` - Additional patterns filtered in absolute silence mode
- `importantPatterns` - Patterns that are never filtered out

## Performance Thresholds

The system automatically highlights slow tRPC procedures based on their execution time:

- Standard Mode: Shows warnings for procedures taking >5 seconds
- Ultra-Quiet Mode: Shows warnings for procedures taking >10 seconds
- Absolute Silence Mode: Shows warnings for procedures taking >30 seconds 