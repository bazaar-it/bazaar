"use client";

import React, { useState } from 'react';
import { customComponentJobs } from '../server/db/schema';
import { Button } from '../components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

type CustomComponent = {
  id: string;
  effect: string | null;
  status: string;
  outputUrl: string | null;
  updatedAt: Date | null;
  tsxCode: string | null;
};

interface CustomComponentDiagnosticProps {
  components: CustomComponent[];
  projectId: string;
  onRefresh?: () => void;
  onFixComponent?: (componentId: string) => Promise<void>;
}

export default function CustomComponentDiagnostic({
  components,
  projectId,
  onRefresh,
  onFixComponent
}: CustomComponentDiagnosticProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [expandedComponents, setExpandedComponents] = useState<string[]>([]);
  
  // Filter components with issues
  const componentsWithIssues = components.filter(component => {
    // Check for ready/complete status with missing outputUrl
    return (
      (component.status === 'ready' || component.status === 'complete') && 
      !component.outputUrl
    );
  });
  
  // Components that may have syntax issues (extra semicolons, missing REMOTION_COMPONENT, etc.)
  const componentsWithPotentialSyntaxIssues = components.filter(component => {
    if (!component.tsxCode) return false;
    
    // Check for common issues
    const hasExtraSemicolons = /<\/\w+>;(\s*[);])/.test(component.tsxCode);
    const missingRemotionComponent = !component.tsxCode.includes('window.__REMOTION_COMPONENT');
    
    return hasExtraSemicolons || missingRemotionComponent;
  });
  
  const handleFix = async (componentId: string) => {
    if (!onFixComponent) return;
    
    setLoading(prev => ({ ...prev, [componentId]: true }));
    try {
      await onFixComponent(componentId);
    } catch (error) {
      console.error('Error fixing component:', error);
    } finally {
      setLoading(prev => ({ ...prev, [componentId]: false }));
    }
  };
  
  const toggleExpand = (componentId: string) => {
    setExpandedComponents(prev => 
      prev.includes(componentId) 
        ? prev.filter(id => id !== componentId) 
        : [...prev, componentId]
    );
  };
  
  // Count stats
  const totalComponents = components.length;
  const readyComponents = components.filter(c => c.status === 'ready' || c.status === 'complete').length;
  const readyWithIssues = componentsWithIssues.length;
  const syntaxIssues = componentsWithPotentialSyntaxIssues.length;
  
  return (
    <div className="border rounded-lg p-4 w-full">
      <div className="border-b pb-3 mb-4">
        <h2 className="text-xl font-bold">Custom Component Diagnostic</h2>
        <p className="text-gray-500 text-sm">
          Diagnose and fix issues with custom components
        </p>
      </div>
      
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-100 p-3 rounded-md">
          <div className="text-sm text-slate-500">Total</div>
          <div className="text-2xl font-bold">{totalComponents}</div>
        </div>
        <div className="bg-slate-100 p-3 rounded-md">
          <div className="text-sm text-slate-500">Ready</div>
          <div className="text-2xl font-bold">{readyComponents}</div>
        </div>
        <div className={`p-3 rounded-md ${readyWithIssues > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
          <div className="text-sm text-slate-500">URL Issues</div>
          <div className="text-2xl font-bold">{readyWithIssues}</div>
        </div>
        <div className={`p-3 rounded-md ${syntaxIssues > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
          <div className="text-sm text-slate-500">Syntax Issues</div>
          <div className="text-2xl font-bold">{syntaxIssues}</div>
        </div>
      </div>
      
      {(componentsWithIssues.length > 0 || componentsWithPotentialSyntaxIssues.length > 0) ? (
        <div className="space-y-4">
          {/* Components with missing outputUrl */}
          {componentsWithIssues.length > 0 && (
            <div className="border rounded p-4">
              <h3 className="text-lg font-medium mb-3">
                Components with missing output URL ({componentsWithIssues.length})
              </h3>
              <div className="space-y-2">
                {componentsWithIssues.map(component => (
                  <div 
                    key={component.id} 
                    className="border rounded-md p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      <div>
                        <div className="font-medium">{component.effect || 'Unnamed Component'}</div>
                        <div className="text-xs text-slate-500">ID: {component.id}</div>
                        <div className="text-xs text-slate-500">Status: {component.status}</div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleFix(component.id)}
                      disabled={loading[component.id]}
                    >
                      {loading[component.id] ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          Fixing...
                        </>
                      ) : "Fix URL"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Components with syntax issues */}
          {componentsWithPotentialSyntaxIssues.length > 0 && (
            <div className="border rounded p-4">
              <h3 className="text-lg font-medium mb-3">
                Components with potential syntax issues ({componentsWithPotentialSyntaxIssues.length})
              </h3>
              <div className="space-y-2">
                {componentsWithPotentialSyntaxIssues.map(component => (
                  <div 
                    key={component.id} 
                    className="border rounded-md p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        <div>
                          <div className="font-medium">{component.effect || 'Unnamed Component'}</div>
                          <div className="text-xs text-slate-500">ID: {component.id}</div>
                          <div className="text-xs text-slate-500">Status: {component.status}</div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => toggleExpand(component.id)}
                        >
                          {expandedComponents.includes(component.id) ? "Hide Code" : "Show Code"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleFix(component.id)}
                          disabled={loading[component.id]}
                        >
                          {loading[component.id] ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                              Fixing...
                            </>
                          ) : "Fix Syntax"}
                        </Button>
                      </div>
                    </div>
                    
                    {expandedComponents.includes(component.id) && component.tsxCode && (
                      <div className="bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto">
                        <pre className="text-xs">{component.tsxCode}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center p-6 text-center">
          <div>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium">All components look good!</h3>
            <p className="text-slate-500 mt-1">
              No components with missing URLs or syntax issues were detected.
            </p>
          </div>
        </div>
      )}
      
      <div className="flex justify-between mt-4 pt-3 border-t">
        <div className="text-xs text-slate-500">
          Last checked: {new Date().toLocaleTimeString()}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>
    </div>
  );
} 