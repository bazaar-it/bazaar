"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/cn";

interface IconsPanelGProps {
  projectId: string;
}

interface IconifyIcon {
  icon: string;
  prefix: string;
  name: string;
  tags?: string[];
  category?: string;
}

interface UploadedIcon {
  id: string;
  iconName: string;
  svgContent: string;
  prefix: string;
  name: string;
}

interface CachedIconData {
  icons: IconifyIcon[];
  svgCache: Record<string, string>;
  searchQuery: string;
  timestamp: number;
}

// Cache configuration
const CACHE_KEY = 'iconsPanelCache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Helper functions for localStorage caching
const saveToCache = (data: CachedIconData) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save icons cache to localStorage:', error);
  }
};

const loadFromCache = (): CachedIconData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedIconData = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Failed to load icons cache from localStorage:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

export function IconsPanelG({ projectId }: IconsPanelGProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [icons, setIcons] = useState<IconifyIcon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [svgCache, setSvgCache] = useState<Record<string, string>>({});
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const preloadSvgs = useCallback(async (iconList: IconifyIcon[]) => {
    const newCache: Record<string, string> = {};
    
    const promises = iconList.map(async (icon) => {
      try {
        const response = await fetch(`https://api.iconify.design/${icon.icon}.svg`);
        if (response.ok) {
          const svgContent = await response.text();
          newCache[icon.icon] = svgContent;
        }
      } catch (error) {
        console.error(`Failed to load SVG for ${icon.icon}:`, error);
      }
    });

    await Promise.all(promises);
    setSvgCache(prev => ({ ...prev, ...newCache }));
  }, []);

  const loadRandomIcons = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get a mix of popular icons from different icon sets
      const popularQueries = ['star', 'heart', 'home', 'user', 'music', 'play', 'arrow', 'check'];
      const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
      
      const response = await fetch(`https://api.iconify.design/search?query=${randomQuery}&limit=100`);
      if (!response.ok) throw new Error('Failed to fetch icons');
      
      const data = await response.json();
      const iconList: IconifyIcon[] = data.icons?.map((iconName: string) => {
        const [prefix, name] = iconName.split(':');
        return {
          icon: iconName,
          prefix,
          name,
        };
      }) || [];
      
      setIcons(iconList);
      // Pre-load SVGs for the first batch
      await preloadSvgs(iconList.slice(0, 12));
      
      // Save to cache after loading (with updated svgCache from preloadSvgs)
      setTimeout(() => {
        saveToCache({
          icons: iconList,
          svgCache: {},  // Will be updated by the cache save effect
          searchQuery: '',  // Random icons have no search query
          timestamp: Date.now()
        });
      }, 1000); // Small delay to allow SVGs to be cached
    } catch (error) {
      console.error('Failed to load random icons:', error);
      toast.error('Failed to load icons');
    } finally {
      setIsLoading(false);
    }
  }, [preloadSvgs]);

  const searchIcons = useCallback(async (query: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=200`);
      if (!response.ok) throw new Error('Failed to search icons');
      
      const data = await response.json();
      const iconList: IconifyIcon[] = data.icons?.map((iconName: string) => {
        const [prefix, name] = iconName.split(':');
        return {
          icon: iconName,
          prefix,
          name,
        };
      }) || [];
      
      setIcons(iconList);
      // Pre-load SVGs for the first batch
      await preloadSvgs(iconList.slice(0, 16));
      
      // Save search results to cache after loading
      setTimeout(() => {
        saveToCache({
          icons: iconList,
          svgCache: {},  // Will be updated by the cache save effect
          searchQuery: query,
          timestamp: Date.now()
        });
      }, 1000); // Small delay to allow SVGs to be cached
    } catch (error) {
      console.error('Failed to search icons:', error);
      toast.error('Failed to search icons');
    } finally {
      setIsLoading(false);
    }
  }, [preloadSvgs]);

  const loadSvgForIcon = useCallback(async (icon: IconifyIcon): Promise<string | null> => {
    if (svgCache[icon.icon]) return svgCache[icon.icon] || null;
    
    try {
      const response = await fetch(`https://api.iconify.design/${icon.icon}.svg`);
      if (!response.ok) throw new Error('Failed to fetch SVG');
      
      const svgContent = await response.text();
      setSvgCache(prev => ({ ...prev, [icon.icon]: svgContent }));
      return svgContent;
    } catch (error) {
      console.error(`Failed to load SVG for ${icon.icon}:`, error);
      return null;
    }
  }, [svgCache]);

  // Load from cache on initial render, fallback to random icons
  useEffect(() => {
    const cachedData = loadFromCache();
    if (cachedData) {
      console.log('[IconsPanelG] Loading from cache:', cachedData.icons.length, 'icons');
      setIcons(cachedData.icons);
      setSvgCache(cachedData.svgCache);
      setSearchQuery(cachedData.searchQuery);
      setHasSearched(!!cachedData.searchQuery);
    } else {
      console.log('[IconsPanelG] No cache found, loading random icons');
      loadRandomIcons();
    }
  }, [loadRandomIcons]);

  // Search debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      setHasSearched(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchIcons(searchQuery.trim());
      }, 500);
    } else if (hasSearched) {
      // If user clears search, show random icons again
      loadRandomIcons();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, hasSearched, searchIcons, loadRandomIcons]);

  // Save current state to cache whenever icons or svgCache changes
  useEffect(() => {
    if (icons.length > 0) {
      const currentCache = loadFromCache();
      // Only save if we have meaningful changes to avoid excessive localStorage writes
      if (!currentCache || 
          currentCache.icons.length !== icons.length || 
          Object.keys(currentCache.svgCache).length !== Object.keys(svgCache).length) {
        
        const cacheData: CachedIconData = {
          icons,
          svgCache,
          searchQuery,
          timestamp: Date.now()
        };
        
        saveToCache(cacheData);
        console.log('[IconsPanelG] Saved to cache:', icons.length, 'icons,', Object.keys(svgCache).length, 'SVGs');
      }
    }
  }, [icons, svgCache, searchQuery]);

  const handleIconDragStart = useCallback(async (e: React.DragEvent, icon: IconifyIcon) => {
    console.log('[IconsPanelG] Starting drag for icon:', icon.icon);
    
    // Load SVG if not cached
    let svgContent = svgCache[icon.icon];
    if (!svgContent) {
      const loadedSvg = await loadSvgForIcon(icon);
      if (loadedSvg) {
        svgContent = loadedSvg;
      }
    }
    
    if (svgContent) {
      // Create the icon data to transfer
      const iconData: UploadedIcon = {
        id: `icon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        iconName: icon.icon,
        svgContent,
        prefix: icon.prefix,
        name: icon.name,
      };
      
      e.dataTransfer.setData("application/icon", JSON.stringify(iconData));
      e.dataTransfer.effectAllowed = "copy";
      
      // Create a visual drag preview
      const dragPreview = document.createElement("div");
      dragPreview.className = "bg-white shadow-lg rounded-lg p-3 border border-blue-300 flex items-center gap-2";
      dragPreview.innerHTML = `
        <div class="w-6 h-6">${svgContent}</div>
        <span class="text-sm font-medium">Icon</span>
      `;
      dragPreview.style.position = "absolute";
      dragPreview.style.top = "-1000px";
      document.body.appendChild(dragPreview);
      
      try {
        e.dataTransfer.setDragImage(dragPreview, 50, 25);
      } catch (error) {
        console.warn("Custom drag preview not supported", error);
      }
      
      // Clean up the drag preview element
      setTimeout(() => {
        if (document.body.contains(dragPreview)) {
          document.body.removeChild(dragPreview);
        }
      }, 100);
    }
  }, [svgCache, loadSvgForIcon]);

  const handleIconClick = useCallback(async (icon: IconifyIcon) => {
    // For click, we can directly trigger the drag data creation and dispatch to chat
    console.log('[IconsPanelG] Icon clicked:', icon.icon);
    
    let svgContent = svgCache[icon.icon];
    if (!svgContent) {
      const loadedSvg = await loadSvgForIcon(icon);
      if (loadedSvg) {
        svgContent = loadedSvg;
      }
    }
    
    if (svgContent) {
      const iconData: UploadedIcon = {
        id: `icon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        iconName: icon.icon,
        svgContent,
        prefix: icon.prefix,
        name: icon.name,
      };
      
      // Dispatch custom event that chat panel can listen to
      window.dispatchEvent(new CustomEvent('iconSelected', { 
        detail: iconData 
      }));
      
      toast.success('Icon added to chat!');
    }
  }, [svgCache, loadSvgForIcon]);

  // Infinite scroll handler
  const handleScroll = useCallback(async () => {
    if (!gridRef.current || isLoading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = gridRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      // Load more icons if we have a search query
      if (searchQuery.trim() && icons.length < 500) {
        try {
          const response = await fetch(
            `https://api.iconify.design/search?query=${encodeURIComponent(searchQuery.trim())}&limit=100&start=${icons.length}`
          );
          if (response.ok) {
            const data = await response.json();
            const newIcons: IconifyIcon[] = data.icons?.map((iconName: string) => {
              const [prefix, name] = iconName.split(':');
              return { icon: iconName, prefix, name };
            }) || [];
            
            if (newIcons.length > 0) {
              setIcons(prev => [...prev, ...newIcons]);
              preloadSvgs(newIcons.slice(0, 12));
            }
          }
        } catch (error) {
          console.error('Failed to load more icons:', error);
        }
      }
    }
  }, [searchQuery, icons.length, isLoading, preloadSvgs]);

  useEffect(() => {
    const gridElement = gridRef.current;
    if (gridElement) {
      gridElement.addEventListener('scroll', handleScroll);
      return () => gridElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search icons (e.g., music, heart, arrow)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full"
          />
        </div>
        
        {searchQuery && (
          <p className="text-sm text-gray-500 mt-2">
            {isLoading ? 'Searching...' : `Found ${icons.length} icons`}
          </p>
        )}
      </div>

      {/* Icons Grid */}
      <div className="flex-1 overflow-auto" ref={gridRef}>
        {isLoading && icons.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading icons...</span>
          </div>
        ) : icons.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Search className="h-8 w-8 mb-2 opacity-50" />
            <p>No icons found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-4 gap-3">
              {icons.map((icon) => {
                const svgContent = svgCache[icon.icon];
                
                // Only render icons that have loaded SVG content
                if (!svgContent) {
                  return null;
                }
                
                return (
                  <div
                    key={icon.icon}
                    className={cn(
                      "aspect-square border border-gray-200 dark:border-gray-700 rounded-lg",
                      "hover:border-blue-300 hover:shadow-md transition-all duration-200",
                      "cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20",
                      "flex items-center justify-center group relative"
                    )}
                    draggable={true}
                    onDragStart={(e) => handleIconDragStart(e, icon)}
                    onClick={() => handleIconClick(icon)}
                    title={`${icon.prefix}:${icon.name}`}
                  >
                    <div 
                      className="w-full h-full text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors p-2"
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: svgContent.replace(
                          '<svg',
                          '<svg style="width: 100%; height: 100%; max-width: 100%; max-height: 100%;"'
                        )
                      }}
                    />
                  </div>
                );
              }).filter(Boolean)}
            </div>
            
            {/* Loading more indicator */}
            {isLoading && icons.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 