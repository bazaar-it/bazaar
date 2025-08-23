"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Search, FolderGit2, Check, X, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";

interface Repository {
  name: string;
  fullName: string;
  description?: string | null;
  language?: string | null;
  updatedAt?: string;
  private?: boolean;
}

interface RepoSelectorProps {
  repositories: string[];
  selectedRepos?: string[];
  onSave?: (selected: string[]) => void;
}

export function RepoSelector({ repositories, selectedRepos = [], onSave }: RepoSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedRepos));
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRepos, setExpandedRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const updateSelectedReposMutation = api.github.updateSelectedRepos.useMutation();
  const getRepoDetailsMutation = api.github.getRepoDetails.useMutation();
  
  // Load detailed repo information
  useEffect(() => {
    const loadRepoDetails = async () => {
      if (repositories.length === 0) return;
      
      setIsLoading(true);
      try {
        const details = await getRepoDetailsMutation.mutateAsync({ 
          repositories: repositories.slice(0, 100) // Limit to first 100
        });
        setExpandedRepos(details);
      } catch (error) {
        console.error('Failed to load repo details:', error);
        // Fallback to simple list
        setExpandedRepos(repositories.map(r => ({ 
          name: r.split('/')[1] || r, 
          fullName: r 
        })));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRepoDetails();
  }, [repositories]);
  
  const filteredRepos = expandedRepos.filter(repo => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query) ||
      repo.language?.toLowerCase().includes(query)
    );
  });
  
  const handleToggle = (repoName: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(repoName)) {
      newSelected.delete(repoName);
    } else {
      newSelected.add(repoName);
    }
    setSelected(newSelected);
  };
  
  const handleSelectAll = () => {
    if (selected.size === filteredRepos.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRepos.map(r => r.fullName)));
    }
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSelectedReposMutation.mutateAsync({
        repositories: Array.from(selected)
      });
      onSave?.(Array.from(selected));
    } catch (error) {
      console.error('Failed to save selected repos:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const getLanguageColor = (language?: string) => {
    const colors: Record<string, string> = {
      TypeScript: 'bg-blue-500',
      JavaScript: 'bg-yellow-500',
      Python: 'bg-green-500',
      React: 'bg-cyan-500',
      Vue: 'bg-emerald-500',
      Go: 'bg-cyan-600',
      Rust: 'bg-orange-600',
    };
    return colors[language || ''] || 'bg-gray-500';
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading repositories...</span>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Repositories to Search</CardTitle>
        <CardDescription>
          Choose which repositories to search when you mention components like "my Sidebar"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and controls */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selected.size === filteredRepos.length ? (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Select All
                  </>
                )}
              </Button>
              <span className="text-sm text-gray-600">
                {selected.size} of {expandedRepos.length} selected
              </span>
            </div>
            
            {selected.size > 10 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                Performance tip: Select fewer repos for faster search
              </Badge>
            )}
          </div>
        </div>
        
        {/* Repository list */}
        <ScrollArea className="h-[400px] border rounded-lg p-4">
          <div className="space-y-2">
            {filteredRepos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No repositories found
              </div>
            ) : (
              filteredRepos.map((repo) => (
                <div
                  key={repo.fullName}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    id={repo.fullName}
                    checked={selected.has(repo.fullName)}
                    onCheckedChange={() => handleToggle(repo.fullName)}
                    className="mt-1"
                  />
                  <label
                    htmlFor={repo.fullName}
                    className="flex-1 cursor-pointer space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{repo.name}</span>
                      {repo.private && (
                        <Badge variant="outline" className="text-xs">Private</Badge>
                      )}
                      {repo.language && (
                        <div className="flex items-center gap-1">
                          <div className={`h-2 w-2 rounded-full ${getLanguageColor(repo.language)}`} />
                          <span className="text-xs text-gray-500">{repo.language}</span>
                        </div>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                    {repo.updatedAt && (
                      <p className="text-xs text-gray-400">
                        Last updated: {new Date(repo.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* Save button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Alert className="flex-1 mr-4">
            <AlertDescription className="text-sm">
              Selected repositories will be searched when you say "animate my [component]"
            </AlertDescription>
          </Alert>
          
          <Button
            onClick={handleSave}
            disabled={isSaving || selected.size === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Selection
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}