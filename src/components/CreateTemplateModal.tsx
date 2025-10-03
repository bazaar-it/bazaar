"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
// Use the database scene type instead of the video Scene type
interface SceneFromDB {
  id: string;
  name: string;
  duration: number;
  tsxCode: string;
  order: number;
  projectId: string;
  props: any;
  layoutJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  scenes: SceneFromDB[];
}

const TEMPLATE_CATEGORIES = [
  { value: "text", label: "Text & Typography" },
  { value: "background", label: "Backgrounds" },
  { value: "animation", label: "Animations" },
  { value: "social", label: "Social Media" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
];

export function CreateTemplateModal({
  isOpen,
  onClose,
  projectId,
  scenes,
}: CreateTemplateModalProps) {
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [supportedFormats, setSupportedFormats] = useState({
    landscape: true,
    portrait: true,
    square: true,
  });
  const [isOfficial, setIsOfficial] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSceneIds(scenes.map((scene) => scene.id));
    }
  }, [isOpen, scenes]);

  const selectedScenes = useMemo(() => {
    const selectedSet = new Set(selectedSceneIds);
    return scenes
      .filter((scene) => selectedSet.has(scene.id))
      .sort((a, b) => a.order - b.order);
  }, [scenes, selectedSceneIds]);

  const totalDurationFrames = useMemo(() => {
    return selectedScenes.reduce((sum, scene) => sum + (scene.duration ?? 0), 0);
  }, [selectedScenes]);

  const toggleSceneSelection = (sceneId: string) => {
    setSelectedSceneIds((prev) => {
      if (prev.includes(sceneId)) {
        return prev.filter((id) => id !== sceneId);
      }
      return [...prev, sceneId];
    });
  };

  const selectAllScenes = () => {
    setSelectedSceneIds(scenes.map((scene) => scene.id));
  };

  const clearSceneSelection = () => {
    setSelectedSceneIds([]);
  };

  const allScenesSelected = selectedSceneIds.length === scenes.length && scenes.length > 0;
  const selectedSceneCount = selectedScenes.length;
  const totalDurationSeconds = totalDurationFrames ? Math.round((totalDurationFrames / 30) * 10) / 10 : 0;

  const createTemplateMutation = api.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully!");
      onClose();
      // Reset form
      setTemplateName("");
      setDescription("");
      setCategory("");
      setTags("");
      setSupportedFormats({ landscape: true, portrait: true, square: true });
      setIsOfficial(false);
      setAdminOnly(false);
      setSelectedSceneIds(scenes.map((scene) => scene.id));
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!templateName.trim()) {
      toast.error('Please provide a template name');
      return;
    }

    if (selectedScenes.length === 0) {
      toast.error('Please select at least one scene');
      return;
    }

    const formatArray = Object.entries(supportedFormats)
      .filter(([_, supported]) => supported)
      .map(([format]) => format as 'landscape' | 'portrait' | 'square');

    if (formatArray.length === 0) {
      toast.error("Please select at least one supported format");
      return;
    }

    createTemplateMutation.mutate({
      projectId,
      sceneIds: selectedScenes.map((scene) => scene.id),
      name: templateName.trim(),
      description: description || undefined,
      category: category || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      supportedFormats: formatArray,
      isOfficial,
      adminOnly,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Template from Scenes</DialogTitle>
          <DialogDescription>
            Select one or more scenes from your project to save as a reusable template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Scene Selection */}
          <div className="space-y-2">
            <Label>Select Scenes</Label>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {selectedSceneCount}/{scenes.length} selected
                {selectedSceneCount > 0 ? ` · ${totalDurationSeconds.toFixed(1)}s total` : ''}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={allScenesSelected ? clearSceneSelection : selectAllScenes}
                >
                  {allScenesSelected ? 'Clear all' : 'Select all'}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto border rounded-lg p-2">
              {scenes.map((scene, index) => {
                const isSelected = selectedSceneIds.includes(scene.id);
                return (
                  <div
                    key={scene.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleSceneSelection(scene.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleSceneSelection(scene.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSceneSelection(scene.id)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        Scene {index + 1}: {scene.name}
                      </div>
                      <div className="text-xs opacity-70">
                        {scene.duration} frames ({(scene.duration / 30).toFixed(1)}s)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedSceneCount > 1 && (
              <p className="text-xs text-gray-500">Scenes will be saved in timeline order to create a multi-scene template.</p>
            )}
          </div>

          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name *</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Animated Text Intro"
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template does..."
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., intro, text, animation (comma-separated)"
            />
          </div>

          {/* Supported Formats */}
          <div className="space-y-2">
            <Label>Supported Formats</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="landscape"
                  checked={supportedFormats.landscape}
                  onCheckedChange={(checked) =>
                    setSupportedFormats(prev => ({ ...prev, landscape: !!checked }))
                  }
                />
                <label
                  htmlFor="landscape"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Landscape (16:9)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="portrait"
                  checked={supportedFormats.portrait}
                  onCheckedChange={(checked) =>
                    setSupportedFormats(prev => ({ ...prev, portrait: !!checked }))
                  }
                />
                <label
                  htmlFor="portrait"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Portrait (9:16)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="square"
                  checked={supportedFormats.square}
                  onCheckedChange={(checked) =>
                    setSupportedFormats(prev => ({ ...prev, square: !!checked }))
                  }
                />
                <label
                  htmlFor="square"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Square (1:1)
                </label>
              </div>
            </div>
          </div>

          {/* Official Template */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="official"
              checked={isOfficial}
              onCheckedChange={(checked) => setIsOfficial(!!checked)}
            />
            <label
              htmlFor="official"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mark as Official Template
            </label>
          </div>

          {/* Admin only gate */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="adminOnly"
              checked={adminOnly}
              onCheckedChange={(checked) => setAdminOnly(!!checked)}
            />
            <label
              htmlFor="adminOnly"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Visible to admins only
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTemplateMutation.isPending}
          >
            {createTemplateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Template"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}