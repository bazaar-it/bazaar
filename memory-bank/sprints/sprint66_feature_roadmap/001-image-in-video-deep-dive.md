# Image-in-Video Feature: Complete Implementation Guide

**Feature**: Use uploaded images directly within generated videos  
**Complexity**: HIGH  
**Estimated Time**: 4-5 days  
**Business Impact**: Critical for product demos, testimonials, photo stories

## 🎯 Current State vs. Desired State

### Current State:
- Users can upload images to inspire AI generation
- Images are analyzed for style/content
- But images are NOT included in the actual video
- Users frustrated: "Why can't I just put my logo in the video?"

### Desired State:
- Uploaded images can be placed IN scenes
- Images can be animated (fade, slide, zoom)
- AI understands image context: "Put the product.jpg in center"
- Drag-and-drop image placement
- Image gallery in chat interface

## 📐 Architecture Design

### 1. Data Model Extensions

```typescript
// src/server/db/schema.ts - Add to scenes table
export const scenes = pgTable("scenes", {
  // ... existing fields
  mediaConfig: json("media_config").$type<MediaConfig>(),
});

// src/lib/types/media.ts - New types
export interface MediaConfig {
  images: ImageElement[];
  imageLibrary?: string[]; // R2 URLs available for this scene
}

export interface ImageElement {
  id: string;
  url: string; // R2 URL
  filename: string;
  position: Position;
  size: Size;
  rotation?: number;
  opacity?: number;
  animation?: ImageAnimation;
  timing?: AnimationTiming;
  zIndex?: number;
}

export interface ImageAnimation {
  type: 'none' | 'fadeIn' | 'slideIn' | 'zoomIn' | 'ken-burns' | 'rotate';
  direction?: 'left' | 'right' | 'top' | 'bottom';
  duration?: number;
  delay?: number;
  easing?: string;
}
```

### 2. Remotion Components

```typescript
// src/remotion/components/DynamicImage.tsx
import { Img, useCurrentFrame, interpolate, spring } from 'remotion';
import { ImageElement } from '~/lib/types/media';

export const DynamicImage: React.FC<{
  element: ImageElement;
  fps: number;
}> = ({ element, fps }) => {
  const frame = useCurrentFrame();
  
  // Calculate animation values
  const { opacity, scale, x, y } = calculateAnimation(
    frame, 
    element.animation, 
    element.timing,
    fps
  );
  
  return (
    <Img
      src={element.url}
      style={{
        position: 'absolute',
        left: element.position.x + x,
        top: element.position.y + y,
        width: element.size.width,
        height: element.size.height,
        opacity,
        transform: `scale(${scale}) rotate(${element.rotation || 0}deg)`,
        zIndex: element.zIndex || 1,
      }}
      onError={(e) => {
        console.error('Image failed to load:', element.url);
        // Fallback to placeholder
      }}
    />
  );
};

// Animation calculations
function calculateAnimation(
  frame: number, 
  animation?: ImageAnimation,
  timing?: AnimationTiming,
  fps: number = 30
) {
  if (!animation || animation.type === 'none') {
    return { opacity: 1, scale: 1, x: 0, y: 0 };
  }
  
  const duration = animation.duration || 30; // frames
  const delay = animation.delay || 0;
  const progress = Math.max(0, Math.min(1, (frame - delay) / duration));
  
  switch (animation.type) {
    case 'fadeIn':
      return {
        opacity: interpolate(progress, [0, 1], [0, 1]),
        scale: 1, x: 0, y: 0
      };
      
    case 'slideIn':
      const slideDistance = 200;
      const slideX = animation.direction === 'left' ? -slideDistance :
                    animation.direction === 'right' ? slideDistance : 0;
      const slideY = animation.direction === 'top' ? -slideDistance :
                    animation.direction === 'bottom' ? slideDistance : 0;
      return {
        opacity: 1,
        scale: 1,
        x: interpolate(progress, [0, 1], [slideX, 0]),
        y: interpolate(progress, [0, 1], [slideY, 0])
      };
      
    case 'zoomIn':
      return {
        opacity: interpolate(progress, [0, 0.2, 1], [0, 1, 1]),
        scale: spring({
          frame: frame - delay,
          fps,
          from: 0.5,
          to: 1,
          config: { damping: 200 }
        }),
        x: 0, y: 0
      };
      
    case 'ken-burns':
      // Slow zoom with pan
      return {
        opacity: 1,
        scale: interpolate(frame, [0, duration], [1, 1.2]),
        x: interpolate(frame, [0, duration], [0, -20]),
        y: interpolate(frame, [0, duration], [0, -10])
      };
      
    default:
      return { opacity: 1, scale: 1, x: 0, y: 0 };
  }
}
```

