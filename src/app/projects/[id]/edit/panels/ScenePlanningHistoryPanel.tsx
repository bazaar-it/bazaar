// src/app/projects/[id]/edit/panels/ScenePlanningHistoryPanel.tsx

"use client";

import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '~/trpc/react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from "~/components/ui/button";
import { 
  ChevronDown, 
  ChevronUp, 
  Loader2Icon, 
  PlayIcon, 
  RefreshCwIcon, 
  AlertCircleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  CodeIcon,
  PaletteIcon,
  LayersIcon,
  TypeIcon,
  BoxIcon,
  EyeIcon
} from "lucide-react";
import { useImageAnalysis } from "~/hooks/useImageAnalysis";
import { TimelineContext } from '~/components/client/Timeline/TimelineContext';
import { useVideoState } from "~/stores/videoState";
import { type JsonPatch } from "~/types/json-patch";
import { TRPCClientError } from "@trpc/client";
import type { Operation } from "fast-json-patch";

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

// New interface for Animation Design Brief
interface AnimationDesignBrief {
  id: string;
  projectId: string;
  sceneId: string;
  status: string;
  errorMessage?: string | null;
  designBrief: any; // This holds the structured brief content
  llmModel: string;
  createdAt: Date;
  updatedAt: Date | null;
  componentJobId: string | null;
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

// Define PartialScenePlanInfo interface
interface PartialScenePlanInfo {
  sceneCount?: number;
  scenes?: Array<{description: string, durationInSeconds?: number}>;
  status: 'planning' | 'partial' | 'complete';
  planStartTime?: Date;
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
      className={`border-gray-100 border rounded-[15px] shadow-sm p-4 mb-4 text-center transition-colors ${dragActive ? 'border-blue-400 bg-blue-50/20' : 'border-gray-200 bg-gray-50/50'}`}
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

// Helper type for valid scene types
type ValidSceneType = "custom" | "text" | "image" | "background-color" | "shape" | 
  "gradient" | "particles" | "text-animation" | "split-screen" | "zoom-pan" | "svg-animation";

// Helper function to check if a string is a valid UUID
function isValidUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Helper function to ensure we have a valid UUID, generating a deterministic one if needed
function ensureValidUuid(sceneId: string): string {
  if (isValidUuid(sceneId)) {
    return sceneId;
  }
  
  // Browser-compatible deterministic UUID generation
  // This uses a simpler hash and conversion approach that works in browsers
  let hash = 0;
  for (let i = 0; i < sceneId.length; i++) {
    const char = sceneId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  
  // Generate a hex string padded to sufficient length
  const hex = ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  
  // Format properly as UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Where y is 8,9,a,b for variant 1 UUID
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1,4)}-a${hex.slice(4,7)}-${hex.slice(0,8)}${hex.slice(0,4)}`; 
}

// Helper function to extract scene planning details from message content
function extractScenePlanningInfo(
  messageContent: string | undefined | null, 
  messageCreatedAt?: Date
): PartialScenePlanInfo | null {
  if (messageContent === null || typeof messageContent === 'undefined') {
    return null; // No content to parse
  }
  const currentContent = messageContent; // Explicitly a string now

  const lowerMessage = currentContent.toLowerCase(); // Use currentContent
  let sceneCount: number | undefined;
  const extractedScenes: Array<{description: string, durationInSeconds?: number}> = [];
  let status: 'planning' | 'partial' | 'complete' = 'planning';

  // Check for explicit scene count (as in original function)
  const sceneCountMatch = (/i've planned your video with (\d+) scenes/i.exec(lowerMessage)) ?? 
                        (/planned (\d+) scenes for you/i.exec(lowerMessage));
  if (sceneCountMatch?.[1] && !isNaN(Number(sceneCountMatch[1]))) {
    sceneCount = parseInt(sceneCountMatch[1], 10);
  }

  // Regex to find scene descriptions and durations (from immediate-fixes.md)
  const sceneRegex = /Scene\s+\d+\s*:\s*([^()]+)(?:\s*\((\d+)s\))?/gi;
  let match;
  while ((match = sceneRegex.exec(currentContent)) !== null) { // Use currentContent
    // Ensure match and all required properties exist before accessing
    if (match && Array.isArray(match) && match.length >= 2 && match[1]) {
      extractedScenes.push({
        description: match[1].trim(),
        durationInSeconds: (match[2] && typeof match[2] === 'string' && !isNaN(Number(match[2]))) ? parseInt(match[2], 10) : undefined
      });
    }
  }

  if (extractedScenes.length > 0) {
    status = sceneCount && extractedScenes.length === sceneCount ? 'complete' : 'partial';
  } else if (lowerMessage.includes("planning") || lowerMessage.includes("working on")) {
    status = 'planning';
  }
  
  // Further refine status based on scene count and extracted scenes
  if (sceneCount && extractedScenes.length > 0 && extractedScenes.length === sceneCount) {
    status = 'complete';
  } else if (extractedScenes.length > 0) {
    status = 'partial';
  } else if (lowerMessage.includes("planning your video") || lowerMessage.includes("generating scene plan")) {
    status = 'planning';
  }

  return { sceneCount, scenes: extractedScenes, status, planStartTime: messageCreatedAt };
}

// Helper function to render a color preview
const ColorPreview = ({ color, label }: { color: string; label: string }) => {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-4 h-4 rounded-full border border-gray-200" 
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-gray-600">{label}: <span className="text-gray-900">{color}</span></span>
    </div>
  );
};

// Helper function to render animation details
const AnimationDetails = ({ animation }: { animation: any }) => {
  return (
    <div className="text-xs border border-gray-100 rounded-md p-2 bg-gray-50">
      <div className="font-medium text-gray-700">{animation.animationType}</div>
      <div className="flex flex-wrap gap-x-4 mt-1">
        <span>Start: {animation.startAtFrame}</span>
        <span>Duration: {animation.durationInFrames}</span>
        <span>Easing: {animation.easing}</span>
      </div>
    </div>
  );
};

// Helper function to render component status
const ComponentStatus = ({ status, error }: { status: string; error?: string | null }) => {
  switch (status) {
    case 'complete':
      return (
        <div className="flex items-center gap-1.5 text-green-600">
          <CheckCircleIcon className="h-4 w-4" />
          <span className="text-xs font-medium">Complete</span>
        </div>
      );
    case 'building':
      return (
        <div className="flex items-center gap-1.5 text-amber-600">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          <span className="text-xs font-medium">Building</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-1.5 text-red-600" title={error || 'Unknown error'}>
          <AlertCircleIcon className="h-4 w-4" />
          <span className="text-xs font-medium">Error</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1.5 text-gray-500">
          <ClockIcon className="h-4 w-4" />
          <span className="text-xs font-medium">Pending</span>
        </div>
      );
  }
};

// Helper function to render brief status
const renderBriefStatus = (status: string): React.ReactNode => {
  if (status === 'pending') {
    return (
      <div className="flex items-center text-amber-500">
        <Loader2Icon className="h-3 w-3 mr-1 animate-spin" />
        <span className="text-xs">Generating...</span>
      </div>
    );
  } else if (status === 'complete') {
    return (
      <div className="flex items-center text-emerald-500">
        <div className="h-2 w-2 rounded-full bg-emerald-500 mr-1" />
        <span className="text-xs">Complete</span>
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-red-500">
        <div className="h-2 w-2 rounded-full bg-red-500 mr-1" />
        <span className="text-xs">Error</span>
      </div>
    );
  }
}

export default function ScenePlanningHistoryPanel() {
  // --- Scene editing state (top-level, fixes React Hooks order) ---
  const [editingSceneId, setEditingSceneId] = React.useState<string | null>(null);
  const [editedScenes, setEditedScenes] = React.useState<Record<string, Partial<ScenePlanScene>>>({});
  const params = useParams<{ id: string }>();
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [expandedBriefs, setExpandedBriefs] = useState<Record<string, boolean>>({});
  const [contextImages, setContextImages] = useState<Record<string, UploadedImage[]>>({});
  const [sceneImages, setSceneImages] = useState<Record<string, UploadedImage[]>>({});
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [tabSections, setTabSections] = useState<string[]>(['scenePlans', 'briefs']);
  const [latestPlan, setLatestPlan] = useState<string | null>(null);
  const imageAnalysis = useImageAnalysis();
  const [analyzingImg, setAnalyzingImg] = useState<Record<string, boolean>>({});
  const [imageTags, setImageTags] = useState<Record<string, string[]>>({});
  const [errorAlert, setErrorAlert] = useState<{ title: string; message: string } | null>(null);
  const [isOverallPlanningInProgress, setIsOverallPlanningInProgress] = useState<boolean>(false);
  const [partialPlanInfo, setPartialPlanInfo] = useState<PartialScenePlanInfo | null>(null);

  const timelineContext = useContext(TimelineContext);
  if (!timelineContext) {
    console.error("TimelineContext not found. ScenePlanningHistoryPanel might not function correctly.");
    return <div>Timeline context not available</div>;
  }
  const { updateFromScenePlan } = timelineContext;

  const { getCurrentProps, applyPatch } = useVideoState();
  const currentProps = getCurrentProps();
  const scenes = currentProps?.scenes ?? [];

  const projectId = params.id;
  
  const [briefsBySceneId, setBriefsBySceneId] = useState<Record<string, AnimationDesignBrief[]>>({});
  const [jobMap, setJobMap] = useState<Record<string, any>>({});
  
  const { 
    data: designBriefsData,
    isLoading: designBriefsLoading,
    refetch: refetchBriefs,
    error: briefsError
  } = api.animation.listDesignBriefs.useQuery(
    { projectId },
    { 
      enabled: !!projectId,
      refetchInterval: 5000
    }
  );
    
  useEffect(() => {
    if (briefsError) {
      console.error("Failed to fetch animation design briefs:", briefsError?.message || briefsError);
      setErrorAlert({
        title: "Error Fetching Briefs",
        message: briefsError.message || "Could not load animation design briefs for this project."
      });
    }
  }, [briefsError]);
  
  // CORRECTED: Organize briefs by sceneId and fetch component jobs
  useEffect(() => {
    if (designBriefsData) {
      const briefsByScene: Record<string, AnimationDesignBrief[]> = {};
      for (const brief of designBriefsData) {
        if (!briefsByScene[brief.sceneId]) {
          briefsByScene[brief.sceneId] = [];
        }
        (briefsByScene[brief.sceneId]!).push(brief);
      }
      setBriefsBySceneId(briefsByScene);
    }
  }, [designBriefsData]);

  // Get all component jobs for the project - this avoids individual queries
  const { data: componentJobs, isLoading: jobsLoading } = api.customComponent.listByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );
  
  // Map job data to briefIds when componentJobs data is available
  useEffect(() => {
    if (designBriefsData && componentJobs) {
      const newJobMap: Record<string, any> = {};
      
      // Find briefs with component job IDs
      const briefsWithComponents = designBriefsData.filter(
        (brief) => brief.componentJobId
      );
      
      // For each brief with a job, find the matching job in our componentJobs data
      briefsWithComponents.forEach((brief) => {
        if (!brief.componentJobId) return;
        
        const job = componentJobs.find(job => job.id === brief.componentJobId);
        if (job) {
          newJobMap[brief.id] = job;
        }
      });
      
      setJobMap(newJobMap);
    }
  }, [designBriefsData, componentJobs]);

  const { data: planningHistoryData, isLoading: planningHistoryLoading } = api.chat.getScenePlanningHistory.useQuery({
    projectId
  }, {
    refetchInterval: 5000,
  });
  
  const { data: chatMessages, isLoading: chatMessagesLoading } = api.chat.getMessages.useQuery(
    { projectId },
    { 
      enabled: !!projectId,
      refetchInterval: 3000
    }
  );
  
  useEffect(() => {
    if (planningHistoryData && planningHistoryData.length > 0) {
      setIsOverallPlanningInProgress(false);
      setPartialPlanInfo(null);
      return;
    }

    if (chatMessages && chatMessages.length > 0) {
      const latestAssistantMessage = chatMessages
        .filter(msg => msg.role === 'assistant' && msg.content)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (latestAssistantMessage) {
        const extractedInfo = extractScenePlanningInfo(latestAssistantMessage.content, latestAssistantMessage.createdAt);

        if (extractedInfo) {
          setPartialPlanInfo(prevPartialPlan => {
            if (!prevPartialPlan || 
                prevPartialPlan.sceneCount !== extractedInfo.sceneCount || 
                (prevPartialPlan.scenes?.length || 0) !== (extractedInfo.scenes?.length || 0) ||
                prevPartialPlan.status !== extractedInfo.status ||
                prevPartialPlan.planStartTime?.getTime() !== extractedInfo.planStartTime?.getTime()
            ) {
              if (extractedInfo.status === 'planning') {
                setIsOverallPlanningInProgress(true);
              } else if (extractedInfo.status === 'complete' || extractedInfo.status === 'partial') {
                const allDetailsFilled = extractedInfo.scenes && extractedInfo.sceneCount && 
                                         extractedInfo.scenes.length === extractedInfo.sceneCount && 
                                         extractedInfo.scenes.every(s => s.description !== 'Details generating...');
                setIsOverallPlanningInProgress(!allDetailsFilled);
              } else {
                setIsOverallPlanningInProgress(false);
              }
              return extractedInfo;
            }
            return prevPartialPlan;
          });
        } else if (latestAssistantMessage.content) {
          // This 'else if' means extractedInfo is null, but latestAssistantMessage.content exists.
          // This implies the message content was not recognized as a scene planning step.
          // If overall planning was in progress based on a *previous* partialPlanInfo,
          // and now we get a non-planning message, we might want to stop indicating overall planning.
          // For now, if extractedInfo is null, and we have no partialPlanInfo, there's nothing to update or change.
          // The original 'if (partialPlanInfo?.status === 'planning')' was contradictory here.
          // Planning status is primarily driven by positive extraction or final data loading.
        }
      }
    } else if (chatMessagesLoading && !partialPlanInfo) {
      setIsOverallPlanningInProgress(true);
      setPartialPlanInfo({ status: 'planning', planStartTime: new Date(), scenes: [] });
    }
  }, [chatMessages, planningHistoryData, chatMessagesLoading, partialPlanInfo]);
  
  const { 
    data: scenePlansQuery, 
    isLoading: scenePlansLoading, 
    error: scenePlansError, 
    refetch: refetchScenePlans 
  } = api.project.listScenePlans.useQuery(
    { projectId },
    { 
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError) {
          if (error.data?.httpStatus === 404 || error.data?.httpStatus === 401 || error.data?.httpStatus === 403) {
            return false;
          }
        }
        return failureCount < 2;
      },
    }
  );
  
  useEffect(() => {
    if (scenePlansError) {
      console.error("Failed to fetch scene plans:", scenePlansError?.message || scenePlansError);
      setErrorAlert({
        title: "Error Fetching Scene Plans",
        message: scenePlansError.message || "Could not load scene plans for this project."
      });
    }
  }, [scenePlansError]);
  
  const planningHistory = React.useMemo<ScenePlan[]>(() => {
    if (!planningHistoryData) return [];
    
    return planningHistoryData.map(plan => {
      const planData = plan.planData as ScenePlanData;
      return {
        ...plan,
        planData
      } as ScenePlan;
    });
  }, [planningHistoryData]);
  
  useEffect(() => {
    if (planningHistory.length > 0) {
      const firstPlan = planningHistory[0];
      if (firstPlan?.id) {
        setExpandedPlans(prev => ({
          ...prev,
          [firstPlan.id]: true
        }));
      }
    }
  }, [planningHistory]);
  
  const togglePlan = (planId: string) => {
    setExpandedPlans(prev => ({
      ...prev,
      [planId]: !prev[planId]
    }));
  };
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  const formatRelativeTime = (date: Date): string => {
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
  const handleRegenerate = (planId: string) => {
    console.log(`Regenerate plan ${planId} with images:`, contextImages[planId]);
    console.log("Regenerate Plan: Regeneration logic not yet implemented.");
  };

  const regeneratePlanMutation = api.chat.initiateChat.useMutation({
    onSuccess: (data: any) => {
      console.log("Plan Regeneration Started: The plan is being regenerated.");
      if (data?.messageId) {
      }
    },
    onError: (error: any) => {
      console.error("Failed to regenerate plan:", error.message);
    },
  });

  const regenerateBriefMutation = api.animation.generateDesignBrief.useMutation({
    onSuccess: (data: any) => {
      console.log("Brief Generation Started: The animation brief is being generated/regenerated.");
      refetchBriefs();
      setErrorAlert(null);
    },
    onError: (error: any) => {
      console.error("Failed to generate/regenerate brief:", error.message);
      setErrorAlert({
        title: "Brief Generation Failed",
        message: error.message || "An unexpected error occurred while trying to generate the brief."
      });
    },
  });

  const handleRegenerateBrief = (sceneId: string) => {
    if (!projectId) {
      setErrorAlert({ title: "Action Failed", message: "Project ID is missing. Cannot regenerate brief." });
      return;
    }

    const sceneToRegenerate = scenes.find(s => s.id === sceneId);

    if (!sceneToRegenerate) {
      setErrorAlert({ title: "Action Failed", message: `Scene with ID ${sceneId} not found.` });
      return;
    }

    const defaultWidth = 1920;
    const defaultHeight = 1080;
    const defaultFps = 30;

    const description = (sceneToRegenerate as any)?.description ?? "No description available";
    const durationInFrames = typeof (sceneToRegenerate as any)?.duration === 'number' 
      ? (sceneToRegenerate as any).duration 
      : defaultFps * 5;

    regenerateBriefMutation.mutate({
      projectId,
      sceneId,
      scenePurpose: description,
      sceneElementsDescription: description,
      dimensions: { 
        width: defaultWidth, 
        height: defaultHeight 
      },
      desiredDurationInFrames: durationInFrames,
    });
  };

  const formatBriefContent = (brief: AnimationDesignBrief): React.ReactNode => {
    if (brief.status === 'error') {
      return (
        <div className="text-xs text-destructive p-2 bg-destructive/10 rounded">
          <h5 className="font-semibold mb-1">Brief Generation Error:</h5>
          <p>{brief.errorMessage || "An unexpected error occurred during brief generation."}</p>
        </div>
      );
    }

    if (!brief.designBrief) return (
      <div className="text-xs text-muted-foreground p-2 bg-muted/20 rounded">
        No content available for this brief. It might be pending or have an issue.
      </div>
    );
    
    try {
      const { 
        sceneName, 
        scenePurpose, 
        elements = [], 
        durationInFrames,
        overallStyle,
        colorPalette,
        transitions = [],
        briefVersion
      } = brief.designBrief;
      
      return (
        <div className="brief-content space-y-2 text-xs">
          <div className="brief-section bg-muted/20 p-2 rounded">
            <h4 className="text-sm font-semibold mb-1">Scene Information</h4>
            <div className="grid grid-cols-2 gap-1">
              <div><span className="font-medium">Name:</span> {sceneName}</div>
              <div><span className="font-medium">Purpose:</span> {scenePurpose}</div>
              <div><span className="font-medium">Duration:</span> {durationInFrames} frames</div>
              {overallStyle && <div><span className="font-medium">Style:</span> {overallStyle}</div>}
              {briefVersion && <div><span className="font-medium">Version:</span> {briefVersion}</div>}
            </div>
          </div>
          
          {colorPalette && (
            <div className="brief-section bg-muted/20 p-2 rounded">
              <h4 className="text-sm font-semibold mb-1">Color Palette</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(colorPalette).map(([name, color], idx) => (
                  <div key={idx} className="flex items-center">
                    <div 
                      className="w-4 h-4 mr-1 rounded-sm border border-border" 
                      style={{ backgroundColor: typeof color === 'string' ? color : '#ccc' }}
                    />
                    <span>{name}: {typeof color === 'string' ? color : JSON.stringify(color)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {elements?.length > 0 && (
            <div className="brief-section bg-muted/20 p-2 rounded">
              <h4 className="text-sm font-semibold mb-1">Elements & Animations</h4>
              <div className="space-y-1">
                {elements.map((element: any, index: number) => (
                  <div key={index} className="p-1 bg-muted/30 rounded">
                    <div><span className="font-medium">Type:</span> {element.type}</div>
                    {element.content && <div><span className="font-medium">Content:</span> {element.content}</div>}
                    {element.position && (
                      <div><span className="font-medium">Position:</span> 
                        x:{element.position.x}, y:{element.position.y}
                      </div>
                    )}
                    {element.animations?.length > 0 && (
                      <div>
                        <span className="font-medium">Animations:</span>
                        <ul className="ml-4 list-disc">
                          {element.animations.map((anim: any, animIndex: number) => (
                            <li key={animIndex}>{anim.type}: {anim.timing}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {transitions?.length > 0 && (
            <div className="brief-section bg-muted/20 p-2 rounded">
              <h4 className="text-sm font-semibold mb-1">Transitions</h4>
              <ul className="ml-4 list-disc">
                {transitions.map((transition: any, index: number) => (
                  <li key={index}>{transition.type} at {transition.timing}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    } catch (e) {
      console.error("Error formatting brief content", e);
      return (
        <div>
          <div className="text-xs text-red-500 mb-2">
            Error formatting brief content. Raw data:
          </div>
          <pre className="text-[10px] p-2 bg-muted/30 rounded overflow-auto max-h-40">
            {JSON.stringify(brief.designBrief, null, 2)}
          </pre>
        </div>
      );
    }
  }

  const toggleBrief = (briefId: string) => {
    setExpandedBriefs(prev => ({
      ...prev,
      [briefId]: !prev[briefId]
    }));
  };

  if (planningHistoryLoading && !planningHistoryData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <Loader2Icon className="h-8 w-8 animate-spin mb-4" />
        <p>Loading scene planning history...</p>
      </div>
    );
  }
  
  if ((!planningHistoryData || planningHistoryData.length === 0) && isOverallPlanningInProgress) {
    return (
      <div className="flex flex-col h-full border border-gray-100 rounded-[15px] shadow-sm overflow-hidden">
        <ContextDropZone onImagesChange={setUploadedImages} />
        <div className="p-4 border-b border-border bg-background">
          <h3 className="text-lg font-semibold text-foreground">Scene Planning History</h3>
          <p className="text-sm text-muted-foreground">
            See how your video ideas were broken down into scenes
          </p>
        </div>
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="rounded-xl bg-secondary p-6 max-w-md w-full text-left">
            <div className="flex items-center gap-2 mb-3">
              <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
              <h3 className="text-lg font-medium">Scene Planning in Progress</h3>
            </div>
            {partialPlanInfo?.planStartTime && (
              <p className="text-xs text-muted-foreground mb-3">
                Started {formatDistanceToNow(new Date(partialPlanInfo.planStartTime))} ago
              </p>
            )}
            {(() => {
              const hasSceneCount = partialPlanInfo?.sceneCount && partialPlanInfo.sceneCount > 0;
              const actualScenes = partialPlanInfo?.scenes || [];

              if (hasSceneCount) {
                const displayScenes = Array.from({ length: partialPlanInfo.sceneCount! }, (_, i) => {
                  const existingScene = actualScenes[i];
                  return {
                    key: `placeholder-scene-${i}`,
                    number: i + 1,
                    description: existingScene?.description || "Planning details...",
                    durationInSeconds: existingScene?.durationInSeconds,
                    isPlaceholder: !existingScene
                  };
                });

                return (
                  <>
                    <p className="text-sm text-gray-800 mb-2">
                      Planning {partialPlanInfo.sceneCount} scenes ({actualScenes.length}/{partialPlanInfo.sceneCount} details received):
                    </p>
                    <ul className="space-y-2 text-sm bg-background/50 p-3 rounded-md max-h-60 overflow-y-auto">
                      {displayScenes.map((scene) => (
                        <li key={scene.key} className={`p-1 border-b border-border/50 last:border-b-0 flex justify-between items-center ${scene.isPlaceholder ? 'opacity-70' : ''}`}>
                          <div>
                            <span className="font-medium">Scene {scene.number}:</span> {scene.description}
                            {scene.durationInSeconds && <span className="text-xs text-muted-foreground"> ({scene.durationInSeconds}s)</span>}
                          </div>
                          {scene.isPlaceholder && <Loader2Icon className="h-3 w-3 ml-2 flex-shrink-0 animate-spin text-muted-foreground" />}
                        </li>
                      ))}
                    </ul>
                  </>
                );
              } else if (actualScenes.length > 0) {
                return (
                  <>
                    <p className="text-sm text-foreground mb-2">Planned scenes so far ({actualScenes.length}):</p>
                    <ul className="space-y-2 text-sm bg-background/50 p-3 rounded-md max-h-60 overflow-y-auto">
                      {actualScenes.map((scene, i) => (
                        <li key={`partial-scene-detail-${i}`} className="p-1 border-b border-border/50 last:border-b-0">
                          <span className="font-medium">Scene {i + 1}:</span> {scene.description}
                          {scene.durationInSeconds && <span className="text-xs text-muted-foreground"> ({scene.durationInSeconds}s)</span>}
                        </li>
                      ))}
                    </ul>
                  </>
                );
              } else {
                return (
                  <p className="text-sm text-muted-foreground mb-4">
                    Our AI is breaking down your request into individual scenes and planning durations.
                    This may take a minute.
                  </p>
                );
              }
            })()}
            <div className="flex items-center justify-center space-x-2 mt-4">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-0"></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-150"></div>
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (planningHistoryData?.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-700">No scene plans yet.</p>
        <p className="text-sm text-gray-600">Try planning a video in the chat!</p>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-white">
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
      <div className="p-4 border-b border-border bg-white">
        <h3 className="text-lg font-semibold text-gray-900">Scene Planning History</h3>
        <p className="text-sm text-gray-600">
          See how your video ideas were broken down into scenes
        </p>
      </div>
      <div className="flex-1 p-4 overflow-auto bg-white text-gray-800">
        {errorAlert && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg relative mb-4">
            <div className="flex items-center">
              <AlertCircleIcon className="h-4 w-4 mr-2" />
              <strong className="font-bold mr-2">{errorAlert.title}</strong>
              <span>{errorAlert.message}</span>
            </div>
          </div>
        )}
        {isOverallPlanningInProgress && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Loader2Icon className="h-4 w-4 animate-spin text-primary" />
              <h3 className="text-sm font-medium text-blue-800">Scene Planning in Progress</h3>
            </div>
            
            {(() => {
              const hasSceneCount = partialPlanInfo?.sceneCount && partialPlanInfo.sceneCount > 0;
              const actualScenes = partialPlanInfo?.scenes || [];

              if (hasSceneCount) {
                const displayScenes = Array.from({ length: partialPlanInfo.sceneCount! }, (_, i) => {
                  const existingScene = actualScenes[i];
                  return {
                    key: `placeholder-scene-${i}`,
                    number: i + 1,
                    description: existingScene?.description || "Planning details...",
                    durationInSeconds: existingScene?.durationInSeconds,
                    isPlaceholder: !existingScene
                  };
                });

                return (
                  <>
                    <p className="text-sm text-blue-700">Planning {partialPlanInfo.sceneCount} scenes ({actualScenes.length}/{partialPlanInfo.sceneCount} details received):</p>
                    <div className="space-y-2">
                      {displayScenes.map((scene) => (
                        <div key={scene.key} className={`text-sm ${scene.isPlaceholder ? 'opacity-70' : ''}`}>
                          <span className="font-medium text-blue-900">Scene {scene.number}:</span> {scene.description}
                          {scene.durationInSeconds && <span className="text-xs text-blue-600"> ({scene.durationInSeconds}s)</span>}
                          {scene.isPlaceholder && <Loader2Icon className="h-3 w-3 ml-2 flex-shrink-0 animate-spin text-blue-500" />}
                        </div>
                      ))}
                    </div>
                  </>
                );
              } else if (actualScenes.length > 0) {
                return (
                  <>
                    <p className="text-sm text-blue-700">Planned scenes so far ({actualScenes.length}):</p>
                    <div className="space-y-2">
                      {actualScenes.map((scene, i) => (
                        <div key={`partial-scene-detail-${i}`} className="text-sm text-blue-800">
                          <span className="font-medium">Scene {i + 1}:</span> {scene.description}
                          {scene.durationInSeconds && <span className="text-xs text-blue-600"> ({scene.durationInSeconds}s)</span>}
                        </div>
                      ))}
                    </div>
                  </>
                );
              } else {
                return (
                  <p className="text-sm text-blue-700">
                    Our AI is breaking down your request into individual scenes and planning durations.
                    This may take a minute.
                  </p>
                );
              }
            })()}
            
            {!partialPlanInfo && (
              <p className="text-sm">Starting to plan your video scenes. Please wait...</p>
            )}
          </div>
        )}
        {planningHistory.map((plan, pIdx) => (
          <div key={`${plan.id}-${pIdx}`} className="mb-6 flex flex-col gap-2">
            <div
              onClick={() => togglePlan(plan.id)}
              className={`cursor-pointer rounded-[15px] shadow-sm px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">Version {plan.planData?.fps === 30 ? 'o4-mini' : 'legacy'}</span>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">✓ Complete</span>
                </div>
                <p className="text-xs text-gray-600">
                  {formatRelativeTime(plan.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegenerate(plan.id);
                  }}
                  size="sm"
                  className="h-8 text-xs flex gap-1.5"
                >
                  <RefreshCwIcon className="h-3.5 w-3.5" />
                  Regenerate
                </Button>
                <ChevronDown className={`h-5 w-5 transform transition-transform ${expandedPlans[plan.id] ? 'rotate-180' : ''}`} />
              </div>
            </div>
            
