# Testing Figma OAuth Integration

## Quick Test (Using PAT)
Your current setup uses the PAT from .env.local, which is perfect for testing!

1. **Create a test Figma file**:
   - Go to https://figma.com
   - Create a new design file
   - Add some components (frames, buttons, text)
   - Name them clearly (e.g., "Hero Section", "Button Primary")

2. **Test in your app**:
   - Copy the Figma file URL
   - Paste in the Figma panel
   - Click Search
   - You should see your components listed

3. **Test drag-and-drop**:
   - Drag a component from Figma panel to Chat
   - It should add text like: "Create an animated version of my Figma design..."
   - Send the message to generate animation

## Test OAuth Flow (Production-Ready)

To test the OAuth flow without PAT:

1. **Temporarily disable PAT**:
```bash
# Comment out the PAT in .env.local
# FIGMA_PAT="..."
```

2. **Restart dev server**:
```bash
npm run dev
```

3. **Test OAuth connection**:
   - Open Figma panel
   - You'll see "Connect Figma" button
   - Click it → Opens Figma authorization
   - Authorize the app
   - Should redirect back and show "Connected"

## Common Test Scenarios

### ✅ Successful Flow
1. Search for Figma file → Components appear
2. See thumbnails for each component
3. Drag component to chat → Message appears
4. Send message → Animation generates

### ❌ Error Cases to Test
1. **Invalid file key**: Should show error message
2. **Private file**: Should show "Access denied"
3. **No components**: Should show "No components found"
4. **Network error**: Should show connection error

## Debug Commands

```bash
# Check if Figma API is working
curl -H "X-Figma-Token: YOUR_PAT" \
  https://api.figma.com/v1/me

# Test file access
curl -H "X-Figma-Token: YOUR_PAT" \
  https://api.figma.com/v1/files/FILE_KEY

# Check browser console for errors
# Open DevTools → Console tab
# Look for any red errors when using Figma panel
```

## Sample Figma Files to Test

You can test with these public Figma files:
- Material Design System: Usually has many components
- Any UI kit from Figma Community
- Your own design files

## Expected Results

✅ **Working correctly if**:
- "Connected" status shows green
- File search returns components
- Components show names and types
- Drag to chat works
- Recent files are saved

❌ **Issues if**:
- "Connect Figma" button shows (means not connected)
- Search returns no results (check file access)
- Drag doesn't work (check console errors)

## Next Steps After Testing

1. **If PAT works**: OAuth is optional but recommended for production
2. **If OAuth works**: Remove PAT from .env.local for production
3. **For production**: Add production redirect URI in Figma app settings