/**
 * Enhanced Uploads Panel with Renaming & Better Reference Support
 */

"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Edit2, Check, X, Upload, Image, Video, Music, Hash } from "lucide-react";

type UploadsPanelProps = {
  projectId: string;
  onInsertToChat?: (url: string, name?: string) => void;
};

interface MediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'logo' | 'youtube';
  originalName?: string;
  customName?: string;
  fileSize?: number;
  tags?: string[];
  uploadedAt?: Date;
}

export default function EnhancedUploadsPanel({ projectId, onInsertToChat }: UploadsPanelProps) {
  const [filter, setFilter] = useState<'all'|'images'|'videos'|'audio'|'logos'>('all');
  const [scope, setScope] = useState<'project'|'user'>('project');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Queries
  const projectQuery = api.project.getUploads.useQuery({ projectId }, { enabled: scope === 'project' });
  const userQuery = api.project.getUserUploads.useQuery(undefined, { enabled: scope === 'user' });
  const renameMutation = api.media.renameAsset.useMutation();
  
  const data = scope === 'project' ? projectQuery.data : userQuery.data as any;
  const isLoading = scope === 'project' ? projectQuery.isLoading : userQuery.isLoading;
  const refetch = scope === 'project' ? projectQuery.refetch : userQuery.refetch;

  useEffect(() => {
    // Periodic refresh
    const id = setInterval(() => { refetch(); }, 10000);
    return () => clearInterval(id);
  }, [refetch]);

  const assets = useMemo(() => {
    const list = (data?.assets || []) as MediaAsset[];
    if (filter === 'all') return list;
    if (filter === 'images') return list.filter(a => a.type === 'image' || a.type === 'logo');
    if (filter === 'videos') return list.filter(a => a.type === 'video');
    if (filter === 'audio') return list.filter(a => a.type === 'audio');
    if (filter === 'logos') return list.filter(a => a.type === 'logo');
    return list;
  }, [data, filter]);

  const handleRename = async (assetId: string, newName: string) => {
    if (!newName.trim()) {
      setEditingId(null);
      return;
    }
    
    try {
      await renameMutation.mutateAsync({
        projectId,
        assetId,
        newName: newName.trim()
      });
      
      toast.success('Asset renamed', {
        description: `Now you can reference it as "${newName.trim()}"`
      });
      
      setEditingId(null);
      refetch();
    } catch (error) {
      toast.error('Failed to rename asset');
      console.error('[EnhancedUploadsPanel] Rename error:', error);
    }
  };

  const startEditing = (asset: MediaAsset) => {
    setEditingId(asset.id);
    setEditingName((asset as any).customName || asset.originalName || 'Untitled');
  };

  const handleDragStart = useCallback((e: React.DragEvent, asset: MediaAsset) => {
    e.dataTransfer.setData('text/plain', asset.url);
    e.dataTransfer.setData('media/name', (asset as any).customName || asset.originalName || '');
  }, []);

  const handleClick = useCallback((asset: MediaAsset) => {
    const name = (asset as any).customName || asset.originalName;
    onInsertToChat?.(asset.url, name);
    
    // Show helpful toast
    if (name) {
      toast.info('Media added to chat', {
        description: `You can reference this as "${name}"`
      });
    }
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
        const fd = new FormData();
        fd.append('file', file);
        fd.append('projectId', projectId);
        
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error(await res.text());
        
        // Show success with filename
        toast.success(`Uploaded: ${file.name}`, {
          description: 'Click to rename for easier reference'
        });
      }
      await refetch();
    } catch (e) {
      console.error('[UploadsPanel] Upload failed:', e);
      toast.error('Upload failed');
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

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image':
      case 'logo':
        return <Image className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  const getDisplayName = (asset: MediaAsset) => {
    return (asset as any).customName || asset.originalName || 'Untitled';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="font-medium">My Media Library</div>
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

      {/* Scope selector */}
      <div className="px-3 pt-2">
        <div className="inline-flex items-center gap-2 text-xs text-gray-600">
          <label className="inline-flex items-center gap-1">
            <input type="radio" name="scope" value="project" checked={scope==='project'} onChange={() => setScope('project')} />
            Project
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="radio" name="scope" value="user" checked={scope==='user'} onChange={() => setScope('user')} />
            All my projects
          </label>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className={`m-3 rounded-lg border-2 ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-300'} p-4 text-sm text-gray-600 flex items-center justify-between transition-colors`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          {isUploading ? 'Uploading…' : isDragging ? 'Drop files to upload' : 'Drag & drop files here'}
        </div>
        <button 
          className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors" 
          onClick={() => fileInputRef.current?.click()} 
          disabled={isUploading}
        >
          Browse
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={onFileSelect} />
      </div>

      {/* Assets grid */}
      {isLoading ? (
        <div className="p-4 text-gray-500 text-center">Loading media library…</div>
      ) : assets.length === 0 ? (
        <div className="p-8 text-gray-400 text-center">
          <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No media uploaded yet</p>
          <p className="text-xs mt-1">Upload images, videos, or audio to use in your scenes</p>
        </div>
      ) : (
        <div className="flex-1 p-3 overflow-auto">
          <div className="grid grid-cols-2 gap-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
                {/* Media preview */}
                <div
                  className="relative cursor-pointer"
                  onClick={() => handleClick(asset)}
                  title="Click to insert in chat"
                >
                  {asset.type === 'image' || asset.type === 'logo' ? (
                    <img src={asset.url} alt={getDisplayName(asset)} className="w-full h-28 object-cover" />
                  ) : asset.type === 'video' ? (
                    <video src={asset.url} className="w-full h-28 object-cover" muted />
                  ) : (
                    <div className="w-full h-28 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <Music className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Type badge */}
                  <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    {getAssetIcon(asset.type)}
                    <span className="capitalize">{asset.type}</span>
                  </div>
                </div>

                {/* Name & actions */}
                <div className="p-2">
                  {editingId === asset.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(asset.id, editingName);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 px-2 py-1 text-xs border rounded"
                        placeholder="Enter custom name"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(asset.id, editingName)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" title={getDisplayName(asset)}>
                          {getDisplayName(asset)}
                        </div>
                        {(asset as any).customName && asset.originalName && (
                          <div className="text-[10px] text-gray-400 truncate" title={asset.originalName}>
                            {asset.originalName}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => startEditing(asset)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Rename for easier reference"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  
                  {/* Size & tags */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{formatSize(asset.fileSize)}</span>
                    {asset.tags && asset.tags.length > 0 && (
                      <div className="flex gap-1">
                        {asset.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-600">
        <p>💡 <strong>Tip:</strong> Rename your uploads for easy reference.</p>
        <p className="mt-1">Example: Rename "IMG_2345.jpg" → "airbnb_kitchen"</p>
        <p className="mt-1">Then say: "Add the airbnb_kitchen image"</p>
      </div>
    </div>
  );
}