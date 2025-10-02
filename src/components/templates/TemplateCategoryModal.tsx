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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TemplateCategoryModalProps {
  template: {
    id: string;
    name: string;
    category: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TemplateCategoryModal({ template, open, onOpenChange, onSuccess }: TemplateCategoryModalProps) {
  const [category, setCategory] = useState<string>(template.category || "");
  const [customCategory, setCustomCategory] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const utils = api.useUtils();

  const { data: categories } = api.templates.getCategories.useQuery();

  const updateMutation = api.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template category updated successfully");
      utils.templates.getAll.invalidate();
      utils.templates.getCategories.invalidate();
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update category");
    },
  });

  useEffect(() => {
    if (open) {
      setCategory(template.category || "");
      setCustomCategory("");
      setUseCustom(false);
    }
  }, [open, template.category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = useCustom ? customCategory.trim() : category;

    if (!finalCategory) {
      toast.error("Please select or enter a category");
      return;
    }

    if (finalCategory === template.category) {
      onOpenChange(false);
      return;
    }

    updateMutation.mutate({
      id: template.id,
      category: finalCategory,
    });
  };

  const existingCategories = categories?.map(c => c.category).filter((c): c is string => c !== null) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Re-categorize Template</DialogTitle>
          <DialogDescription>
            Change the category for "{template.name}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {existingCategories.length > 0 && !useCustom ? (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} disabled={updateMutation.isPending}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setUseCustom(true)}
                >
                  + Create new category
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="custom-category">Category Name</Label>
                <Input
                  id="custom-category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter category name"
                  maxLength={100}
                  disabled={updateMutation.isPending}
                />
                {existingCategories.length > 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setUseCustom(false)}
                  >
                    ← Choose existing category
                  </Button>
                )}
              </div>
            )}
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
            <Button
              type="submit"
              disabled={
                updateMutation.isPending ||
                (!useCustom && !category) ||
                (useCustom && !customCategory.trim())
              }
            >
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
