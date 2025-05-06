"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '~/trpc/react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from "~/components/ui/button";
import { ChevronDown, ChevronUp, Loader2Icon } from "lucide-react";
import { useImageAnalysis } from "~/hooks/useImageAnalysis";

// Interfaces that match the database schema
interface ScenePlanScene {
  id: string;
  description: string;
  durationInSeconds: number;
  effectType: string;
}

interface ScenePlanData {
  intent: string;
  reasoning: string;
  scenes: ScenePlanScene[];
  sceneCount: number;
  totalDuration: number;
  fps: number;
}

interface ScenePlan {
  id: string;
  projectId: string;
  messageId: string | null;
  rawReasoning: string;
  planData: ScenePlanData;
  userPrompt: string;
  createdAt: Date;
}

// Type for the API response
type ApiScenePlan = {
  id: string;
  projectId: string;
  messageId: string | null;
  rawReasoning: string;
  planData: unknown;
  userPrompt: string;
  createdAt: Date;
};

// New type for uploaded images
interface UploadedImage {
  id: string;
  file: File;
  url: string;
}

// ContextDropZone: simple drag-and-drop UI, no backend
function ContextDropZone({ onImagesChange }: { onImagesChange: (imgs: UploadedImage[]) => void }) {
  const [dragActive, setDragActive] = React.useState(false);
  const [droppedFiles, setDroppedFiles] = React.useState<File[]>([]);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setDroppedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      const imgs = files.map(file => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }));
      onImagesChange(imgs);
    }
  }
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dragActive ? 'border-blue-400 bg-blue-50/20' : 'border-border bg-background'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{ minHeight: 80 }}
    >
      <div className="text-sm mb-2">Drag and drop files, images, or links here.<br/> (UI only, no upload yet)</div>
      {droppedFiles.length > 0 && (
        <ul className="text-xs text-left mt-2">
          {droppedFiles.map((file, i) => (
            <li key={i} className="truncate">{file.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ScenePlanningHistoryPanel() {
  // --- Scene editing state (top-level, fixes React Hooks order) ---
  const [editingSceneId, setEditingSceneId] = React.useState<string | null>(null);
  const [editedScenes, setEditedScenes] = React.useState<Record<string, Partial<ScenePlanScene>>>({});
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  // Separate tab state for reasoning/context
  const [tabSections, setTabSections] = useState<Record<string, 'reasoning' | 'context'>>({});
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [sceneImages, setSceneImages] = useState<Record<string, UploadedImage[]>>({});
  const { analyzeImage } = useImageAnalysis();
  const [imageTags, setImageTags] = useState<Record<string, string[]>>({});
  const [analyzingImg, setAnalyzingImg] = useState<Record<string, boolean>>({});
  // Fetch planning history data
  const { data: planningHistoryData } = api.chat.getScenePlanningHistory.useQuery({
    projectId
  }, {
    refetchInterval: 5000, // Auto refresh every 5 seconds
  });

  // Type safe history data
  const planningHistory = React.useMemo<ScenePlan[]>(() => {
    if (!planningHistoryData) return [];
    
    return planningHistoryData.map(plan => {
      // Ensure plan.planData is properly typed
      const planData = plan.planData as ScenePlanData;
      return {
        ...plan,
        planData
      } as ScenePlan;
    });
  }, [planningHistoryData]);
  
  // Auto-expand the most recent plan when data loads
  useEffect(() => {
    if (planningHistory.length > 0) {
      const firstPlan = planningHistory[0];
      if (firstPlan && firstPlan.id) {
        setExpandedPlans(prev => ({
          ...prev,
          [firstPlan.id]: true
        }));
      }
    }
  }, [planningHistory]);
  
  // Toggle a plan's expanded state
  const togglePlan = (planId: string) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };
  
  // Toggle a section within a plan
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Format relative time
  const formatRelativeTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Stub handler for regenerating a plan with attached images
  const handleRegenerate = (planId: string) => {
    console.log('Regenerating plan:', planId, 'with image attachments:', sceneImages);
    // TODO: call tRPC mutation e.g. api.chat.regenerateScene.mutate({ planId, attachments: sceneImages });
  };
  
  // Analyze image using vision stub
  const handleAnalyzeImage = async (img: UploadedImage) => {
    setAnalyzingImg(prev => ({ ...prev, [img.id]: true }));
    const tags = await analyzeImage(img.url);
    setImageTags(prev => ({ ...prev, [img.id]: tags }));
    setAnalyzingImg(prev => ({ ...prev, [img.id]: false }));
  };
  
  if (planningHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <p>No scene planning history yet.</p>
        <p className="text-sm">Try planning a video in the chat!</p>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background">
      {/* Image upload context */}
      <ContextDropZone onImagesChange={setUploadedImages} />
      {uploadedImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto my-4">
          {uploadedImages.map(img => (
            <img
              key={img.id}
              src={img.url}
              className="h-16 w-16 object-cover rounded"
              draggable
              onDragStart={e => e.dataTransfer.setData('imageId', img.id)}
            />
          ))}
        </div>
      )}
      <div className="p-4 border-b border-border bg-background">
        <h3 className="text-lg font-semibold text-foreground">Scene Planning History</h3>
        <p className="text-sm text-muted-foreground">
          See how your video ideas were broken down into scenes
        </p>
      </div>
      <div className="flex-1 p-4 overflow-auto bg-background">
        {planningHistory.map((plan) => (
          <div key={plan.id} className="mb-6 flex flex-col gap-2">
            {/* Header bubble */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => togglePlan(plan.id)}
            >
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-1">
                  {formatRelativeTime(plan.createdAt)} &bull; {plan.planData.sceneCount} scenes &bull; {plan.planData.totalDuration}s
                </div>
                <div className="font-medium text-foreground truncate">
                  {plan.userPrompt}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {expandedPlans[plan.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </Button>
            </div>
            {expandedPlans[plan.id] && (
              <div className="flex flex-col gap-4 mt-1">
                {/* User Request bubble */}
                <div className="rounded-xl bg-secondary text-foreground p-4 shadow-sm">
                  <div className="text-xs font-medium mb-1 text-muted-foreground">User Request</div>
                  <div className="whitespace-pre-line break-words text-sm">{plan.userPrompt}</div>
                </div>
                {/* LLM Reasoning + Context Tabs bubble */}
                <div className="rounded-xl bg-secondary text-foreground p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      className={`text-xs font-medium px-2 py-1 rounded transition-colors ${tabSections[plan.id] !== 'context' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => setTabSections(prev => ({ ...prev, [plan.id]: 'reasoning' }))}
                    >LLM Reasoning</button>
                    <button
                      className={`text-xs font-medium px-2 py-1 rounded transition-colors ${tabSections[plan.id] === 'context' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                      onClick={() => setTabSections(prev => ({ ...prev, [plan.id]: 'context' }))}
                    >Context</button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0 ml-auto" onClick={() => toggleSection(`${plan.id}-reasoning`)}>
                      {expandedSections[`${plan.id}-reasoning`] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </Button>
                  </div>
                  {expandedSections[`${plan.id}-reasoning`] && (
                    <>
                      {tabSections[plan.id] === 'context' ? (
                        <ContextDropZone onImagesChange={setUploadedImages} />
                      ) : (
                        <div className="whitespace-pre-line break-words text-sm">{plan.planData.reasoning}</div>
                      )}
                    </>
                  )}
                </div>
                {/* Scenes bubble */}
                <div className="rounded-xl bg-secondary text-foreground p-4 shadow-sm">
                  <div className="text-xs font-medium mb-2 text-muted-foreground">Scenes</div>
                   <div className="flex flex-col gap-3">
                    {/* Scene editing state is managed at the component level */}
                    {plan.planData.scenes.map((scene, idx) => {
                      const isEditing = editingSceneId === scene.id;
                      const editedScene = editedScenes[scene.id] || scene;

                      const handleEditClick = () => {
                        setEditingSceneId(scene.id);
                        setEditedScenes(prev => ({
                          ...prev,
                          [scene.id]: {
                            id: scene.id,
                            description: scene.description,
                            durationInSeconds: scene.durationInSeconds,
                            effectType: scene.effectType,
                          }
                        }));
                      };

                      const handleSave = () => {
                        setEditingSceneId(null);
                        // Optionally: persist editedScenes[scene.id] to backend here
                      };

                      return (
                        <div
                          key={scene.id}
                          className="rounded-lg bg-background border border-border p-3"
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => {
                            e.preventDefault();
                            const imageId = e.dataTransfer.getData('imageId');
                            const img = uploadedImages.find(i => i.id === imageId);
                            if (img) {
                              setSceneImages(prev => ({
                                ...prev,
                                [scene.id]: [...(prev[scene.id] || []), img],
                              }));
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            {!isEditing ? (
                              <>
                                <span className="font-medium text-sm">Scene {idx + 1}: {scene.effectType}</span>
                                <div className="flex gap-2 items-center">
                                  <span className="text-xs text-muted-foreground">Duration: {scene.durationInSeconds}s</span>
                                  <button className="ml-2 text-xs text-blue-500 underline" onClick={handleEditClick}>Edit</button>
                                </div>
                              </>
                            ) : (
                              <>
                                <input
                                  className="font-medium text-sm border rounded px-1 py-0.5 mr-2 w-32"
                                  value={editedScene.effectType || ''}
                                  onChange={e => setEditedScenes(prev => ({
                                    ...prev,
                                    [scene.id]: { ...editedScene, effectType: e.target.value }
                                  }))}
                                  placeholder="Type"
                                />
                                <input
                                  className="text-xs border rounded px-1 py-0.5 w-20 mr-2"
                                  type="number"
                                  value={editedScene.durationInSeconds || 0}
                                  onChange={e => setEditedScenes(prev => ({
                                    ...prev,
                                    [scene.id]: { ...editedScene, durationInSeconds: Number(e.target.value) }
                                  }))}
                                  placeholder="Duration"
                                  min={1}
                                />
                                <button className="text-xs text-green-600 underline" onClick={handleSave}>Save</button>
                              </>
                            )}
                          </div>
                          {!isEditing ? (
                            <div className="text-sm whitespace-pre-line">{scene.description}</div>
                          ) : (
                            <textarea
                              className="text-sm border rounded px-1 py-0.5 w-full"
                              value={editedScene.description || ''}
                              onChange={e => setEditedScenes(prev => ({
                                ...prev,
                                [scene.id]: { ...editedScene, description: e.target.value }
                              }))}
                              rows={2}
                            />
                          )}
                          {/* Attached images */}
                          {sceneImages[scene.id]?.map(img => (
                            <div key={img.id} className="flex flex-col items-center">
                              <img src={img.url} className="h-10 w-10 object-cover rounded" />
                              <button
                                onClick={() => handleAnalyzeImage(img)}
                                className="text-xs text-blue-500 underline mt-1"
                              >
                                Analyze
                              </button>
                              {(analyzingImg[img.id] ?? false) && <Loader2Icon className="animate-spin mt-1 h-4 w-4" />}
                              {(imageTags[img.id]?.length ?? 0) > 0 && (
                                <div className="text-xs mt-1">{imageTags[img.id]?.join(', ')}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    <div className="flex justify-end mt-2 gap-2">
                      <button
                        onClick={() => handleRegenerate(plan.id)}
                        className="bg-muted px-4 py-2 w-24 rounded text-xs border border-border"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>
                {/* Total Duration bubble */}
                <div className="rounded-xl bg-secondary text-muted-foreground text-xs p-3 text-right">
                  Total Duration: {plan.planData.totalDuration}s at {plan.planData.fps} FPS
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
