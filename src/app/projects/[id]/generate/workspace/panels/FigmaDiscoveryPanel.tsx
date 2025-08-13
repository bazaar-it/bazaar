'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '~/trpc/react';
import { Loader2, Search, Palette, Layers, FileText, Square, RefreshCw, Clock, ChevronDown, Link2, LogOut, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';

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

interface RecentFile {
  key: string;
  name: string;
  accessedAt: string;
}

export default function FigmaDiscoveryPanel({ projectId }: FigmaDiscoveryPanelProps) {
  const [fileKey, setFileKey] = useState('');
  const [components, setComponents] = useState<FigmaComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check Figma connection status
  const { data: connectionStatus, refetch: refetchConnection } = api.figma.checkConnection.useQuery();
  
  // Get OAuth URL
  const { data: oauthData } = api.figma.getOAuthUrl.useQuery(
    undefined,
    { enabled: !connectionStatus?.connected }
  );
  
  // Disconnect mutation
  const disconnectMutation = api.figma.disconnect.useMutation({
    onSuccess: () => {
      refetchConnection();
      toast.success('Disconnected from Figma');
      setComponents([]);
    },
  });

  // Handle OAuth connection
  const handleConnect = useCallback(() => {
    if (oauthData?.url) {
      setIsConnecting(true);
      window.open(oauthData.url, '_blank', 'width=600,height=800');
      
      // Poll for connection status
      const pollInterval = setInterval(async () => {
        const result = await refetchConnection();
        if (result.data?.connected) {
          clearInterval(pollInterval);
          setIsConnecting(false);
          toast.success('Successfully connected to Figma!');
        }
      }, 2000);
      
      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsConnecting(false);
      }, 120000);
    }
  }, [oauthData, refetchConnection]);
  
  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    if (confirm('Are you sure you want to disconnect your Figma account?')) {
      await disconnectMutation.mutateAsync();
    }
  }, [disconnectMutation]);
  
  // Load recent files from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('figma-recent-files');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentFiles(parsed.slice(0, 5)); // Keep only 5 most recent
      } catch (e) {
        console.error('Failed to parse recent files:', e);
      }
    }
  }, []);

  // Save recent file
  const saveRecentFile = (key: string, name: string) => {
    const newRecent: RecentFile = {
      key,
      name: name || key,
      accessedAt: new Date().toISOString()
    };
    
    const updated = [newRecent, ...recentFiles.filter(f => f.key !== key)].slice(0, 5);
    setRecentFiles(updated);
    localStorage.setItem('figma-recent-files', JSON.stringify(updated));
  };

  // Index file mutation
  const indexFile = api.figma.indexFile.useMutation({
    onSuccess: (data) => {
      console.log('Figma indexFile response:', data);
      if (data.components && data.components.length > 0) {
        setComponents(data.components);
        toast.success(`Found ${data.components.length} components!`);
        // Save to recent files
        const cleanKey = fileKey.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)?.[1] || fileKey;
        saveRecentFile(cleanKey, `File with ${data.components.length} components`);
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

  const handleSearch = async (forceRefresh = false) => {
    if (!fileKey.trim()) {
      toast.error('Please enter a Figma file key');
      return;
    }

    // Clean the file key (remove any URL parts if user pastes full URL)
    let cleanKey = fileKey.trim();
    
    // Extract key from Figma URL if needed
    const urlMatch = cleanKey.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      cleanKey = urlMatch[1] || '';
    }

    setLoading(true);
    setComponents([]);
    
    // Check if connected first
    if (!connectionStatus?.connected) {
      toast.error('Please connect your Figma account first');
      setLoading(false);
      return;
    }

    // Now index the file
    console.log('Indexing Figma file:', cleanKey, 'Force refresh:', forceRefresh);
    indexFile.mutate({ 
      fileKey: cleanKey,
      forceRefresh: forceRefresh 
    });
  };
  
  const handleRefresh = () => {
    if (fileKey && components.length > 0) {
      toast.info('Refreshing components...');
      handleSearch(true);
    }
  };

  const handleDragStart = (component: FigmaComponent) => {
    setDragging(component.id);
    
    // Extract the actual file key if it's a URL
    let actualFileKey = fileKey;
    const urlMatch = fileKey.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      actualFileKey = urlMatch[1] || '';
    }
    
    // Create drag data for ChatPanelG with file key for fetching
    const dragData = {
      type: 'figma-component',
      component: {
        id: component.id,
        name: component.name,
        fileKey: actualFileKey,
        nodeId: component.id, // This is the node ID
        fullId: `${actualFileKey}:${component.id}`, // Combined for easy parsing
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
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-lg">Figma Designs</h2>
          </div>
          
          {/* Connection status */}
          {connectionStatus?.connected ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                Connected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDisconnect}
                className="h-6 px-2"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleConnect}
              disabled={isConnecting}
              className="h-7"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-3 h-3 mr-1" />
                  Connect Figma
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Connection info */}
        {connectionStatus && !connectionStatus.connected ? (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Click "Connect Figma" above to link your account
          </div>
        ) : connectionStatus?.user?.email ? (
          <div className="text-xs text-gray-500">
            {connectionStatus.user.email}
          </div>
        ) : null}
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={fileKey}
              onChange={(e) => setFileKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch()}
              placeholder="Enter Figma file key or URL"
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
            {recentFiles.length > 0 && (
              <button
                onClick={() => setShowRecent(!showRecent)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                title="Recent files"
              >
                <Clock className="w-4 h-4 text-gray-400" />
              </button>
            )}
            
            {/* Recent files dropdown */}
            {showRecent && recentFiles.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10">
                <div className="p-2 border-b">
                  <p className="text-xs font-medium text-gray-600">Recent Files</p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {recentFiles.map((file) => (
                    <button
                      key={file.key}
                      onClick={() => {
                        setFileKey(file.key);
                        setShowRecent(false);
                        handleSearch();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b last:border-0"
                    >
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {file.key.substring(0, 12)}... • {new Date(file.accessedAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => handleSearch()}
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
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded transition-colors"
                title="Refresh components"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
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
                  
                  {/* Thumbnail with loading state */}
                  {component.thumbnailUrl ? (
                    <div className="relative w-full h-24 mt-2">
                      <img 
                        src={component.thumbnailUrl} 
                        alt={component.name}
                        className="w-full h-full object-contain rounded bg-gray-50 border border-gray-100"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          // Show fallback
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="hidden w-full h-full bg-gradient-to-br from-purple-50 to-purple-100 rounded items-center justify-center">
                        <Palette className="w-8 h-8 text-purple-300" />
                      </div>
                    </div>
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