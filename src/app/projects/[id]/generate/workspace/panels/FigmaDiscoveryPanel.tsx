'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { Loader2, Search, Palette, Layers, FileText, Square } from 'lucide-react';
import { toast } from 'sonner';

interface FigmaDiscoveryPanelProps {
  projectId: string;
}

interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  thumbnailUrl?: string;
  description?: string;
}

export default function FigmaDiscoveryPanel({ projectId }: FigmaDiscoveryPanelProps) {
  const [fileKey, setFileKey] = useState('');
  const [components, setComponents] = useState<FigmaComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  // Test Figma connection with PAT
  const testConnection = api.figma.checkConnection.useQuery(undefined, {
    retry: false,
    enabled: false // Don't auto-run
  });

  // Index file mutation
  const indexFile = api.figma.indexFile.useMutation({
    onSuccess: (data) => {
      console.log('Figma indexFile response:', data);
      if (data.components && data.components.length > 0) {
        setComponents(data.components);
        toast.success(`Found ${data.components.length} components!`);
      } else {
        toast.warning('No components found in this file');
        setComponents([]);
      }
      setLoading(false);
    },
    onError: (error) => {
      console.error('Figma indexFile error:', error);
      toast.error(error.message || 'Failed to fetch Figma file');
      setLoading(false);
    }
  });

  const handleSearch = async () => {
    if (!fileKey.trim()) {
      toast.error('Please enter a Figma file key');
      return;
    }

    // Clean the file key (remove any URL parts if user pastes full URL)
    let cleanKey = fileKey.trim();
    
    // Extract key from Figma URL if needed
    const urlMatch = cleanKey.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      cleanKey = urlMatch[1];
    }

    setLoading(true);
    setComponents([]);
    
    // First test connection
    console.log('Testing Figma connection...');
    try {
      const connectionResult = await testConnection.refetch();
      console.log('Connection test result:', connectionResult.data);
      
      if (!connectionResult.data?.connected) {
        toast.error('Figma connection failed. Check your PAT in .env.local');
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error('Failed to connect to Figma');
      setLoading(false);
      return;
    }

    // Now index the file
    console.log('Indexing Figma file:', cleanKey);
    indexFile.mutate({ fileKey: cleanKey });
  };

  const handleDragStart = (component: FigmaComponent) => {
    setDragging(component.id);
    
    // Create drag data for ChatPanelG
    const dragData = {
      type: 'figma-component',
      component: {
        id: component.id,
        name: component.name,
        fileKey: fileKey,
        prompt: `Create an animated version of the Figma component "${component.name}"`
      }
    };
    
    // Store for drop handling
    (window as any).figmaDragData = dragData;
  };

  const handleDragEnd = () => {
    setDragging(null);
    delete (window as any).figmaDragData;
  };

  const getComponentIcon = (type: string) => {
    const iconClass = "w-4 h-4 text-gray-500";
    switch (type?.toLowerCase()) {
      case 'frame':
      case 'frames':
        return <Square className={iconClass} />;
      case 'component':
      case 'components':
        return <Layers className={iconClass} />;
      case 'text':
        return <FileText className={iconClass} />;
      default:
        return <Palette className={iconClass} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-lg">Figma Designs</h2>
        </div>
        {testConnection.data?.connected && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            PAT Connected
          </span>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={fileKey}
            onChange={(e) => setFileKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
            placeholder="Enter Figma file key or URL"
            className="flex-1 px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !fileKey.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Paste a Figma URL or just the file key
        </p>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
            <p className="text-sm text-gray-600">Fetching Figma components...</p>
            <p className="text-xs text-gray-400 mt-2">This may take a moment for large files</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && components.length === 0 && !fileKey && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎨</div>
            <p className="text-lg font-medium mb-2">Import from Figma</p>
            <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
              Enter a Figma file key or URL above to discover components and frames you can animate
            </p>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Example file key: <code className="bg-gray-100 px-1 py-0.5 rounded">abc123XYZ</code></p>
              <p>Or paste full URL: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">figma.com/file/abc123XYZ/...</code></p>
            </div>
          </div>
        )}

        {/* No Results State */}
        {!loading && components.length === 0 && fileKey && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-lg font-medium mb-2">No components found</p>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              This file might not contain any components or frames, or the file key might be incorrect.
            </p>
          </div>
        )}

        {/* Components Grid */}
        {!loading && components.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Found {components.length} components
              </p>
              <p className="text-xs text-gray-400">
                Drag to chat to animate
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {components.map((component) => (
                <div
                  key={component.id}
                  draggable
                  onDragStart={() => handleDragStart(component)}
                  onDragEnd={handleDragEnd}
                  className={`
                    p-3 border rounded-lg cursor-move transition-all bg-white
                    ${dragging === component.id 
                      ? 'opacity-50 scale-95 border-purple-400' 
                      : 'hover:border-purple-400 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1">
                      {getComponentIcon(component.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={component.name}>
                        {component.name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {component.type}
                      </p>
                    </div>
                  </div>
                  
                  {/* Thumbnail placeholder */}
                  {component.thumbnailUrl ? (
                    <img 
                      src={component.thumbnailUrl} 
                      alt={component.name}
                      className="w-full h-24 object-cover rounded mt-2 bg-gray-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-24 bg-gradient-to-br from-purple-50 to-purple-100 rounded mt-2 flex items-center justify-center">
                      <Palette className="w-8 h-8 text-purple-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {components.length > 0 && (
        <div className="p-3 border-t bg-gray-50">
          <p className="text-xs text-center text-gray-600">
            💡 Drag components to chat to create animations
          </p>
        </div>
      )}
    </div>
  );
}