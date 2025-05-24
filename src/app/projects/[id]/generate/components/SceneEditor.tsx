"use client";
// src/app/projects/[id]/generate/components/SceneEditor.tsx

import { useState, useEffect } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import type { Scene } from "../types/storyboard";

export interface SceneEditorProps {
  scene: Scene;
  onSave: (updated: Scene) => void;
}

export default function SceneEditor({ scene, onSave }: SceneEditorProps) {
  const [name, setName] = useState(scene.name);
  const [duration, setDuration] = useState(scene.duration);
  const [template, setTemplate] = useState(scene.template || "");

  useEffect(() => {
    setName(scene.name);
    setDuration(scene.duration);
    setTemplate(scene.template || "");
  }, [scene]);

  const handleSave = () => {
    if (!name.trim() || duration <= 0) return;
    onSave({ ...scene, name: name.trim(), duration, template });
  };

  return (
    <div className="space-y-3 p-3 border rounded-md bg-gray-50">
      <div className="space-y-2">
        <Label htmlFor="scene-name">Name</Label>
        <Input
          id="scene-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scene-duration">Duration (frames)</Label>
        <Input
          id="scene-duration"
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scene-template">Template</Label>
        <Input
          id="scene-template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
      </div>

      <Button onClick={handleSave} className="mt-2">
        Save Scene
      </Button>
    </div>
  );
}
