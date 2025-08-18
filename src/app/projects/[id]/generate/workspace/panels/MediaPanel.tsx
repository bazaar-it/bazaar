// src/app/projects/[id]/generate/workspace/panels/MediaPanel.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { AudioPanel } from "./AudioPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Upload, Music } from "lucide-react";

type MediaPanelProps = {
  projectId: string;
  onInsertToChat?: (url: string) => void;
  defaultTab?: 'uploads' | 'audio'; // For auto-opening to specific tab
};

export default function MediaPanel({ projectId, onInsertToChat, defaultTab = 'uploads' }: MediaPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [filter, setFilter] = useState<'all'|'images'|'videos'|'audio'|'logos'>('all');
  const [scope, setScope] = useState<'project'|'user'>('project');
  const projectQuery = api.project.getUploads.useQuery({ projectId }, { enabled: scope === 'project' });
  const userQuery = api.project.getUserUploads.useQuery(undefined, { enabled: scope === 'user' });
  const data = scope === 'project' ? projectQuery.data : userQuery.data as any;
  const isLoading = scope === 'project' ? projectQuery.isLoading : userQuery.isLoading;
  const refetch = scope === 'project' ? projectQuery.refetch : userQuery.refetch;
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameMutation = api.project.renameAsset.useMutation();

  // Update active tab if defaultTab changes (for auto-opening audio)
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

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

  const handleRename = async (assetId: string, newName: string) => {
    if (!newName.trim()) return;
    
    try {
      await renameMutation.mutateAsync({
        assetId,
        newName: newName.trim()
      });
      await refetch();
      toast.success('File renamed successfully');
    } catch (error) {
      console.error('Failed to rename asset:', error);
      toast.error('Failed to rename file');
    }
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
      console.error('[MediaPanel] Upload failed:', e);
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
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
          <TabsTrigger value="uploads" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Uploads
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            Audio
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="uploads" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b flex-shrink-0">
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
            <div className="px-3 pt-2 flex-shrink-0">
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
              className={`mx-3 mt-3 mb-2 rounded-lg border ${isDragging ? 'border-orange-400 bg-orange-50/40' : 'border-dashed border-gray-300'} p-4 text-sm text-gray-600 flex items-center justify-between flex-shrink-0`}
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

            {/* Scrollable content area */}
            {isLoading ? (
              <div className="p-4 text-gray-500">Loading…</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-3">
                  {assets.map((a: any) => (
                  <div
                    key={a.id}
                    className="group border rounded-lg overflow-hidden"
                  >
                    <div
                      className="cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => handleDragStart(e, a.url)}
                      onClick={() => handleClick(a.url)}
                    >
                      {a.type === 'image' || a.type === 'logo' ? (
                        <img src={a.url} alt={a.originalName} className="w-full h-28 object-cover" />
                      ) : a.type === 'video' ? (
                        <video src={a.url} className="w-full h-28 object-cover" muted />
                      ) : (
                        <div className="w-full h-28 flex items-center justify-center text-sm text-gray-600 bg-gray-50">Audio</div>
                      )}
                    </div>
                    <div className="p-2 text-xs text-gray-600 flex items-center justify-between">
                      {editingId === a.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => {
                            if (editingName !== (a.customName || a.originalName)) {
                              handleRename(a.id, editingName);
                            }
                            setEditingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingName !== (a.customName || a.originalName)) {
                                handleRename(a.id, editingName);
                              }
                              setEditingId(null);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          className="flex-1 px-1 border rounded outline-none focus:ring-1 focus:ring-orange-400"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="truncate max-w-[70%] cursor-text hover:text-gray-900" 
                          title="Click to rename"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(a.id);
                            setEditingName(a.customName || a.originalName);
                          }}
                        >
                          {a.customName || a.originalName}
                        </span>
                      )}
                      <span>{formatSize(a.fileSize)}</span>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="audio" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
          <AudioPanel projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
