'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { Search, Copy, Check, Info, Palette, Grid3x3 } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { api } from '~/trpc/react';
import { useParams } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';

// Popular icon libraries with their prefixes
const ICON_LIBRARIES = [
  { name: 'All Libraries', prefix: 'all', count: '200,000+' },
  { name: 'Material Design', prefix: 'mdi', count: '7,000+' },
  { name: 'Font Awesome', prefix: 'fa6-solid', count: '2,000+' },
  { name: 'Heroicons', prefix: 'heroicons', count: '300+' },
  { name: 'Tabler', prefix: 'tabler', count: '3,200+' },
  { name: 'Lucide/Feather', prefix: 'lucide', count: '1,000+' },
  { name: 'Bootstrap', prefix: 'bi', count: '1,800+' },
  { name: 'Simple Icons', prefix: 'simple-icons', count: '2,400+' },
  { name: 'Logos', prefix: 'logos', count: '1,500+' },
  { name: 'Material Symbols', prefix: 'material-symbols', count: '3,000+' },
  { name: 'Fluent', prefix: 'fluent', count: '12,000+' },
  { name: 'Phosphor', prefix: 'ph', count: '7,000+' },
  { name: 'Remix', prefix: 'ri', count: '2,800+' },
  { name: 'Carbon', prefix: 'carbon', count: '2,000+' },
  { name: 'Ant Design', prefix: 'ant-design', count: '800+' },
];



// Popular Lucide icons for clean, modern interfaces
const POPULAR_ICONS = [
  // Essential UI icons
  'lucide:home', 'lucide:menu', 'lucide:search', 'lucide:settings', 'lucide:user',
  'lucide:bell', 'lucide:heart', 'lucide:star', 'lucide:bookmark', 'lucide:share',
  'lucide:more-horizontal', 'lucide:more-vertical', 'lucide:x', 'lucide:plus',
  'lucide:minus', 'lucide:check', 'lucide:chevron-right', 'lucide:chevron-left',
  'lucide:chevron-up', 'lucide:chevron-down', 'lucide:arrow-right', 'lucide:arrow-left',
  'lucide:arrow-up', 'lucide:arrow-down', 'lucide:external-link', 'lucide:link',
  
  // Media & Content
  'lucide:play', 'lucide:pause', 'lucide:stop', 'lucide:skip-forward',
  'lucide:skip-back', 'lucide:volume-2', 'lucide:volume-x', 'lucide:camera',
  'lucide:video', 'lucide:image', 'lucide:file', 'lucide:folder',
  'lucide:download', 'lucide:upload', 'lucide:edit', 'lucide:trash-2',
  
  // Communication
  'lucide:message-circle', 'lucide:message-square', 'lucide:mail',
  'lucide:phone', 'lucide:phone-call', 'lucide:video-off', 'lucide:mic',
  'lucide:mic-off', 'lucide:send', 'lucide:inbox', 'lucide:reply',
  
  // Business & Finance
  'lucide:shopping-cart', 'lucide:shopping-bag', 'lucide:credit-card',
  'lucide:dollar-sign', 'lucide:trending-up', 'lucide:trending-down',
  'lucide:bar-chart', 'lucide:pie-chart', 'lucide:activity', 'lucide:target',
  
  // Technology
  'lucide:smartphone', 'lucide:laptop', 'lucide:monitor', 'lucide:tablet',
  'lucide:wifi', 'lucide:wifi-off', 'lucide:bluetooth', 'lucide:battery',
  'lucide:zap', 'lucide:cpu', 'lucide:hard-drive', 'lucide:server',
  
  // Tools & Actions
  'lucide:save', 'lucide:copy', 'lucide:scissors', 'lucide:refresh-cw',
  'lucide:rotate-ccw', 'lucide:undo', 'lucide:redo', 'lucide:maximize',
  'lucide:minimize', 'lucide:filter', 'lucide:sort-asc', 'lucide:sort-desc',
  
  // Status & Alerts
  'lucide:check-circle', 'lucide:x-circle', 'lucide:alert-circle',
  'lucide:alert-triangle', 'lucide:info', 'lucide:help-circle',
  'lucide:shield', 'lucide:lock', 'lucide:unlock', 'lucide:eye',
  'lucide:eye-off', 'lucide:thumbs-up', 'lucide:thumbs-down',
  
  // Navigation & Layout
  'lucide:map-pin', 'lucide:compass', 'lucide:navigation', 'lucide:move',
  'lucide:grid', 'lucide:layout', 'lucide:sidebar', 'lucide:panel-left',
  'lucide:panel-right', 'lucide:columns', 'lucide:rows', 'lucide:square',
  'lucide:circle', 'lucide:triangle', 'lucide:hexagon',
  
  // Time & Calendar
  'lucide:clock', 'lucide:calendar', 'lucide:calendar-days', 'lucide:timer',
  'lucide:stopwatch', 'lucide:alarm-clock', 'lucide:history', 'lucide:fast-forward',
  'lucide:rewind', 'lucide:pause-circle', 'lucide:play-circle',
];

