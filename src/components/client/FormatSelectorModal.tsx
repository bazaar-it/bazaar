"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent,
} from '~/components/ui/dialog';
import { FormatSelector, type VideoFormat } from '~/app/projects/new/FormatSelector';

interface FormatSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (format: VideoFormat) => void;
  isCreating?: boolean;
}

export function FormatSelectorModal({ 
  open, 
  onOpenChange, 
  onSelect, 
  isCreating = false 
}: FormatSelectorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-0">
        {/* Semi-transparent background with blur */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-md" />
        
        {/* Content */}
        <div className="relative z-10">
          <FormatSelector 
            onSelect={onSelect} 
            isCreating={isCreating}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}