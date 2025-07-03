"use client";

import { useState } from "react";
import { format } from "date-fns";
import ShareVideoPlayerClient from "./ShareVideoPlayerClient";
import ShareButtons from "./SharePageClient";
import { LoopToggle } from "~/components/ui/LoopToggle";
import type { InputProps } from "~/lib/types/video/input-props";

interface SharePageContentProps {
  inputProps: InputProps;
  project: {
    title: string;
  };
  creator: {
    name: string | null;
  } | null;
  viewCount: number;
  createdAt: Date;
  shareUrl: string;
}

export default function SharePageContent({
  inputProps,
  project,
  creator,
  viewCount,
  createdAt,
  shareUrl,
}: SharePageContentProps) {
  const [isLooping, setIsLooping] = useState(true); // Default to looping

  return (
    <div className="w-full max-w-4xl rounded-xl bg-white dark:bg-black/80 shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
      <div className="p-6 md:p-8">
        <ShareVideoPlayerClient 
          inputProps={inputProps} 
          isLooping={isLooping}
          setIsLooping={setIsLooping}
        />
      </div>
      <div className="bg-gray-50/50 dark:bg-black/30 px-6 py-4 md:px-8 md:py-6 border-t border-gray-200 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
              <span>By {creator?.name ?? 'Anonymous'}</span>
              <span>{format(new Date(createdAt), 'MMMM d, yyyy')}</span>
              <span>{inputProps.scenes.length} {inputProps.scenes.length === 1 ? 'scene' : 'scenes'}</span>
              <span>{viewCount ?? 0} {viewCount === 1 ? 'view' : 'views'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LoopToggle 
              isLooping={isLooping} 
              onToggle={setIsLooping}
            />
            <ShareButtons
              shareUrl={shareUrl}
              shareTitle={project.title}
              shareDescription={`Check out this video I made with Bazaar: "${project.title}"`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}