interface IconPickerPanelProps {
  onInsertToChat?: (iconCode: string) => void;
}

export function IconPickerPanel({ onInsertToChat }: IconPickerPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Get project ID from URL params
  const params = useParams();
  const projectId = params?.id as string | undefined;
  
  // API mutation for tracking icon usage
  const trackIconUsage = api.icons.trackUsage.useMutation();
  
  // Real icon search API
  const { data: searchResults, isLoading } = api.icons.searchIcons.useQuery(
    {
      query: debouncedSearch,
      collection: selectedCollection,
      limit: 120,
    },
    {
      enabled: true, // Always search, even with empty query (shows popular)
    }
  );
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load recently used icons from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentlyUsedIcons');
    if (stored) {
      setRecentlyUsed(JSON.parse(stored));
    }
  }, []);

  // Save icon to recently used
  const addToRecentlyUsed = useCallback((iconName: string) => {
    setRecentlyUsed(prev => {
      const updated = [iconName, ...prev.filter(i => i !== iconName)].slice(0, 20);
      localStorage.setItem('recentlyUsedIcons', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Handle icon selection
  const handleSelectIcon = useCallback((iconName: string) => {
    setSelectedIcon(iconName);
    addToRecentlyUsed(iconName);
    
    // Track icon selection
    trackIconUsage.mutate({
      projectId,
      iconName,
      action: 'selected',
      source: 'picker',
      metadata: {
        searchQuery: searchQuery || undefined,
        fromRecent: recentlyUsed.includes(iconName),
      },
    });
  }, [addToRecentlyUsed, trackIconUsage, projectId, searchQuery, recentlyUsed]);

  // Copy icon code to clipboard
  const copyToClipboard = useCallback((iconName: string) => {
    // Copy the actual Remotion code for the icon
    const code = `<window.IconifyIcon icon="${iconName}" style={{fontSize: "24px"}} />`;
    navigator.clipboard.writeText(code);
    setCopiedIcon(iconName);
    console.log('Icon code copied to clipboard');
    setTimeout(() => setCopiedIcon(null), 2000);
    addToRecentlyUsed(iconName);
    
    // Track icon copy
    trackIconUsage.mutate({
      projectId,
      iconName,
      action: 'copied',
      source: 'picker',
      metadata: {
        searchQuery: searchQuery || undefined,
        fromRecent: recentlyUsed.includes(iconName),
      },
    });
  }, [addToRecentlyUsed, trackIconUsage, projectId, searchQuery, recentlyUsed]);

  // Insert icon into chat
  const insertIcon = useCallback((iconName: string) => {
    if (onInsertToChat) {
      // Insert icon reference in a special format that won't be confused with URLs
      const code = `[icon:${iconName}]`;
      onInsertToChat(code);
      console.log('Icon reference has been inserted into your message');
      addToRecentlyUsed(iconName);
      
      // Track icon insertion
      trackIconUsage.mutate({
        projectId,
        iconName,
        action: 'inserted',
        source: 'picker',
        metadata: {
          searchQuery: searchQuery || undefined,
          fromRecent: recentlyUsed.includes(iconName),
        },
      });
    }
  }, [onInsertToChat, addToRecentlyUsed, trackIconUsage, projectId, searchQuery, recentlyUsed]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, iconName: string) => {
    const code = `[icon:${iconName}]`;
    e.dataTransfer.setData('text/plain', code);
    e.dataTransfer.effectAllowed = 'copy';
    addToRecentlyUsed(iconName);
    
    // Track drag & drop usage
    trackIconUsage.mutate({
      projectId,
      iconName,
      action: 'inserted',
      source: 'picker',
      metadata: {
        searchQuery: searchQuery || undefined,
        fromRecent: recentlyUsed.includes(iconName),
        dragDrop: true,
      },
    });
  }, [addToRecentlyUsed, trackIconUsage, projectId, searchQuery, recentlyUsed]);

  // Use real search results or fallback to popular icons
  const displayIcons = searchResults?.icons || POPULAR_ICONS.slice(0, 120);

  return (
    <div className="h-full flex flex-col">
      {/* Header with search */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search icons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

        </div>

        {/* Library filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Library:</span>
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            className="flex-1 px-2 py-1 border rounded text-xs bg-background"
          >
            {ICON_LIBRARIES.map(col => (
              <option key={col.prefix} value={col.prefix}>
                {col.name} ({col.count})
              </option>
            ))}
          </select>
        </div>


      </div>

      {/* Icons grid */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {/* Recently used section */}
          {recentlyUsed.length > 0 && !searchQuery && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">RECENTLY USED</h3>
              <div className="grid grid-cols-8 gap-1">
                {recentlyUsed.slice(0, 24).map((iconName) => (
                  <IconButton
                    key={iconName}
                    iconName={iconName}
                    isSelected={selectedIcon === iconName}
                    isCopied={copiedIcon === iconName}
                    onSelect={handleSelectIcon}
                    onCopy={copyToClipboard}
                    onInsert={insertIcon}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main icons grid */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">
              {searchQuery ? `SEARCH RESULTS${searchResults?.total ? ` (${searchResults.total}+)` : ''}` : 'POPULAR ICONS'}
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground text-sm">Searching 200,000+ icons...</div>
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-1">
                {displayIcons.length > 0 ? (
                  displayIcons.map((iconName) => (
                    <IconButton
                      key={iconName}
                      iconName={iconName}
                      isSelected={selectedIcon === iconName}
                      isCopied={copiedIcon === iconName}
                      onSelect={handleSelectIcon}
                      onCopy={copyToClipboard}
                      onInsert={insertIcon}
                      onDragStart={handleDragStart}
                    />
                  ))
                ) : (
                  <div className="col-span-8 text-center py-8 text-muted-foreground text-sm">
                    No icons found. Try a different search or library.
                  </div>
                )}
              </div>
            )}
            
            {searchResults?.hasMore && (
              <div className="mt-4 text-center text-xs text-muted-foreground">
                Showing first {displayIcons.length} results. Refine your search for better results.
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer with selected icon */}
      {selectedIcon && (
        <div className="p-3 border-t bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 border rounded bg-background">
                <Icon icon={selectedIcon} className="w-6 h-6" />
              </div>
              <div>
                <p className="font-mono text-xs">{selectedIcon}</p>
                <p className="text-xs text-muted-foreground">Click insert or drag to chat</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(selectedIcon)}
                className="h-7 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button
                size="sm"
                onClick={() => insertIcon(selectedIcon)}
                className="h-7 text-xs"
              >
                Insert
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual icon button component
interface IconButtonProps {
  iconName: string;
  isSelected: boolean;
  isCopied: boolean;
  onSelect: (iconName: string) => void;
  onCopy: (iconName: string) => void;
  onInsert: (iconName: string) => void;
  onDragStart: (e: React.DragEvent, iconName: string) => void;
}

function IconButton({
  iconName,
  isSelected,
  isCopied,
  onSelect,
  onCopy,
  onInsert,
  onDragStart,
}: IconButtonProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, iconName)}
      onClick={() => onInsert(iconName)} // Click to insert directly
      onContextMenu={(e) => {
        e.preventDefault();
        onCopy(iconName); // Right-click to copy
      }}
      className={`
        relative group p-3 border rounded cursor-pointer transition-all
        hover:bg-muted/50 hover:border-foreground/20 hover:scale-110
        ${isSelected ? 'border-primary bg-primary/10' : ''}
        ${isCopied ? 'ring-2 ring-green-500' : ''}
      `}
      title={`${iconName}\nClick to insert • Right-click to copy`}
    >
      <Icon 
        icon={iconName} 
        className="w-5 h-5 mx-auto"
      />
    </div>
  );
}