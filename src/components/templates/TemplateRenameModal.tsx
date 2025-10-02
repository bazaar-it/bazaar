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

interface TemplateRenameModalProps {
  template: {
    id: string;
    name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateRenameModal({ template, open, onOpenChange, onSuccess }: TemplateRenameModalProps) {
  const [name, setName] = useState(template.name);
  const utils = api.useUtils();

  const updateMutation = api.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template renamed successfully");
      utils.templates.getAll.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to rename template");
    },
  });

  useEffect(() => {
    if (open) {
      setName(template.name);
    }
  }, [open, template.name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name cannot be empty");
      return;
    }
    if (name === template.name) {
      onOpenChange(false);
      return;
    }
    updateMutation.mutate({
      id: template.id,
      name: name.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Rename Template</DialogTitle>
          <DialogDescription>
            Change the display name for this template
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name"
                maxLength={255}
                disabled={updateMutation.isPending}
              />
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
            <Button type="submit" disabled={updateMutation.isPending || !name.trim()}>
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
