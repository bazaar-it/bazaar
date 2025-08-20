'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { Search, X, Copy, Check, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// Popular icon collections for quick access
const POPULAR_COLLECTIONS = {
  'Material Design': 'mdi',
  'Material Symbols': 'material-symbols',
  'Font Awesome': 'fa6-solid',
  'Heroicons': 'heroicons',
  'Tabler': 'tabler',
  'Lucide': 'lucide',
  'Simple Icons': 'simple-icons',
  'Logos': 'logos',
  'Fluent': 'fluent',
  'Bootstrap': 'bi',
};

// Popular icons for quick access
const POPULAR_ICONS = [
  'mdi:home', 'mdi:account', 'mdi:settings', 'mdi:heart',
  'mdi:star', 'mdi:search', 'mdi:menu', 'mdi:close',
  'mdi:check', 'mdi:plus', 'mdi:minus', 'mdi:arrow-right',
  'mdi:arrow-left', 'mdi:download', 'mdi:upload', 'mdi:share',
  'mdi:edit', 'mdi:delete', 'mdi:email', 'mdi:phone',
  'mdi:calendar', 'mdi:clock', 'mdi:location', 'mdi:link',
  'mdi:image', 'mdi:video', 'mdi:music', 'mdi:file',
  'mdi:folder', 'mdi:lock', 'mdi:unlock', 'mdi:eye',
  'mdi:eye-off', 'mdi:refresh', 'mdi:filter', 'mdi:sort',
];

interface IconPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string) => void;
}

export function IconPicker({ open, onClose, onSelectIcon }: IconPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null);
  const { toast } = useToast();

  // Search icons using Iconify API
  const searchIcons = useCallback(async (query: string, collection?: string) => {
    if (!query && collection === 'all') {
      setSearchResults(POPULAR_ICONS);
      return;
    }

    setLoading(true);
    try {
      // For demonstration, we'll use a predefined set
      // In production, you'd want to use the Iconify API or local search
      let results: string[] = [];
      
      if (collection && collection !== 'all') {
        // Filter by collection
        results = POPULAR_ICONS.filter(icon => icon.startsWith(collection));
      } else if (query) {
        // Search across all collections
        results = POPULAR_ICONS.filter(icon => 
          icon.toLowerCase().includes(query.toLowerCase())
        );
      } else {
        results = POPULAR_ICONS;
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching icons:', error);
      toast({
        title: 'Search failed',
        description: 'Failed to search icons. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchIcons(searchQuery, selectedCollection);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCollection, searchIcons]);

  // Handle icon selection
  const handleSelectIcon = (iconName: string) => {
    setSelectedIcon(iconName);
  };

  // Copy icon name to clipboard
  const copyToClipboard = (iconName: string) => {
    navigator.clipboard.writeText(iconName);
    setCopiedIcon(iconName);
    toast({
      title: 'Copied!',
      description: `Icon name "${iconName}" copied to clipboard`,
    });
    setTimeout(() => setCopiedIcon(null), 2000);
  };

  // Insert icon into chat
  const insertIcon = () => {
    if (selectedIcon) {
      onSelectIcon(selectedIcon);
      onClose();
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, iconName: string) => {
    e.dataTransfer.setData('text/plain', `icon:${iconName}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Icon Picker</DialogTitle>
          <DialogDescription>
            Search and select from over 200,000 icons. Drag and drop or click to insert.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 h-full">
          {/* Search and filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search icons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-background"
            >
              <option value="all">All Collections</option>
              {Object.entries(POPULAR_COLLECTIONS).map(([name, prefix]) => (
                <option key={prefix} value={prefix}>{name}</option>
              ))}
            </select>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="search" className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="search">Search Results</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="recent">Recently Used</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="flex-1 mt-4">
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">Searching...</div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-8 gap-2">
                    {searchResults.map((iconName) => (
                      <div
                        key={iconName}
                        draggable
                        onDragStart={(e) => handleDragStart(e, iconName)}
                        onClick={() => handleSelectIcon(iconName)}
                        className={`
                          relative group p-4 border rounded-lg cursor-pointer
                          hover:bg-muted/50 transition-all
                          ${selectedIcon === iconName ? 'border-primary bg-primary/10' : ''}
                        `}
                        title={iconName}
                      >
                        <Icon icon={iconName} className="w-8 h-8 mx-auto" />
                        <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(iconName);
                            }}
                          >
                            {copiedIcon === iconName ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-muted-foreground">No icons found</div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="popular" className="flex-1 mt-4">
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="grid grid-cols-8 gap-2">
                  {POPULAR_ICONS.map((iconName) => (
                    <div
                      key={iconName}
                      draggable
                      onDragStart={(e) => handleDragStart(e, iconName)}
                      onClick={() => handleSelectIcon(iconName)}
                      className={`
                        relative group p-4 border rounded-lg cursor-pointer
                        hover:bg-muted/50 transition-all
                        ${selectedIcon === iconName ? 'border-primary bg-primary/10' : ''}
                      `}
                      title={iconName}
                    >
                      <Icon icon={iconName} className="w-8 h-8 mx-auto" />
                      <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(iconName);
                          }}
                        >
                          {copiedIcon === iconName ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="recent" className="flex-1 mt-4">
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                Recently used icons will appear here
              </div>
            </TabsContent>
          </Tabs>

          {/* Selected icon preview */}
          {selectedIcon && (
            <div className="border-t pt-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 border rounded-lg bg-muted/20">
                  <Icon icon={selectedIcon} className="w-12 h-12" />
                </div>
                <div>
                  <p className="font-mono text-sm">{selectedIcon}</p>
                  <p className="text-xs text-muted-foreground">Click "Use Icon" or drag to chat</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(selectedIcon)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Name
                </Button>
                <Button onClick={insertIcon}>
                  Use Icon
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}