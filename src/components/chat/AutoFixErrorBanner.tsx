"use client";

import React from 'react';
import { Button } from "~/components/ui/button";
import { RefreshCwIcon } from 'lucide-react';

export interface ErrorDetails {
  sceneName: string;
  errorMessage: string;
  timestamp: number;
}

interface Scene {
  id: string;
  [key: string]: any;
}

interface AutoFixErrorBannerProps {
  scenes: Scene[];
  sceneErrors: Map<string, ErrorDetails>;
  onAutoFix: (sceneId: string) => void;
  isGenerating: boolean;
}

export function AutoFixErrorBanner({ 
  scenes, 
  sceneErrors, 
  onAutoFix, 
  isGenerating 
}: AutoFixErrorBannerProps) {
  if (sceneErrors.size === 0) return null;

  return (
    <>
      {Array.from(sceneErrors.entries()).map(([sceneId, errorDetails]) => {
        // Check if scene still exists
        const sceneStillExists = scenes.some((s: any) => s.id === sceneId);
        if (!sceneStillExists) return null;
        
        return (
          <div key={sceneId} className="mb-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-sm">⚠</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Scene Compilation Error
                  </span>
                  <p className="text-xs text-gray-500">{errorDetails.sceneName}</p>
                </div>
              </div>
              <Button
                onClick={() => onAutoFix(sceneId)}
                disabled={isGenerating}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 font-medium"
              >
                {isGenerating ? (
                  <>
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    🔧 Auto-Fix
                  </>
                )}
              </Button>
            </div>
            
            {/* Quotes */}
            <div className="bg-gray-50 border-l-4 border-gray-300 p-4 mb-3 rounded-r">
              <p className="text-sm italic text-gray-700 mb-2">
                "If you're not embarrassed by the first version of your product, you've launched too late."
              </p>
              <p className="text-xs text-gray-500 mb-3">— Reid Hoffman</p>
              
            </div>
            
            <div className="text-xs text-gray-500">
              <span className="font-medium">Error:</span> {errorDetails.errorMessage.substring(0, 120)}...
            </div>
          </div>
        );
      })}
    </>
  );
}