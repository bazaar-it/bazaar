import React from 'react';
import { Image, Video, Music, FileText } from 'lucide-react';
import type { AssetMention } from '~/lib/utils/asset-mentions';

interface AssetMentionAutocompleteProps {
  suggestions: AssetMention[];
  selectedIndex: number;
  onSelect: (asset: AssetMention) => void;
  position?: { top: number; left: number };
}

export function AssetMentionAutocomplete({
  suggestions,
  selectedIndex,
  onSelect,
  position
}: AssetMentionAutocompleteProps) {
  if (suggestions.length === 0) return null;

  const getIcon = (type: AssetMention['type']) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'logo': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div 
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px] max-w-[300px]"
      style={position ? { top: position.top, left: position.left } : { bottom: '100%', left: 0, marginBottom: '4px' }}
    >
      {suggestions.map((asset, index) => (
        <button
          key={asset.id}
          type="button"
          className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-100 text-left text-sm ${
            index === selectedIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
          }`}
          onClick={() => onSelect(asset)}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur
        >
          <span className="text-gray-400">
            {getIcon(asset.type)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">@{asset.name}</div>
            {asset.name !== asset.originalName && (
              <div className="text-xs text-gray-500 truncate">{asset.originalName}</div>
            )}
          </div>
        </button>
      ))}
      <div className="px-3 py-1 text-xs text-gray-500 border-t mt-1">
        Type @ to mention uploaded assets
      </div>
    </div>
  );
}