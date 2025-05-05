# Bazaar Video Generator - Pre-Launch Test Plan

## Critical Path Tests

| ID | Test | Steps | Expected Result | Problem Indicators | Fix Action |
|----|------|-------|----------------|-------------------|------------|
| CP1 | Component Generation | 1. Create new project<br>2. Ask for "Create a bouncing ball animation"<br>3. Wait for completion | Component appears in sidebar | - No response from AI<br>- Error in console<br>- No component in sidebar | Check `chat.ts` stream handling and component generation function |
| CP2 | Component Preview | 1. After CP1, add component to timeline<br>2. Check preview panel | Animation plays in preview | - Component not visible<br>- Error in preview<br>- Console errors | Verify component insertion in `handleInsertComponent` in Sidebar.tsx |
| CP3 | Modify Animation | 1. After CP2, ask "Make the ball red"<br>2. Wait for completion | Ball color changes to red | - AI doesn't modify<br>- Patch not applied | Check patch application in `applyJsonPatch` handling in chat.ts |
| CP4 | Page Refresh Stability | 1. Start component generation<br>2. Refresh page during process<br>3. After reload, check sidebar | Only one component appears | - Multiple identical components<br>- Streaming errors | Review our streaming protection in chat.ts and ChatPanel.tsx |
| CP5 | Component Management | 1. Rename a component<br>2. Delete a component | Operations succeed | - Error during operation<br>- UI doesn't update | Check customComponent router and Sidebar component |

## Extended Feature Tests

| ID | Test | Steps | Expected Result | Problem Indicators | Fix Action |
|----|------|-------|----------------|-------------------|------------|
| EX1 | Complex Animation | Ask for "3D rotating text with your company name" | Component generates successfully | Poor quality code or errors | May need to enhance prompt engineering in system prompt |
| EX2 | Multiple Components | Add 3+ different components to timeline | All render correctly | Memory issues, performance drops | Check `VideoPreview.tsx` rendering logic |
| EX3 | Component Positioning | Adjust component position on timeline | Component moves accordingly | Wrong timestamps, visual glitches | Check scene handling in video state |
| EX4 | Error Handling | 1. Ask for impossible animation<br>2. Cause compile error | Graceful error message | Crash or unhelpful errors | Review error handling in component build process |
| EX5 | User Flow | Complete entire flow from start to finish | Smooth experience | Any friction points | Document specific UX issues |

## Rapid Testing Shortcuts

To test quickly, use these prompts/actions:

1. **Quick Component Test**: "Create simple text animation that says 'Hello World'"
2. **JSON Patch Test**: "Make the background blue" (should apply a simple patch)
3. **Refresh Test**: Start component generation and immediately refresh
4. **Sidebar Test**: Check components after generation - should have no duplicates

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Stream hanging | Check console for controller errors; restart server if needed |
| Duplicate components | Clear DB entries manually via admin; our code fix should prevent new duplicates |
| Build failures | Check logs for compile errors; may need to update Remotion dependencies |
| Preview not updating | Force refetch of video props via browser console: `window.__NEXT_REDUX_STORE__.dispatch({type: "REFETCH_VIDEO_PROPS"})` |
| Console errors | Most common: React state update after unmount - check cleanup functions in useEffect |

## Critical Console Commands

```bash
# Quick DB check for component jobs
npx drizzle-kit studio

# Restart dev server
npm run dev

# Check R2 storage status
# [Add your R2 CLI command here]
```

## Before Deploying to Production

Check these specific files one more time:

1. `/src/server/api/routers/chat.ts` - Stream handling and activeStreamIds
2. `/src/app/projects/[id]/edit/panels/ChatPanel.tsx` - processedMessageIds tracking
3. `/src/server/api/routers/customComponent.ts` - Filter for successful components
