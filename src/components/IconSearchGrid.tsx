"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronsUpDown, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { useParams } from "next/navigation";
import { getIconSetAvailability, getIconSetBadge } from "~/lib/icons/icon-sets";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

// IconButton component to avoid code duplication
interface IconButtonProps {
  iconName: string;
  onClick: () => void;
}

function IconButton({ iconName, onClick }: IconButtonProps) {
  const [prefix, name] = iconName.split(':');
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
                     <button
             onClick={onClick}
             className="group rounded-2xl border p-1 hover:shadow-sm transition flex flex-col items-center gap-1 cursor-pointer w-full aspect-square"
           >
             <div className="w-full h-full grid place-items-center">
               <Icon icon={iconName} className="w-full h-full max-w-full max-h-full" />
             </div>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            <span className="font-medium">{name}</span>
            <span className="text-muted-foreground"> ({prefix})</span>
          </p>
          <p className="text-xs text-muted-foreground">Click to insert into chat</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function IconSearchGrid({ pageSize = 40, onInsertToChat }: { pageSize?: number, onInsertToChat?: (iconCode: string) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [collections, setCollections] = useState<Record<string, { name: string }>>({});
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [selectedPrefixes, setSelectedPrefixes] = useState<string[]>([]);
  const [openCollections, setOpenCollections] = useState(false);
  const [collectionsSearch, setCollectionsSearch] = useState("");
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);

  const [page, setPage] = useState(1);
  const [allIcons, setAllIcons] = useState<{ name: string; prefix: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreResults, setHasMoreResults] = useState(false);

  // Get project ID from URL params
  const params = useParams();
  const projectId = params?.id as string | undefined;

  // API mutation for tracking icon usage
  const trackIconUsage = api.icons.trackUsage.useMutation({
    onError: (error) => {
      console.error('Failed to track icon usage:', error);
    },
    onSuccess: () => {
      console.log('Icon usage tracked successfully');
    },
  });

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
      const updated = [iconName, ...prev.filter(i => i !== iconName)].slice(0, 16);
      localStorage.setItem('recentlyUsedIcons', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Insert icon into chat
  const insertIcon = useCallback((iconName: string) => {
    if (onInsertToChat) {
      // Insert icon reference in a special format that won't be confused with URLs
      const code = `[icon:${iconName}]`;
      onInsertToChat(code);
      console.log('Icon reference has been inserted into your message');
      addToRecentlyUsed(iconName);
      
      // Track icon insertion only if projectId is available
      if (projectId) {
        console.log('Tracking icon usage:', { projectId, iconName, action: 'inserted' });
        trackIconUsage.mutate({
          projectId,
          iconName,
          action: 'inserted',
          source: 'picker',
          metadata: {
            searchQuery: debouncedQuery || undefined,
            fromRecent: recentlyUsed.includes(iconName),
          },
        });
      } else {
        console.log('No projectId available, skipping icon usage tracking');
      }
    }
  }, [onInsertToChat, addToRecentlyUsed, trackIconUsage, projectId, debouncedQuery, recentlyUsed]);

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch collections on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchCollections() {
      try {
        // Iconify collections list (prefix -> {name})
        // https://api.iconify.design/collections
        const res = await fetch("https://api.iconify.design/collections");
        if (!res.ok) throw new Error(`Collections HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setCollections(data);
      } catch (e: any) {
        if (!cancelled) setCollectionsError(e?.message ?? "Could not fetch libraries");
      }
    }
    fetchCollections();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build filtered list of collection prefixes
  const collectionEntries = useMemo(() => Object.entries(collections), [collections]);
  const filteredCollectionEntries = useMemo(() => {
    const q = collectionsSearch.toLowerCase();
    if (!q) return collectionEntries;
    return collectionEntries.filter(([prefix, meta]) =>
      prefix.toLowerCase().includes(q) || meta.name.toLowerCase().includes(q)
    );
  }, [collectionEntries, collectionsSearch]);

  // Check if all available collections are selected
  const allCollectionsSelected = useMemo(() => {
    return filteredCollectionEntries.length > 0 && 
           filteredCollectionEntries.every(([prefix]) => selectedPrefixes.includes(prefix));
  }, [filteredCollectionEntries, selectedPrefixes]);

  // Check if all collections (not just filtered) are selected
  const allLibrariesSelected = useMemo(() => {
    return collectionEntries.length > 0 && 
           collectionEntries.every(([prefix]) => selectedPrefixes.includes(prefix));
  }, [collectionEntries, selectedPrefixes]);

  // Select all filtered collections
  const selectAllFiltered = useCallback(() => {
    const filteredPrefixes = filteredCollectionEntries.map(([prefix]) => prefix);
    setSelectedPrefixes(prev => {
      const newSelection = [...new Set([...prev, ...filteredPrefixes])];
      return newSelection;
    });
  }, [filteredCollectionEntries]);

  // Deselect all filtered collections
  const deselectAllFiltered = useCallback(() => {
    const filteredPrefixes = filteredCollectionEntries.map(([prefix]) => prefix);
    setSelectedPrefixes(prev => prev.filter(p => !filteredPrefixes.includes(p)));
  }, [filteredCollectionEntries]);

  // Remove individual prefix from selection
  const removePrefix = useCallback((prefixToRemove: string) => {
    setSelectedPrefixes(prev => prev.filter(p => p !== prefixToRemove));
  }, []);

  // Search API - fetch all results and paginate locally
  useEffect(() => {
    let cancelled = false;
    async function fetchSearch() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        
        // If no search query, show random icons instead
        if (debouncedQuery) {
          params.set("query", debouncedQuery);
        } else {
          // Show random icons when no search query
          params.set("query", "a");
        }
        
        // Fetch maximum results (200 is the limit for Iconify API)
        params.set("limit", "200");
        if (selectedPrefixes.length > 0) params.set("prefixes", selectedPrefixes.join(","));
        
        // Iconify v2 search endpoint
        // https://api.iconify.design/search?query=...&limit=...
        const url = `https://api.iconify.design/search?${params.toString()}`;
        console.log('Fetching:', url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
        const data = await res.json();
        console.log('Response:', { iconsCount: data.icons?.length || 0 });
        
        // Expected shape: { total: number, icons: Array<string> } (v2 API)
        if (!cancelled) {
          // Convert string array to {name, prefix} objects
          const list = (data.icons ?? []).map((iconName: string) => {
            const [prefix, name] = iconName.split(':');
            return { name, prefix };
          }).filter((d: any) => d.name && d.prefix);
          setAllIcons(list);
          
          // Check if there are more results than we can show on one page
          const hasMore = list.length > pageSize;
          setHasMoreResults(hasMore);
          
          // Reset to page 1 when search changes
          setPage(1);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Something went wrong with the search");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSearch();
    // re-run when query or selected libraries change (not page)
  }, [debouncedQuery, pageSize, selectedPrefixes]);

  // Calculate current page icons from all icons
  const currentPageIcons = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return allIcons.slice(startIndex, startIndex + pageSize);
  }, [allIcons, page, pageSize]);

  const canGoNext = hasMoreResults && page * pageSize < allIcons.length;
  const canGoPrevious = page > 1;

  const togglePrefix = (p: string) => {
    setSelectedPrefixes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  // State for showing more badges
  const [showAllBadges, setShowAllBadges] = useState(false);
  const maxVisibleBadges = 4;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
          <Input
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder="Search all icons..."
            className="pl-9"
          />
        </div>

        <Popover open={openCollections} onOpenChange={setOpenCollections}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[180px] justify-between">
              {allLibrariesSelected ? (
                <span className="truncate">
                  All libraries selected
                </span>
              ) : selectedPrefixes.length > 0 ? (
                <span className="truncate">
                  {selectedPrefixes.length} selected
                </span>
              ) : (
                <span className="truncate">Filter libraries</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-3" align="end">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search in libraries..."
                  value={collectionsSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCollectionsSearch(e.target.value)}
                  className="flex-1"
                />
              </div>
              
              {/* Select All / Deselect All buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllFiltered}
                  disabled={allCollectionsSelected}
                >
                  Select all
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={deselectAllFiltered}
                  disabled={selectedPrefixes.length === 0}
                >
                  Deselect all
                </Button>
              </div>

              {collectionsError ? (
                <p className="text-sm text-red-600">{collectionsError}</p>
              ) : (
                <ScrollArea className="h-[300px] pr-2">
                  <div className="grid grid-cols-2 gap-1">
                    {filteredCollectionEntries.map(([prefix, meta]) => {
                      const checked = selectedPrefixes.includes(prefix);
                      const availability = getIconSetAvailability(prefix);
                      const badge = getIconSetBadge(availability);
                      return (
                        <button
                          key={prefix}
                          onClick={() => togglePrefix(prefix)}
                          className={`flex items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-muted ${checked ? "bg-muted" : ""}`}
                          title={badge.tooltip}
                        >
                          <div className={`shrink-0 h-4 w-4 border rounded-sm flex items-center justify-center ${checked ? "bg-primary text-primary-foreground" : ""}`}>
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs opacity-70 truncate">{prefix}</span>
                              <span className={`text-[10px] px-1 py-0 rounded-full ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>
                            <div className="text-sm truncate">{meta.name}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </PopoverContent>
        </Popover>
             </div>

       {/* Selected prefixes badges under search field */}
       {selectedPrefixes.length > 0 && !allLibrariesSelected && (
         <div className="flex flex-wrap items-center gap-2">
           {selectedPrefixes
             .slice(0, showAllBadges ? undefined : maxVisibleBadges)
             .map((p) => {
               const availability = getIconSetAvailability(p);
               const badge = getIconSetBadge(availability);
               return (
                 <Badge 
                   key={p} 
                   variant="secondary" 
                   className="font-mono flex items-center gap-1 text-xs"
                   title={badge.tooltip}
                 >
                   <span className={`text-[10px] ${availability === 'local' ? 'text-green-600' : 'text-blue-600'}`}>
                     {availability === 'local' ? '✓' : '☁'}
                   </span>
                   {p}
                   <button
                     onClick={() => removePrefix(p)}
                     className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                     title="Remove from selection"
                   >
                     <X className="h-3 w-3" />
                   </button>
                 </Badge>
               );
             })}
           {selectedPrefixes.length > maxVisibleBadges && (
             <Button
               variant="ghost"
               size="sm"
               onClick={() => setShowAllBadges(!showAllBadges)}
               className="text-xs h-6 px-2"
             >
               {showAllBadges ? `Show less` : `Show ${selectedPrefixes.length - maxVisibleBadges} more`}
             </Button>
           )}
         </div>
       )}

        <div className="py-2">
          {/* Recently used section */}
          {recentlyUsed.length > 0 && !debouncedQuery && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">Recently used</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {recentlyUsed
                  .slice(0, 16)
                  .map((iconName) => (
                    <IconButton
                      key={iconName}
                      iconName={iconName}
                      onClick={() => insertIcon(iconName)}
                    />
                  ))}
              </div>
            </div>
          )}

            <div className="flex items-center justify-between mb-3">
             <div className="text-sm opacity-70">
               {loading ? "Loading…" : allIcons.length > 0 ? `Results` : "No results"}
             </div>
             <div className="flex items-center gap-2">
               {(canGoPrevious || canGoNext) && (
                 <>
                   <Button
                     variant="outline"
                     size="icon"
                     disabled={!canGoPrevious || loading}
                     onClick={() => setPage((p) => Math.max(1, p - 1))}
                     title="Previous page"
                   >
                     <ChevronLeft className="h-4 w-4" />
                   </Button>
                   <span className="text-sm tabular-nums">
                     {page}
                   </span>
                   <Button
                     variant="outline"
                     size="icon"
                     disabled={!canGoNext || loading}
                     onClick={() => setPage((p) => p + 1)}
                     title="Next page"
                   >
                     <ChevronRight className="h-4 w-4" />
                   </Button>
                 </>
               )}
             </div>
           </div>

          {error && (
            <div className="text-sm text-red-600 mb-3">{error}</div>
          )}

                     <AnimatePresence mode="popLayout">
             <motion.div
               key={`${debouncedQuery}-${selectedPrefixes.join(",")}-${page}`}
               initial={{ opacity: 0, y: 6 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -6 }}
               transition={{ duration: 0.2 }}
             >
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                 {currentPageIcons.map((it) => {
                   const full = `${it.prefix}:${it.name}`;
                   return (
                     <IconButton
                       key={full}
                       iconName={full}
                       onClick={() => insertIcon(full)}
                     />
                   );
                 })}
               </div>
             </motion.div>
           </AnimatePresence>
        </div>

      <div className="text-xs opacity-60">
        Data source: Iconify public API. Click an icon to insert it into chat.
      </div>
    </div>
  );
}
