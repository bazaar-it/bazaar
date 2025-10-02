"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TemplateDeleteConfirmationProps {
  template: {
    id: string;
    name: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateDeleteConfirmation({ template, open, onOpenChange, onSuccess }: TemplateDeleteConfirmationProps) {
  const utils = api.useUtils();

  const deleteMutation = api.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully");
      utils.templates.getAll.invalidate();
      utils.templates.getCategories.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate(template.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Delete Template</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{template.name}"?
            <br />
            <br />
            This action will hide the template from users. The template will be soft-deleted and can be restored from the database if needed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
