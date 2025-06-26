# Web Agent Feature

## Overview
The Web Agent feature enables automatic brand matching by analyzing websites provided in user prompts. When users include a URL, the system captures screenshots and uses them to generate videos matching that brand's visual identity.

## Quick Usage
```bash
# Simply include a URL in your prompt:
"Create a video for https://stripe.com"
"Make an animation like https://vercel.com"
"Generate content matching our site at https://github.com"
```

## How It Works
1. **URL Detection** - Automatically extracts URLs from prompts
2. **Website Analysis** - Captures desktop & mobile screenshots (3-4 seconds)
3. **R2 Storage** - Uploads screenshots to Cloudflare R2
4. **AI Context** - Passes brand visuals to generation tools
5. **Brand Matching** - Creates videos matching the website's design

## Technical Details
- **Location**: `/src/tools/webAnalysis/WebAnalysisAgent.ts`
- **Integration**: Context Builder → Brain Orchestrator → Generation Tools
- **Performance**: 3-4 second analysis, 80% success rate
- **Security**: Validates URLs, blocks private IPs/localhost

## Sprint Documentation
For full implementation details, see: `/memory-bank/sprints/sprint52_web_agent/`

## Status
✅ **Production Ready** (Implemented in Sprint 52)