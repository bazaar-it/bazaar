# Sprint 55: Video Support - TODO

## Completed ✅

- [x] Add video file type support to ImageUpload component
- [x] Update upload API to handle video files to R2
- [x] Add video context to Brain types
- [x] Update code generator prompt to handle videos
- [x] Fix orchestrator to pass videoUrls to tools
- [x] Fix Zod schemas to include videoUrls
- [x] Test video generation with Remotion

## Future Enhancements 🚀

### High Priority
- [ ] Add video duration detection using ffprobe or browser API
- [ ] Auto-set scene duration based on video length
- [ ] Generate video thumbnails for preview in chat
- [ ] Add video format validation (ensure browser-compatible formats)

### Medium Priority
- [ ] Support video trimming with startFrom/endAt props
- [ ] Add video playback controls in preview panel
- [ ] Support multiple video layers in a single scene
- [ ] Add video filters and effects options

### Low Priority
- [ ] Support video speed control (slow motion, fast forward)
- [ ] Add video transition effects between scenes
- [ ] Support video masking and shapes
- [ ] Add audio waveform visualization option

## Technical Debt
- [ ] Add proper TypeScript types for video-specific props
- [ ] Create dedicated video upload component (separate from ImageUpload)
- [ ] Add video-specific error handling and user feedback
- [ ] Optimize video loading in preview (lazy loading, streaming)

## Documentation
- [ ] Update user documentation with video support examples
- [ ] Add video best practices guide
- [ ] Create video tutorial showing the feature
- [ ] Document supported video formats and limitations