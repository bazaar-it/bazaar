# Image Prompt → Tool Evaluation Guide

## 1. Single image, explicit embed request

- **User prompt**: Add this product photo as the hero background and fade in the headline
- **Context**: User just uploaded the photo
- **Attachments**: 1 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `embed`
- **Directives**: Embed exact image URL as background; add gradient overlay for text
- **Reasoning**: Explicit embed request for new scene

## 2. Single image, explicit recreate request

- **User prompt**: Recreate this dashboard screenshot as a clean animated scene
- **Context**: Single upload
- **Attachments**: 1 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Rebuild layout/typography; animate cards
- **Reasoning**: User wants new code matching screenshot

## 3. Single image referencing existing scene

- **User prompt**: Update scene 2 to match this screenshot
- **Context**: Scene 2 mentioned in latest chat
- **Attachments**: 1 image(s)
- **Expected tool**: `editScene`
- **imageAction**: `recreate`
- **Directives**: Target scene 2; adjust layout/colors to match image
- **Reasoning**: Explicit edit request

## 4. Multiple images with per-image instructions

- **User prompt**: Create a split-screen: left is the UI screenshot, right is the product photo
- **Context**: Both images uploaded together
- **Attachments**: 2 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `mixed`
- **Directives**: Directive A: recreate UI; Directive B: embed product photo
- **Reasoning**: Different treatment per image

## 5. Multiple images forming a collage

- **User prompt**: Make a grid with these three photos and add a title
- **Context**: Three photos uploaded
- **Attachments**: 3 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `embed`
- **Directives**: Embed all photos in responsive grid
- **Reasoning**: Display exact images

## 6. Latest upload should override earlier ones

- **User prompt**: Use this new screenshot instead of the previous one
- **Context**: Previous upload earlier in chat
- **Attachments**: 1 image(s)
- **Expected tool**: `editScene`
- **imageAction**: `recreate`
- **Directives**: Replace referenced scene with newest screenshot
- **Reasoning**: Prompt prefers latest attachment

## 7. Historical asset referenced by name

- **User prompt**: Bring back the 'Pricing Table' screenshot and highlight the totals
- **Context**: Asset stored in media library
- **Attachments**: 0 image(s)
- **Expected tool**: `editScene`
- **imageAction**: `embed`
- **Directives**: Look up asset by name tokens; embed and add highlight
- **Reasoning**: No new upload; use stored asset

## 8. Voice prompt referencing recent upload

- **User prompt**: Animate this chart to slide up
- **Context**: Chart image uploaded two messages earlier
- **Attachments**: 0 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Use last attachment; recreate chart with animation
- **Reasoning**: Prompt mentions action on latest image

## 9. Ambiguous multi-image request needing clarification

- **User prompt**: Make a new scene with these
- **Context**: Two images, no instructions
- **Attachments**: 2 image(s)
- **Expected tool**: `needsClarification`
- **Directives**: Ask user which asset is primary/background
- **Reasoning**: Not enough info

## 10. Embed image with overlay text

- **User prompt**: Show this product photo and overlay animated labels
- **Context**: Fresh upload
- **Attachments**: 1 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `embed`
- **Directives**: Embed photo; add animated labels around product
- **Reasoning**: Explicit embed

## 11. Recreate with modified color palette

- **User prompt**: Rebuild this UI but convert it to dark mode
- **Context**: Screenshot uploaded
- **Attachments**: 1 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Recreate layout; change colors to dark theme
- **Reasoning**: Recreation with tweaks

## 12. Replace embedded image in existing scene

- **User prompt**: In scene 1, swap the hero background with this updated shot
- **Context**: Scene 1 currently embeds photo
- **Attachments**: 1 image(s)
- **Expected tool**: `editScene`
- **imageAction**: `embed`
- **Directives**: Update <Img src> in scene 1
- **Reasoning**: Edit existing embed

## 13. Edit scene to match new screenshot

- **User prompt**: Update the analytics scene to match this screenshot
- **Context**: Scene 3 referenced
- **Attachments**: 1 image(s)
- **Expected tool**: `editScene`
- **imageAction**: `recreate`
- **Directives**: Adjust layout/style to match screenshot
- **Reasoning**: Edit with recreate

## 14. Multi-image sequential scene

- **User prompt**: Create a carousel: first this onboarding screen, then this dashboard
- **Context**: Two uploads
- **Attachments**: 2 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Sequence animations for the recreated layouts
- **Reasoning**: Multiple recreated screens

## 15. Background embed with strong text