            {expandedPlans[plan.id] && (
              <div className="bg-white rounded-[15px] shadow-sm overflow-hidden">
                <div className="text-gray-800 text-sm">
                  {plan.planData?.scenes?.map((scene: ScenePlanScene, idx: number) => {
                    const editedScene = editedScenes[scene.id] || {};
                    const isEditing = editingSceneId === scene.id;
                    const latestScene = {
                      ...scene,
                      ...editedScene,
                    };
                    
                    const handleEditClick = () => {
                      setEditingSceneId(scene.id);
                      setEditedScenes({
                        ...editedScenes,
                        [scene.id]: {
                          ...editedScenes[scene.id],
                        },
                      });
                    };
                    
                    const handleSave = () => {
                      setEditingSceneId(null);
                      
                      const patchOps: JsonPatch = [];
                      
                      if (typeof editedScenes[scene.id]?.description === 'string') {
                        patchOps.push({
                          op: 'replace',
                          path: `/scenes/${idx}/description`,
                          value: editedScenes[scene.id]?.description,
                        });
                      }
                      
                      if (typeof editedScenes[scene.id]?.durationInSeconds === 'number') {
                        patchOps.push({
                          op: 'replace',
                          path: `/scenes/${idx}/durationInSeconds`,
                          value: editedScenes[scene.id]?.durationInSeconds,
                        });
                      }
                      
                      if (patchOps.length > 0) {
                        applyPatch(projectId, patchOps as Operation[]);
                      }
                    };
                    
                    return (
                      <div key={scene.id} className="mb-4 last:mb-0">
                        <div className="bg-white p-4 rounded-lg border border-gray-100">
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 text-gray-900">Scene Information</h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                              <div>
                                <div className="text-xs text-gray-600 mb-1">Name:</div>
                                <div className="font-medium text-gray-900">Scene {idx + 1}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 mb-1">Purpose:</div>
                                <div className="text-gray-800">{latestScene.description}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 mb-1">Duration:</div>
                                <div className="font-medium text-gray-900">{latestScene.durationInSeconds} frames</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-600 mb-1">Version:</div>
                                <div className="text-gray-900">1.0</div>
                              </div>
                            </div>
                          </div>
                          
                          {briefsBySceneId && scene.id && (briefsBySceneId[scene.id]?.length ?? 0) > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <h4 className="text-sm font-semibold mb-2 text-gray-900">Animation Design Briefs</h4>
                              <div className="space-y-2">
                                {briefsBySceneId[scene.id]?.map((brief) => (
                                  <div key={brief.id} className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <span className="text-xs font-medium text-gray-900">Model: {brief.llmModel}</span>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          Created {formatDistanceToNow(new Date(brief.createdAt), { addSuffix: true })}
                                        </div>
                                      </div>
                                      {renderBriefStatus(brief.status)}
                                    </div>
                                    
                                    <div 
                                      className="cursor-pointer flex items-center mt-2 text-xs text-gray-600 hover:text-gray-900"
                                      onClick={() => {
                                        setExpandedBriefs(prev => ({
                                          ...prev,
                                          [brief.id]: !prev[brief.id]
                                        }));
                                      }}
                                    >
                                      <span>
                                        {expandedBriefs[brief.id] ? 'Hide Details' : 'Show Details'}
                                      </span>
                                      {expandedBriefs[brief.id] ? (
                                        <ChevronUp className="h-3 w-3 ml-1" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3 ml-1" />
                                      )}
                                    </div>
                                    
                                    {expandedBriefs[brief.id] && renderBriefDetails(brief, jobMap)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-4 flex justify-end gap-2">
                            <Button 
                              onClick={() => handleRegenerateBrief(scene.id)}
                              size="sm"
                              className="h-8 text-xs"
                            >
                              Generate Design Brief
                            </Button>
                            <Button
                              type="button"
                              onClick={handleEditClick}
                              size="sm"
                              className="h-8 text-xs"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-gray-100 p-4">
                  <h4 className="text-xs font-semibold mb-2 text-gray-900">Total Duration: {Math.round(plan.planData?.totalDuration || 0)}s at {plan.planData?.fps || 30} FPS</h4>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        if (plan.planData && plan.planData.scenes) {
                          const formattedScenes = plan.planData.scenes.map(scene => ({
                            id: scene.id,
                            type: scene.effectType || 'text',
                            durationInFrames: Math.round((scene.durationInSeconds || 3) * 30)
                          }));
                          updateFromScenePlan(formattedScenes);
                          setLatestPlan(plan.id);
                        }
                      }}
                      className="text-xs h-8 flex items-center gap-1"
                    >
                      <PlayIcon className="h-3 w-3" />
                      Apply to Timeline
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const renderBriefDetails = (brief: AnimationDesignBrief, currentJobMap: Record<string, any>) => {
  if (!brief.designBrief) return null;
  
  const { colorPalette, elements } = brief.designBrief;
  
  return (
    <div className="mt-2 space-y-3">
      {colorPalette && (
        <div>
          <h5 className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
            <PaletteIcon className="h-3.5 w-3.5 text-gray-500" />
            <span>Color Palette</span>
          </h5>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {colorPalette.background && (
              <ColorPreview color={colorPalette.background} label="Background" />
            )}
            {colorPalette.primary && (
              <ColorPreview color={colorPalette.primary} label="Primary" />
            )}
            {colorPalette.secondary && (
              <ColorPreview color={colorPalette.secondary} label="Secondary" />
            )}
            {colorPalette.textPrimary && (
              <ColorPreview color={colorPalette.textPrimary} label="Text" />
            )}
            {colorPalette.accent && (
              <ColorPreview color={colorPalette.accent} label="Accent" />
            )}
          </div>
        </div>
      )}
      
      {elements && elements.length > 0 && (
        <div>
          <h5 className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
            <LayersIcon className="h-3.5 w-3.5 text-gray-500" />
            <span>Scene Elements ({elements.length})</span>
          </h5>
          <div className="space-y-2 mt-1">
            {elements.slice(0, 3).map((element: any, idx: number) => (
              <div key={element.elementId || idx} className="border border-gray-100 rounded-md p-2 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {element.elementType === 'text' ? (
                      <TypeIcon className="h-3.5 w-3.5 text-blue-500" />
                    ) : element.elementType === 'shape' ? (
                      <BoxIcon className="h-3.5 w-3.5 text-purple-500" />
                    ) : (
                      <LayersIcon className="h-3.5 w-3.5 text-gray-500" />
                    )}
                    <span className="text-xs font-medium">{element.name || `Element ${idx + 1}`}</span>
                  </div>
                  <span className="text-xs text-gray-500">{element.elementType}</span>
                </div>
                
                {element.content && (
                  <div className="text-xs mt-1 text-gray-700 truncate">
                    "{element.content.substring(0, 40)}{element.content.length > 40 ? '...' : ''}"
                  </div>
                )}
                
                {element.animations && element.animations.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">{element.animations.length} Animation{element.animations.length !== 1 ? 's' : ''}</div>
                    <div className="space-y-1">
                      {element.animations.slice(0, 1).map((animation: any, animIdx: number) => (
                        <AnimationDetails key={animation.animationId || animIdx} animation={animation} />
                      ))}
                      {element.animations.length > 1 && (
                        <div className="text-xs text-gray-500 italic">+{element.animations.length - 1} more...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {elements.length > 3 && (
              <div className="text-xs text-gray-500 text-center italic">+{elements.length - 3} more elements</div>
            )}
          </div>
        </div>
      )}
      
      {brief.componentJobId && currentJobMap?.[brief.id] && (
        <div>
          <h5 className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
            <CodeIcon className="h-3.5 w-3.5 text-gray-500" />
            Component
          </h5>
          <div className="border border-gray-100 rounded-md p-2 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{currentJobMap[brief.id]?.name || 'Unnamed Component'}</span>
              <ComponentStatus 
                status={currentJobMap[brief.id]?.status || 'unknown'} 
                error={currentJobMap[brief.id]?.errorMessage} 
              />
            </div>
            {currentJobMap[brief.id]?.status === 'complete' && (
              <div className="flex justify-end mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    const outputUrl = currentJobMap[brief.id]?.outputUrl;
                    if (outputUrl) {
                      window.open(outputUrl, '_blank');
                    }
                  }}
                >
                  Preview <EyeIcon className="ml-1.5 h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
