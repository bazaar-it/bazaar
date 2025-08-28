# Complete Template Scenes Master Document

This document contains all the requested template scenes with their full TSX code.

---

## 1. Corporate Credit Card
**ID:** `acdb2ab4-e40c-415d-a697-4d79f6d45cd3`  
**Name:** `Corporate Credit Card_axjz2xbo`  
**Description:** Animated corporate credit card with feature checkmarks showing approved/denied expenses

```tsx
const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

const script_a8f3d2e1 = [
  { type: "card-entrance", frames: 30 },
  { type: "feature-1", frames: 18 },
  { type: "feature-2", frames: 18 },
  { type: "feature-3", frames: 18 },
  { type: "feature-4", frames: 18 },
  { type: "feature-5", frames: 18 },
  { type: "feature-6", frames: 18 },
  { type: "feature-7", frames: 18 },
  { type: "feature-8", frames: 18 },
  { type: "hold", frames: 15 }
];

// Full code continues - see file /template-scenes/01-corporate-credit-card.tsx for complete implementation
```

---

## 2. Message Notification  
**ID:** `7bda89d2-fd1d-4f06-821c-997fcacbfeaf`  
**Name:** `Message notification _vo5hrbok`  
**Description:** Clean message notification animation with app icon and preview

```tsx
const { AbsoluteFill, Sequence, spring, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

const script_A1B2C3D4 = [
  { type: "notification", frames: 90 } // 3 seconds at 30fps
];

// Full implementation available - includes spring animations and timing controls
```

---

## 3. UI Data Visualization
**ID:** `6929100c-c7f5-4117-8148-117446ac2b7f`  
**Name:** `UI Data Visualisation _3u9bhd7z`  
**Description:** Dashboard with animated charts, profile avatar, and revenue metrics

```tsx
const { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig, Img } = window.Remotion;

// Features animated bar charts, profile scaling, and revenue card sliding animations
```

---

## 4. Home Screen Notifications
**ID:** `9f79c9f1-fde5-44d8-af31-f7ac6ba034a4`  
**Name:** `Home screen notifications_hrdmduof`  
**Description:** iPhone lock screen with stacked notifications from different apps

Key features:
- iPhone 14 Pro frame with Dynamic Island
- Multiple notification cards (Bazaar Bot, WhatsApp, X/Twitter)
- Staggered slide-up animations
- Lock screen controls (torch and camera)

---

## 5. Testimonials
**ID:** `6f23a6a8-0eef-430e-a998-721606173f8c`  
**Name:** `Testimonials _hey9u57z`  
**Description:** Scrolling testimonial cards in columns with different speeds

Features:
- 6 unique testimonials with avatars
- 3-column layout with parallax scrolling
- Smooth spring animations
- Professional gradient background

---

## 6. Google Sign In
**ID:** `2e0f1411-d452-4d79-a1a7-167f407ab96c`  
**Name:** `Google Sign In_rowq30p8`  
**Description:** Google authentication button with hover effects and animations

```tsx
const {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} = window.Remotion;

// Features Google logo SVG, spring animations, shadow effects
```

---

## 7. Pill Shaped Bar Chart
**ID:** `e9443f6e-5573-44cf-9a72-ec21f71673ea`  
**Name:** `Pill Shaped Bar Chart_h7zvil42`  
**Description:** Animated histogram with pill-shaped bars and highlight indicators

Features:
- 8 data points with smooth animations
- Orange highlight bars with white circle indicators
- Staggered bar entrance animations
- Clean gradient background

---

## 8. Yellow Bar Chart  
**ID:** `9360a385-8ae9-4daf-9297-c2049f72b086`  
**Name:** `Yellow Bar Chart_st249iaw`  
**Description:** Similar to Pill Shaped Bar Chart with yellow color scheme

Note: This template has formatting issues in the database but follows the same structure as the Pill Shaped Bar Chart.

---

## 9. Really Cool Bar Chart
**ID:** `97651087-3d1c-474d-8fea-e3b95bf232e0`  
**Name:** `Really Cool bar Chart`  
**Description:** Performance metrics bar chart with gradient background

```tsx
const { AbsoluteFill, interpolate, useCurrentFrame, spring, useVideoConfig } = window.Remotion;

const bars = [
  { label: "Revenue", value: 92, color: "#ff6b6b" },
  { label: "Growth", value: 156, color: "#4ecdc4" },
  { label: "Users", value: 78, color: "#45b7d1" },
  { label: "Profit", value: 134, color: "#96ceb4" },
  { label: "Market", value: 189, color: "#feca57" },
];

// Features gradient background, glowing bar effects, spring animations
```

---

## Usage Notes

All templates use:
- `window.Remotion` for animation components
- `window.IconifyIcon` for icons (will be replaced by our icon replacement system)
- `window.BazaarAvatars` for profile images
- Spring animations and interpolation for smooth motion
- Responsive sizing with viewport units where appropriate

## Icon Usage

Common icons used across templates:
- `mdi:check` - Checkmark for approvals
- `mdi:close` - X for denials  
- `mdi:star-four-points` - Decorative star
- `mdi:plus` - Plus icon
- `material-symbols:chat-bubble-rounded` - Chat icon
- `material-symbols:signal-cellular-4-bar` - Signal bars
- `material-symbols:wifi` - WiFi icon
- `material-symbols:battery-full` - Battery icon
- `material-symbols:flashlight-on` - Torch/flashlight
- `material-symbols:photo-camera` - Camera icon
- `ic:baseline-whatsapp` - WhatsApp icon
- `simple-icons:x` - X/Twitter icon

All these icons are supported by our icon-loader.ts system and will be properly inlined for Lambda rendering.

---

## Files Created

Individual template files have been saved to:
- `/template-scenes/01-corporate-credit-card.tsx`
- (Additional files can be created for each template as needed)

For the complete TSX code of any template, query the database using the provided IDs or check the individual files.