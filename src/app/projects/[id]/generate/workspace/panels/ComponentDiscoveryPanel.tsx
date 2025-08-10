"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Loader2, Search, Package, Lock, ShoppingCart, MessageSquare, FileText, Github, RefreshCw, X } from "lucide-react";
import type { UICatalog, UIComponentItem } from "~/server/services/github/component-indexer.service";

interface ComponentDiscoveryPanelProps {
  onComponentSelect?: (component: UIComponentItem) => void;
  projectId: string;
}

const CATEGORY_CONFIG = {
  core: { 
    label: 'Core Components', 
    icon: Package, 
    color: 'bg-blue-500',
    description: 'Essential UI components'
  },
  auth: { 
    label: 'Authentication', 
    icon: Lock, 
    color: 'bg-green-500',
    description: 'Login, signup, auth flows'
  },
  commerce: { 
    label: 'Commerce', 
    icon: ShoppingCart, 
    color: 'bg-purple-500',
    description: 'Checkout, cart, payments'
  },
  interactive: { 
    label: 'Interactive', 
    icon: MessageSquare, 
    color: 'bg-orange-500',
    description: 'Chat, comments, forms'
  },
  content: { 
    label: 'Content', 
    icon: FileText, 
    color: 'bg-pink-500',
    description: 'Cards, modals, heroes'
  },
  custom: { 
    label: 'Custom', 
    icon: Package, 
    color: 'bg-gray-500',
    description: 'Project-specific components'
  },
};

