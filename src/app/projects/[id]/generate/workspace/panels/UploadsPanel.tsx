// src/app/projects/[id]/generate/workspace/panels/UploadsPanel.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

type UploadsPanelProps = {
  projectId: string;
  onInsertToChat?: (url: string) => void;
};

export default function UploadsPanel({ projectId, onInsertToChat }: UploadsPanelProps) {
  const [filter, setFilter] = useState<'all'|'images'|'videos'|'audio'|'logos'>('all');
  const [scope, setScope] = useState<'project'|'user'>('project');
  const projectQuery = api.project.getUploads.useQuery({ projectId }, { enabled: scope === 'project' });
  const userQuery = api.project.getUserUploads.useQuery(undefined, { enabled: scope === 'user' });
  const data = scope === 'project' ? projectQuery.data : userQuery.data as any;
  const isLoading = scope === 'project' ? projectQuery.isLoading : userQuery.isLoading;
  const refetch = scope === 'project' ? projectQuery.refetch : userQuery.refetch;
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Periodic refresh to reflect new uploads made elsewhere
    const id = setInterval(() => { refetch(); }, 10000);
    return () => clearInterval(id);
  }, [refetch]);

  const assets = useMemo(() => {
    const list = data?.assets || [];
    if (filter === 'all') return list;
    if (filter === 'images') return list.filter((a: any) => a.type === 'image' || a.type === 'logo');
    if (filter === 'videos') return list.filter((a: any) => a.type === 'video');
    if (filter === 'audio') return list.filter((a: any) => a.type === 'audio');
    if (filter === 'logos') return list.filter((a: any) => a.type === 'logo');
    return list;
  }, [data, filter]);

  const handleDragStart = useCallback((e: React.DragEvent, url: string) => {
    e.dataTransfer.setData('text/plain', url);
  }, []);

  const handleClick = useCallback((url: string) => {
    onInsertToChat?.(url);
  }, [onInsertToChat]);

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '—';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.max(1, Math.round(kb))}KB`;
    const mb = kb / 1024;
    return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)}MB`;
  };

  const uploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        // Validate supported formats (videos)
        if (file.type.startsWith('video/')) {
          const allowedVideo = ['video/mp4', 'video/webm'];
          if (!allowedVideo.includes(file.type)) {
            toast.error('Unsupported video format', {
              description: 'Supported video formats: MP4, WebM (.mp4, .webm)'
            });
            continue;
          }
        }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('projectId', projectId);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());
      }
      await refetch();
    } catch (e) {
      console.error('[UploadsPanel] Upload failed:', e);
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    void uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    void uploadFiles(files);
  };

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
      <div className="px-3 pt-2">
        <div className="inline-flex items-center gap-2 text-xs text-gray-600">
          <label className="inline-flex items-center gap-1">
            <input type="radio" name="scope" value="project" checked={scope==='project'} onChange={() => setScope('project')} /> Project
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="radio" name="scope" value="user" checked={scope==='user'} onChange={() => setScope('user')} /> All my projects
          </label>
        </div>
      </div>

      {/* Upload controls */}
      <div
        className={`m-3 rounded-lg border ${isDragging ? 'border-blue-400 bg-blue-50/40' : 'border-dashed border-gray-300'} p-4 text-sm text-gray-600 flex items-center justify-between`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <div>
          {isUploading ? 'Uploading…' : isDragging ? 'Drop files to upload' : 'Drag & drop files here, or'}
        </div>
        <div>
          <button className="px-3 py-1 border rounded-md" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>Upload</button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/mp4,video/webm,audio/*" className="hidden" onChange={onFileSelect} />
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 text-gray-500">Loading…</div>
      ) : (
        <div className="p-3 grid grid-cols-2 gap-3 overflow-auto">
          {assets.map((a: any) => (
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
                <span>{formatSize(a.fileSize)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
