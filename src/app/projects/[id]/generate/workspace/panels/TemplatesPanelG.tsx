"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { SearchIcon } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { TEMPLATES, type TemplateDefinition } from "~/templates/registry";
import { Player } from "@remotion/player";

interface TemplatesPanelGProps {
  projectId: string;
  onSceneGenerated?: (sceneId: string) => Promise<void>;
}

// Mini template preview component using actual Remotion Player
const TemplatePreview = ({ template }: { template: TemplateDefinition }) => {
  return (
    <div className="relative w-full aspect-video bg-black rounded-t overflow-hidden">
      <Player
        component={template.component}
        durationInFrames={template.duration}
        compositionWidth={1920}
        compositionHeight={1080}
        fps={30}
        style={{
          width: '100%',
          height: '100%',
        }}
        controls={false}
        loop
        autoPlay
        clickToPlay={false}
      />
    </div>
  );
};

export default function TemplatesPanelG({ projectId, onSceneGenerated }: TemplatesPanelGProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // Direct template addition mutation - bypasses LLM pipeline
  const addTemplateMutation = api.generation.addTemplate.useMutation({
    onSuccess: async (result) => {
      if (result.success) {
        toast.success(`${result.message}`);
        console.log('[TemplatesPanelG] Template added successfully:', result.scene);
        
        // 🚨 CRITICAL: Invalidate all relevant caches to trigger UI updates
        console.log('[TemplatesPanelG] Invalidating caches and refreshing video state...');
        
        // Invalidate project scenes cache
        await utils.generation.getProjectScenes.invalidate({ projectId });
        await utils.generation.getProjectScenes.refetch({ projectId });
        
        // Invalidate chat messages cache
        await utils.chat.getMessages.invalidate({ projectId });
        
        // 🚨 CRITICAL: Update video state through callback
        if (onSceneGenerated && result.scene?.id) {
          console.log('[TemplatesPanelG] Triggering video state update...');
          await onSceneGenerated(result.scene.id);
        }
        
        console.log('[TemplatesPanelG] ✅ All caches invalidated and video state updated');
      } else {
        toast.error("Failed to add template");
      }
    },
    onError: (error) => {
      console.error('[TemplatesPanelG] Template addition failed:', error);
      toast.error(`Failed to add template: ${error.message}`);
    },
  });

  // Handle template addition
  const handleAddTemplate = useCallback(async (template: TemplateDefinition) => {
    console.log('[TemplatesPanelG] Adding template:', template.name);
    
    addTemplateMutation.mutate({
      projectId,
      templateId: template.id,
      templateName: template.name,
      templateCode: template.getCode(), // Get the code string for database storage
      templateDuration: template.duration,
    });
  }, [projectId, addTemplateMutation]);

  // Filter templates based on search (search by name but don't show name)
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return TEMPLATES;
    
    return TEMPLATES.filter(template =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search */}
      <div className="flex-none p-2 border-b">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Templates Grid - More Responsive */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Full-Size Preview */}
              <TemplatePreview template={template} />
              
              {/* Just Add Button - No Titles */}
              <div className="px-2 py-1">
                <Button
                  onClick={() => handleAddTemplate(template)}
                  disabled={addTemplateMutation.isPending}
                  className="w-full bg-black text-white hover:bg-gray-800 text-sm py-1 font-medium"
                  size="sm"
                >
                  {addTemplateMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <SearchIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No templates found</p>
            {searchQuery && (
              <p className="text-xs mt-1">Try a different search term</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}