'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { type EnhancedArtifact } from '~/types/enhanced-a2a';

export interface AnimationDesignBriefViewerProps {
  briefArtifact?: EnhancedArtifact;
  taskId?: string; // For direct task identification
}

interface BriefContent {
  description: string;
  scenes?: Array<{
    name: string;
    description: string;
    duration?: number;
    elements?: Array<{
      type: string;
      id: string;
      properties: Record<string, any>;
    }>;
  }>;
  stylistic_guidelines?: {
    color_palette?: string[];
    animation_style?: string;
    mood?: string;
  };
}

export function AnimationDesignBriefViewer({ briefArtifact, taskId }: AnimationDesignBriefViewerProps) {
  const [briefContent, setBriefContent] = useState<BriefContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // When no briefArtifact is provided
    if (!briefArtifact) {
      if (taskId) {
        // If we have a taskId but no artifact, show a placeholder instead of an error
        setError(null);
        setBriefContent({
          description: `This is a placeholder for Animation Design Brief for Task ID: ${taskId}`,
          stylistic_guidelines: {
            animation_style: 'System default',
            mood: 'Professional',
            color_palette: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
          },
          scenes: [
            {
              name: 'Intro Scene',
              description: 'Opening scene with logo and animation',
              duration: 60
            }
          ]
        });
        return;
      } else {
        // If there's no briefArtifact and no taskId, show an error
        setError('No animation design brief artifact provided');
        return;
      }
    }
    
    try {
      // Parse the brief content from the artifact
      let content: BriefContent;
      
      if (briefArtifact?.data) {
        // If data is already available as an object
        content = typeof briefArtifact.data === 'string'
          ? JSON.parse(briefArtifact.data)
          : briefArtifact.data;
      } else if (briefArtifact?.url) {
        // We would need to fetch from URL, but for now just show a message
        setError('Brief data is only available via URL. Fetch not implemented in viewer.');
        return;
      } else if (briefArtifact) {
        setError('Brief artifact does not contain data or URL');
        return;
      } else {
        // This should never happen due to the checks above, but TypeScript doesn't know that
        return;
      }
      
      setBriefContent(content);
      setError(null);
    } catch (err) {
      console.error('Error parsing animation design brief:', err);
      setError('Failed to parse animation design brief data');
    }
  }, [briefArtifact]);
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Animation Design Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }
  
  if (!briefContent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Animation Design Brief</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500">Loading brief content...</div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Animation Design Brief</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-1">Description</h3>
          <p className="text-sm">{briefContent.description}</p>
        </div>
        
        {briefContent.stylistic_guidelines && (
          <div>
            <h3 className="text-sm font-semibold mb-1">Stylistic Guidelines</h3>
            <div className="pl-4 space-y-1">
              {briefContent.stylistic_guidelines.animation_style && (
                <p className="text-sm"><span className="font-medium">Style:</span> {briefContent.stylistic_guidelines.animation_style}</p>
              )}
              {briefContent.stylistic_guidelines.mood && (
                <p className="text-sm"><span className="font-medium">Mood:</span> {briefContent.stylistic_guidelines.mood}</p>
              )}
              {briefContent.stylistic_guidelines.color_palette && (
                <div>
                  <p className="text-sm font-medium">Color Palette:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {briefContent.stylistic_guidelines.color_palette.map((color, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div
                          className="w-8 h-8 rounded-md border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs mt-1">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {briefContent.scenes && briefContent.scenes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Scenes</h3>
            <div className="space-y-3">
              {briefContent.scenes.map((scene, index) => (
                <div key={index} className="border rounded-md p-3">
                  <h4 className="text-sm font-semibold">{scene.name}</h4>
                  <p className="text-sm mt-1">{scene.description}</p>
                  
                  {scene.duration !== undefined && (
                    <p className="text-sm mt-1"><span className="font-medium">Duration:</span> {scene.duration} frames</p>
                  )}
                  
                  {scene.elements && scene.elements.length > 0 && (
                    <div className="mt-2">
                      <h5 className="text-xs font-semibold">Elements</h5>
                      <ul className="pl-4 mt-1 list-disc">
                        {scene.elements.map((element, elemIndex) => (
                          <li key={elemIndex} className="text-xs">
                            {element.type}: {element.id}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 