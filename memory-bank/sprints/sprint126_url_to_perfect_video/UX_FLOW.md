# URL to Video: Complete UX Flow

**Sprint**: 126
**Last Updated**: 2025-10-01
**Status**: Finalized for implementation

---

## 🎯 User Journey Overview

```
New Project Click → Modal (URL + Preferences) → Background Extraction →
Progress Updates → Generated Video → Export or Edit
```

**Key Insight**: Guide user through multi-step modal to build investment before generation starts.

---

## 📱 Detailed UX Flow

### Step 1: Entry Point

**Homepage or Dashboard**
```
┌──────────────────────────────────────┐
│  My Projects                         │
├──────────────────────────────────────┤
│  [Project 1]  [Project 2]  [Project 3]│
│                                      │
│  [+ New Project]  ← User clicks here │
└──────────────────────────────────────┘
```

### Step 2: Create Project Modal (first-run + sidebar shortcut)

**Modal appears (full-screen on mobile, centered on desktop)**

```
┌─────────────────────────────────────────────────────┐
│  Create Your Video                            [✕]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🌐 Website URL *                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │ https://yourcompany.com                     │   │
│  └─────────────────────────────────────────────┘   │
│  ↓ After URL paste, show preview:                  │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔄 Analyzing yourcompany.com...             │   │
│  └─────────────────────────────────────────────┘   │
│  OR (after extraction):                             │
│  ┌─────────────────────────────────────────────┐   │
│  │ ✅ Brand colors extracted                   │   │
│  │ [█] [█] [█]  ← Color swatches              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ⏱️ Video Length: 30s                               │
│  [●────────────────] (20s to 40s slider)           │
│                                                     │
│  💡 Help us tell your story (optional)             │
│  ┌───────────────────────────────────────────┐     │
│  │ What problem do you solve?                │     │
│  │ [                                        ] │     │
│  └───────────────────────────────────────────┘     │
│  ┌───────────────────────────────────────────┐     │
│  │ What makes you different?                 │     │
│  │ [                                        ] │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  🎵 Music Style                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Energetic │ │   Calm   │ │Professional│          │
│  │   [▶]   │ │   [▶]   │ │   [▶]   │  ← Play 5s  │
│  └──────────┘ └──────────┘ └──────────┘           │
│  [●]          [ ]          [ ]                     │
│                                                     │
│  ──────────────────────────────────────────────    │
│  [Cancel]              [Generate Video →]          │
└─────────────────────────────────────────────────────┘
```

**Interaction Details:**

1. **URL Input**
   - Validation: Must be valid URL format (auto-prefixes `https://` when missing)
   - On paste/blur: Start brand extraction immediately (async)
   - Show inline status (“Analyzing domain…”) while extraction runs

2. **Duration Slider**
   - Default: 30s
   - Range: 20-40s
   - Show current value as user drags

3. **Optional Text Inputs**
   - Collapsed by default (expandable section)
   - Placeholder text guides user
   - Character limit: 200 chars each

4. **Music Selector**
   - Three radio buttons with play buttons
   - Click preview icon: 5-second audio snippet (auto-stops or toggles off)
   - Click card: Select that style
   - Default: Energetic
   - Selected track is auto-applied as project background music after generation

5. **Generate Button**
   - Disabled until URL non-empty
   - Shows loading state after click
   - Keeps modal open while scenes stream; auto-closes ≈0.8s after completion (dismissible)

6. **Reopen Later**
   - Sidebar globe icon reopens the modal without creating a new project
   - Dismissal stored per-project (`sessionStorage`) so the modal won’t re-open automatically unless requested

### Step 3: Workspace with Progress

**User navigated to `/projects/{projectId}/generate`**

**Chat Panel shows live progress:**

```
┌─────────────────────────────────────────┐
│  Chat                                   │
├─────────────────────────────────────────┤
│                                         │
│  🎬 Generating your video...            │
│                                         │
│  ✅ Brand extracted                     │
│     Colors, fonts, and style captured  │
│                                         │
│  ✅ Template selected: Product Launch   │
│     5 scenes, 30 seconds                │
│                                         │
│  🔄 Customizing scene 1/5: Brand Intro  │
│     [████░░░░░░] 40%                   │
│                                         │
│  ✅ Scene 1 compiled (5.2s)             │
│                                         │
│  🔄 Customizing scene 2/5: Problem      │
│     [████████░░] 80%                   │
│                                         │
│  ... (continues for all 5 scenes)       │
│                                         │
│  ✅ All scenes ready!                   │
│                                         │
│  🎵 Adding music: Future Design         │
│                                         │
│  ✅ Video complete! (28.5s total)       │
│     View your video in the preview →    │
│                                         │
└─────────────────────────────────────────┘

- A single assistant message is progressively updated with template selection, scene completion counts, and final summary so users can review status after the modal closes.
```

**Preview Panel:**
- Shows player with loading state initially
- Updates to show each scene as it compiles
- Final video plays automatically when complete

**Timeline Panel:**
- Shows scenes appearing one by one
- Each scene has duration, name, thumbnail

**Streaming Events:**
- `assistant_message_chunk` → narrates extraction + scene progress inside modal and chat
- `scene_completed` → includes `sceneIndex`, `sceneName`, `sceneId`, `totalScenes` for progress checklist
- `audio_added` → confirms the chosen soundtrack was applied as background music
- `all_scenes_complete` → flips UI into completion state and triggers modal auto-close

