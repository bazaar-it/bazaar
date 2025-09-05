"use client";

import React, { useState } from 'react';
import { Github, Figma, ExternalLink, Loader2, CheckCircle, AlertCircle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from 'sonner';
import { cn } from "~/lib/cn";
import { ComponentDiscoveryPanel } from './ComponentDiscoveryPanel';
import FigmaDiscoveryPanel from './FigmaDiscoveryPanel';

interface IntegrationsPanelProps {
  projectId: string;
}

type TabType = 'github' | 'figma';

export default function IntegrationsPanel({ projectId }: IntegrationsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('github');
  const [isConnecting, setIsConnecting] = useState<TabType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [isSavingRepos, setIsSavingRepos] = useState(false);

  // GitHub connection query
  const { data: githubConnection, refetch: refetchGitHub, isLoading: isLoadingGitHub } = api.github.getConnection.useQuery();
  
  // Update selected repos mutation
  const updateReposMutation = api.github.updateSelectedRepos.useMutation({
    onSuccess: async () => {
      toast.success('Repository selection saved');
      // Wait for refetch to complete before UI updates
      await refetchGitHub();
    },
    onError: (error) => {
      toast.error('Failed to save repository selection');
      console.error('Failed to update repos:', error);
    }
  });

  // Reset repository selection mutation
  const resetReposMutation = api.github.resetRepositorySelection.useMutation({
    onSuccess: () => {
      toast.success('Repository selection reset');
      // Don't refetch immediately - let the user select new repos first
      setSelectedRepos([]);
    },
    onError: (error) => {
      toast.error('Failed to reset repository selection');
      console.error('Failed to reset repos:', error);
    }
  });

  // Initialize selected repos when data loads
  React.useEffect(() => {
    console.log('[IntegrationsPanel] GitHub connection data:', githubConnection?.selectedRepos);
    if (githubConnection?.selectedRepos) {
      setSelectedRepos(githubConnection.selectedRepos);
    }
  }, [githubConnection?.selectedRepos]);

  const githubConnected = githubConnection?.isConnected ?? false;

  const handleGitHubConnect = () => {
    setIsConnecting('github');
    const authUrl = '/api/auth/github/connect';
    window.location.href = authUrl;
  };

  // Create disconnect mutation hook
  const disconnectMutation = api.github.disconnect.useMutation({
    onSuccess: () => {
      toast.success('GitHub disconnected');
      refetchGitHub();
    },
    onError: (error) => {
      toast.error('Failed to disconnect GitHub');
      console.error('Disconnect error:', error);
    }
  });

  const handleGitHubDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
    } catch (error) {
      // Error is already handled by onError callback
      console.error('Failed to disconnect:', error);
    }
  };

  const handleRepoToggle = (repo: string) => {
    console.log('[IntegrationsPanel] Toggling repo:', repo);
    setSelectedRepos(prev => {
      const newSelection = prev.includes(repo) 
        ? prev.filter(r => r !== repo)
        : [...prev, repo];
      console.log('[IntegrationsPanel] New selection:', newSelection);
      return newSelection;
    });
  };

  const handleSaveRepoSelection = async () => {
    console.log('[IntegrationsPanel] Saving repos:', selectedRepos);
    if (selectedRepos.length === 0) {
      toast.error('Please select at least one repository');
      return;
    }
    setIsSavingRepos(true);
    try {
      await updateReposMutation.mutateAsync({ repositories: selectedRepos });
      console.log('[IntegrationsPanel] Save successful, repos should be updated');
    } catch (error) {
      console.error('[IntegrationsPanel] Save failed:', error);
    } finally {
      setIsSavingRepos(false);
    }
  };

  const filteredRepos = React.useMemo(() => {
    const repos = githubConnection?.repositories || [];
    if (!searchQuery) return repos;
    return repos.filter(repo => 
      repo.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [githubConnection?.repositories, searchQuery]);

  // Loading state
  if (isLoadingGitHub) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Tabs */}
      <div className="border-b">
        <div className="px-4 pt-4 pb-0">
          <h2 className="text-lg font-semibold">Connect Your Tools</h2>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            Import and animate your actual components from GitHub and Figma
          </p>
          
          {/* Tab buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('github')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors",
                activeTab === 'github'
                  ? "bg-white border-t border-l border-r border-gray-200 text-gray-900 -mb-px"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              <Github className="h-4 w-4" />
              GitHub
              {githubConnected && (
                <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  Connected
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('figma')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors",
                activeTab === 'figma'
                  ? "bg-white border-t border-l border-r border-gray-200 text-gray-900 -mb-px"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              )}
            >
              <Figma className="h-4 w-4" />
              Figma
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* GitHub Tab */}
        {activeTab === 'github' && (
          <div className="h-full flex flex-col overflow-hidden">
            {!githubConnected ? (
              // GitHub Connection UI
              <div className="flex-1 p-6">
                <div className="max-w-md mx-auto">
                  <div className="text-center mb-6">
                    <div className="inline-flex p-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4">
                      <Github className="h-8 w-8 text-gray-900" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">🎬 Animate Your Real Components!</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Connect your GitHub repos and say "animate my navbar" to create stunning videos of your actual UI components.
                    </p>
                    <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm font-medium text-blue-900 mb-2">How it works:</p>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• Connect your GitHub account securely</li>
                        <li>• Select which repositories to search</li>
                        <li>• Mention any component by name in chat</li>
                        <li>• Watch it animate with perfect styling</li>
                      </ul>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleGitHubConnect}
                    disabled={isConnecting === 'github'}
                    className="w-full"
                    size="lg"
                  >
                    {isConnecting === 'github' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Github className="h-4 w-4 mr-2" />
                        Connect GitHub Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // GitHub Connected - Repository Selection
              <div className="h-full flex flex-col overflow-hidden">
                {(!githubConnection?.selectedRepos?.length || githubConnection.selectedRepos.length === 0) ? (
                  // Repository selection UI
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 bg-green-50 border-b border-green-200 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-900">
                              Connected as @{githubConnection?.username}
                            </p>
                            <p className="text-xs text-green-700">
                              {githubConnection?.repoCount} repositories available
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handleGitHubDisconnect}
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 hover:text-red-600"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                    
                    {/* Call to action */}
                    <div className="p-4 bg-amber-50 border-b border-amber-200 flex-shrink-0">
                      <p className="text-sm font-medium text-amber-900 mb-1">
                        ⚡ Almost there! Select repositories to enable component discovery
                      </p>
                      <p className="text-xs text-amber-700">
                        Choose which repos to search when you mention components in chat
                      </p>
                    </div>
                    
                    {/* Repository Search and Selection */}
                    <div className="p-4 border-b flex-shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search repositories..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    {/* Repository List */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {filteredRepos.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                          No repositories found
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredRepos.map(repo => (
                            <label
                              key={repo}
                              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedRepos.includes(repo)}
                                onChange={() => handleRepoToggle(repo)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {repo}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Save Button */}
                    {filteredRepos.length > 0 && (
                      <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-gray-600">
                            {selectedRepos.length} {selectedRepos.length === 1 ? 'repository' : 'repositories'} selected
                          </p>
                        </div>
                        <Button
                          onClick={handleSaveRepoSelection}
                          disabled={isSavingRepos || selectedRepos.length === 0}
                          className="w-full"
                        >
                          {isSavingRepos ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Enable Component Discovery'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Component Discovery Panel
                  <div className="h-full flex flex-col">
                    <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Searching in {selectedRepos.length} {selectedRepos.length === 1 ? 'repository' : 'repositories'}
                      </p>
                      <Button
                        onClick={async () => {
                          await resetReposMutation.mutateAsync();
                        }}
                        variant="ghost"
                        size="sm"
                        disabled={resetReposMutation.isPending}
                      >
                        {resetReposMutation.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          'Change Repos'
                        )}
                      </Button>
                    </div>
                    <ComponentDiscoveryPanel projectId={projectId} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Figma Tab */}
        {activeTab === 'figma' && (
          <div className="h-full">
            <FigmaDiscoveryPanel projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}