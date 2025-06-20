# Sprint 48: Social Media Format Support

## Clarified Goal
Users create videos on desktop, but can choose output formats optimized for different social platforms.

## Use Cases
- **Instagram Stories/Reels**: 1080x1920 (9:16 portrait)
- **TikTok**: 1080x1920 (9:16 portrait)
- **YouTube Shorts**: 1080x1920 (9:16 portrait)
- **Instagram Feed**: 1080x1080 (1:1 square)
- **Twitter/X**: 1280x720 (16:9 landscape)
- **LinkedIn**: 1280x720 (16:9 landscape)
- **YouTube**: 1920x1080 (16:9 landscape)

## User Flow
1. User creates new project on desktop
2. Selects target platform/format:
   ```
   "What platform is this video for?"
   [Instagram Story] [TikTok] [YouTube] [Square Post] [Custom]
   ```
3. AI generates content optimized for that format
4. Preview shows actual format dimensions
5. Export produces video in selected format

## Format-Specific AI Behavior

### Portrait Mode (Stories/Reels/TikTok)
- Vertical layouts with stacked elements
- Larger text for mobile viewing
- Top/bottom safe zones for UI elements
- Single focal points
- Swipe-up CTA placement

### Square Format (Instagram Feed)
- Centered compositions
- Balanced layouts
- Works for both mobile and desktop viewing
- No extreme edges (content in center 80%)

### Landscape (YouTube/Traditional)
- Current default behavior
- Horizontal layouts
- Multi-column designs
- Smaller text acceptable

## Implementation Priority

### Phase 1: Format Selection (IMMEDIATE)
```typescript
// Project creation screen
const SOCIAL_FORMATS = [
  {
    id: 'youtube',
    name: 'YouTube / Desktop',
    width: 1280,
    height: 720,
    icon: '📺',
    description: 'Traditional horizontal video'
  },
  {
    id: 'stories',
    name: 'Stories / Reels / TikTok',
    width: 1080,
    height: 1920,
    icon: '📱',
    description: 'Vertical format for mobile platforms'
  },
  {
    id: 'instagram-square',
    name: 'Instagram Post',
    width: 1080,
    height: 1080,
    icon: '📷',
    description: 'Square format for feed posts'
  }
];
```

### Phase 2: AI Prompt Enhancement
```typescript
// Add to AI context based on format
const getFormatGuidelines = (format: string) => {
  switch(format) {
    case 'stories':
      return `
        This is a VERTICAL video for Instagram Stories/TikTok (1080x1920).
        - Stack elements vertically
        - Use large, bold text (mobile-readable)
        - Keep important content in center 80% (safe zones)
        - Single focal points work best
        - Bottom 20% often has UI overlays
      `;
    case 'instagram-square':
      return `
        This is a SQUARE video for Instagram (1080x1080).
        - Center all important content
        - Balanced, symmetrical layouts work well
        - Medium-sized text
        - Works on both mobile and desktop
      `;
    default:
      return `
        This is a HORIZONTAL video for YouTube/Desktop (1280x720).
        - Use full width for layouts
        - Multi-column designs work well
        - Standard text sizes
      `;
  }
};
```

### Phase 3: Preview Adjustments
- Show phone frame for vertical formats
- Show appropriate container for each format
- Scale preview to fit workspace while maintaining aspect ratio

## Quick Implementation Path

1. **Add format to project creation** (1 day)
   - Simple dropdown with 3 options
   - Store in project settings

2. **Update PreviewPanelG** (few hours)
   - Use project format for dimensions
   - Remove hardcoded values

3. **Enhance AI prompts** (few hours)
   - Add format context to generation
   - Include platform-specific guidelines

4. **Test with each format** (1 day)
   - Generate content for each platform
   - Verify appropriate layouts

## Benefits
- Users can create platform-specific content
- AI generates optimized layouts for each format
- Better engagement on social platforms
- One tool for all video needs

## Success Metrics
- Users can select format during project creation
- AI generates appropriate vertical layouts for Stories
- Preview correctly shows selected format
- Exports match platform requirements