### Step 4: Video Complete State

**Chat shows completion message with actions:**

```
┌─────────────────────────────────────────┐
│                                         │
│  🎉 Your video is ready!                │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  [Preview playing in side panel] │  │
│  └──────────────────────────────────┘  │
│                                         │
│  What would you like to do?            │
│                                         │
│  [📥 Export Video]  [🔄 Regenerate]    │
│                                         │
│  [🎨 Edit Scenes]   [🎵 Change Music]  │
│                                         │
└─────────────────────────────────────────┘
```

**Button Actions:**

1. **Export Video** → Opens export modal (existing flow)
2. **Edit Scenes** → User can use chat normally to edit
3. **Change Music** → Opens music selector modal

---

## 🎨 Visual Design Notes

### Modal Style
- **Desktop**: 600px width, centered, overlay backdrop
- **Mobile**: Full-screen, slide up animation
- **Colors**: Match workspace theme
- **Typography**: Clear hierarchy (headers 20px, body 14px)

### Progress Messages Style
- **Different from chat messages**: Lighter background, system font
- **Icons**: Emoji for quick recognition
- **Progress bars**: Only for lengthy operations (scene compilation)
- **Grouping**: Related updates grouped together

### Color Preview
- **Swatches**: 40px circles
- **Layout**: Horizontal row, max 5 colors
- **Hover**: Show hex code tooltip

### Music Selector
- **Cards**: 100px wide, rounded corners
- **Selected state**: Border + check mark
- **Play button**: Small icon, plays 5s preview
- **Audio**: Fade in/out, stop previous when new clicked

---

## ⚡ Performance Optimizations

### Modal Load Time
- Pre-load music previews (5s clips, ~100KB each)
- Lazy load brand extraction (starts on URL paste)
- Form validation client-side (no server round-trips)

### Background Work
- Brand extraction starts immediately when URL valid
- By time user fills optional fields, extraction likely done
- Show cached result if URL previously extracted (<30 days)

### Progress Updates
- SSE connection established before generation starts
- Events batched (max 1 per second to avoid spam)
- Progress stored in database (survives page refresh)

---

## 🧪 User Testing Scenarios

### Happy Path
1. User clicks "New Project"
2. Pastes company URL
3. Sees brand colors extracted (5s)
4. Leaves optional fields blank
5. Selects "Energetic" music
6. Clicks "Generate Video"
7. Watches progress updates (60s)
8. Video completes, plays automatically
9. User exports without edits

### Power User Path
1. User clicks "New Project"
2. Pastes URL
3. While extraction happens, fills problem statement
4. Adds differentiators text
5. Samples all 3 music styles, picks Professional
6. Adjusts duration to 35s
7. Generates video
8. After completion, regenerates with different template
9. Edits scene 3 text via chat
10. Exports final version

### Error Recovery Path
1. User enters invalid URL
2. See error: "Please enter a valid website URL"
3. User corrects URL
4. Extraction fails (site blocked)
5. See warning: "Couldn't extract brand fully, using defaults"
6. Video generates with fallback colors
7. User manually edits colors via chat
8. Exports video

---

## 📊 Analytics Events to Track

### Modal Interactions
- `modal_opened`: User clicked "New Project"
- `url_pasted`: URL entered and validated
- `brand_preview_shown`: Colors extracted and displayed
- `optional_field_filled`: User filled problem/differentiators
- `music_sampled`: User clicked play on music preview
- `music_selected`: User chose music style
- `duration_changed`: User moved slider
- `generate_clicked`: User clicked Generate button
- `modal_abandoned`: User closed modal without generating

### Generation Process
- `generation_started`: API call initiated
- `brand_extraction_time`: How long extraction took
- `template_selected`: Which template chosen
- `scene_compilation_time`: Per-scene compile time
- `total_generation_time`: End-to-end time
- `generation_completed`: Success
- `generation_failed`: Error + reason

### Post-Generation
- `video_played`: User watched generated video
- `export_clicked`: User exported without edits
- `regenerate_clicked`: User wanted different template
- `edit_clicked`: User made manual edits
- `music_changed`: User swapped music

---

## 🚀 Launch Checklist

### Modal UX
- [ ] Modal opens on "New Project" click
- [ ] URL validation works (client-side)
- [ ] Brand extraction starts on URL paste
- [ ] Color preview shows after extraction
- [ ] Optional fields are truly optional
- [ ] Music previews play (5s clips)
- [ ] Duration slider smooth (20-40s range)
- [ ] Generate button disabled until URL valid
- [ ] Generate button shows loading state
- [ ] Modal closes after generation starts
- [ ] User navigated to workspace

### Progress Display
- [ ] SSE connection established
- [ ] Progress messages styled differently from chat
- [ ] Scene-by-scene updates show
- [ ] Progress bars for lengthy operations
- [ ] Completion message with action buttons
- [ ] Video auto-plays when complete
- [ ] Modal auto-closes shortly after completion (≤1s delay)

### Post-Generation Actions
- [ ] Export button works
- [ ] Edit button allows chat edits
- [ ] Change music opens selector
- [ ] All actions work on mobile

### Error Handling
- [ ] Invalid URL shows error
- [ ] Failed extraction shows warning
- [ ] Compilation errors show retry option
- [ ] Timeout after 120s with error message
- [ ] User can cancel mid-generation

---

**Ready for implementation? All design and UX decisions finalized above.**
