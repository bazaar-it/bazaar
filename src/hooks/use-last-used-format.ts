"use client";

import { useState, useEffect, useCallback } from "react";
import { type VideoFormat } from "~/lib/types/video/remotion-constants";
import { api } from "~/trpc/react";

const STORAGE_KEY = 'bazaar-last-format';

export function useLastUsedFormat() {
  const [lastFormat, setLastFormat] = useState<VideoFormat>('landscape');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Query recent projects to infer format if localStorage is empty
  const { data: recentProjects } = api.project.list.useQuery(undefined, {
    enabled: !isLoaded, // Only query if we haven't loaded from localStorage yet
  });

  useEffect(() => {
    // Try to load from localStorage first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['landscape', 'portrait', 'square'].includes(stored)) {
        setLastFormat(stored as VideoFormat);
        setIsLoaded(true);
        return;
      }
    } catch (error) {
      console.warn('Failed to read format preference from localStorage:', error);
    }

    // If no localStorage value, try to infer from most recent project
    if (recentProjects && recentProjects.length > 0) {
      const mostRecent = recentProjects[0];
      if (mostRecent?.props?.meta?.format) {
        const format = mostRecent.props.meta.format;
        if (['landscape', 'portrait', 'square'].includes(format)) {
          setLastFormat(format as VideoFormat);
          // Save to localStorage for next time
          try {
            localStorage.setItem(STORAGE_KEY, format);
          } catch (error) {
            console.warn('Failed to save format preference to localStorage:', error);
          }
        }
      }
    }
    
    setIsLoaded(true);
  }, [recentProjects]);

  const updateLastFormat = useCallback((format: VideoFormat) => {
    setLastFormat(format);
    try {
      localStorage.setItem(STORAGE_KEY, format);
    } catch (error) {
      console.warn('Failed to save format preference to localStorage:', error);
    }
  }, []);

  return {
    lastFormat,
    updateLastFormat,
    isLoaded,
  };
} 