### 3. Scene Code Integration

```typescript
// src/remotion/components/SceneWrapper.tsx - Modified to include images
import { DynamicImage } from './DynamicImage';

export const SceneWrapper: React.FC<{
  children: React.ReactNode;
  mediaConfig?: MediaConfig;
}> = ({ children, mediaConfig }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Render background images first */}
      {mediaConfig?.images
        .filter(img => img.zIndex < 0)
        .map(img => <DynamicImage key={img.id} element={img} fps={30} />)
      }
      
      {/* Scene content */}
      {children}
      
      {/* Render foreground images */}
      {mediaConfig?.images
        .filter(img => img.zIndex >= 0)
        .map(img => <DynamicImage key={img.id} element={img} fps={30} />)
      }
    </div>
  );
};
```

### 4. MCP Tool Implementation

```typescript
// src/server/services/mcp/tools/addImageToScene.ts
import { z } from 'zod';
import { MCP_TOOL } from '../base';
import { db } from '~/server/db';
import { scenes } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { ImageElement } from '~/lib/types/media';

const inputSchema = z.object({
  sceneId: z.string(),
  imageUrl: z.string().url(),
  position: z.object({
    x: z.number().default(100),
    y: z.number().default(100),
  }).optional(),
  size: z.object({
    width: z.number().default(300),
    height: z.number().default(200),
  }).optional(),
  animation: z.object({
    type: z.enum(['none', 'fadeIn', 'slideIn', 'zoomIn', 'ken-burns']),
    direction: z.enum(['left', 'right', 'top', 'bottom']).optional(),
    duration: z.number().optional(),
  }).optional(),
});

export const addImageToScene: MCP_TOOL = {
  id: 'addImageToScene',
  name: 'Add Image to Scene',
  description: 'Place an uploaded image into a specific scene with optional animation',
  
  async execute(params: z.infer<typeof inputSchema>) {
    // 1. Get current scene
    const [scene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, params.sceneId));
      
    if (!scene) {
      throw new Error('Scene not found');
    }
    
    // 2. Parse existing media config
    const currentMedia = scene.mediaConfig || { images: [] };
    
    // 3. Create new image element
    const newImage: ImageElement = {
      id: `img_${Date.now()}`,
      url: params.imageUrl,
      filename: extractFilename(params.imageUrl),
      position: params.position || { x: 100, y: 100 },
      size: params.size || { width: 300, height: 200 },
      animation: params.animation || { type: 'fadeIn' },
      zIndex: currentMedia.images.length, // Stack on top
    };
    
    // 4. Update scene with new image
    const updatedMedia = {
      ...currentMedia,
      images: [...currentMedia.images, newImage],
    };
    
    // 5. Inject image component into TSX code
    const updatedCode = injectImageIntoCode(
      scene.tsxCode,
      newImage,
      scene.mediaConfig
    );
    
    // 6. Save to database
    await db
      .update(scenes)
      .set({
        tsxCode: updatedCode,
        mediaConfig: updatedMedia,
      })
      .where(eq(scenes.id, params.sceneId));
      
    return {
      success: true,
      imageId: newImage.id,
      message: `Added image to scene at position (${newImage.position.x}, ${newImage.position.y})`,
    };
  }
};

// Helper to inject image rendering into scene code
function injectImageIntoCode(
  currentCode: string,
  image: ImageElement,
  mediaConfig?: MediaConfig
): string {
  // If code doesn't have SceneWrapper, add it
  if (!currentCode.includes('SceneWrapper')) {
    return `
