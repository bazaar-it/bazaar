// src/app/projects/[id]/generate/workspace/panels/UploadsPanel.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "~/trpc/react";

type UploadsPanelProps = {
  projectId: string;
  onInsertToChat?: (url: string) => void;
};

export default function UploadsPanel({ projectId, onInsertToChat }: UploadsPanelProps) {
  const [filter, setFilter] = useState<'all'|'images'|'videos'|'audio'|'logos'>('all');
  const { data, isLoading, refetch } = api.project.getUploads.useQuery({ projectId });

  useEffect(() => {
    // Periodic refresh to reflect new uploads made elsewhere
    const id = setInterval(() => { refetch(); }, 10000);
    return () => clearInterval(id);
  }, [refetch]);

  const assets = useMemo(() => {
    const list = data?.assets || [];
    if (filter === 'all') return list;
    if (filter === 'images') return list.filter(a => a.type === 'image' || a.type === 'logo');
    if (filter === 'videos') return list.filter(a => a.type === 'video');
    if (filter === 'audio') return list.filter(a => a.type === 'audio');
    if (filter === 'logos') return list.filter(a => a.type === 'logo');
    return list;
  }, [data, filter]);

  const handleDragStart = useCallback((e: React.DragEvent, url: string) => {
    e.dataTransfer.setData('text/plain', url);
  }, []);

  const handleClick = useCallback((url: string) => {
    onInsertToChat?.(url);
  }, [onInsertToChat]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="font-medium">My uploads</div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="all">All</option>
          <option value="images">Images</option>
          <option value="videos">Videos</option>
          <option value="audio">Audio</option>
          <option value="logos">Logos</option>
        </select>
      </div>

      {isLoading ? (
        <div className="p-4 text-gray-500">Loading…</div>
      ) : (
        <div className="p-3 grid grid-cols-2 gap-3 overflow-auto">
          {assets.map((a) => (
            <div
              key={a.id}
              className="group border rounded-lg overflow-hidden cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => handleDragStart(e, a.url)}
              onClick={() => handleClick(a.url)}
              title={a.originalName}
            >
              {a.type === 'image' || a.type === 'logo' ? (
                <img src={a.url} alt={a.originalName} className="w-full h-28 object-cover" />
              ) : a.type === 'video' ? (
                <video src={a.url} className="w-full h-28 object-cover" muted />
              ) : (
                <div className="w-full h-28 flex items-center justify-center text-sm text-gray-600 bg-gray-50">Audio</div>
              )}
              <div className="p-2 text-xs text-gray-600 flex items-center justify-between">
                <span className="truncate max-w-[70%]" title={a.originalName}>{a.originalName}</span>
                <span>{Math.round(a.fileSize/1024/1024)}MB</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
