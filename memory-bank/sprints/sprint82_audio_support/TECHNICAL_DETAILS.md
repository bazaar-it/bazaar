# Sprint 82: Technical Implementation Details

## Architecture Overview

### Data Flow
```
User Upload → Upload API → R2 Storage → Audio Panel → Video State → Preview Panel → Export
```

### Component Hierarchy
```
WorkspaceContentAreaG
├── AudioPanel (New)
│   ├── Upload Interface
│   ├── Audio Controls
│   └── Trimming UI
└── PreviewPanelG (Modified)
    └── Remotion Audio Component
```

## Code Changes

### 1. AudioPanel Component Structure
```typescript
interface AudioTrack {
  id: string;
  url: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  volume: number;
}
```

### 2. Video State Integration
```typescript
// Added to video state store
updateProjectAudio: (projectId: string, audio: AudioTrack | null) => void;

// Audio stored per project
interface ProjectState {
  // ... existing fields
  audio?: AudioTrack | null;
}
```

### 3. Remotion Audio Integration
```typescript
// In generated composition
{projectAudio && projectAudio.url && (
  <Audio
    src={projectAudio.url}
    startFrom={Math.floor(projectAudio.startTime * 30)} // Convert seconds to frames
    endAt={Math.floor(projectAudio.endTime * 30)}
    volume={projectAudio.volume}
  />
)}
```

### 4. Upload API Extension
```typescript
// Added audio validation
const isAudio = file.type.startsWith('audio/') || file.name.endsWith('.mp3');

// File size limits
const maxSize = isVideo ? 100 * 1024 * 1024 : isAudio ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

// Storage path
const mediaType = isVideo ? 'videos' : isAudio ? 'audio' : 'images';
```

## Key Implementation Details

### Audio Loading Strategy
1. File uploaded to R2 with unique key
2. Audio element created to extract duration
3. Metadata stored in video state
4. Preview recompiles with audio reference

### Frame Conversion
- Audio times stored in seconds for user clarity
- Converted to frames (30fps) for Remotion
- Formula: `frames = seconds * 30`

### State Management
- Audio data persists in Zustand store
- Linked to project ID
- Survives page refreshes
- One audio track per project

### Preview Integration
- Audio data injected via `window.projectAudio`
- Set before module import to ensure availability
- Triggers recompilation on audio changes

## File Structure
```
src/
├── app/projects/[id]/generate/workspace/panels/
│   └── AudioPanel.tsx (NEW)
├── components/chat/
│   └── MediaUpload.tsx (RENAMED from ImageUpload.tsx)
├── stores/
│   └── videoState.ts (MODIFIED)
└── app/api/upload/
    └── route.ts (MODIFIED)
```

## API Endpoints
No new endpoints created. Extended existing `/api/upload` to handle audio files.

## Database Schema
No database changes required. Audio metadata stored in video state (client-side).

## Security Considerations
- File type validation (client and server)
- File size limits enforced
- Audio files scoped to project in R2
- Standard authentication required

## Performance Optimizations
- Debounced preview recompilation
- Audio cached after upload
- Lazy loading of audio element
- Progress indication during upload

## Browser Compatibility
- Uses standard HTML5 Audio API
- File input with accept attribute
- No special browser requirements
- Works on all modern browsers

## Error Handling
```typescript
try {
  // Upload logic
} catch (error) {
  console.error('Audio upload failed:', error);
  toast.error('Failed to upload audio');
} finally {
  setIsUploading(false);
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
}
```

## Debug Helpers
- Console logs for troubleshooting
- File metadata logging
- Upload progress tracking
- State change notifications

## Testing Approach
1. Manual testing of file uploads
2. Verification of trim functionality
3. Volume control testing
4. Export verification
5. Error case testing

## Deployment Notes
- No environment variable changes
- No infrastructure changes
- Uses existing R2 bucket
- No migration required