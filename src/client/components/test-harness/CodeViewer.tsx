// src/client/components/test-harness/CodeViewer.tsx
// @ts-nocheck

'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { api } from '~/trpc/react';
import { Badge } from '~/components/ui/badge';

interface CustomComponent {
  id: string;
  effect: string;
  tsxCode: string;
  status: 'pending' | 'building' | 'complete' | 'failed';
  createdAt: Date;
}

interface CodeViewerProps {
  taskId: string;
}

export function CodeViewer({ taskId }: CodeViewerProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [components, setComponents] = useState<CustomComponent[]>([]);
  
  // Fetch components using tRPC
  const { data: componentsData, isLoading } = api.customComponent.getComponentsForTask.useQuery(
    { taskId },
    { 
      enabled: !!taskId,
      refetchInterval: 5000, // Poll every 5 seconds
      onSuccess: (data) => {
        if (data.length > 0) {
          setComponents(data);
          if (!selectedComponentId) {
            setSelectedComponentId(data[0].id);
          }
        }
      }
    }
  );
  
  const selectedComponent = components.find(comp => comp.id === selectedComponentId);
  
  // Function to get appropriate variant for status badge
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'complete':
        return 'success';
      case 'failed':
        return 'destructive';
      case 'building':
        return 'default';
      default:
        return 'secondary';
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated TSX Code</CardTitle>
        <CardDescription>
          {taskId 
            ? `Component code for task ${taskId.substring(0, 8)}...` 
            : 'Create a task to view component code'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">Loading components...</div>
        ) : components.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No components generated yet for this task.
          </div>
        ) : (
          <Tabs value={selectedComponentId || undefined} onValueChange={setSelectedComponentId}>
            <TabsList className="mb-4 overflow-x-auto whitespace-nowrap flex">
              {components.map((comp) => (
                <TabsTrigger key={comp.id} value={comp.id} className="flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[100px]">
                      {comp.effect.substring(0, 15)}...
                    </span>
                    <Badge variant={getStatusVariant(comp.status)}>
                      {comp.status}
                    </Badge>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {components.map((comp) => (
              <TabsContent key={comp.id} value={comp.id}>
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-md">
                    <h3 className="font-medium">Component Effect</h3>
                    <p className="text-sm mt-1">{comp.effect}</p>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-md flex justify-between items-center">
                    <h3 className="font-medium">Status</h3>
                    <Badge variant={getStatusVariant(comp.status)}>
                      {comp.status}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">TSX Code</h3>
                    <pre className="p-4 bg-secondary text-secondary-foreground rounded-md overflow-x-auto whitespace-pre-wrap text-sm">
                      {comp.tsxCode || 'No code generated yet'}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

// Generate mock data for development
function generateMockComponents(): CustomComponent[] {
  return [
    {
      id: "comp-001",
      effect: "Fade in text with bounce",
      tsxCode: `
import { useEffect, useRef } from 'react';
import { interpolate, spring, useCurrentFrame } from 'remotion';
import { AbsoluteFill, Img, Sequence } from 'remotion';

export const FadeInTextWithBounce: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Animation timing
  const textEntry = 30; // When text begins to appear
  const duration = 60; // Duration of fade in
  
  // Calculate opacity
  const opacity = interpolate(
    frame,
    [textEntry, textEntry + duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  // Calculate bounce effect
  const bounce = spring({
    frame: Math.max(0, frame - textEntry),
    fps: 30,
    config: {
      damping: 8,
      mass: 0.8,
      stiffness: 100,
    }
  });
  
  // Apply bounce to scale
  const scale = interpolate(bounce, [0, 1], [0.8, 1]);
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          opacity,
          transform: \`scale(\${scale})\`,
          fontFamily: 'Arial, sans-serif',
          fontSize: 60,
          fontWeight: 'bold',
          color: '#4287f5',
          textAlign: 'center',
        }}
      >
        Introducing Our Product
      </div>
    </AbsoluteFill>
  );
};`,
      status: 'complete',
      createdAt: new Date()
    },
    {
      id: "comp-002",
      effect: "Product image zoom in",
      tsxCode: `
import { interpolate, useCurrentFrame } from 'remotion';
import { AbsoluteFill, Img } from 'remotion';

export const ProductImageZoomIn: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Animation timing
  const imageEntry = 60;
  const duration = 45;
  
  // Calculate opacity and scale
  const opacity = interpolate(
    frame,
    [imageEntry, imageEntry + duration],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const scale = interpolate(
    frame,
    [imageEntry, imageEntry + duration],
    [0.8, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          opacity,
          transform: \`scale(\${scale})\`,
          width: '50%',
          height: 'auto',
        }}
      >
        <Img
          src="https://example.com/product.png"
          style={{
            width: '100%',
            height: 'auto',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};`,
      status: 'building',
      createdAt: new Date()
    },
    {
      id: "comp-003",
      effect: "Feature slide in from left",
      tsxCode: `
import { interpolate, useCurrentFrame } from 'remotion';
import { AbsoluteFill } from 'remotion';

export const FeatureSlideIn: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Animation timing
  const entryFrame = 30;
  const duration = 40;
  
  // Calculate position and opacity
  const xPosition = interpolate(
    frame,
    [entryFrame, entryFrame + duration],
    [-300, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  const opacity = interpolate(
    frame,
    [entryFrame, entryFrame + duration / 2],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: '10%',
      }}
    >
      <div
        style={{
          opacity,
          transform: \`translateX(\${xPosition}px)\`,
          fontFamily: 'Arial, sans-serif',
          fontSize: 36,
          fontWeight: 'bold',
          color: '#333333',
        }}
      >
        Lightning Fast Performance
      </div>
    </AbsoluteFill>
  );
};`,
      status: 'failed',
      createdAt: new Date()
    }
  ];
} 