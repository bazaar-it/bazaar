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

interface TemplatesPanelGProps {
  projectId: string;
  onSceneGenerated?: (sceneId: string) => Promise<void>;
}

// 🚨 FIXED: Template preview that shows static frame and only plays on hover
const TemplateCard: React.FC<{
  template: TemplateDefinition;
  onAdd: () => void;
  isLoading: boolean;
}> = ({ template, onAdd, isLoading }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = useCallback(() => {
    // Delay before starting hover preview to prevent accidental triggers
    const timeout = setTimeout(() => {
      setIsHovered(true);
    }, 200);

    setIsHovering(true);

    return () => clearTimeout(timeout);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsHovering(false);
  }, []);

  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-500"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardContent className="p-0">
        <div className="relative">
          <div className="aspect-video bg-gray-900 rounded-t-lg overflow-hidden relative">
            {isHovered && isHovering ? (
              // Show animated preview on hover
              <Player
                component={template.component}
                durationInFrames={template.duration}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                style={{ width: "100%", height: "100%" }}
                controls={false}
                loop
                autoPlay
              />
            ) : (
              // Show static frame as preview
              <Player
                component={template.component}
                durationInFrames={template.duration}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                style={{ width: "100%", height: "100%" }}
                controls={false}
                loop={false}
                autoPlay={false}
                initialFrame={template.previewFrame}
              />
            )}
            
            {/* Overlay with template name and hover hint */}
            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <div className="text-center text-white">
                <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
                <p className="text-sm opacity-80">
                  {isHovered ? "Playing preview..." : "Hover to play"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">{template.name}</h3>
                <p className="text-xs text-gray-500">
                  {Math.round(template.duration / 30 * 10) / 10}s duration
                </p>
              </div>
              
              <Button
                size="sm"
                onClick={onAdd}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
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
    <div className="p-4 space-y-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="text-center py-8 text-gray-500">
          <SearchIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>No templates found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}