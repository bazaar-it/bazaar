# Media Renaming Feature - Sprint 101

## Overview
Added custom naming capability to uploaded media assets, allowing users to give meaningful names that make referencing easier in chat.

## Problem Solved
- **Before**: User uploads "Screenshot_2025-08-12_102355.png" → Hard to reference
- **After**: User renames to "airbnb_kitchen" → Can say "use the airbnb_kitchen image"

## Implementation

### 1. Enhanced Uploads Panel
Created `/src/components/uploads/EnhancedUploadsPanel.tsx`:
- Visual media library with grid layout
- Inline rename with Edit button
- Shows custom name prominently
- Preserves original filename as subtitle
- Drag & drop + browse upload
- Filter by type (images, videos, audio, logos)
- Scope: Project or all user projects

### 2. Backend Support

#### Media Router (`/src/server/api/routers/media.ts`)
- `renameAsset` - Updates custom name
- `addTags` - Tag media for categorization
- `deleteAsset` - Remove unwanted media
- `getMediaContext` - Full media context with metadata

#### Updated Asset Type
```typescript
interface Asset {
  // ... existing fields
  customName?: string;        // User-defined name
  referenceNames?: string[];  // All possible references
}
```

### 3. Smart Reference Resolution

When user says "add the airbnb_kitchen image at frame 77":

1. **MediaResolver** checks for "airbnb_kitchen" in:
   - Custom names (HIGHEST priority)
   - Reference names
   - Original filenames
   - Tags

2. **Finds match** with high confidence (0.9+)

3. **Enhances prompt** for LLM:
   ```
   RESOLVED MEDIA:
   "airbnb_kitchen" → https://r2.dev/.../abc123.jpg
   You MUST use this exact URL
   ```

4. **Validates** generated code to ensure correct URL used

## User Experience Flow

1. **Upload**: User drags image to panel
2. **Rename**: Click edit icon, type "airbnb_kitchen"
3. **Reference**: In chat: "Add the airbnb_kitchen image"
4. **Resolution**: System finds exact URL
5. **Generation**: LLM uses real URL, not placeholder
6. **Validation**: Code checked for correct URL

## Connection to Upload Panel

The existing UploadsPanel at `/src/app/projects/[id]/generate/workspace/panels/UploadsPanel.tsx` can be:
- Replaced with `EnhancedUploadsPanel` for full features
- Or updated to include rename functionality

### Quick Integration:
```tsx
// In workspace file, replace:
import UploadsPanel from './panels/UploadsPanel';

// With:
import EnhancedUploadsPanel from '~/components/uploads/EnhancedUploadsPanel';
```

## Examples

### Example 1: Logo Reference
```
User uploads: company_logo_final_v3.png
Renames to: "logo"
Later says: "Put our logo in the corner"
System: Resolves "logo" → exact URL
```

### Example 2: Multiple Properties
```
User uploads: IMG_4521.jpg, IMG_4522.jpg, IMG_4523.jpg
Renames to: "kitchen", "bedroom", "pool"
Says: "Create a slideshow: kitchen, then bedroom, then pool"
System: Resolves all three to exact URLs
```

### Example 3: Screenshot Reference
```
User uploads: Screenshot 2025-08-12 at 10.23.55.png
Renames to: "competitor_homepage"
Says: "Make something similar to competitor_homepage"
System: Resolves and provides exact URL to LLM
```

## Benefits

1. **Natural Language**: "Use the kitchen photo" instead of "use IMG_4521.jpg"
2. **No Hallucination**: Always resolves to real URLs
3. **Organized Library**: See all media with custom names
4. **Project Context**: Media stays with project
5. **Reusability**: Reference same asset multiple times easily

## Technical Details

### Priority Resolution Order:
1. Custom name (exact match)
2. Custom name (fuzzy match)
3. Reference names
4. Original filename
5. Tags
6. Type-based fallback

### Confidence Scoring:
- Exact custom name: 1.0
- Fuzzy custom name: 0.8-0.9
- Original filename: 0.7
- Tag match: 0.6
- Type match: 0.4

## Next Steps

1. ✅ Add visual indicator for renamed assets
2. ⏳ Bulk rename functionality
3. ⏳ Auto-suggest names based on content
4. ⏳ Search/filter by custom names
5. ⏳ Export/import media library