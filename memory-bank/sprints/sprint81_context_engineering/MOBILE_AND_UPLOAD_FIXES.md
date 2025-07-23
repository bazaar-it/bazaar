# Mobile Version and Upload Fixes

**Date**: 2025-07-22
**Sprint**: 81
**Status**: Partially Fixed

## Issues Addressed

### 1. Mobile Version Not Working

**Problem**: Mobile version wasn't displaying properly
**Root Cause**: Missing viewport meta tag in Next.js 13+ App Router

**Fix Applied**:
```typescript
// src/app/layout.tsx
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

### 2. Mobile Height Issues

**Problem**: Content cut off by mobile browser address bars
**Fix Applied**: Changed `h-screen` to `h-[100dvh]` in GenerateWorkspaceRoot.tsx

```typescript
// Before
<div className="h-screen flex flex-col overflow-hidden">

// After  
<div className="h-[100dvh] flex flex-col overflow-hidden">
```

**Benefits**:
- `dvh` (dynamic viewport height) adjusts when address bars show/hide
- Bottom navigation no longer cut off
- Content properly accessible on all mobile browsers

### 3. Audio Upload 413 Error (Partial Fix)

**Problem**: Large audio files (>4.5MB) fail with 413 "Payload Too Large" error
**Root Cause**: Vercel platform limitation - 4.5MB max body size for API routes on hobby/pro plans

**Attempted Fixes**:
1. ❌ Added route configuration (doesn't work with App Router)
2. ❌ Tried middleware approach (doesn't affect body parsing)
3. ❌ Updated vercel.json (bodyParser config ignored in App Router)
4. ✅ Added runtime and maxDuration to route (helps with timeouts)

**Current Status**: 
- Files under 4.5MB will upload successfully
- Larger files still fail with 413 error

## Recommendations for Audio Upload Fix

### Option 1: Client-Side File Compression
```typescript
// Compress audio before upload
const compressAudio = async (file: File) => {
  // Use Web Audio API to reduce bitrate
  // Convert to lower quality MP3
  // Return compressed file
};
```

### Option 2: Chunked Upload Implementation
```typescript
// Split file into chunks and upload sequentially
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks
const uploadInChunks = async (file: File) => {
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  for (let i = 0; i < chunks; i++) {
    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await uploadChunk(chunk, i, chunks);
  }
};
```

### Option 3: Direct R2 Upload with Presigned URLs
```typescript
// Get presigned URL from server
const { uploadUrl } = await getPresignedUrl();
// Upload directly to R2, bypassing Vercel
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
});
```

### Option 4: Upgrade Vercel Plan
- Enterprise plans support larger body sizes
- Or use external service for file uploads

## Temporary Workaround

For now, users should:
1. Use audio files under 4.5MB
2. Compress audio files before uploading
3. Use external audio hosting and paste URLs

## Files Modified

1. `/src/app/layout.tsx` - Added viewport configuration
2. `/src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx` - Fixed mobile heights
3. `/src/app/api/upload/route.ts` - Added runtime configuration
4. `/vercel.json` - Attempted body parser config (reverted)

## Testing Checklist

- [x] Mobile viewport displays correctly
- [x] Bottom navigation visible on mobile
- [x] Content not cut off by address bars
- [x] Small audio files upload successfully
- [ ] Large audio files need alternative solution

## Next Steps

1. Implement presigned URL uploads for large files
2. Add file size validation with user-friendly error message
3. Consider audio compression options
4. Test on various mobile devices and browsers