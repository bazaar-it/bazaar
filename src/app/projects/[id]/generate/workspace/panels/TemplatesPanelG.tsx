"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { SearchIcon, PlayIcon, PlusIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { TEMPLATES, type TemplateDefinition } from "~/templates/registry";
import { Player } from "@remotion/player";
import { useVideoState } from '~/stores/videoState';

const PLAYER_FPS = 30;

interface TemplatesPanelGProps {
  projectId: string;
  onSceneGenerated?: (sceneId: string) => Promise<void>;
}

const TemplateCard: React.FC<{
  template: TemplateDefinition;
  onAdd: () => void;
  isLoading: boolean;
}> = ({ template, onAdd, isLoading }) => {
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-500 overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardContent className="p-0">
        <div className="relative w-full aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
          <Player
            component={template.component}
            durationInFrames={template.duration}
            compositionWidth={1920} 
            compositionHeight={1080}
            fps={PLAYER_FPS}
            style={{ width: "100%", height: "100%" }}
            controls={false}
            loop={isHovering}
            autoPlay={isHovering}
            initialFrame={!isHovering ? template.previewFrame : 0}
            key={template.id + (isHovering ? '-playing' : '-static')}
          />
          
          {isHovering && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
              <PlayIcon className="w-12 h-12 text-white/70" />
            </div>
          )}
          {!isHovering && (
            <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                Static Preview
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-grow">
              <h3 className="font-medium text-sm truncate" title={template.name}>{template.name}</h3>
              <p className="text-xs text-gray-500">
                {Math.round(template.duration / PLAYER_FPS * 10) / 10}s duration
              </p>
            </div>
            <Button
              size="sm"
              onClick={(e) => { 
                e.stopPropagation();
                onAdd();
              }}
              disabled={isLoading}
              className="h-7 w-7 p-0 flex-shrink-0 ml-2"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlusIcon className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function TemplatesPanelG({ projectId, onSceneGenerated }: TemplatesPanelGProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [addingTemplate, setAddingTemplate] = useState<string | null>(null);

  const addTemplateMutation = api.generation.addTemplate.useMutation({
    onSuccess: async (result) => {
      if (result.success && result.scene?.id) {
        toast.success("Template added successfully!");
        if (onSceneGenerated) {
          await onSceneGenerated(result.scene.id);
        }
      } else {
        toast.error(result.message || "Failed to add template");
      }
      setAddingTemplate(null);
    },
    onError: (error) => {
      toast.error(`Failed to add template: ${error.message}`);
      setAddingTemplate(null);
    },
  });

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter(template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleAddTemplate = useCallback(async (template: TemplateDefinition) => {
    try {
      setAddingTemplate(template.id);
      
      await addTemplateMutation.mutateAsync({
        projectId,
        templateId: template.id,
        templateName: template.name,
        templateCode: template.getCode(),
        templateDuration: template.duration,
      });
    } catch (error) {
      console.error('Error adding template:', error);
    }
  }, [projectId, addTemplateMutation]);

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header with search */}
      <div className="flex-shrink-0 p-4 pb-2 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Responsive grid: 1 column on small screens, 2 on larger screens */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onAdd={() => handleAddTemplate(template)}
                isLoading={addingTemplate === template.id}
              />
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <SearchIcon className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <p className="text-lg">No templates found matching "{searchTerm}"</p>
              <p className="text-sm mt-2">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}