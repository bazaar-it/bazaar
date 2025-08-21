# 🚀 Figma Integration Quick Start

**Time to First Success: 3 minutes**

## For Developers Joining the Project

### 30-Second Overview
We built a Figma integration that lets users drag & drop Figma designs into our video creation chat. The designs get converted to animated Remotion components automatically.

### 2-Minute Setup

#### Step 1: Get a Figma PAT (1 min)
1. Go to https://www.figma.com → Profile → Settings
2. Scroll to "Personal access tokens"
3. Click "Generate new token"
4. Name it "Bazaar Dev" and copy it

#### Step 2: Configure Environment (30 sec)
```bash
# Add to .env.local
FIGMA_PAT="figd_YOUR_TOKEN_HERE"
```

#### Step 3: Test It (30 sec)
```bash
npm run dev
# Open http://localhost:3000/projects/[any-project-id]/generate
# Click the palette icon (🎨) in sidebar
# You should see the Figma panel!
```

### First Test Run

1. **Create a Test Figma File**:
   - Go to figma.com → New Design File
   - Draw a rectangle, add text
   - Name it "Test Component"
   - Copy the file key from URL

2. **Import in Bazaar**:
   - Paste file key in Figma panel
   - Click Search
   - See your component appear!
   - Drag it to chat

## Code You'll Touch Most

### 1. Main UI Component
```typescript
// src/app/projects/[id]/generate/workspace/panels/FigmaDiscoveryPanel.tsx
// This is where users interact with Figma
```

### 2. API Endpoints
```typescript
// src/server/api/routers/figma.router.ts
// Add new Figma operations here
```

### 3. Figma Service
```typescript
// src/server/services/figma/figma-discovery.service.ts
// Core logic for fetching from Figma API
```

## Key Concepts in 1 Minute

### How It Works
```
User → Enters Figma URL → We fetch components → Display in grid → 
User drags to chat → We generate animation code → Video plays!
```

### The Stack
- **Frontend**: React + tRPC hooks
- **Backend**: Next.js API + tRPC
- **Database**: PostgreSQL (caching)
- **External**: Figma REST API

### The Data Flow
```typescript
// 1. User action
const { mutate } = api.figma.indexFile.useMutation();

// 2. API call
mutate({ fileKey: "abc123" });

// 3. Figma fetch
const file = await fetch(`figma.com/v1/files/${fileKey}`);

// 4. Display
setComponents(file.components);

// 5. Drag to chat
window.figmaDragData = { component };
```

## Common Tasks

### Add a New Figma Endpoint
```typescript
// In figma.router.ts
myNewEndpoint: protectedProcedure
  .input(z.object({ /* params */ }))
  .mutation(async ({ input, ctx }) => {
    // Your logic
  })
```

### Change the UI
```typescript
// In FigmaDiscoveryPanel.tsx
// It's just a React component!
```

### Debug API Calls
```javascript
// Browser console
localStorage.setItem('DEBUG_FIGMA', 'true');
// Now check Network tab for /api/trpc/figma calls
```

## Current Limitations (So You're Not Surprised)

1. **No thumbnails** - We show icons instead
2. **Basic animations** - Conversion is simple for now
3. **Rate limited** - 2 requests/second to Figma
4. **PAT only** - No OAuth yet

## Where Everything Lives

```
memory-bank/sprints/sprint89_figma_integration/
├── README.md                 # Full sprint overview
├── DEVELOPER-GUIDE.md        # Deep technical dive
├── TESTING-GUIDE.md          # How to test everything
├── INTEGRATION-STATUS.md     # Current state & rating
└── QUICK-START.md            # You are here!
```

## Your First Contribution Ideas

### Easy (30 min)
- Add a refresh button to re-fetch components
- Show component count in header
- Add loading skeleton instead of spinner

### Medium (2 hours)
- Implement thumbnail previews using Figma image API
- Add "recent files" dropdown
- Batch selection with checkboxes

### Advanced (1 day)
- Improve Figma → Remotion conversion
- Add component search/filter
- Implement proper OAuth flow

## Get Help

### Stuck? Check These First:
1. Browser console for errors
2. Network tab for API failures
3. `test-figma-pat.ts` to verify token

### Common Issues:

**"Forbidden" error**
→ You don't have access to that Figma file

**No components found**
→ File might only have shapes, not components/frames

**Slow loading**
→ Rate limiting, normal for large files

## Success Checklist

- [ ] I can see the Figma panel
- [ ] I can enter a file key
- [ ] I can see components load
- [ ] I can drag a component to chat
- [ ] I understand where the code lives

## Ready to Code?

1. **Start here**: `FigmaDiscoveryPanel.tsx`
2. **Understand flow**: Follow a file key from input to display
3. **Make a change**: Add a console.log to track the flow
4. **Test it**: Use your own Figma file
5. **Commit**: You're now a Figma integration contributor!

## TL;DR

```bash
# Setup
echo 'FIGMA_PAT="figd_YOUR_TOKEN"' >> .env.local
npm run dev

# Test
# 1. Open project workspace
# 2. Click palette icon in sidebar
# 3. Paste a Figma file key
# 4. Drag component to chat
# 5. 🎉 Magic happens
```

**Welcome to the team! You're ready to contribute! 🚀**