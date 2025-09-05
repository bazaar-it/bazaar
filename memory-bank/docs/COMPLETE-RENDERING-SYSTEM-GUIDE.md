# The Complete Bazaar-vid Video Rendering System: From Click to Download

This document explains EXACTLY how Bazaar-vid renders videos when a user clicks "Render". Every step, every transformation, every service involved.

## Table of Contents
1. [Overview: The Complete Flow](#overview)
2. [The User Interface Layer](#ui-layer)
3. [The Backend Processing Pipeline](#backend-pipeline)
4. [Code Transformation: TSX → JavaScript](#code-transformation)
5. [Font System: How Typography Works](#font-system)
6. [Icon System: Iconify → SVG Conversion](#icon-system)
7. [Avatar System: R2 Storage Integration](#avatar-system)
8. [AWS Lambda Remotion: Cloud Video Rendering](#lambda-rendering)
9. [The Lambda Composition: How Videos Are Built](#lambda-composition)
10. [Progress Tracking & Download](#progress-download)
11. [Error Handling & Debugging](#error-handling)
12. [Configuration & Environment](#configuration)

---

## 1. Overview: The Complete Flow {#overview}

```
User clicks "Render" 
  ↓
ExportButton.tsx validates input
  ↓
tRPC: render.startRender mutation
  ↓
Database: Fetch project + scenes with tsxCode
  ↓
render.service.ts: prepareRenderConfig()
  ├── Transform TSX → JavaScript for each scene
  ├── Replace Iconify icons with SVG components
  ├── Fix avatar URLs for Lambda
  ├── Extract fonts from scene code
  └── Calculate video dimensions
  ↓
lambda-render.service.ts: renderVideoOnLambda()
  ├── Send scene data to AWS Lambda
  ├── Lambda loads MainCompositionSimple.tsx
  ├── Lambda builds video using Remotion
  └── Output saved to S3 bucket
  ↓
Progress tracking via getRenderStatus
  ↓
Auto-download when complete
```

---

## 2. The User Interface Layer {#ui-layer}

### ExportButton Component (`/src/components/export/ExportButton.tsx`)

**What happens when user clicks "Render":**

1. **Modal Display**: `ExportOptionsModal` shows format (MP4/WebM/GIF) and quality (Low/Medium/High) options
2. **Validation**: Button checks if project has scenes to render
3. **tRPC Call**: Triggers `startRender.mutate()` with:
   ```typescript
   {
     projectId: string,
     format: 'mp4' | 'webm' | 'gif',
     quality: 'low' | 'medium' | 'high'
   }
   ```
4. **UI State**: Button shows loading state with spinner
5. **Progress Polling**: Starts querying `getRenderStatus` every 1000ms

**User Experience Flow:**
- Click "Render" → Modal opens
- Select options (format: MP4/WebM/GIF, quality: Low/Medium/High) → Click "Start Render" 
- Button shows "Starting..." → "X% Complete" (updates every second)
- When done → Auto-download triggers immediately (no manual click needed)
- "Download Video" button appears (for re-downloading)
- "Render Again" button also appears (to start a new render)

---

## 3. The Backend Processing Pipeline {#backend-pipeline}

### tRPC Router (`/src/server/api/routers/render.ts`)

**The `startRender` mutation does:**

1. **User Quota Check**: Validates daily export limit (10 per day by default)
2. **Concurrency Check**: Only allows one render per user at a time
3. **Project Fetch**: Gets project + scenes from database using Drizzle ORM:
   ```typescript
   const project = await ctx.db.query.projects.findFirst({
     where: (projects, { eq, and }) => and(
       eq(projects.id, input.projectId),
       eq(projects.userId, ctx.session.user.id)
     ),
     with: {
       scenes: {
         orderBy: (scenes, { asc }) => asc(scenes.order),
       },
     },
   });
   ```
4. **Scene Validation**: Filters out scenes without `tsxCode`
5. **Duration Check**: Ensures video isn't longer than 30 minutes
6. **Render Config**: Calls `prepareRenderConfig()`
7. **Lambda Trigger**: Calls `renderVideoOnLambda()`
8. **State Tracking**: Stores render job in memory + database

**Key Data Flow:**
```typescript
// Input from frontend
{ projectId, format, quality }
  ↓
// Database query result
{ project: ProjectEntity, scenes: SceneEntity[] }
  ↓
// Filtered scenes
scenes.filter(s => s.tsxCode && s.tsxCode.length > 0)
  ↓
// Render configuration
{ scenes: ProcessedScene[], settings: QualitySettings, dimensions: {width, height} }
```

---

## 4. Code Transformation: TSX → JavaScript {#code-transformation}

### The Big Challenge: Browser Code → Lambda Code

**The Problem**: Scenes contain TSX code that uses browser APIs (`window.React`, `window.Remotion`, `window.IconifyIcon`, etc.) but Lambda runs in Node.js without browser globals.

### Transformation Process (`/src/server/services/render/render.service.ts`)

The `preprocessSceneForLambda()` function performs these transformations IN THIS EXACT ORDER:

#### Step 1: TypeScript/JSX Compilation
```typescript
// Uses Sucrase to transform TSX → JS
const { transform } = require('sucrase');
let { code } = transform(tsxCode, {
  transforms: ['typescript', 'jsx'],
  jsxRuntime: 'classic',
  production: true,
});
```

**Example Transformation:**
```tsx
// BEFORE (TSX from scene):
const MyScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: 'Poppins'}}>
      <h1>Hello World</h1>
    </AbsoluteFill>
  );
};
export default MyScene;
```

```javascript
// AFTER (JavaScript for Lambda):
const MyScene = () => {
  const frame = useCurrentFrame();
  return React.createElement(
    AbsoluteFill, 
    { style: { fontFamily: 'Poppins' } }, 
    React.createElement('h1', null, 'Hello World')
  );
};
const Component = MyScene;
```

#### Step 2: Window Object Removal
```typescript
// Remove browser-specific imports
code = code.replace(/const\s*{\s*[^}]+\s*}\s*=\s*window\.Remotion\s*;?\n?/g, '');
code = code.replace(/const\s*{\s*[^}]+\s*}\s*=\s*window\.React\s*;?/g, '');
code = code.replace(/window\.React/g, 'React');
```

#### Step 3: Export Transformation for Lambda
```typescript
// CRITICAL: Function constructor CANNOT handle ANY export statements
// ALL exports must be stripped and converted to const Component
code = code
  .replace(/export\s+default\s+function\s+(\w+)/g, 'const Component = function $1')
  .replace(/export\s+default\s+([a-zA-Z_$][\w$]*);?\s*$/gm, 'const Component = $1;')
  .replace(/export\s+const\s+\w+\s*=\s*[^;]+;?/g, '')  // Remove export const
  .replace(/export\s+{\s*[^}]*\s*};?/g, '');            // Remove export { ... }
```

---

## 5. Font System: How Typography Works {#font-system}

### The Font Pipeline: Preview vs Lambda

**Two Different Systems:**
1. **Preview** (browser): Uses `@remotion/google-fonts` + CSS
2. **Lambda** (Node.js): Uses `@remotion/fonts` + bundled WOFF2 files

### Preview Font Loading (`/src/components/GlobalDependencyProvider.tsx`)

```typescript
// Preloads common fonts on app start
const commonFonts = [
  'Inter', 'DM Sans', 'Roboto', 'Poppins', 'Montserrat',
  'Playfair Display', 'Merriweather', 'Lobster', 'Dancing Script',
  'Pacifico', 'Fira Code', 'JetBrains Mono', 'Raleway', 'Ubuntu',
  'Bebas Neue', 'Plus Jakarta Sans'
];

for (const font of commonFonts) {
  await ensureFontLoaded(font, '400');
  await ensureFontLoaded(font, '700');
}
```

### Lambda Font System (`/src/remotion/fonts/`)

**Font Catalog** (`/src/remotion/fonts/catalog.ts`):
```typescript
export const FONT_CATALOG: FontCatalog = {
  'Inter': {
    '400': 'Inter-Regular.woff2',
    '700': 'Inter-Bold.woff2',
    // ... all weights
  },
  'Poppins': {
    '400': 'Poppins-Regular.woff2',
    '500': 'Poppins-Medium.woff2',
    '700': 'Poppins-Bold.woff2',
  },
  // ... 15+ other fonts
};
```

**Font Loader** (`/src/remotion/fonts/loader.ts`):
```typescript
export async function ensureFontLoaded(family: string, weight: string = '400') {
  const file = FONT_CATALOG[family]?.[weight];
  if (!file) return;
  
  await loadFont({
    family: family,
    weight: weight,
    url: staticFile(`fonts/${file}`) // Points to public/fonts/
  });
}
```

### How Fonts Get Loaded in Lambda

**Font Detection** (`/src/remotion/MainCompositionSimple.tsx`):
```typescript
function extractFontsFromScenes(scenes: any[]): Array<{family: string; weights: Set<string>}> {
  const fontMap = new Map<string, Set<string>>();
  
  for (const scene of scenes) {
    const code = scene.jsCode || scene.tsxCode || '';
    
    // Find font families: fontFamily: "Poppins"
    const patterns = [
      /fontFamily:\s*["']([^"']+)["']/g,
      /font:\s*["']([^"']+)["']/g,
    ];
    
    // Find font weights: fontWeight: "700"
    const weightPatterns = [
      /fontWeight:\s*["']?(\d+|bold|normal)["']?/g,
    ];
    
    // Extract and map fonts to weights
    // ...
  }
  
  return Array.from(fontMap.entries()).map(([family, weights]) => ({
    family, weights
  }));
}
```

**Font Loading Before Render**:
```typescript
React.useEffect(() => {
  const fontsNeeded = extractFontsFromScenes(scenes);
  
  const loadPromises: Promise<void>[] = [];
  for (const {family, weights} of fontsNeeded) {
    for (const weight of weights) {
      loadPromises.push(ensureFontLoaded(family, weight));
    }
  }
  
  Promise.all(loadPromises).then(() => {
    setFontsReady(true);
    continueRender(handle); // Tell Remotion fonts are ready
  });
}, [scenes]);
```

#### Important Processing Order

Based on actual logs, the transformation happens in this sequence:
1. **Scene Validation**: Check if scene has only script array without component
2. **Sucrase Compilation**: TSX → JavaScript
3. **Icon Detection & Loading**: Find all icon references
4. **Icon Map Injection**: Add `__iconMap` at the BEGINNING of code
5. **Window Object Removal**: Strip window.Remotion, window.React
6. **Avatar URL Replacement**: Replace window.BazaarAvatars
7. **Export Statement Removal**: Convert ALL exports to const Component

**Result**: The transformed code starts with the icon map, which is why logs show the icon map in the code preview.

---

## 6. Icon System: Iconify → SVG Conversion {#icon-system}

### The Icon Challenge

**Problem**: Scene code uses `<IconifyIcon icon="mdi:home" />` but Lambda can't fetch icons from CDN.

**Solution**: Pre-load all icons during preprocessing and convert to inline SVG components.

### Icon Preprocessing (`/src/server/services/render/render.service.ts`)

#### Step 1: Icon Detection
```typescript
async function replaceIconifyIcons(code: string): Promise<string> {
  const iconNames = new Set<string>();
  
  // Find icons in JSX: <IconifyIcon icon="mdi:home" />
  const directIconRegex = /<window\.IconifyIcon\s+icon=["']([^"']+)["']/g;
  
  // Find icons in data: { icon: "mdi:home" }
  const iconDataRegex = /\{\s*icon:\s*["']([^"']+)["']/g;
  
  // Find variable icons: const myIcon = "mdi:home"
  const variableIconRefRegex = /\b(icon|iconName)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)/g;
  
  // Collect all unique icon names...
}
```

#### Step 2: Icon Loading
```typescript
// Load SVG from Iconify node loader
const { loadNodeIcon } = await import('@iconify/utils/lib/loader/node-loader');

for (const iconName of iconNames) {
  const [collection, icon] = iconName.split(':');
  const svgString = await loadNodeIcon(collection, icon);
  
  if (svgString) {
    iconMap.set(iconName, svgString);
  } else {
    // Fallback to simple square icon
    iconMap.set(iconName, '<svg viewBox="0 0 24 24"><rect.../></svg>');
  }
}
```

#### Step 3: SVG Component Generation
```typescript
// Create React components for each icon
const iconMapEntries = [];
for (const [name, svg] of iconMap.entries()) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24";
  
  const innerMatch = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
  const inner = innerMatch?.[1] || '';
  
  iconMapEntries.push(
    `"${name}": function(props) { 
       return React.createElement("svg", {
         viewBox: "${viewBox}",
         width: "1em", 
         height: "1em",
         fill: "currentColor",
         dangerouslySetInnerHTML: { __html: \`${inner}\` }
       }, null); 
     }`
  );
}
```

#### Step 4: Code Injection
```typescript
// Inject icon map at top of scene code
const iconMapCode = `
  const __iconMap = {
    ${iconMapEntries.join(',\n    ')}
  };
  
  const IconifyIcon = function(props) {
    const iconName = props.icon;
    const IconComponent = __iconMap[iconName];
    return IconComponent ? IconComponent(props) : null;
  };
`;

code = iconMapCode + '\n' + code;
code = code.replace(/window\.IconifyIcon/g, 'IconifyIcon');
```

**Result**: Every `<IconifyIcon icon="mdi:home" />` becomes an inline SVG component that works in Lambda.

---

## 7. Avatar System: R2 Storage Integration {#avatar-system}

### Avatar URL Transformation

**Problem**: Scene code uses `window.BazaarAvatars['asian-woman']` but Lambda needs direct URLs.

**Solution**: Replace with absolute Cloudflare R2 URLs during preprocessing.

```typescript
// In preprocessSceneForLambda()
transformedCode = transformedCode.replace(
  /window\.BazaarAvatars\[['"]([^'"]+)['"]\]/g,
  (match: string, avatarId: string) => {
    const avatarUrls: Record<string, string> = {
      'asian-woman': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/asian-woman.png',
      'black-man': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/black-man.png',
      'hispanic-man': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/hispanic-man.png',
      'middle-eastern-man': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/middle-eastern-man.png',
      'white-woman': 'https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/white-woman.png'
    };
    return `"${avatarUrls[avatarId]}"`;
  }
);
```

**Result**: `window.BazaarAvatars['asian-woman']` becomes `"https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/avatars/asian-woman.png"`

---

## 8. AWS Lambda Remotion: Cloud Video Rendering {#lambda-rendering}

### Lambda Service (`/src/server/services/render/lambda-render.service.ts`)

#### Lambda Configuration (Uses Environment Variables)
```typescript
// NOT hardcoded - uses environment variables:
const config = {
  region: process.env.AWS_REGION,
  functionName: process.env.REMOTION_FUNCTION_NAME,
  bucketName: process.env.REMOTION_BUCKET_NAME,
  serveUrl: process.env.REMOTION_SERVE_URL || 'https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-it-4-0-321/index.html'
};
```

#### Lambda Invocation
```typescript
const { renderMediaOnLambda } = await import("@remotion/lambda/client");

const { renderId, bucketName } = await renderMediaOnLambda({
  region: process.env.AWS_REGION,
  functionName: process.env.REMOTION_FUNCTION_NAME,
  serveUrl: DEPLOYED_SITE_URL,
  composition: "MainCompositionSimple",
  inputProps: {
    scenes: processedScenes,    // JavaScript code ready for execution
    projectId: projectId,
    width: renderWidth,
    height: renderHeight,
    audio: audioTrack           // Optional background audio
  },
  codec: format === 'gif' ? 'gif' : 'h264',
  jpegQuality: settings.jpegQuality,
  crf: settings.crf,
  frameRange: [0, totalDuration - 1],
  outName: `renders/${projectId}-${Date.now()}.${format}`, // S3 key
  webhook: {
    url: `${process.env.NEXTAUTH_URL}/api/webhooks/render`,
    secret: process.env.WEBHOOK_SECRET
  }
});
```

### What Happens in Lambda

1. **Lambda Function Receives**: Processed scene data + render settings
2. **Remotion Loads**: `MainCompositionSimple` from deployed site
3. **Scene Execution**: Each scene's JavaScript runs in Lambda environment
4. **Font Loading**: Fonts loaded from bundled WOFF2 files
5. **Frame Rendering**: Remotion renders each frame (30fps = 30 frames/second)
6. **FFmpeg Encoding**: Frames encoded to MP4/WebM/GIF
7. **S3 Upload**: Final video saved to `renders/${projectId}-${timestamp}.mp4`
8. **Webhook**: Lambda notifies our API when complete

**Lambda Resources:**
- Memory: 4GB RAM
- Disk: 8GB temporary storage
- Timeout: 600 seconds (10 minutes)
- Concurrent executions: Limited by AWS quotas

---

## 9. The Lambda Composition: How Videos Are Built {#lambda-composition}

### MainCompositionSimple (`/src/remotion/MainCompositionSimple.tsx`)

This is the **heart of video rendering** - the component Lambda executes.

#### Key Components

**1. Font Loading System**
```typescript
React.useEffect(() => {
  const fontsNeeded = extractFontsFromScenes(scenes);
  const loadPromises: Promise<void>[] = [];
  
  for (const {family, weights} of fontsNeeded) {
    for (const weight of weights) {
      loadPromises.push(ensureFontLoaded(family, weight));
    }
  }
  
  await Promise.all(loadPromises);
  setFontsReady(true);
  continueRender(handle);
}, [scenes]);
```

**2. Dynamic Scene Execution**
```typescript
const DynamicScene: React.FC = ({ scene, index }) => {
  if (scene.jsCode) {
    try {
      // Create component factory from JavaScript code
      const createComponent = new Function(
        'React', 'AbsoluteFill', 'useCurrentFrame', 'interpolate', 
        'spring', 'Sequence', 'useVideoConfig', // Remotion API
        `
          ${scene.jsCode}
          
          if (typeof Component !== 'undefined') return Component;
          return null;
        `
      );
      
      // Execute the factory with Remotion context
      const ComponentFactory = createComponent(
        React, AbsoluteFill, useCurrentFrame, interpolate, 
        spring, Sequence, useVideoConfig
      );
      
      // Render the component
      return <ComponentFactory />;
    } catch (error) {
      // Show error scene with diagnostic info
      return <ErrorScene error={error} sceneId={scene.id} />;
    }
  }
  
  return <EmptyScene message="No code to render" />;
};
```

**3. Video Timeline Assembly**
```typescript
export const VideoComposition: React.FC = ({ scenes, audio }) => {
  const totalVideoDuration = scenes.reduce((sum, scene) => 
    sum + extractSceneDuration(scene), 0
  );

  return (
    <AbsoluteFill>
      {/* Background audio track */}
      {audio && (
        <Audio
          src={audio.url}
          volume={audio.volume}
          startFrom={Math.round(audio.startTime * 30)}
          endAt={Math.round(audio.endTime * 30)}
          loop={audio.endTime - audio.startTime < totalVideoDuration / 30}
        />
      )}
      
      {/* Video scenes in sequence */}
      <Series>
        {scenes.map((scene, index) => {
          const duration = extractSceneDuration(scene);
          return (
            <Series.Sequence key={scene.id} durationInFrames={duration}>
              <DynamicScene scene={scene} index={index} />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
```

#### Duration Calculation
```typescript
const extractSceneDuration = (scene: any): number => {
  if (!scene.jsCode) return scene.duration || 150;
  
  try {
    // Extract duration from scene code
    const durationExtractor = new Function(`
      let exports = {};
      ${scene.jsCode}
      return exports.durationInFrames || 
             (typeof durationInFrames !== 'undefined' ? durationInFrames : null);
    `);
    
    const extractedDuration = durationExtractor();
    return extractedDuration && extractedDuration > 0 ? extractedDuration : scene.duration || 150;
  } catch (error) {
    return scene.duration || 150; // 5 seconds at 30fps
  }
};
```

---

## 10. Progress Tracking & Download {#progress-download}

### Progress Monitoring

**Client-side Polling** (`/src/components/export/ExportButton.tsx`):
```typescript
const { data: status } = api.render.getRenderStatus.useQuery(
  { renderId: renderId! },
  {
    enabled: !!renderId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false; // Stop polling
      }
      return 1000; // Poll every second
    },
  }
);
```

**Server-side Progress Check** (`/src/server/api/routers/render.ts`):
```typescript
const progress = await getLambdaRenderProgress(renderId, bucketName);

return {
  status: progress.done ? 'completed' : 'rendering',
  progress: Math.round((progress.overallProgress || 0) * 100),
  outputUrl: progress.outputFile,
  isFinalizingFFmpeg: progress.encodedFrames === progress.renderedFrames && progress.overallProgress < 1,
  errors: progress.errors
};
```

### Download Flow

**1. S3 URL Construction (CRITICAL BUG FIXED)**:
```typescript
// Lambda returns FULL URL: https://s3.us-east-1.amazonaws.com/bucket/renders/project-123.mp4
let outputUrl = progress.outputFile;

if (outputUrl && outputUrl.startsWith('https://')) {
  // IMPORTANT: Lambda already returns a complete, valid S3 URL
  // Use it directly without modification
  outputUrl = progress.outputFile;
} else {
  // Only construct URL if it's just a key (rare case)
  const bucketName = process.env.REMOTION_BUCKET_NAME || 'remotionlambda-useast1-yb1vzou9i7';
  const region = process.env.AWS_REGION || 'us-east-1';
  outputUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${outputUrl}`;
}
```

**WARNING**: Previous code had a bug that would parse the Lambda URL incorrectly, causing the bucket name to appear twice in the final URL.

**2. Auto-download**:
```typescript
useEffect(() => {
  if (status?.status === 'completed' && !hasDownloaded && status.outputUrl) {
    const autoDownload = async () => {
      const response = await fetch(status.outputUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = generateCleanFilename(projectTitle, quality, format);
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    };
    
    autoDownload();
    setHasDownloaded(true);
  }
}, [status]);
```

---

## 11. Error Handling & Debugging {#error-handling}

### Common Failure Points

**1. Font Loading Errors**:
```
Error: A network error occurred
```
- **Cause**: Too many fonts loaded at once, network timeout
- **Solution**: Only load fonts used in scenes, not entire catalog

**2. Scene Compilation Errors**:
```
Error: Component factory returned null/undefined
```
- **Cause**: Scene TSX code incomplete or malformed
- **Debug**: Check scene.jsCode for proper Component assignment

**3. Lambda Timeout**:
```
Error: Task timed out after 600.00 seconds
```
- **Cause**: Video too long or complex scenes
- **Solution**: Increase Lambda timeout or reduce scene complexity

**4. S3 Access Denied**:
```
Error: Access denied when downloading
```
- **Cause**: S3 public access not configured
- **Solution**: Run `npm run setup:s3-public` after Lambda deployment

### Debugging Tools

**1. Scene Code Inspection**:
```typescript
// In preprocessSceneForLambda()
console.log(`[Preprocess] Scene ${scene.id}:`, {
  originalCodeLength: tsxCode.length,
  transformedCodeLength: transformedCode.length,
  hasComponent: transformedCode.includes('const Component'),
  transformedCodePreview: transformedCode.substring(0, 200)
});
```

**2. Lambda Logs** (CloudWatch):
```
[Lambda Font Loading] Loading Poppins weight 500
[Lambda Font Loading] Successfully loaded scene fonts
[DynamicScene] Successfully created component factory for scene 0
[VideoComposition] Total calculated duration: 180 frames (6s)
```

**3. Render State Tracking**:
```typescript
renderState.set(renderId, {
  id: renderId,
  status: 'rendering',
  progress: 45,
  userId: userId,
  projectId: projectId,
  bucketName: bucketName,
  createdAt: Date.now()
});
```

---

## 12. Configuration & Environment {#configuration}

### Required Environment Variables

**AWS Lambda Configuration**:
```env
RENDER_MODE=lambda
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
REMOTION_FUNCTION_NAME=remotion-render-4-0-320-mem4096mb-disk8192mb-600sec
REMOTION_BUCKET_NAME=remotionlambda-useast1-yb1vzou9i7
REMOTION_SERVE_URL=https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-fonts-update/index.html
REMOTION_SITE_ID=bazaar-fonts-update  # Must match site name from deployment
```

**Webhook Configuration**:
```env
NEXTAUTH_URL=https://bazaar.it
WEBHOOK_SECRET=60fe7de8e795930a34aafc4f783c0eac944d19bc142cdc674c71fe6784005b6c
```

**Performance Settings**:
```env
USER_DAILY_EXPORT_LIMIT=10
MAX_RENDER_DURATION_MINUTES=30
LAMBDA_MEMORY_MB=4096
LAMBDA_DISK_SIZE_MB=8192
```

### Deployment Commands

**Build and Deploy Site**:
```bash
npm run build
npx remotion lambda sites create --site-name bazaar-it-4-0-321
```

**Deploy Lambda Function**:
```bash
bash scripts/deploy-lambda.sh
# Creates: remotion-render-4-0-320-mem4096mb-disk8192mb-600sec
```

**Setup S3 Public Access**:
```bash
npm run setup:s3-public
# Configures public read for renders/* path
```

---

## Summary: The Complete Picture

When a user clicks "Render" in Bazaar-vid:

1. **Frontend validates** project has scenes
2. **Backend fetches** project + scenes from PostgreSQL using Drizzle ORM
3. **Code transformation** converts TSX → JavaScript, replaces icons/avatars/fonts
4. **Lambda invocation** sends processed scenes to AWS
5. **Video rendering** happens in cloud with Remotion
6. **Progress tracking** provides real-time updates (polling every 1000ms)
7. **Auto-download** delivers final MP4/WebM/GIF to user

## Actual Transformation Example (From Real Logs)

**Input**: 21,533 characters of TSX code
```typescript
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } = window.Remotion;
const Scene_A8K9M2X7 = () => {
  // ... scene code
};
export default Scene_A8K9M2X7;
```

**Processing**:
- Found 15 unique icons (mdi:web, mdi:newspaper, simple-icons:openai, etc.)
- Generated icon map with SVG components
- Removed window references
- Stripped export statements

**Output**: 34,284 characters of Lambda-ready JavaScript
```javascript
const __iconMap = {
  "mdi:web": function(props) { return React.createElement("svg", /*...*/) },
  // ... 14 more icons
};
const IconifyIcon = function(props) { /*...*/ };
// Remotion components will be provided by the runtime
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } = Remotion;
const Scene_A8K9M2X7 = () => {
  // ... scene code with IconifyIcon references
};
const Component = Scene_A8K9M2X7;
```

The entire system is designed to handle the complexity of transforming React components into video frames while managing fonts, icons, avatars, and audio in a cloud environment. Every piece has been architected to work reliably at scale while providing a seamless user experience.

**Key Innovation**: The preprocessing pipeline that transforms browser-based React components into Lambda-compatible JavaScript while maintaining full design fidelity - fonts, icons, animations, and all.