import { SceneWrapper } from '@/components/SceneWrapper';

export default function Scene() {
  return (
    <SceneWrapper mediaConfig={${JSON.stringify({ images: [image] })}}>
      ${currentCode}
    </SceneWrapper>
  );
}`;
  }
  
  // Otherwise, update existing mediaConfig prop
  // This is complex - might need AST manipulation
  // For now, append comment with config
  return currentCode + `\n// IMAGE_CONFIG: ${JSON.stringify(image)}`;
}
```

### 5. Brain Orchestrator Integration

```typescript
// src/server/services/brain/orchestratorNEW.ts - Enhancement
class BrainOrchestrator {
  async analyzePromptWithImages(prompt: string, context: Context) {
    // Check if prompt references uploaded images
    const imageReferences = this.extractImageReferences(prompt);
    
    if (imageReferences.length > 0) {
      // User said something like "put my logo.png in the corner"
      const imageAnalysis = await this.analyzeReferencedImages(
        imageReferences,
        context.uploadedImages
      );
      
      // Add image placement tool to workflow
      return {
        tools: ['addImageToScene'],
        parameters: {
          imageUrl: imageAnalysis.matchedImage.url,
          position: this.inferPosition(prompt), // "in the corner" -> {x: 20, y: 20}
          animation: this.inferAnimation(prompt), // "fade in" -> {type: 'fadeIn'}
        }
      };
    }
    
    // Continue with normal flow
    return super.analyzePrompt(prompt, context);
  }
  
  private extractImageReferences(prompt: string): string[] {
    // Match patterns like:
    // - "my logo.png"
    // - "the product image"
    // - "uploaded photo"
    // - "image #1"
    const patterns = [
      /(\w+\.(png|jpg|jpeg|gif|webp))/gi,
      /(uploaded|my|the)\s+(image|photo|picture|logo)/gi,
      /image\s*#?\d+/gi,
    ];
    
    const matches = [];
    patterns.forEach(pattern => {
      const found = prompt.match(pattern);
      if (found) matches.push(...found);
    });
    
    return matches;
  }
  
