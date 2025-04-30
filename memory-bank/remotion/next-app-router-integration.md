# Integrating Remotion with Next.js App Router

## Summary
- Documents how to properly integrate Remotion with Next.js App Router
- Covers Player component setup, state management, and rendering pipeline
- Provides patterns for server/client component separation with Remotion

## Architecture Overview

The Bazaar-Vid integration of Remotion with Next.js App Router follows these principles:

1. **Server/Client Component Separation**: Remotion Player renders on the client side only
2. **Central State Management**: Zustand store coordinates Remotion state across components
3. **tRPC for Server Communication**: All server-side rendering operations go through tRPC
4. **Isolation of Remotion-specific Code**: Remotion components are kept separate from UI components

## Integration Patterns

### 1. Player Component Setup

The Remotion Player must be wrapped in a client component:

```tsx
// src/components/client/PlayerShell.tsx
'use client';

import { Player } from '@remotion/player';
import { useVideoState } from '~/store/videoState';
import { DynamicVideo } from '~/remotion/compositions/DynamicVideo';

export const PlayerShell: React.FC = () => {
  // Use Zustand store to get video properties
  const { inputProps, setCurrentFrame } = useVideoState();
  
  return (
    <div className="w-full aspect-video">
      <Player
        component={DynamicVideo}
        inputProps={inputProps}
        durationInFrames={inputProps.meta.duration}
        fps={30}
        style={{
          width: '100%',
          height: '100%',
        }}
        onFrameChange={(frame) => {
          setCurrentFrame(frame);
        }}
      />
    </div>
  );
};
```

### 2. State Management with Zustand

Use Zustand to manage Remotion state across components:

```tsx
// src/store/videoState.ts
import { create } from 'zustand';
import { type InputProps } from '~/types/input-props';

interface VideoState {
  // Video state
  inputProps: InputProps;
  currentFrame: number;
  
  // Actions
  setInputProps: (props: InputProps) => void;
  setCurrentFrame: (frame: number) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
}

export const useVideoState = create<VideoState>((set) => ({
  inputProps: {
    meta: { 
      duration: 150, 
      title: "My Video" 
    },
    scenes: []
  },
  currentFrame: 0,
  
  setInputProps: (props) => set({ inputProps: props }),
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  
  updateScene: (id, updates) => set((state) => ({
    inputProps: {
      ...state.inputProps,
      scenes: state.inputProps.scenes.map((scene) => 
        scene.id === id ? { ...scene, ...updates } : scene
      )
    }
  }))
}));
```

### 3. Server-Side Rendering Pipeline

For Lambda rendering through tRPC:

```tsx
// src/server/api/routers/render.ts
import { z } from "zod";
import { renderMediaOnLambda } from "@remotion/lambda/client";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { getLambdaClient } from "~/lib/remotion-lambda";

export const renderRouter = createTRPCRouter({
  startRender: protectedProcedure
    .input(z.object({
      inputProps: z.any(), // Should use your InputProps schema
      webhookUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lambdaClient = getLambdaClient();
      
      const renderId = await renderMediaOnLambda({
        serveUrl: process.env.REMOTION_SERVE_URL!,
        composition: "DynamicVideo",
        inputProps: input.inputProps,
        codec: "h264",
        imageFormat: "jpeg",
        maxRetries: 3,
        privacy: "public",
        webhook: input.webhookUrl,
        region: "us-east-1", // Change as needed
        functionName: process.env.REMOTION_FUNCTION_NAME,
        jpegQuality: 80,
      });
      
      // Store render details in database
      await ctx.db.insert(videoRenders).values({
        id: renderId,
        userId: ctx.session.user.id,
        status: "rendering",
        props: input.inputProps,
        createdAt: new Date(),
      });
      
      return { renderId };
    }),
});
```

### 4. Setting Up Remotion Lambda

```tsx
// src/lib/remotion-lambda.ts
import { getAwsClient } from "@remotion/lambda/client";

let lambdaClient: ReturnType<typeof getAwsClient> | null = null;

export function getLambdaClient() {
  if (lambdaClient) {
    return lambdaClient;
  }
  
  lambdaClient = getAwsClient({
    region: process.env.REMOTION_REGION!,
    accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
  });
  
  return lambdaClient;
}
```

## Handling Multiple Compositions

For projects with multiple Remotion compositions:

```tsx
// src/remotion/Root.tsx
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Main dynamic video composition used in the app */}
      <Composition
        id="DynamicVideo"
        component={DynamicVideo}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultDynamicProps}
        schema={inputPropsSchema}
      />
      
      {/* Additional compositions for specific use cases */}
      <Composition
        id="IntroTemplate"
        component={IntroTemplate}
        durationInFrames={90}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultIntroProps}
      />
      
      {/* Logo animations and other reusable elements */}
      <Composition
        id="LogoAnimation"
        component={LogoAnimation}
        durationInFrames={60}
        fps={30}
        width={500}
        height={500}
        defaultProps={{
          color: "#000000",
          scale: 1,
        }}
      />
    </>
  );
};
```

## Performance Optimization

### 1. Bundle Size Optimization

```jsx
// webpack-override.mjs
export const webpackOverride = (currentConfiguration) => {
  // Apply default Tailwind and other configs...
  
  // Add bundle size optimizations
  return {
    ...withTailwind,
    optimization: {
      ...withTailwind.optimization,
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 20000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Get the vendor name
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )[1];
              
              // Return a truncated version to avoid long filenames
              return `vendor.${packageName.replace('@', '')}`;
            },
          },
        },
      },
    },
  };
};
```

### 2. Offthread Video Processing

For better performance with video assets:

```tsx
// In Remotion composition components
import { OffthreadVideo } from "remotion";

export const VideoScene: React.FC<{ src: string }> = ({ src }) => {
  return (
    <AbsoluteFill>
      {/* Process video in a worker thread for better performance */}
      <OffthreadVideo 
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </AbsoluteFill>
  );
};
```

## Environment Variables

Required environment variables for Remotion integration:

```bash
# For Remotion Studio
NEXT_PUBLIC_REMOTION_STUDIO_URL=http://localhost:3000

# For Lambda rendering
REMOTION_AWS_ACCESS_KEY_ID=your-access-key
REMOTION_AWS_SECRET_ACCESS_KEY=your-secret-key
REMOTION_REGION=us-east-1
REMOTION_FUNCTION_NAME=your-lambda-function-name
REMOTION_SERVE_URL=https://your-remotion-site.netlify.app
```

## Troubleshooting

Common issues and solutions:

1. **Player doesn't render**: Ensure the Player component is properly marked with 'use client'
2. **Lambda rendering fails**: Verify AWS credentials and function name are correct
3. **State updates don't reflect in video**: Confirm Zustand store is correctly updating the InputProps
4. **CSS styling issues**: Follow the patterns in tailwind-shadcn-integration.md
5. **Dynamic imports fail**: Use dynamic imports with 'next/dynamic' for client components

## References

- [Remotion Player Documentation](https://www.remotion.dev/docs/player)
- [Lambda Rendering](https://www.remotion.dev/docs/lambda)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Zustand State Management](https://github.com/pmndrs/zustand)

## Related Documentation

- [Tailwind and Shadcn UI Integration](./tailwind-shadcn-integration.md)
- [Remotion Compositions Guide](./remotion-compositions.md)
- [Lambda Render Pipeline](./lambda-rendering.md)
