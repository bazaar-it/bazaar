"use client";

import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { MoreVertical, Edit, Clock, FolderTree, Trash2, Code } from "lucide-react";
import { TemplateRenameModal } from './TemplateRenameModal';
import { TemplateDurationModal } from './TemplateDurationModal';
import { TemplateCategoryModal } from './TemplateCategoryModal';
import { TemplateDeleteConfirmation } from './TemplateDeleteConfirmation';
import { TemplateEditCodeModal } from './TemplateEditCodeModal';

interface TemplateAdminMenuProps {
  template: {
    id: string;
    name: string;
    duration: number;
    category: string | null;
  };
  projectId: string;
  onUpdate?: () => void;
}

export function TemplateAdminMenu({ template, projectId, onUpdate }: TemplateAdminMenuProps) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDurationOpen, setIsDurationOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditCodeOpen, setIsEditCodeOpen] = useState(false);

  const handleSuccess = () => {
    onUpdate?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-white/80"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDurationOpen(true)}>
            <Clock className="h-4 w-4 mr-2" />
            Edit Duration
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsCategoryOpen(true)}>
            <FolderTree className="h-4 w-4 mr-2" />
            Re-categorize
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsEditCodeOpen(true)}>
            <Code className="h-4 w-4 mr-2" />
            Edit Code
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteOpen(true)}
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TemplateRenameModal
        template={template}
        open={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        onSuccess={handleSuccess}
      />

      <TemplateDurationModal
        template={template}
        open={isDurationOpen}
        onOpenChange={setIsDurationOpen}
        onSuccess={handleSuccess}
      />

      <TemplateCategoryModal
        template={template}
        open={isCategoryOpen}
        onOpenChange={setIsCategoryOpen}
        onSuccess={handleSuccess}
      />

      <TemplateEditCodeModal
        template={template}
        projectId={projectId}
        open={isEditCodeOpen}
        onOpenChange={setIsEditCodeOpen}
        onSuccess={handleSuccess}
      />

      <TemplateDeleteConfirmation
        template={template}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
