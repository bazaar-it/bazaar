"use client";

import React, { useState, useEffect } from 'react';
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
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TemplateDurationModalProps {
  template: {
    id: string;
    name: string;
    duration: number; // Duration in frames
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateDurationModal({ template, open, onOpenChange, onSuccess }: TemplateDurationModalProps) {
  // Convert frames to seconds for display (30 FPS)
  const [seconds, setSeconds] = useState(template.duration / 30);
  const utils = api.useUtils();

  const updateMutation = api.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template duration updated successfully");
      utils.templates.getAll.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update duration");
    },
  });

  useEffect(() => {
    if (open) {
      setSeconds(template.duration / 30);
    }
  }, [open, template.duration]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (seconds <= 0) {
      toast.error("Duration must be greater than 0 seconds");
      return;
    }
    const frames = Math.round(seconds * 30); // Convert seconds to frames
    if (frames === template.duration) {
      onOpenChange(false);
      return;
    }
    updateMutation.mutate({
      id: template.id,
      duration: frames,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Edit Template Duration</DialogTitle>
          <DialogDescription>
            Set the default duration for "{template.name}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                step="0.1"
                min="0.1"
                value={seconds}
                onChange={(e) => setSeconds(parseFloat(e.target.value) || 0)}
                placeholder="Enter duration in seconds"
                disabled={updateMutation.isPending}
              />
              <p className="text-xs text-gray-500">
                Frames: {Math.round(seconds * 30)} (at 30 FPS)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || seconds <= 0}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
