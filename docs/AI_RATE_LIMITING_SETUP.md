# AI API Rate Limiting & Monitoring Setup

## Overview
This document explains how to set up and use the AI API rate limiting, key rotation, and monitoring system to prevent 529 errors and ensure reliable service during high traffic.

## Quick Setup Guide

### 1. Create Multiple API Keys

#### Anthropic (Claude)
1. Go to https://console.anthropic.com/
2. Create 3-5 API keys with names like:
   - `bazaar-vid-primary`
   - `bazaar-vid-backup-1`
   - `bazaar-vid-backup-2`
   - `bazaar-vid-backup-3`
   - `bazaar-vid-backup-4`
3. Set spending limits on each key ($50-100/month recommended)

#### OpenAI (Fallback)
1. Go to https://platform.openai.com/api-keys
2. Create 2-3 API keys for fallback scenarios

### 2. Add Keys to Vercel Environment

```bash
# Primary keys (existing)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
OPENAI_API_KEY=sk-xxxxx

# Additional Anthropic keys
ANTHROPIC_API_KEY_2=sk-ant-api03-yyyyy
ANTHROPIC_API_KEY_3=sk-ant-api03-zzzzz
ANTHROPIC_API_KEY_4=sk-ant-api03-aaaaa
ANTHROPIC_API_KEY_5=sk-ant-api03-bbbbb

# Additional OpenAI keys (for fallback)
OPENAI_API_KEY_2=sk-yyyyy
OPENAI_API_KEY_3=sk-zzzzz

# Optional: Monitoring webhook (Slack, Discord, etc.)
MONITORING_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# Optional: Redis for distributed rate limiting
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
```

### 3. Run Database Migration

```bash
npm run db:generate
npm run db:migrate
```

This creates the `api_usage_metrics` table for tracking API usage.

## How It Works

### 1. **API Key Rotation**
- Automatically rotates between multiple API keys
- Tracks health of each key (errors, rate limits)
- Marks unhealthy keys and puts them in cooldown
- Falls back to least-used key when all are unhealthy

### 2. **Rate Limiting (No Redis Required)**
- In-memory rate limiting: 50 req/min for Anthropic, 100 req/min for OpenAI
- Request queuing with priority support
- Automatic retry with exponential backoff
- Circuit breaker pattern to prevent cascading failures

### 3. **Automatic Fallback**
- When Anthropic returns 529 (overloaded), automatically falls back to OpenAI
- Preserves request context and returns comparable results
- Higher priority for fallback requests

### 4. **Monitoring & Alerting**
- Tracks all API calls in database
- Real-time health monitoring
- Webhook alerts for critical issues
- Dashboard at `/api/admin/ai-health`

## Usage in Code

The system is already integrated, but here's how it works:

```typescript
// All AI calls now have automatic protection
const response = await AIClientService.generateResponse(
  config,
  messages,
  systemPrompt,
  {
    fallbackToOpenAI: true,  // Enable automatic fallback
    priority: 5,             // Higher priority = processed first
    skipRateLimit: false,    // Set true for critical requests
  }
);
```

## Monitoring Dashboard

Check system health at: `https://your-app.vercel.app/api/admin/ai-health`

Returns:
```json
{
  "status": "ok",
  "services": {
    "apiKeys": {
      "anthropic": [
        {
          "key": "Primary",
          "health": 95,
          "status": "healthy"
        }
      ]
    },
    "rateLimiter": {
      "anthropic": {
        "queueSize": 0,
        "rateLimit": {
          "requests": 12,
          "remaining": 38
        }
      }
    }
  },
  "statistics": {
    "totalRequests": 156,
    "successRate": 98.5,
    "avgResponseTime": 2341
  }
}
```

## Best Practices

1. **Create Multiple Keys**: Don't rely on a single API key
2. **Set Spending Limits**: Protect against unexpected costs
3. **Monitor Regularly**: Check health dashboard during high traffic
4. **Use Priority Wisely**: 
   - User-facing requests: priority 5-6
   - Background tasks: priority 1-2
   - Admin tasks: priority 3-4

## Troubleshooting

### Still Getting 529 Errors?
1. Add more API keys
2. Increase rate limits in `simpleRateLimiter.ts`
3. Check if all keys are healthy: `/api/admin/ai-health`

### Queue Building Up?
1. Check queue stats in health endpoint
2. Consider clearing queue: Add admin endpoint to call `clearQueue()`
3. Reduce request rate from frontend

### Fallback Not Working?
1. Ensure OpenAI keys are configured
2. Check OpenAI API limits and billing
3. Verify `fallbackToOpenAI: true` is set in critical paths

## Security Notes

1. **API Keys**: Never commit API keys to git
2. **Health Endpoint**: Consider restricting to admin users only
3. **Monitoring Data**: Contains user IDs - ensure proper access control
4. **Rate Limits**: Adjust based on your API tier and traffic patterns

## Cost Optimization

1. **Use Fallback Wisely**: OpenAI can be more expensive for some models
2. **Monitor Token Usage**: Track in `api_usage_metrics` table
3. **Set Alerts**: Configure webhook alerts for high usage
4. **Optimize Prompts**: Shorter prompts = lower costs

## Future Enhancements

1. **Redis Integration**: Add Redis for distributed rate limiting across multiple servers
2. **Dynamic Key Health**: Auto-adjust rate limits based on error patterns
3. **Cost Tracking**: Add cost estimation to monitoring
4. **User-Level Limits**: Implement per-user rate limiting