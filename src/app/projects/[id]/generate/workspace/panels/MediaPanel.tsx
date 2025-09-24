// src/app/projects/[id]/generate/workspace/panels/MediaPanel.tsx
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Upload, MoreVertical, Edit, Trash2, Loader2, Search } from "lucide-react";
import { Icon } from '@iconify/react';
import { IconSearchGrid } from "~/components/IconSearchGrid";

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
  onInsertToChat?: (url: string, name?: string) => void;
  defaultTab?: 'uploads' | 'icons'; // For auto-opening to specific tab
};

type FilterType = 'all'|'images'|'videos'|'audio'|'logos';

export default function MediaPanel({ projectId, onInsertToChat, defaultTab = 'uploads' }: MediaPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState("");
  // Always show user uploads (all projects) by default
  const userQuery = api.project.getUserUploads.useQuery();
  const data = userQuery.data as any;
  const isLoading = userQuery.isLoading;
  const refetch = userQuery.refetch;
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [loadingAssetId, setLoadingAssetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameMutation = api.project.renameAsset.useMutation();
  const deleteMutation = api.project.softDeleteAsset.useMutation();

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };
    
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const assets = useMemo(() => {
    const list = data?.assets || [];
    
    // First apply type filter
    let filtered = list;
    if (filter === 'all') filtered = list;
    else if (filter === 'images') filtered = list.filter((a: any) => a.type === 'image' || a.type === 'logo');
    else if (filter === 'videos') filtered = list.filter((a: any) => a.type === 'video');
    else if (filter === 'audio') filtered = list.filter((a: any) => a.type === 'audio');
    else if (filter === 'logos') filtered = list.filter((a: any) => a.type === 'logo');
    
    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((asset: any) => {
        // Search in custom name
        if (asset.customName?.toLowerCase().includes(query)) return true;
        // Search in original name
        if (asset.originalName?.toLowerCase().includes(query)) return true;
        // Search in tags
        if (asset.tags?.some((tag: string) => tag.toLowerCase().includes(query))) return true;
        // Search in type
        if (asset.type?.toLowerCase().includes(query)) return true;
        return false;
      });
    }
    
    return filtered;
  }, [data, filter, searchQuery]);

  const handleDragStart = useCallback((e: React.DragEvent, url: string, asset: any) => {
    e.dataTransfer.setData('text/plain', url);
    e.dataTransfer.setData('media/name', asset.customName || asset.originalName || '');
    if (asset?.id) {
      const payload = JSON.stringify({ id: asset.id, url, type: asset.type });
      e.dataTransfer.setData('application/bazaar-asset', payload);
      e.dataTransfer.setData('asset/id', asset.id);
    }
  }, []);

  const linkAssetMutation = api.project.linkAssetToProject.useMutation();

  const handleClick = useCallback(async (url: string, asset: any) => {
    try {
      if (asset?.id && projectId) {
        await linkAssetMutation.mutateAsync({ projectId, assetId: asset.id });
      }
    } catch (error) {
      console.warn('[MediaPanel] Failed to link asset to project (continuing anyway):', error);
    }

    onInsertToChat?.(url, asset.customName || asset.originalName || '');
  }, [onInsertToChat, linkAssetMutation, projectId]);



  const handleRename = async (assetId: string, newName: string) => {
    if (!newName.trim()) return;
    
    setLoadingAssetId(assetId);
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
    } finally {
      setLoadingAssetId(null);
    }
  };

  const handleEditName = (assetId: string, currentName: string) => {
    setEditingId(assetId);
    setEditingName(currentName);
    setOpenMenuId(null);
  };

  const handleDelete = async (assetId: string) => {
    setLoadingAssetId(assetId);
    try {
      await deleteMutation.mutateAsync({ assetId });
      await refetch();
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error('Failed to delete file');
    } finally {
      setLoadingAssetId(null);
      setOpenMenuId(null);
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
            {/* Search field */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, tags or type..."
                  className="w-full pl-10 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-1 mt-2 px-3">
              {(['all', 'images', 'videos', 'audio', 'logos'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 px-3 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                    filter === f 
                      ? 'bg-black text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

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
                  <div className="border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg transition-colors duration-200 bg-gray-50 hover:bg-gray-100 flex items-center justify-center w-full h-37">
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
                    className={`group border rounded-lg overflow-hidden relative ${loadingAssetId === a.id ? 'opacity-50' : ''}`}
                  >
                    <div
                      className="cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => handleDragStart(e, a.url, a)}
                      onClick={() => { void handleClick(a.url, a); }}
                    >
                      {loadingAssetId === a.id ? (
                        <div className="w-full h-28 flex items-center justify-center bg-gray-50">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                        </div>
                      ) : a.type === 'image' || a.type === 'logo' ? (
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
                    
                                         {/* Three dots menu button */}
                     <div className="absolute top-1 right-1 opacity-50 hover:opacity-100 transition-opacity duration-200">
                       <button
                         className="w-6 h-6 bg-black/70 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer"
                         onClick={(e) => {
                           e.stopPropagation();
                           setOpenMenuId(openMenuId === a.id ? null : a.id);
                         }}
                         disabled={loadingAssetId === a.id}
                       >
                         <MoreVertical className="w-3 h-3" />
                       </button>
                       
                       {/* Dropdown menu */}
                       {openMenuId === a.id && (
                         <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-32">
                           <button
                             className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors duration-200"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleEditName(a.id, a.customName || a.originalName);
                             }}
                           >
                             <Edit className="w-3 h-3" />
                             Edit name
                           </button>
                                                       <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors duration-200 text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(a.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                         </div>
                       )}
                     </div>
                     <div className="p-2 text-xs text-gray-600">
                       {loadingAssetId === a.id ? (
                         <div className="flex items-center gap-2">
                           <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                           <span className="text-gray-400">Processing...</span>
                         </div>
                       ) : editingId === a.id ? (
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
          <IconSearchGrid onInsertToChat={onInsertToChat} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