  private inferPosition(prompt: string): Position {
    const positions = {
      'center': { x: 810, y: 440 }, // 1920x1080 center
      'top left|corner': { x: 50, y: 50 },
      'top right': { x: 1620, y: 50 },
      'bottom left': { x: 50, y: 880 },
      'bottom right': { x: 1620, y: 880 },
      'left': { x: 50, y: 440 },
      'right': { x: 1620, y: 440 },
      'top': { x: 810, y: 50 },
      'bottom': { x: 810, y: 880 },
    };
    
    for (const [pattern, pos] of Object.entries(positions)) {
      if (new RegExp(pattern, 'i').test(prompt)) {
        return pos;
      }
    }
    
    return { x: 100, y: 100 }; // Default
  }
}
```

### 6. UI Components

```typescript
// src/components/chat/ImageGallery.tsx
export const ImageGallery: React.FC<{
  projectId: string;
  onImageSelect?: (imageUrl: string) => void;
}> = ({ projectId, onImageSelect }) => {
  const { data: projectImages } = api.project.getImages.useQuery({ projectId });
  
  return (
    <div className="flex gap-2 p-2 bg-gray-50 rounded-lg overflow-x-auto">
      {projectImages?.map((img, index) => (
        <div
          key={img.url}
          className="relative group cursor-pointer"
          onClick={() => onImageSelect?.(img.url)}
        >
          <img
            src={img.url}
            alt={`Image ${index + 1}`}
            className="w-20 h-20 object-cover rounded hover:ring-2 hover:ring-blue-500"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-white text-xs">Click to use</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// src/components/chat/ChatPanelG.tsx - Add image gallery
const ChatPanelG = () => {
  const [showImages, setShowImages] = useState(false);
  
  return (
    <div>
      {/* Existing chat UI */}
      
      {/* Image gallery toggle */}
      <button
        onClick={() => setShowImages(!showImages)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ImageIcon className="w-4 h-4" />
        {showImages ? 'Hide' : 'Show'} uploaded images ({images.length})
      </button>
      
      {showImages && (
        <ImageGallery
          projectId={projectId}
          onImageSelect={(url) => {
            // Add to message: "Use image: url"
            setMessage(prev => `${prev} [Image: ${url}]`);
          }}
        />
      )}
    </div>
  );
};
```

### 7. Preview Panel Enhancements

```typescript
// src/components/preview/PreviewPanelG.tsx - Add drag & drop
import { useDrop } from 'react-dnd';

const PreviewPanelG = () => {
  const [{ isOver }, drop] = useDrop({
    accept: 'image',
    drop: (item: { url: string }, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset && currentSceneId) {
        // Calculate position relative to preview
        const rect = previewRef.current?.getBoundingClientRect();
        if (rect) {
          const x = offset.x - rect.left;
          const y = offset.y - rect.top;
          
          // Add image to current scene
          addImageToScene({
            sceneId: currentSceneId,
            imageUrl: item.url,
            position: { x, y },
          });
        }
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });
  
  return (
    <div
      ref={drop}
      className={`preview-container ${isOver ? 'ring-2 ring-blue-500' : ''}`}
    >
      {/* Existing preview */}
    </div>
  );
};
```

## 📊 Implementation Phases

### Phase 1: Core Infrastructure (Day 1-2)
- [ ] Database schema updates
- [ ] Type definitions
- [ ] Remotion DynamicImage component
- [ ] Basic animation system
- [ ] Error handling & fallbacks

### Phase 2: Backend Integration (Day 3)
- [ ] MCP tool creation
- [ ] Brain orchestrator enhancements
- [ ] Image reference detection
- [ ] Position/animation inference
- [ ] Code injection logic

### Phase 3: UI Implementation (Day 4-5)
- [ ] Image gallery in chat
- [ ] Drag & drop to preview
- [ ] Image selection UI
- [ ] Context menu for images
- [ ] Progress indicators

### Phase 4: Testing & Polish
- [ ] Cross-browser image loading
- [ ] Performance with many images
- [ ] Animation smoothness
- [ ] Error states
- [ ] Documentation

## 🎯 Success Metrics

1. **Technical Success**:
   - Images load in < 500ms
   - Animations run at 30fps
   - No memory leaks with 50+ images
   - Works with all image formats

2. **User Success**:
   - 80% can add image in first try
   - 60% use animations
   - < 5% error rate
   - Positive feedback on ease of use

3. **Business Success**:
   - 30% of videos include uploaded images
   - Premium feature potential
   - Enables new use cases (product demos)
   - Competitive parity achieved

## 🚧 Potential Challenges

1. **Performance**: Large images could slow preview
   - Solution: Thumbnail generation, lazy loading

2. **Code Injection**: Complex to modify existing TSX
   - Solution: AST manipulation or wrapper approach

3. **Cross-Origin**: R2 CORS issues
   - Solution: Proper CORS headers, proxy if needed

4. **Mobile**: Drag & drop on touch devices
   - Solution: Tap to select, then position

## 📝 Migration Strategy

1. **Existing Projects**: Work without modification
2. **New Features**: Opt-in via image gallery
3. **Database**: Non-breaking mediaConfig addition
4. **Rollback**: Feature flag to disable if needed

## 🎉 End Result

Users can:
- See all uploaded images in a gallery
- Click or drag images into scenes
- Position images precisely
- Apply entrance animations
- Reference images in prompts: "Put logo.png in top right"
- Layer images with z-index control
- Create photo slideshows, product demos, testimonial videos

This transforms Bazaar from "AI video generator" to "AI video editor with your content"!