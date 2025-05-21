"use client";
// src/app/projects/[id]/generate/components/StoryboardViewer.tsx

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Storyboard, Scene, Asset } from '../types/storyboard';

export interface StoryboardViewerProps {
  storyboard: Storyboard;
  onSelectScene?: (scene: Scene) => void;
}

const StoryboardViewer: React.FC<StoryboardViewerProps> = ({ 
  storyboard,
  onSelectScene
}) => {
  const { scenes = [], style = {}, assets = [] } = storyboard;
  
  const handleSceneSelection = (scene: Scene) => {
    if (onSelectScene) {
      onSelectScene(scene);
    }
  };

  // Display global style information
  const renderStyleInfo = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Color Palette */}
        <Card>
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-2">Color Palette</h3>
            <div className="flex flex-wrap gap-2">
              {style.colorPalette?.map((color, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs mt-1">{color}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Fonts */}
        <Card>
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-2">Fonts</h3>
            <div className="space-y-1">
              {style.fontPrimary && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Primary:</span>
                  <span className="text-sm" style={{ fontFamily: style.fontPrimary }}>
                    {style.fontPrimary}
                  </span>
                </div>
              )}
              {style.fontSecondary && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Secondary:</span>
                  <span className="text-sm" style={{ fontFamily: style.fontSecondary }}>
                    {style.fontSecondary}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Video Details */}
        <Card>
          <CardContent className="pt-4">
            <h3 className="font-semibold mb-2">Video Details</h3>
            <div className="space-y-1 text-sm">
              <div>Resolution: {storyboard.width || 1920}x{storyboard.height || 1080}</div>
              <div>FPS: {storyboard.fps || 30}</div>
              <div>Duration: {storyboard.duration || 'Not specified'} frames</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render scenes as cards in a grid layout
  const renderScenes = () => {
    if (!scenes.length) {
      return <div className="text-center text-gray-500 my-4">No scenes defined in storyboard.</div>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {scenes.map((scene, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="bg-gray-100 dark:bg-gray-800 aspect-video flex items-center justify-center p-4">
              <div 
                className="w-full h-full flex items-center justify-center text-xl"
                style={{ 
                  backgroundColor: style.colorPalette?.[0] || '#f3f4f6',
                  color: style.colorPalette?.[1] || '#111827',
                  fontFamily: style.fontPrimary
                }}
              >
                {scene.name || `Scene ${index + 1}`}
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{scene.name || `Scene ${index + 1}`}</h3>
                  <p className="text-sm text-gray-500">Duration: {scene.duration} frames</p>
                  {scene.template && <p className="text-sm text-gray-500">Template: {scene.template}</p>}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleSceneSelection(scene)}
                >
                  Edit
                </Button>
              </div>
              
              {/* Show scene properties if any */}
              {scene.props && Object.keys(scene.props).length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium mb-1">Properties:</h4>
                  <div className="text-xs space-y-1">
                    {Object.entries(scene.props).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="font-medium mr-1">{key}:</span>
                        <span className="truncate">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Render assets
  const renderAssets = () => {
    if (!assets.length) {
      return <div className="text-center text-gray-500 my-4">No assets defined in storyboard.</div>;
    }

    const renderAssetCard = (asset: Asset) => {
      const { type, url } = asset;
      
      let preview;
      if (type === 'image' && url) {
        preview = (
          <div className="relative aspect-video w-full">
            <Image 
                          src={url} 
                          fill 
                          className="object-cover rounded-t-md" 
                          alt={asset.metadata?.alt || 'Asset'} 
            />
          </div>
        );
      } else if (type === 'audio' && url) {
        preview = (
          <div className="flex items-center justify-center h-24 bg-gray-100 dark:bg-gray-800 rounded-t-md">
            <audio controls className="w-full max-w-[200px]">
              <source src={url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      } else if (type === 'video' && url) {
        preview = (
          <div className="relative aspect-video w-full">
            <video 
              src={url}
              controls
              className="absolute inset-0 w-full h-full object-cover rounded-t-md"
            />
          </div>
        );
      } else {
        preview = (
          <div className="flex items-center justify-center h-24 bg-gray-100 dark:bg-gray-800 rounded-t-md">
            <span className="text-gray-500">{type || 'Unknown'} Asset</span>
          </div>
        );
      }
      
      return (
        <Card key={asset.id} className="overflow-hidden">
          {preview}
          <CardContent className="p-3">
            <h4 className="font-medium text-sm">{asset.id || 'Unnamed Asset'}</h4>
            {asset.metadata && (
              <div className="mt-1 text-xs space-y-1">
                {Object.entries(asset.metadata).map(([key, value]) => (
                  <div key={key} className="flex">
                    <span className="font-medium mr-1">{key}:</span>
                    <span className="truncate">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    };
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
        {assets.map(renderAssetCard)}
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto">
      <div className="space-y-6 p-1">
        <Tabs defaultValue="style">
          <TabsList>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="scenes">Scenes ({scenes.length})</TabsTrigger>
            <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="style" className="mt-4">
            {renderStyleInfo()}
          </TabsContent>
          
          <TabsContent value="scenes">
            {renderScenes()}
          </TabsContent>
          
          <TabsContent value="assets">
            {renderAssets()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StoryboardViewer; 