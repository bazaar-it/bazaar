# Use Cases — Images (Add/Edit × Embed/Recreate)

## 1) Add + Recreate
- “Create a new scene from this screenshot.”
- “Recreate this UI and animate the charts.”
- Behavior: New scene. Do not display original. Use image as reference to code shapes/text/colors. Animate.

## 2) Add + Embed
- “Add my product photo as the hero background.”
- “Insert the logo into a new scene and animate a simple reveal.”
- Behavior: New scene. Display exact image via <Img>. Minimal motion (fade/slide) if requested.

## 3) Edit + Recreate (style transfer)
- “Make the button in scene 3 look like this (image).”
- “Update scene 3 typography to match this screenshot.”
- Behavior: Target existing scene code; locate matching element(s); change styles (colors, radius, font, spacing). Do not display the image.

## 4) Edit + Embed (content insertion)
- “In scene 1’s left card, place this image.”
- “Add this chart image into the stats panel.”
- Behavior: Target existing scene; insert <Img> at specified location; size/fit properly.

## 5) Multi-image mixed intent
- “Recreate this UI (image A), then also put this photo (image B) in the main canvas.”
- Behavior: Per-asset directives: A: recreate, B: embed. New scene or edit target accordingly.

## 6) Scene attached (dragged) ⇒ Edit bias
- “Use this image to update scene 3.”
- Behavior: Respect attached `sceneUrls` ⇒ edit. Use `imageAction` per phrasing.

## 7) Asset referencing by name (“the logo”) long after upload
- “Add the logo to the intro.”
- Behavior: Use asset metadata tags (kind:logo, detectedText) to resolve which asset to use. Note: the logo can be an uploaded PNG/JPG/SVG; metadata helps disambiguate among multiple uploaded logos.

## 8) Ambiguity resolution
- If only: “animate this” + image
  - Default: add + embed (no image shown? If wording suggests ‘recreate’, return recreate)
  - Metadata hints (kind:ui/chart) can bias toward recreate.

## 9) Non-image media
- Videos/audio keep current behavior; image logic applies to images only.

---

Edge Considerations
- Multiple logos uploaded: choose by detected text/brandText and recency; if uncertain, request clarification.
- Element targeting: when edit + embed, allow paths like “left card/header/footer/chart slot”.
- Scaling/fit: intelligent defaults (contain/cover) using canvas dimensions and aspect ratio.
- Duration: embed does not imply long duration; match requested or minimal default.
