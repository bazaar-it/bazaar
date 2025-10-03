"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Loader2, FileCode } from "lucide-react";
import { useVideoState } from "~/stores/videoState";

interface TemplateEditCodeModalProps {
  template: {
    id: string;
    name: string;
  };
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateEditCodeModal({ template, projectId, open, onOpenChange, onSuccess }: TemplateEditCodeModalProps) {
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const utils = api.useUtils();

  // Get scenes from the current project
  const scenes = useVideoState(state => state.projects[projectId]?.props?.scenes || []);
  const activeScenes = scenes.filter((s: any) => !s.deletedAt);

  const updateCodeMutation = api.templates.updateCode.useMutation({
    onSuccess: () => {
      toast.success("Template code updated successfully");
      utils.templates.getAll.invalidate();
      onSuccess?.();
      onOpenChange(false);
      setSelectedSceneId("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update template code");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSceneId) {
      toast.error("Please select a scene");
      return;
    }

    updateCodeMutation.mutate({
      templateId: template.id,
      projectId,
      sceneId: selectedSceneId,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedSceneId("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Template Code</DialogTitle>
          <DialogDescription>
            Select a scene from the current project to update the code for "{template.name}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {activeScenes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileCode className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No scenes in this project</p>
                <p className="text-xs mt-1">Create a scene first to update template code</p>
              </div>
            ) : (
              <>
                <Label>Select Scene</Label>
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  <RadioGroup value={selectedSceneId} onValueChange={setSelectedSceneId}>
                    <div className="space-y-3">
                      {activeScenes.map((scene: any, index: number) => (
                        <div key={scene.id} className="flex items-start space-x-3">
                          <RadioGroupItem
                            value={scene.id}
                            id={`scene-${scene.id}`}
                            className="mt-1"
                            disabled={updateCodeMutation.isPending}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`scene-${scene.id}`}
                              className="text-base font-medium cursor-pointer flex items-center gap-2"
                            >
                              <span className="text-gray-500 text-sm">#{index + 1}</span>
                              {scene.name}
                              {selectedSceneId === scene.id && (
                                <span className="text-xs text-blue-600 font-normal">(Selected)</span>
                              )}
                            </Label>
                            <p className="text-xs text-gray-500 mt-1">
                              Duration: {Math.round(scene.duration / 30 * 10) / 10}s
                              {scene.createdAt && (
                                <> • Created {new Date(scene.createdAt).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </ScrollArea>
                {selectedSceneId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>Note:</strong> The selected scene's code will replace the template code.
                      This will clear any compiled JS and require recompilation.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateCodeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateCodeMutation.isPending || !selectedSceneId || activeScenes.length === 0}
            >
              {updateCodeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Template"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
