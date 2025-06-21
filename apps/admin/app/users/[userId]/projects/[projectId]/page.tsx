"use client";

import { useState, use } from "react";
import { api } from "../../../../../../lib/api";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import AdminVideoPlayer to avoid SSR issues with Remotion
const AdminVideoPlayer = dynamic(() => import("../../../../../components/AdminVideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <div className="flex items-center justify-center h-48 text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          Loading Video Player...
        </div>
      </div>
    </div>
  )
});

interface ProjectDetailPageProps {
  params: Promise<{
    userId: string;
    projectId: string;
  }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { userId, projectId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Fetch complete project details
  const { data: projectDetails, isLoading: projectLoading } = api.admin.getUserProjectDetails.useQuery({
    projectId: projectId,
    userId: userId,
  }, {
    enabled: !!projectId && !!userId
  });

  // Handle authentication and admin check
  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session?.user) {
    redirect('/login');
  }

  if (projectLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading project details...</div>
        </div>
      </div>
    );
  }

  if (!projectDetails?.project) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-4">The project you're looking for doesn't exist.</p>
          <Link
            href={`/admin/users/${userId}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            ← Back to User
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleIcon = (role: string) => {
    return role === 'user' ? '👤' : '🤖';
  };

  const getEditComplexityColor = (complexity: string | null) => {
    switch (complexity) {
      case 'structural': return 'bg-red-100 text-red-800';
      case 'creative': return 'bg-blue-100 text-blue-800';
      case 'surgical': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/users/${userId}`}
          className="text-indigo-600 hover:text-indigo-900 mb-2 inline-flex items-center"
        >
          ← Back to User
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{projectDetails.project.title}</h1>
            <p className="text-gray-600 mt-1">Project Details & Activity</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Created: {formatDate(projectDetails.project.createdAt)}</div>
            <div>Updated: {formatDate(projectDetails.project.updatedAt)}</div>
          </div>
        </div>
      </div>

      {/* Video Player Section - NEW */}
      {projectDetails.scenes && projectDetails.scenes.length > 0 && (
        <div className="mb-6">
          <AdminVideoPlayer 
            scenes={projectDetails.scenes}
            projectTitle={projectDetails.project.title}
            autoPlay={false}
            showControls={true}
          />
        </div>
      )}

      {/* Project Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{projectDetails.summary.totalScenes}</div>
            <div className="text-sm text-gray-600">Scenes</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{projectDetails.summary.totalUserPrompts}</div>
            <div className="text-sm text-gray-600">User Prompts</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{projectDetails.summary.totalIterations}</div>
            <div className="text-sm text-gray-600">Iterations</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{projectDetails.summary.imagesUploaded}</div>
            <div className="text-sm text-gray-600">Images</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenes List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Scenes ({projectDetails.scenes.length})
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {projectDetails.scenes.map((scene: any) => (
              <div key={scene.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{scene.name}</h3>
                  <span className="text-xs text-gray-500">
                    {scene.iterationCount} iterations
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Duration: {scene.duration} frames
                </div>
                <div className="text-xs text-gray-500">
                  Created: {formatDate(scene.createdAt)}
                </div>
                {scene.tsxCode && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                      View Code
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40">
                      <code>{scene.tsxCode.slice(0, 500)}...</code>
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Chat History ({projectDetails.chatHistory.length})
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {projectDetails.chatHistory.map((message: any) => (
              <div key={message.id} className={`p-3 rounded-lg ${
                message.role === 'user' ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span>{getRoleIcon(message.role)}</span>
                    <span className="text-sm font-medium capitalize">{message.role}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(message.createdAt)}
                  </span>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {message.content}
                </div>
                {message.imageUrls && message.imageUrls.length > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    📷 {message.imageUrls.length} image(s)
                  </div>
                )}
                {message.status === 'error' && (
                  <div className="mt-1 text-xs text-red-600">⚠️ Error</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scene Iterations - ENHANCED REASONING FLOW */}
      {projectDetails.sceneIterations.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Scene Iterations & AI Reasoning Flow ({projectDetails.sceneIterations.length})
          </h2>
          <div className="space-y-4">
            {projectDetails.sceneIterations.map((iteration: any, index: any) => (
              <details key={iteration.id} className="border rounded-lg overflow-hidden">
                <summary className="cursor-pointer bg-gray-50 px-4 py-3 hover:bg-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {projectDetails.scenes.find((s: any) => s.id === iteration.sceneId)?.name || 'Unknown Scene'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {iteration.operationType} • {iteration.editComplexity} • {iteration.modelUsed}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{formatDate(iteration.createdAt)}</span>
                    {iteration.generationTimeMs && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        {Math.round(iteration.generationTimeMs / 1000)}s
                      </span>
                    )}
                  </div>
                </summary>
                
                <div className="p-4 space-y-6 bg-white">
                  {/* 1. User Input */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">👤 User Request</h4>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{iteration.userPrompt}</p>
                    </div>
                  </div>

                  {/* 2. Brain Reasoning */}
                  {iteration.brainReasoning && (
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h4 className="font-semibold text-gray-900 mb-2">🧠 Brain LLM Decision Making</h4>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{iteration.brainReasoning}</p>
                      </div>
                    </div>
                  )}

                  {/* 3. Tool Reasoning */}
                  {(iteration.toolReasoning && typeof iteration.toolReasoning === 'string') && (
                    <div className="border-l-4 border-green-500 pl-4">
                      <h4 className="font-semibold text-gray-900 mb-2">🛠️ Tool Execution Reasoning</h4>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{iteration.toolReasoning as string}</p>
                      </div>
                    </div>
                  )}

                  {/* 4. Code Changes */}
                  {(iteration.codeBefore || iteration.codeAfter) && (
                    <div className="border-l-4 border-orange-500 pl-4">
                      <h4 className="font-semibold text-gray-900 mb-2">📝 Code Changes</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {iteration.codeBefore && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Before:</h5>
                            <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs overflow-x-auto max-h-64">
                              <code>{iteration.codeBefore.slice(0, 1000)}{iteration.codeBefore.length > 1000 ? '...' : ''}</code>
                            </pre>
                          </div>
                        )}
                        {iteration.codeAfter && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">After:</h5>
                            <pre className="bg-green-50 border border-green-200 rounded p-3 text-xs overflow-x-auto max-h-64">
                              <code>{iteration.codeAfter.slice(0, 1000)}{iteration.codeAfter.length > 1000 ? '...' : ''}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 5. Structured Changes */}
                  {(iteration.changesApplied !== null && iteration.changesApplied !== undefined) || (iteration.changesPreserved !== null && iteration.changesPreserved !== undefined) ? (
                    <div className="border-l-4 border-teal-500 pl-4">
                      <h4 className="font-semibold text-gray-900 mb-2">🔄 Change Analysis</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {(iteration.changesApplied !== null && iteration.changesApplied !== undefined) && (
                          <div>
                            <h5 className="text-sm font-medium text-green-700 mb-2">✅ Changes Applied:</h5>
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                                {(() => {
                                  try {
                                    return typeof iteration.changesApplied === 'string' 
                                      ? iteration.changesApplied 
                                      : JSON.stringify(iteration.changesApplied, null, 2);
                                  } catch {
                                    return 'Unable to display changes data';
                                  }
                                })()}
                              </pre>
                            </div>
                          </div>
                        )}
                        {(iteration.changesPreserved !== null && iteration.changesPreserved !== undefined) && (
                          <div>
                            <h5 className="text-sm font-medium text-blue-700 mb-2">🔒 Changes Preserved:</h5>
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <pre className="text-xs text-gray-800 whitespace-pre-wrap">
                                {(() => {
                                  try {
                                    return typeof iteration.changesPreserved === 'string'
                                      ? iteration.changesPreserved
                                      : JSON.stringify(iteration.changesPreserved, null, 2);
                                  } catch {
                                    return 'Unable to display changes data';
                                  }
                                })()}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* 6. Performance Metrics */}
                  <div className="border-l-4 border-gray-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📊 Performance Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-700">Model</div>
                        <div className="text-lg font-semibold text-gray-900">{iteration.modelUsed}</div>
                      </div>
                      {iteration.generationTimeMs && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm font-medium text-gray-700">Generation Time</div>
                          <div className="text-lg font-semibold text-gray-900">{Math.round(iteration.generationTimeMs / 1000)}s</div>
                        </div>
                      )}
                      {iteration.temperature && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm font-medium text-gray-700">Temperature</div>
                          <div className="text-lg font-semibold text-gray-900">{iteration.temperature}</div>
                        </div>
                      )}
                      {iteration.tokensUsed && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-sm font-medium text-gray-700">Tokens Used</div>
                          <div className="text-lg font-semibold text-gray-900">{iteration.tokensUsed.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Project Memory */}
      {projectDetails.projectMemory.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Project Memory ({projectDetails.projectMemory.length})
          </h2>
          <div className="space-y-3">
            {projectDetails.projectMemory.map((memory: any) => (
              <div key={memory.id} className="border-l-4 border-blue-400 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {memory.memoryType}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(memory.createdAt)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {memory.memoryValue.slice(0, 100)}
                  {memory.memoryValue.length > 100 && '...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 