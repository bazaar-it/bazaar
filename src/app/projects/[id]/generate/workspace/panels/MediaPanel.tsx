// src/app/projects/[id]/generate/workspace/panels/MediaPanel.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Upload } from "lucide-react";
import { Icon } from '@iconify/react';
import { IconPickerPanel } from "~/components/IconPickerPanel";

// Animated audio wave component
const AudioWaveAnimation = () => {
  const baseHeights = [12, 20, 28, 24, 16, 32, 22, 14, 26]; // Base heights for bars
  
  return (
    <>
      <style>{`
        @keyframes audioFlow {
          0% { transform: scaleY(0.4); }
          25% { transform: scaleY(1.2); }
          50% { transform: scaleY(0.7); }
          75% { transform: scaleY(1); }
          100% { transform: scaleY(0.4); }
        }
        .audio-bar {
          animation: audioFlow 2s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>
      <div className="flex items-end justify-center gap-0.5 h-8">
        {baseHeights.map((height, i) => (
          <div
            key={i}
            className="w-1 bg-gray-500 rounded-sm audio-bar"
            style={{
              height: `${height}px`,
              animationDelay: `${i * 0.12}s`
            }}
          />
        ))}
      </div>
    </>
  );
};

type MediaPanelProps = {
  projectId: string;
  onInsertToChat?: (url: string) => void;
  defaultTab?: 'uploads' | 'icons'; // For auto-opening to specific tab
};

export default function MediaPanel({ projectId, onInsertToChat, defaultTab = 'uploads' }: MediaPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [filter, setFilter] = useState<'all'|'images'|'videos'|'audio'|'logos'>('all');
  // Always show user uploads (all projects) by default
  const userQuery = api.project.getUserUploads.useQuery();
  const data = userQuery.data as any;
  const isLoading = userQuery.isLoading;
  const refetch = userQuery.refetch;
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
          <TabsTrigger value="icons" className="flex items-center gap-2">
            <Icon icon="tdesign:icon" className="w-4 h-4" />
            Icons
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="uploads" className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=inactive]:hidden">
          <div 
            className={`flex-1 flex flex-col overflow-hidden relative ${isDragging ? 'bg-blue-50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => {
              // Only hide drag state if leaving the entire uploads area
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsDragging(false);
              }
            }}
            onDrop={onDrop}
          >
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-blue-50/80 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center">
                <div className="text-blue-600 text-lg font-medium">Drop files to upload</div>
              </div>
            )}

            {/* Scrollable content area */}
            {isLoading ? (
              <div className="p-4 text-gray-500">Loading…</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Upload button as first item in grid */}
                  <div className="border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg transition-colors duration-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center text-gray-600 gap-2">
                      {!isUploading ? (
                        <>
                          <button
                            className="px-4 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-medium rounded-full transition-colors duration-200"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Upload
                          </button>
                          <div className="text-xs text-center px-2 leading-tight">
                            <div>or drop images, video</div>
                            <div>or audio here</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6" />
                          <span className="text-xs font-medium">Uploading…</span>
                        </>
                      )}
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,video/mp4,video/webm,audio/*" className="hidden" onChange={onFileSelect} />
                  
                  {/* Existing files */}
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
                      ) : a.type === 'audio' ? (
                        <div className="w-full h-28 flex flex-col items-center justify-center text-sm text-gray-600 bg-gray-50 gap-2">
                          <AudioWaveAnimation />
                          <span className="text-xs text-center px-2">Audio</span>
                        </div>
                      ) : (
                        <div className="w-full h-28 flex items-center justify-center text-sm text-gray-600 bg-gray-50">File</div>
                      )}
                    </div>
                    <div className="p-2 text-xs text-gray-600">
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
                          className="w-full px-1 border rounded outline-none focus:ring-1 focus:ring-orange-400"
                          autoFocus
                        />
                      ) : (
                        <span 
                          className="block truncate cursor-text hover:text-gray-900" 
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
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="icons" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
          <IconPickerPanel onInsertToChat={onInsertToChat} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