- **User prompt**: Create an energetic text scene using this background image
- **Context**: Image uploaded
- **Attachments**: 1 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `embed`
- **Directives**: Embed as background; add kinetic typography
- **Reasoning**: Embed background

## 16. Reference prior-day upload

- **User prompt**: Still use the screenshot I uploaded yesterday and animate the cards
- **Context**: Asset already saved
- **Attachments**: 0 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Retrieve from asset library; recreate layout
- **Reasoning**: Existing asset recreation

## 17. Mixed intent: recreate + embed

- **User prompt**: Use this UI screenshot as the layout but overlay the original photo
- **Context**: Two uploads
- **Attachments**: 2 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `mixed`
- **Directives**: UI screenshot→recreate; photo→embed
- **Reasoning**: Different treatments

## 18. Embed with gradient readability

- **User prompt**: Place this photo and make the headline pop
- **Context**: Photo uploaded
- **Attachments**: 1 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `embed`
- **Directives**: Embed image; add gradient overlay before text
- **Reasoning**: Embed requirement

## 19. Ambiguous reference to 'it'

- **User prompt**: Make it match this
- **Context**: No scene specified; image attached
- **Attachments**: 1 image(s)
- **Expected tool**: `needsClarification`
- **Directives**: Ask which scene to modify
- **Reasoning**: Ambiguous

## 20. Audio already added, now image

- **User prompt**: Add this screenshot as a new slide
- **Context**: Audio uploaded earlier
- **Attachments**: 1 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Ensure we still execute addScene despite audio context
- **Reasoning**: Regression guard

## 21. Transparent logo over background

- **User prompt**: Put the transparent logo over this gradient
- **Context**: Two uploads
- **Attachments**: 2 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `mixed`
- **Directives**: Background gradient→embed; logo→embed with correct layering
- **Reasoning**: Layered embedding

## 22. Recreate with animation direction

- **User prompt**: Recreate this dashboard and slide cards in sequentially
- **Context**: Screenshot uploaded
- **Attachments**: 1 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Detailed animation instructions
- **Reasoning**: Recreate

## 23. Scene edit replacing background image

- **User prompt**: In scene 4, replace the background with this gradient image
- **Context**: Scene 4 exists
- **Attachments**: 1 image(s)
- **Expected tool**: `editScene`
- **imageAction**: `embed`
- **Directives**: Swap background, adjust text colors
- **Reasoning**: Edit embed

## 24. Blend colors from one image with layout from another

- **User prompt**: Blend the color scheme of this gradient with the layout of this dashboard
- **Context**: Two images
- **Attachments**: 2 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Extract colors from gradient; recreate dashboard layout
- **Reasoning**: Combined recreation

## 25. Scene attachment with new image

- **User prompt**: Here’s scene 2 and a new screenshot—update it to match
- **Context**: sceneUrls includes scene 2
- **Attachments**: 1 image(s)
- **Expected tool**: `editScene`
- **imageAction**: `recreate`
- **Directives**: Use attached scene ID; replace design
- **Reasoning**: Attachment overrides

## 26. Follow-up referencing prior embed

- **User prompt**: I liked the layout—use this photo inside the second card
- **Context**: Scene created earlier
- **Attachments**: 1 image(s)
- **Expected tool**: `editScene`
- **imageAction**: `embed`
- **Directives**: Find second card element; embed image
- **Reasoning**: Specific edit

## 27. Image plus explicit duration

- **User prompt**: Use this screenshot to create a quick intro scene, 3 seconds long
- **Context**: New upload
- **Attachments**: 1 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Set requestedDurationFrames=90
- **Reasoning**: Recreate with duration

## 28. Follow-up animation on earlier embed

- **User prompt**: Now animate the text we added over that photo
- **Context**: Earlier embed scene
- **Attachments**: 0 image(s)
- **Expected tool**: `editScene`
- **imageAction**: `embed`
- **Directives**: Target existing embed; animate text only
- **Reasoning**: Edit extant scene

## 29. Multiple attachments, user corrects choice

- **User prompt**: Use the second screenshot; the first one was wrong
- **Context**: Two attachments uploaded
- **Attachments**: 2 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `recreate`
- **Directives**: Only use last attachment
- **Reasoning**: Clear instruction

## 30. Asset metadata reference

- **User prompt**: Use the asset tagged 'kind:logo' as a floating element
- **Context**: Asset stored with tags
- **Attachments**: 0 image(s)
- **Expected tool**: `addScene`
- **imageAction**: `embed`
- **Directives**: Lookup asset by tag; embed with animation
- **Reasoning**: Embedded asset

