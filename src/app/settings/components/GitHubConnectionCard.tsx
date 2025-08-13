"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Github, Link2, Unlink, RefreshCw, FolderGit2, CheckCircle2, Settings } from "lucide-react";
import { api } from "~/trpc/react";
import { RepoSelector } from "./RepoSelector";

interface GitHubConnectionCardProps {
  userId: string;
}

export function GitHubConnectionCard({ userId }: GitHubConnectionCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  
  // Query to check if GitHub is connected
  const { data: connection, isLoading, refetch } = api.github.getConnection.useQuery();
  const disconnectMutation = api.github.disconnect.useMutation();
  const testConnectionMutation = api.github.testConnection.useMutation();
  
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Redirect to GitHub OAuth
      window.location.href = '/api/auth/github/connect';
    } catch (error) {
      console.error('Failed to initiate GitHub connection:', error);
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      await refetch();
      setTestResult(null);
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
    }
  };
  
  const handleTestConnection = async () => {
    try {
      const result = await testConnectionMutation.mutateAsync();
      setTestResult(`✅ Successfully connected! Found ${result.repoCount} repositories.`);
    } catch (error) {
      setTestResult('❌ Connection test failed. Please reconnect.');
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="h-6 w-6" />
            <div>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Connect your GitHub account to animate your actual components
              </CardDescription>
            </div>
          </div>
          {connection?.isConnected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connection?.isConnected ? (
          <>
            <Alert>
              <AlertDescription>
                <strong>🎬 Bring Your Components to Life!</strong>
                <br />
                Connect your GitHub repos and say "animate my sidebar" to create videos of your actual UI components.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <FolderGit2 className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <strong>How it works:</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Connect your GitHub repositories</li>
                    <li>We'll find your components when you mention them</li>
                    <li>Your code structure and styles are preserved</li>
                    <li>Creates perfect animations of your actual UI</li>
                  </ul>
                </div>
              </div>
              
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Github className="h-5 w-5" />
                  <div>
                    <p className="font-medium">@{connection.username}</p>
                    <p className="text-sm text-gray-600">
                      {connection.repoCount} repositories accessible
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {testResult && (
                <Alert className={testResult.includes('✅') ? 'border-green-300' : 'border-red-300'}>
                  <AlertDescription>{testResult}</AlertDescription>
                </Alert>
              )}
              
              {/* Repository selection button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowRepoSelector(!showRepoSelector)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showRepoSelector ? 'Hide' : 'Select'} Repositories to Search
              </Button>
              
              {/* Show repo selector */}
              {showRepoSelector && connection.repositories && (
                <RepoSelector
                  repositories={connection.repositories}
                  selectedRepos={connection.selectedRepos}
                  onSave={(selected) => {
                    setShowRepoSelector(false);
                    refetch();
                  }}
                />
              )}
              
              {/* Show selected repos if not showing selector */}
              {!showRepoSelector && connection.selectedRepos && connection.selectedRepos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Searching {connection.selectedRepos.length} repositories:
                  </p>
                  <div className="space-y-1">
                    {connection.selectedRepos.slice(0, 5).map((repo: string) => (
                      <div key={repo} className="flex items-center gap-2 text-sm text-gray-600">
                        <FolderGit2 className="h-3 w-3" />
                        {repo}
                      </div>
                    ))}
                    {connection.selectedRepos.length > 5 && (
                      <p className="text-sm text-gray-500">...and {connection.selectedRepos.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}
              
              {!showRepoSelector && (!connection.selectedRepos || connection.selectedRepos.length === 0) && (
                <Alert className="border-yellow-300">
                  <AlertDescription>
                    <strong>⚠️ No repositories selected!</strong>
                    <br />Click "Select Repositories to Search" to choose which repos to search for components.
                  </AlertDescription>
                </Alert>
              )}
              
              <Alert>
                <AlertDescription>
                  <strong>Try it out!</strong> Go to any project and say:
                  <br />• "Animate my navbar"
                  <br />• "Create a video with my sidebar sliding in"
                  <br />• "Show my dashboard component"
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}