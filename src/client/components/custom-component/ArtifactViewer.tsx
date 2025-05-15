//src/client/components/custom-component/ArtifactViewer.tsx

'use client';

import { useState } from 'react';
import { type Artifact } from '~/types/a2a';
import { Button } from '~/components/ui/button';
import { 
  Download, 
  ExternalLink, 
  Code as CodeIcon, 
  Image as ImageIcon,
  File as FileIcon,
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

interface ArtifactViewerProps {
  artifacts: Artifact[];
  className?: string;
  compact?: boolean;
}

/**
 * Component for displaying A2A task artifacts
 * 
 * Shows a list of artifacts with appropriate icons, descriptions, and actions
 * based on artifact type and MIME type.
 */
export function ArtifactViewer({
  artifacts,
  className = '',
  compact = false
}: ArtifactViewerProps) {
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);

  // No artifacts to display
  if (!artifacts?.length) {
    return (
      <div className={`text-sm text-gray-500 italic ${className}`}>
        No artifacts available
      </div>
    );
  }

  // Get appropriate icon based on artifact type and MIME type
  const getArtifactIcon = (artifact: Artifact) => {
    if (artifact.mimeType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />;
    }
    
    if (artifact.mimeType.includes('javascript') || artifact.mimeType.includes('typescript')) {
      return <CodeIcon className="h-4 w-4 text-amber-500" />;
    }
    
    return <FileIcon className="h-4 w-4 text-gray-500" />;
  };

  // Toggle expanded state for an artifact
  const toggleExpand = (artifactId: string) => {
    setExpandedArtifact(expandedArtifact === artifactId ? null : artifactId);
  };

  // Determine if an artifact should be expandable
  const isExpandable = (artifact: Artifact) => {
    return !compact && (artifact.description || artifact.data);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {artifacts.map((artifact) => (
        <div 
          key={artifact.id} 
          className="border rounded-md overflow-hidden bg-white dark:bg-gray-800"
        >
          {/* Artifact header */}
          <div 
            className={`flex items-center justify-between p-3 ${
              isExpandable(artifact) ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
            }`}
            onClick={() => isExpandable(artifact) && toggleExpand(artifact.id)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getArtifactIcon(artifact)}
              <div className="truncate flex-1">
                <div className="font-medium truncate">{artifact.name || `Artifact ${artifact.id.substring(0, 8)}`}</div>
                <div className="text-xs text-gray-500 truncate">{artifact.mimeType}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {artifact.url && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Download"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(artifact.url, '_blank');
                    }}
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Download</span>
                  </Button>
                  
                  {!compact && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Open in new tab"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(artifact.url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="sr-only">Open</span>
                    </Button>
                  )}
                </>
              )}
              
              {isExpandable(artifact) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(artifact.id);
                  }}
                >
                  {expandedArtifact === artifact.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {expandedArtifact === artifact.id ? 'Collapse' : 'Expand'}
                  </span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Expanded artifact content */}
          {expandedArtifact === artifact.id && (
            <div className="border-t p-3">
              {artifact.description && (
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Description</h4>
                  <p className="text-sm">{artifact.description}</p>
                </div>
              )}
              
              {artifact.data && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Data</h4>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded-md overflow-auto max-h-60">
                    {typeof artifact.data === 'string' 
                      ? artifact.data 
                      : JSON.stringify(artifact.data, null, 2)
                    }
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