export function ComponentDiscoveryPanel({ onComponentSelect, projectId }: ComponentDiscoveryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<keyof UICatalog | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['core', 'auth']));
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());
  const [isDraggingMultiple, setIsDraggingMultiple] = useState(false);
  
  // Fetch discovered components
  const { data: catalog, isLoading, refetch } = api.githubDiscovery.discoverComponents.useQuery(
    { forceRefresh: false },
    {
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
      refetchOnWindowFocus: false,
    }
  );
  
  // Check if user has GitHub connected
  const { data: githubConnection } = api.github.getConnection.useQuery();
  
  // Create a unique key for each component
  const getComponentKey = (component: UIComponentItem) => {
    return `${component.repo}-${component.path}`;
  };
  
  // Handle selecting/deselecting components
  const toggleComponentSelection = (component: UIComponentItem) => {
    const key = getComponentKey(component);
    const newSelected = new Set(selectedComponents);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedComponents(newSelected);
  };
  
  // Check if a component is selected
  const isComponentSelected = (component: UIComponentItem) => {
    return selectedComponents.has(getComponentKey(component));
  };
  
  // Get all selected component objects
  const getSelectedComponentObjects = (): UIComponentItem[] => {
    const components: UIComponentItem[] = [];
    if (!catalog) return components;
    
    Object.values(catalog).forEach(categoryComponents => {
      categoryComponents.forEach(component => {
        if (selectedComponents.has(getComponentKey(component))) {
          components.push(component);
        }
      });
    });
    
    return components;
  };
  
  const handleDragStart = (e: React.DragEvent, component: UIComponentItem) => {
    // Check if this component is part of a multi-selection
    const isSelected = isComponentSelected(component);
    let componentsToSend: UIComponentItem[];
    
    if (isSelected && selectedComponents.size > 1) {
      // If it's selected and there are multiple selections, send all
      componentsToSend = getSelectedComponentObjects();
      setIsDraggingMultiple(true);
    } else {
      // Otherwise just send this one component
      componentsToSend = [component];
      setIsDraggingMultiple(false);
    }
    
    // Set drag data for the chat to consume
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'github-component',
      components: componentsToSend, // Send as array
      component: componentsToSend[0], // Keep backward compatibility
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  const handleDragEnd = () => {
    setIsDraggingMultiple(false);
  };
  
  const handleComponentClick = (e: React.MouseEvent, component: UIComponentItem) => {
    // If shift or cmd/ctrl is held, toggle selection
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      toggleComponentSelection(component);
    } else if (onComponentSelect) {
      // Normal click - single selection behavior
      onComponentSelect(component);
    }
  };
  
  // Clear all selections
  const clearSelections = () => {
    setSelectedComponents(new Set());
  };
  
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  
  // Filter components based on search
  const filterComponents = (components: UIComponentItem[]) => {
    if (!searchQuery) return components;
    const query = searchQuery.toLowerCase();
    return components.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.path.toLowerCase().includes(query)
    );
  };
  
  // Get all components or filtered by category
  const getVisibleComponents = () => {
    if (!catalog) return {};
    
    if (selectedCategory === 'all') {
      return Object.entries(catalog).reduce((acc, [cat, comps]) => ({
        ...acc,
        [cat]: filterComponents(comps)
      }), {} as UICatalog);
    }
    
    return {
      [selectedCategory]: filterComponents(catalog[selectedCategory] || [])
    } as Partial<UICatalog>;
  };
  
  const visibleComponents = getVisibleComponents();
  const totalComponents = catalog ? 
    Object.values(catalog).reduce((sum, arr) => sum + arr.length, 0) : 0;
  
  if (!githubConnection?.isConnected) {
    return (
      <div className="flex h-full flex-col bg-gray-50">
        <div className="border-b bg-white px-4 py-3">
          <h2 className="text-lg font-semibold">Component Discovery</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Github className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium">Connect GitHub to Discover Components</h3>
          <p className="mb-4 text-sm text-gray-600">
            Connect your GitHub account to automatically discover and animate components from your repositories.
          </p>
          <a
            href="/settings"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Connect GitHub
          </a>
        </div>
      </div>
    );
  }
  
  if (!githubConnection?.selectedRepos?.length) {
    return (
      <div className="flex h-full flex-col bg-gray-50">
        <div className="border-b bg-white px-4 py-3">
          <h2 className="text-lg font-semibold">Component Discovery</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Package className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium">Select Repositories</h3>
          <p className="mb-4 text-sm text-gray-600">
            You haven't selected any repositories to search yet.
          </p>
          <a
            href="/settings"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Select Repositories
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Component Discovery</h2>
            <p className="text-xs text-gray-500">
              {totalComponents} components found in {githubConnection.selectedRepos.length} repos
              {selectedComponents.size > 0 && (
                <span className="ml-2 font-medium text-blue-600">
                  · {selectedComponents.size} selected
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedComponents.size > 0 && (
              <button
                onClick={clearSelections}
                className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                title="Clear selections"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => refetch()}
              className="rounded p-1.5 hover:bg-gray-100"
              title="Refresh components"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="border-b bg-white px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border bg-gray-50 py-2 pl-9 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="border-b bg-white px-4 py-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              selectedCategory === 'all'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as keyof UICatalog)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedCategory === key
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Components List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(visibleComponents).map(([category, components]) => {
              if (!components || components.length === 0) return null;
              
              const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
              const Icon = config.icon;
              const isExpanded = expandedCategories.has(category);
              
              return (
                <div key={category} className="rounded-lg bg-white shadow-sm">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex w-full items-center justify-between p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`rounded p-1 ${config.color} bg-opacity-10`}>
                        <Icon className={`h-4 w-4 ${config.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-medium">{config.label}</h3>
                        <p className="text-xs text-gray-500">{components.length} components</p>
                      </div>
                    </div>
                    <svg
                      className={`h-4 w-4 transform transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t">
                      <div className="grid grid-cols-2 gap-2 p-3">
                        {components.map((component) => {
                          const isSelected = isComponentSelected(component);
                          return (
                            <div
                              key={`${component.repo}-${component.path}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, component)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => handleComponentClick(e, component)}
                              className={`group cursor-move rounded-lg border p-3 transition-all ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50' 
                                  : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                              }`}
                            >
                              <div className="mb-1 flex items-start justify-between">
                                <div className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleComponentSelection(component)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <h4 className={`text-sm font-medium ${
                                    isSelected ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600'
                                  }`}>
                                    {component.name}
                                  </h4>
                                </div>
                                <span className="text-xs text-gray-400">{component.score}</span>
                              </div>
                              <p className="ml-6 text-xs text-gray-500">
                                {component.path.split('/').slice(-2).join('/')}
                              </p>
                              <p className="ml-6 mt-1 text-xs text-gray-400">
                                {component.repo.split('/')[1]}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Help Text */}
      <div className="border-t bg-white px-4 py-2">
        <p className="text-xs text-gray-500">
          💡 Select multiple with checkboxes or Cmd/Shift+Click • Drag to chat
        </p>
      </div>
    </div>
  );
}