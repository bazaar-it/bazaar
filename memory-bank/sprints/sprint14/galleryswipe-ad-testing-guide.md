# GallerySwipe Ad Testing Guide

This document provides a step-by-step guide for testing the end-to-end pipeline using the GallerySwipe ad prompt as a test case. Follow these instructions to verify that the entire system is working correctly.

## Test Prompt

Use this exact prompt for testing:

```
Hi, I'm building an app for users to connect their photo library - an Apple app that uses AI to browse through all their images and make it easy for them to delete images to clean up storage. Swipe right to keep, swipe left to delete. Given the amount of right swipes and left swipes, I have an algorithm to know which images to batch delete and which to keep. The app is called 'GallerySwipe', launching tomorrow. Please make a 25-second video I can use as an ad.
```

## Prerequisites

1. A fresh, empty Bazaar-Vid project
2. All backend services running:
   - Next.js app
   - Worker processes (if separate)
   - Database connection
3. OpenAI API key properly configured

## Testing Procedure

### Step 1: Create a New Project

1. Navigate to the Bazaar-Vid homepage
2. Click "Create New Project"
3. Name the project "GallerySwipe Ad Test"
4. Click "Create"

**Expected Result:** A new, empty project is created and you're redirected to the editor.

### Step 2: Enter the Test Prompt

1. In the Chat Panel (usually on the right side), paste the test prompt
2. Press Enter or click the send button

**Expected Result:** 
- The prompt appears in the chat as a user message
- The system begins processing (indicated by a loading/typing animation)
- After a brief delay, the assistant starts responding with initial acknowledgment

### Step 3: Monitor Scene Planning

1. Watch the chat for updates about scene planning
2. Observe the Scene Planning History panel for new scene plans

**Expected Results:**
- Assistant mentions planning scenes for the video
- A new scene plan appears in the Scene Planning History panel
- The plan should include approximately 5-8 scenes:
  - Introduction/Logo scene
  - App interface demonstration
  - Swiping gesture demonstration
  - Benefits explanation
  - Call to action / closing

### Step 4: Verify Animation Design Briefs

1. In the Scene Planning History panel, expand the latest scene plan
2. Click to expand individual scenes
3. Look for "Animation Design Briefs" sections within each scene
4. Check if briefs are generating (some may still be in "Pending" status)

**Expected Results:**
- Each "custom" type scene should show Animation Design Brief generation
- Initially, some briefs will be in "Pending" status
- Over time (30-60 seconds), briefs should change to "Complete" status
- Expanding a complete brief should show detailed styling and animation information

### Step 5: Monitor Component Generation

1. Watch the Chat panel for updates about component generation
2. Check the Timeline panel for new scenes appearing

**Expected Results:**
- Assistant mentions generating custom components
- Scenes gradually appear in the Timeline
- Scene status indicators in the Timeline show:
  - Blue/pulsing for "Building" scenes
  - Green for "Complete" scenes
  - Yellow/Red for scenes with warnings/errors (if any)
- The total duration should be approximately 25 seconds (750 frames at 30fps)

### Step 6: Preview the Generated Video

1. Once all or most scenes show as complete, use the Preview panel
2. Press play to watch the entire video
3. Ensure scenes transition correctly and timing is appropriate

**Expected Results:**
- A complete video plays with all scenes in sequence
- Animations run smoothly without glitches
- Scenes represent the GallerySwipe app concept appropriately
- Total duration is close to the requested 25 seconds

### Step 7: Test Regeneration (If Needed)

If any scenes have issues or don't match expectations:

1. In the Scene Planning History panel, find the problematic scene
2. Click "Regenerate Animation Brief" for that scene
3. Monitor the Chat and Timeline for updates

**Expected Results:**
- A new brief is generated for the selected scene
- The component is regenerated based on the new brief
- The Timeline updates with the new component
- The video preview includes the regenerated scene

## Verification Checklist

Use this checklist to confirm that all parts of the pipeline are working:

- [ ] User prompt successfully processed
- [ ] Scene plan generated with appropriate scenes
- [ ] Animation Design Briefs created for all custom scenes
- [ ] Components generated from the briefs
- [ ] Timeline shows all scenes with correct timing
- [ ] Video playback works for the full sequence
- [ ] Regeneration features work for problematic scenes

## Common Issues and Troubleshooting

### Scene Planning Fails

**Symptoms:**
- Chat stops responding after entering prompt
- No scene plan appears in Scene Planning History

**Troubleshooting:**
1. Check browser console for errors
2. Verify OpenAI API key is valid
3. Check server logs for errors in scenePlanner.service.ts
4. Try a shorter, simpler prompt as a test

### Animation Design Briefs Stuck in "Pending"

**Symptoms:**
- Briefs show "Pending" status for more than 2 minutes
- No progress in component generation

**Troubleshooting:**
1. Check server logs for errors in animationDesigner.service.ts
2. Verify OpenAI API is responding (could be rate limits or throttling)
3. Try clicking "Regenerate Animation Brief" to retry
4. Check database connection for animationDesignBriefs table

### Component Generation Fails

**Symptoms:**
- Timeline shows error indicators for scenes
- Preview has missing or placeholder scenes

**Troubleshooting:**
1. Check server logs for errors in componentGenerator.service.ts
2. Verify OpenAI API is responding correctly
3. Check worker logs for compilation errors
4. Try regenerating the problematic scene

### Video Playback Issues

**Symptoms:**
- Video preview doesn't play
- Scenes are out of sync or glitchy

**Troubleshooting:**
1. Check browser console for Remotion errors
2. Verify all components have loaded correctly
3. Check Timeline for duration or timing issues
4. Try refreshing the browser if all components are generated

## Reporting Results

After completing the test, document the results including:

1. Which parts of the pipeline worked correctly
2. Any issues encountered and how they were resolved
3. Screenshots of the final video
4. Suggestions for improvements

Add this information to `memory-bank/testing/galleryswipe-test-results.md` to help track progress and regressions. 