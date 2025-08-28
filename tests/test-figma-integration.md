# Figma Integration Test Plan

## Test Setup

### Prerequisites
1. ✅ Figma PAT configured in `.env.local`
2. ✅ Dev server running (`npm run dev`)
3. ✅ Figma panel visible in workspace
4. ✅ A Figma file with components you have access to

### Test Scenarios

## Scenario 1: Basic Component Discovery
1. **Open Figma Panel** 
   - Click the palette icon in sidebar
   - Panel should show "Figma Designs" header

2. **Enter Figma File Key**
   - Get a file key from your Figma file URL
   - Example: `figma.com/file/ABC123XYZ/filename` → key is `ABC123XYZ`
   - Paste key in input field
   - Click Search or press Enter

3. **Expected Results**
   - Loading spinner appears
   - Components display in grid with:
     - ✅ Component names
     - ✅ Component types (Frame, Component, etc.)
     - ✅ Thumbnail images (if available)
   - "Found X components" message
   - Refresh button visible

## Scenario 2: Drag Component to Chat
1. **Select a Component**
   - Hover over a component - should show hover effect
   - Click and start dragging

2. **Drag to Chat Panel**
   - Drag component to chat input area
   - Drop zone should highlight

3. **Expected Result**
   - Message appears in chat: `Create an animated version of my Figma design "Component Name" (ID: xxx)`
   - Message is ready to send

## Scenario 3: Generate Animation from Figma
1. **Send the Message**
   - With Figma component message in chat
   - Click Send or press Enter

2. **Expected Flow**
   - Message sent to orchestrator
   - System should:
     a. Detect it's a Figma component request
     b. Fetch component data from Figma API
     c. Send to GPT-5-mini for conversion
     d. Generate Remotion component code
     e. Create scene in preview

3. **Success Indicators**
   - Chat shows "Generating..." state
   - New scene appears in preview
   - Scene contains animated Figma design

## Scenario 4: Recent Files
1. **After First Search**
   - File should be saved to recent files
   - Clock icon appears in search field

2. **Click Clock Icon**
   - Dropdown shows recent files
   - Shows file name and date accessed

3. **Select Recent File**
   - Click on recent file
   - Should auto-search and load components

## Scenario 5: Refresh Components
1. **With Components Loaded**
   - Click Refresh button
   - Should reload components from Figma

2. **Expected Behavior**
   - Loading state shows
   - Components refresh
   - Toast notification confirms refresh

## Test Commands

### Check if Figma PAT is working:
```bash
npx tsx test-figma-pat.ts
```

### Monitor console for debug info:
```javascript
// In browser console
localStorage.setItem('DEBUG_FIGMA', 'true')
```

### Check network requests:
- Open DevTools → Network tab
- Filter by: `figma` or `trpc`
- Should see:
  - `/api/trpc/figma.checkConnection`
  - `/api/trpc/figma.indexFile`

## Common Issues & Solutions

### "Forbidden" Error
- **Issue**: Can't access file
- **Solution**: Use a file you own or have been shared with

### No Components Found
- **Issue**: File has no components
- **Solution**: Ensure file has frames or components, not just shapes

### Drag Not Working
- **Issue**: Component doesn't drag to chat
- **Solution**: Check console for `figmaDragData` object

### No Thumbnails
- **Issue**: Components show without images
- **Solution**: This is normal - thumbnails may take time to load

## Success Criteria

- [ ] Can search and find Figma components
- [ ] Can see component thumbnails
- [ ] Can drag component to chat
- [ ] Message appears in chat input
- [ ] Recent files are saved and accessible
- [ ] Refresh button works
- [ ] GPT-5-mini generates proper Remotion code
- [ ] Generated scene appears in preview

## Next Steps After Testing

If all tests pass:
1. Try with different component types (buttons, cards, etc.)
2. Test with large files (50+ components)
3. Test error handling with invalid keys

If issues found:
1. Check browser console for errors
2. Check server logs for API errors
3. Verify PAT is valid
4. Check network tab for failed requests