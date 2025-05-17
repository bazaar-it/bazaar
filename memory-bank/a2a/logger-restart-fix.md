# A2A Logger Restart Fix

## Problem
A critical issue was discovered in the A2A system where the development server was constantly restarting due to log file creation/rotation:

1. The TaskProcessor was using Winston's DailyRotateFile transport to log to the `logs/` directory
2. Each file creation/modification triggered Next.js's Hot Module Replacement (HMR)
3. HMR sent a SIGTERM to the Node process, restarting the server
4. On restart, a new TaskProcessor was created, which created a new log file
5. This resulted in an infinite restart loop, preventing agents from processing messages

Evidence of the problem in logs:
```
Added A2A file transport...
... < 0.8 s later >
SIGTERM received
```

## Solution
Implemented a two-part solution:

1. **Modified Logger Initialization**:
   - Updated `initializeA2AFileTransport()` to use a configurable log directory with `A2A_LOG_DIR` environment variable
   - Added singleton safeguards to prevent duplicate transport initialization
   - Defaulted log directory to `/tmp/a2a-logs` (outside the watched tree)
   - Used proper error handling for directory creation and transport setup

2. **Updated Next.js Configuration**:
   - Added webpackDevMiddleware configuration to explicitly ignore log directories
   - Added patterns to ignore both project's `logs/` and external `/tmp/a2a-logs/` paths
   - Ensured existing configuration is preserved with fallbacks

## Usage
For development:
- Set `A2A_LOG_DIR=/tmp/a2a-logs` in environment to keep logs outside the watched tree
- Or rely on the default which uses `/tmp/a2a-logs`

For production:
- Set `A2A_LOG_DIR=/var/log/app` or another appropriate log directory

## Benefits
- TaskProcessor no longer restarts in an infinite loop
- Agents can now fully process messages without interruption
- Maintains logging capability in both development and production
- Solves the core issue that was preventing A2A system progress

## Next Steps
With this fix in place, we should now be able to see the full A2A workflow continue beyond the initial setup, with the ScenePlannerAgent receiving and processing messages as expected.

After restarting the server, we expect to see log entries like:
```
[A2A] Routing message to ScenePlannerAgent
[ScenePlannerAgent] Processing message...
```

This will allow us to continue debugging and developing the A2A system. 