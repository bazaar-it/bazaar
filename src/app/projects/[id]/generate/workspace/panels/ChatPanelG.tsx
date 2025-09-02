// src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { Loader2, Send, ImageIcon, Sparkles, Github, X } from 'lucide-react';
import { Icon } from '@iconify/react';
import { cn } from "~/lib/cn";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { GeneratingMessage } from "~/components/chat/GeneratingMessage";
import { MediaUpload, type UploadedMedia, createMediaUploadHandlers } from "~/components/chat/MediaUpload";
import { type DraftAttachment, type DbMessage } from "~/stores/videoState";
import { AudioTrimPanel } from "~/components/audio/AudioTrimPanel";
import { VoiceInput } from "~/components/chat/VoiceInput";
import { AssetMentionAutocomplete } from "~/components/chat/AssetMentionAutocomplete";

import { 
  parseAssetMentions, 
  resolveAssetMentions, 
  getAssetSuggestions, 
  getMentionContext,
  type AssetMention 
} from "~/lib/utils/asset-mentions";
import { useAutoFix } from "~/hooks/use-auto-fix";
import { useSSEGeneration } from "~/hooks/use-sse-generation";
import { PurchaseModal } from "~/components/purchase/PurchaseModal";
import { extractYouTubeUrl } from "~/brain/tools/youtube-analyzer";


// Component message representation for UI display
interface ComponentMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  status?: "pending" | "error" | "success" | "building" | "tool_calling";
  kind?: "text" | "error" | "status" | "tool_result" | "scene_plan";
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
}

interface ChatPanelGProps {
  projectId: string;
  selectedSceneId: string | null;
  onSceneGenerated?: (sceneId: string) => void;
  userId?: string;
}

// Helper functions to convert between UploadedMedia and DraftAttachment
const convertToDraftAttachment = (media: UploadedMedia): DraftAttachment => ({
  id: media.id,
  status: media.status,
  url: media.url,
  error: media.error,
  type: media.type,
  isLoaded: media.isLoaded,
  duration: media.duration,
  name: media.file.name,
  fileName: media.file.name,
  fileSize: media.file.size,
  mimeType: media.file.type,
});

const convertFromDraftAttachment = (draft: DraftAttachment): UploadedMedia => ({
  id: draft.id,
  file: new File([], draft.fileName || 'file', { type: draft.mimeType || 'application/octet-stream' }),
  status: draft.status,
  url: draft.url,
  error: draft.error,
  type: draft.type,
  isLoaded: draft.isLoaded,
  duration: draft.duration,
});

export default function ChatPanelG({
  projectId,
  selectedSceneId,
  onSceneGenerated,
  userId,
}: ChatPanelGProps) {
  // Get draft message and attachments from store to persist across panel changes
  const draftMessage = useVideoState((state) => state.getDraftMessage(projectId));
  const draftAttachments = useVideoState((state) => state.getDraftAttachments(projectId));
  const setDraftMessage = useVideoState((state) => state.setDraftMessage);
  const setDraftAttachments = useVideoState((state) => state.setDraftAttachments);
  const clearDraft = useVideoState((state) => state.clearDraft);
  const [message, setMessage] = useState(draftMessage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<'thinking' | 'generating'>('thinking');
  const [generationComplete, setGenerationComplete] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('claude-sonnet-4-20250514'); // Default model
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  
  // Asset mention state
  const [mentionSuggestions, setMentionSuggestions] = useState<AssetMention[]>([]);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const activeAssistantMessageIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  
  // Use draft attachments from VideoState instead of local state
  const [uploadedImages, setUploadedImages] = useState<UploadedMedia[]>(
    draftAttachments.map(convertFromDraftAttachment)
  );
  const [selectedIcons, setSelectedIcons] = useState<string[]>([]); // Track selected icons
  const [selectedScenes, setSelectedScenes] = useState<{ id: string; index: number; name: string }[]>([]); // Dragged scene mentions
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // GitHub mode state - smart auto-detection
  const [isGitHubMode, setIsGitHubMode] = useState(false);
  const [githubModeSource, setGitHubModeSource] = useState<'manual' | 'drag' | 'auto' | null>(null);
  
  // Figma mode state - smart auto-detection
  const [isFigmaMode, setIsFigmaMode] = useState(false);
  const [figmaModeSource, setFigmaModeSource] = useState<'manual' | 'drag' | 'auto' | null>(null);
  
  // 🚨 NEW: Auto-expanding textarea state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Character limit for URL safety (12KB for Vercel)
  const SAFE_CHARACTER_LIMIT = 12000;
  
  // Fetch user assets for @mentions
  const { data: userAssets } = api.project.getUserUploads.useQuery();
  

  
  // Check if user has GitHub connected and get discovered components
  const { data: githubConnection } = api.github.getConnection.useQuery();
  const { data: discoveredComponents } = api.githubDiscovery.discoverComponents.useQuery(
    { forceRefresh: false },
    { enabled: !!githubConnection?.isConnected }
  );
  
  // Get video state and current scenes
  const { getCurrentProps, replace, updateAndRefresh, getProjectChatHistory, addUserMessage, addAssistantMessage, updateMessage, updateScene, deleteScene, removeMessage, setSceneGenerating, updateProjectAudio, syncDbMessages } = useVideoState();
  const currentProps = getCurrentProps();
  const scenes = currentProps?.scenes || [];
  
  // 🚨 SIMPLIFIED: Scene context logic - let Brain LLM handle scene targeting
  const selectedScene = selectedSceneId ? scenes.find((s: any) => s.id === selectedSceneId) : null;
  
  // ✅ SINGLE SOURCE OF TRUTH: Use only VideoState for messages
  // Load messages from database on mount
  const { data: dbMessages } = api.chat.getMessages.useQuery({ 
    projectId 
  }, {
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minute cache
  });

  const messages = getProjectChatHistory(projectId);
  
  // Debug: Log messages to check for duplicates
  // Commented out to prevent re-render spam
  // console.log('[ChatPanelG] Messages from VideoState:', messages.length);
  
  // Sync database messages to VideoState when loaded
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      console.log('[ChatPanelG] Syncing database messages to VideoState:', dbMessages.length);
      const typedMessages: DbMessage[] = dbMessages.map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant',
        kind: msg.kind as 'status' | 'text' | 'error' | 'tool_result' | 'scene_plan' | undefined
      }));
      syncDbMessages(projectId, typedMessages);
    }
  }, [dbMessages, projectId, syncDbMessages]);


  // Convert VideoState messages to component format for rendering
  const componentMessages: ComponentMessage[] = useMemo(() => {
    // ✅ DEDUPLICATE: Remove duplicate messages by ID to prevent React key errors
    const uniqueMessages = messages.filter((msg, index, array) => 
      array.findIndex(m => m.id === msg.id) === index
    );
    
    // Removed console.log to prevent re-render spam
    
    return uniqueMessages.map(msg => ({
      id: msg.id,
      content: msg.message,
      isUser: msg.isUser,
      timestamp: new Date(msg.timestamp),
      status: msg.status,
      kind: msg.kind,
      imageUrls: msg.imageUrls,
      videoUrls: msg.videoUrls,
      audioUrls: msg.audioUrls,
    }));
  }, [messages]);

  // ✅ BATCH LOADING: Get iterations for all messages at once
  const messageIds = componentMessages
    .filter(m => !m.isUser && m.id && !m.id.startsWith('_') && !m.id.startsWith('temp-') && !m.id.startsWith('optimistic-') && !m.id.startsWith('system-') && !m.id.startsWith('user-'))
    .map(m => m.id)
    .filter(id => id && id.length > 0); // Additional validation to ensure no empty IDs

  const { data: messageIterations } = api.generation.getBatchMessageIterations.useQuery(
    { messageIds },
    { 
      enabled: messageIds.length > 0,
      staleTime: 0, // Always fetch fresh data to ensure restore button shows immediately
      refetchInterval: false, // Don't poll, but always get fresh data on mount/invalidation
    }
  );

  // ✅ CORRECT: Use the generation endpoint that goes through Brain Orchestrator
  const generateSceneMutation = api.generation.generateScene.useMutation({
    onSettled: async () => {
      // Invalidate iterations query after any scene operation to ensure restore button appears
      await utils.generation.getBatchMessageIterations.invalidate();
    }
  });

  // Auto-scroll function
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);
  
  // 🚨 CRITICAL FIX: Use getProjectScenes instead of getById to get actual scene data
  const { data: scenesData, refetch: refetchScenes } = api.generation.getProjectScenes.useQuery(
    { projectId: projectId },
    { 
      staleTime: 30000, // Cache for 30 seconds
    }
  );
  
  // 🚨 NEW: Get tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // Use auto-fix hook early to ensure consistent hook order
  // IMPORTANT: This must be called before any conditional logic
  useAutoFix(projectId, scenes);
  
  // Helper function to convert database scenes to InputProps format (same as page.tsx)
  const convertDbScenesToInputProps = useCallback((dbScenes: any[]) => {
    let currentStart = 0;
    const convertedScenes = dbScenes.map((dbScene) => {
      const sceneDuration = dbScene.duration || 150; 
      const scene = {
        id: dbScene.id,
        type: 'custom' as const,
        start: currentStart,
        duration: sceneDuration,
        data: {
          code: dbScene.tsxCode,
          name: dbScene.name,
          componentId: dbScene.id,
          props: dbScene.props || {}
        }
      };
      currentStart += sceneDuration;
      return scene;
    });
    
    return {
      meta: {
        title: currentProps?.meta?.title || 'New Project',
        duration: currentStart,
        backgroundColor: currentProps?.meta?.backgroundColor || '#000000'
      },
      scenes: convertedScenes
    };
  }, [currentProps]);

  // 🚨 FIX: Smart auto-scroll that respects user scroll position
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  // Detect when user manually scrolls
  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10; // 10px threshold
      
      if (!isAtBottom && !userHasScrolled) {
        setUserHasScrolled(true);
        setShouldAutoScroll(false);
      } else if (isAtBottom && userHasScrolled) {
        setUserHasScrolled(false);
        setShouldAutoScroll(true);
      }
    }
  }, [userHasScrolled]);
  
  // Auto-scroll only when appropriate
  useEffect(() => {
    if (shouldAutoScroll && !userHasScrolled) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [componentMessages, shouldAutoScroll, userHasScrolled, scrollToBottom]);

  
  // 🚀 [TICKET-006] Retry logic with exponential backoff
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries === 0) throw error;
      
      console.log(`[ChatPanelG] 🔄 Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
  };

  // Simple, honest loading message
  const getInitialLoadingMessage = () => {
    return "Processing your request...";
  };

  // Smart GitHub component detection
  const checkForGitHubComponents = useCallback((text: string): boolean => {
    if (!githubConnection?.isConnected || !discoveredComponents) return false;
    
    // Get all component names from discovered components
    const componentNames = new Set<string>();
    Object.values(discoveredComponents).forEach((components: any[]) => {
      components.forEach((comp: any) => {
        componentNames.add(comp.name.toLowerCase());
      });
    });
    
    // Check if message mentions any discovered component
    const lowerText = text.toLowerCase();
    for (const compName of componentNames) {
      if (lowerText.includes(compName)) {
        return true;
      }
    }
    
    // Check for explicit paths
    if (lowerText.includes('src/') || lowerText.includes('components/')) {
      return true;
    }
    
    return false;
  }, [githubConnection, discoveredComponents]);
  
  // Smart Figma component detection
  const checkForFigmaComponents = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase();
    
    // Check for Figma-specific keywords and patterns
    const figmaPatterns = [
      /figma\s+(design|component|frame|layer)/i,
      /my\s+figma\s+/i,
      /from\s+figma/i,
      /figma\s+file/i,
      /design\s+"[^"]+"/i, // Design names in quotes
      /\(ID:\s*[\w:]+\)/i, // Figma ID pattern
    ];
    
    return figmaPatterns.some(pattern => pattern.test(text));
  }, []);
  
  // ✅ HYBRID APPROACH: SSE for messages, mutation for generation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;

    let trimmedMessage = message.trim();
    const originalMessage = trimmedMessage; // Keep original for display
    
    // Smart GitHub mode detection
    if (githubModeSource !== 'manual' && checkForGitHubComponents(trimmedMessage)) {
      setIsGitHubMode(true);
      setGitHubModeSource('auto');
      toast.info('GitHub mode auto-enabled for component');
    }
    
    // Smart Figma mode detection
    if (figmaModeSource !== 'manual' && checkForFigmaComponents(trimmedMessage)) {
      setIsFigmaMode(true);
      setFigmaModeSource('auto');
      toast.info('Figma mode auto-enabled for design');
    }
    
    // Extract icon references from the message
    const iconPattern = /\[icon:([^\]]+)\]/g;
    const iconRefs: string[] = [];
    let iconMatch;
    while ((iconMatch = iconPattern.exec(trimmedMessage)) !== null) {
      if (iconMatch[1]) {
        iconRefs.push(iconMatch[1]);
      }
    }
    
    // If we have icons, append them to the message in a clear format
    if (iconRefs.length > 0) {
      trimmedMessage = trimmedMessage.replace(iconPattern, ''); // Remove icon markers
      trimmedMessage = `${trimmedMessage.trim()}\n\nUse these specific icons: ${iconRefs.map(icon => `<window.IconifyIcon icon="${icon}" />`).join(', ')}`;
    }
    
    // 🚨 NEW: Get image, video, and audio URLs from uploaded media
    let imageUrls = uploadedImages
      .filter(img => img.status === 'uploaded' && img.url && img.type === 'image')
      .map(img => img.url!);
    
    let videoUrls = uploadedImages
      .filter(img => img.status === 'uploaded' && img.url && img.type === 'video')
      .map(img => img.url!);
    
    let audioUrls = uploadedImages
      .filter(img => img.status === 'uploaded' && img.url && img.type === 'audio')
      .map(img => img.url!);
    
    // If scenes were attached via drag, append a friendly reference for the model and machine tokens (not shown in UI)
    if (selectedScenes.length > 0) {
      const humanRefs = selectedScenes.map(s => `@scene ${s.index}`).join(', ');
      const idTokens = selectedScenes.map(s => `[scene:${s.id}]`).join(' ');
      trimmedMessage = `${trimmedMessage}\n\nUse these specific scenes: ${humanRefs}\n${idTokens}`.trim();
    }
    
    // Resolve @mentions and categorize URLs by type
    if (userAssets?.assets) {
      console.log('[ChatPanelG] User assets available:', userAssets.assets.length);
      console.log('[ChatPanelG] Message to resolve:', trimmedMessage);
      
      const { 
        resolvedMessage, 
        imageUrls: mentionedImages, 
        audioUrls: mentionedAudio, 
        videoUrls: mentionedVideos 
      } = resolveAssetMentions(
        trimmedMessage,
        userAssets.assets
      );
      
      console.log('[ChatPanelG] Resolved message:', resolvedMessage);
      console.log('[ChatPanelG] Mentioned images:', mentionedImages);
      console.log('[ChatPanelG] Mentioned audio:', mentionedAudio);
      console.log('[ChatPanelG] Mentioned videos:', mentionedVideos);
      
      // Update message to show resolved references
      trimmedMessage = resolvedMessage;
      
      // Add mentioned assets to appropriate categories
      if (mentionedImages.length > 0) {
        console.log('[ChatPanelG] 🖼️ Adding mentioned images:', mentionedImages);
        imageUrls = [...imageUrls, ...mentionedImages];
      }
      if (mentionedAudio.length > 0) {
        console.log('[ChatPanelG] 🎵 Adding mentioned audio:', mentionedAudio);
        audioUrls = [...audioUrls, ...mentionedAudio];
      }
      if (mentionedVideos.length > 0) {
        console.log('[ChatPanelG] 🎥 Adding mentioned videos:', mentionedVideos);
        videoUrls = [...videoUrls, ...mentionedVideos];
      }
    } else {
      console.log('[ChatPanelG] No user assets available for @mention resolution');
    }
    
    // Filter out icon references from imageUrls (they should be processed as icons, not images)
    imageUrls = imageUrls.filter(url => !url.startsWith('[icon:'));
    
    if (imageUrls.length > 0) {
      console.log('[ChatPanelG] 🖼️ Including images in chat submission:', imageUrls);
    }
    
    if (videoUrls.length > 0) {
      console.log('[ChatPanelG] 🎥 Including videos in chat submission:', videoUrls);
    }
    
    if (audioUrls.length > 0) {
      console.log('[ChatPanelG] 🎵 Including audio in chat submission:', audioUrls);
    }
    
    // Get scene URLs from selected scenes
    let sceneUrls = selectedScenes.map(s => s.id);
    
    // Clear input immediately for better UX
    setMessage("");
    setDraftMessage(projectId, ""); // Clear draft in store too
    setUploadedImages([]);
    setDraftAttachments(projectId, []); // Clear draft attachments in store too
    setSelectedIcons([]); // Clear icon previews after sending
    setSelectedScenes([]); // Clear scene mentions after sending
    setIsGenerating(true);
    setGenerationPhase('thinking'); // Start in thinking phase
    
    // Immediately scroll to bottom after adding messages
    setTimeout(() => {
      scrollToBottom();
    }, 50);
    
    // Check for pending YouTube URL from previous clarification
    const pendingYouTubeUrl = localStorage.getItem('pendingYouTubeUrl');
    let finalMessage = trimmedMessage;
    
    if (pendingYouTubeUrl) {
      console.log('[ChatPanelG] Found pending YouTube URL:', pendingYouTubeUrl);
      
      // Check if user is providing a time specification or starting a new request
      const isLikelyTimeResponse = /^\d+[-–]\d+|^first\s+\d+|^\d+:\d+|^seconds?\s+\d+/i.test(trimmedMessage);
      const hasNewYouTubeUrl = extractYouTubeUrl(trimmedMessage) !== null;
      
      if (isLikelyTimeResponse && !hasNewYouTubeUrl) {
        // This is likely a follow-up response to "Which seconds?"
        // Combine the URL with the time specification
        finalMessage = `${pendingYouTubeUrl} ${trimmedMessage}`;
        console.log('[ChatPanelG] Enhanced message for follow-up:', finalMessage);
      } else {
        // User is starting a new request, clear the pending URL
        console.log('[ChatPanelG] User started new request, clearing pending URL');
      }
      
      localStorage.removeItem('pendingYouTubeUrl'); // Clear after use
    }
    
    // Let SSE handle DB sync in background
    // Use finalMessage if it's a YouTube follow-up, otherwise use original message with @mentions
    const displayMessage = finalMessage !== trimmedMessage ? finalMessage : originalMessage;
    
    // ✨ NEW: Extract website URL from message
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = displayMessage.match(urlRegex);
    const websiteUrl = urls?.find(url => 
      !url.includes('youtube.com') && 
      !url.includes('youtu.be') &&
      !url.includes('localhost') &&
      !url.includes('127.0.0.1')
    );
    
    // Pass both GitHub and Figma modes to generation, plus website URL
    generateSSE(displayMessage, imageUrls, videoUrls, audioUrls, sceneUrls, selectedModel, isGitHubMode || isFigmaMode, websiteUrl);
    
    // Show user message AFTER sending to backend to prevent overwriting
    addUserMessage(projectId, originalMessage, imageUrls, videoUrls, audioUrls, sceneUrls);
  };

  // Handle selecting an asset mention - moved before handleKeyDown to fix ReferenceError
  const handleSelectMention = useCallback((asset: AssetMention) => {
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      const mentionContext = getMentionContext(message, cursorPosition);
      
      if (mentionContext) {
        // Replace the @query with @assetName
        const before = message.substring(0, mentionContext.startIndex);
        const after = message.substring(cursorPosition);
        const newMessage = `${before}@${asset.name} ${after}`;
        
        setMessage(newMessage);
        setShowMentionAutocomplete(false);
        
        // Move cursor after the mention
        setTimeout(() => {
          if (textareaRef.current) {
            const newPosition = mentionContext.startIndex + asset.name.length + 2;
            textareaRef.current.setSelectionRange(newPosition, newPosition);
            textareaRef.current.focus();
          }
        }, 0);
      }
    }
  }, [message]);

  // Handle keyboard events for textarea
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention autocomplete navigation
    if (showMentionAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex(prev => 
          prev < mentionSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex(prev => 
          prev > 0 ? prev - 1 : mentionSuggestions.length - 1
        );
        return;
      }
      
      if (e.key === 'Tab' || (e.key === 'Enter' && mentionSuggestions.length > 0)) {
        e.preventDefault();
        if (mentionSuggestions[mentionSelectedIndex]) {
          handleSelectMention(mentionSuggestions[mentionSelectedIndex]);
        }
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionAutocomplete(false);
        return;
      }
    }
    
    // Normal Enter key handling
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!message.trim() || isGenerating) return;
      
      // Trigger form submission directly
      const form = e.currentTarget.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  }, [message, isGenerating, showMentionAutocomplete, mentionSuggestions, mentionSelectedIndex, handleSelectMention]);

  // Handle message input change with @mention detection
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    // Persist to store for panel switching
    setDraftMessage(projectId, newValue);
    
    // Extract icon references from the message
    const iconPattern = /\[icon:([^\]]+)\]/g;
    const icons: string[] = [];
    let match;
    while ((match = iconPattern.exec(newValue)) !== null) {
      if (match[1]) {
        icons.push(match[1]);
      }
    }
    if (icons.length > 0) {
      console.log('[ChatPanelG] Extracted icons:', icons);
    }
    setSelectedIcons(icons);
    
    // Check for @mention context
    if (textareaRef.current && userAssets?.assets) {
      const cursorPosition = textareaRef.current.selectionStart;
      const mentionContext = getMentionContext(newValue, cursorPosition);
      
      if (mentionContext) {
        // Get suggestions based on query
        const suggestions = getAssetSuggestions(
          mentionContext.query,
          userAssets.assets
        );
        
        setMentionSuggestions(suggestions);
        setMentionSelectedIndex(0);
        setShowMentionAutocomplete(suggestions.length > 0);
      } else {
        setShowMentionAutocomplete(false);
      }
    }
  }, [userAssets, projectId, setDraftMessage]);

  // ✅ NEW: Handle edit scene plan - copy prompt to input
  const handleEditScenePlan = useCallback((prompt: string) => {
    setMessage(prompt);
    setDraftMessage(projectId, prompt); // Sync with store
    // Clear attachments when editing scene plan
    setUploadedImages([]);
    setDraftAttachments(projectId, []);
    // Focus the textarea after setting the message
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Move cursor to end
        const length = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(length, length);
      }
    }, 50);
  }, [projectId, setDraftMessage, setDraftAttachments]);

  // 🚨 NEW: Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '20px'; // Reset to smaller initial height
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 10; // Smaller minimum height
      const lineHeight = 24; // Approximate line height
      const maxLines = 20;
      const maxHeight = lineHeight * maxLines;
      
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  // Auto-resize when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]); // Remove adjustTextareaHeight from dependencies since it's stable

  // Sync draft attachments with VideoState (consolidated to prevent infinite loop)
  useEffect(() => {
    const sceneAttachments = selectedScenes.map(scene => ({
      id: `scene-${scene.id}`,
      status: 'uploaded' as const,
      type: 'scene' as const,
      name: scene.name,
      sceneId: scene.id,
      sceneIndex: scene.index,
      isLoaded: true
    }));
    
    const allAttachments = [
      ...uploadedImages.map(convertToDraftAttachment),
      ...sceneAttachments
    ];
    
    setDraftAttachments(projectId, allAttachments);
  }, [selectedScenes, uploadedImages, projectId, setDraftAttachments]);

  // Initialize selectedScenes from draftAttachments on mount only
  useEffect(() => {
    const sceneAttachments = draftAttachments
      .filter(att => att.type === 'scene' && att.sceneId && att.sceneIndex !== undefined)
      .map(att => ({
        id: att.sceneId!,
        index: att.sceneIndex!,
        name: att.name || `Scene ${att.sceneIndex}`
      }));
    
    if (sceneAttachments.length > 0) {
      setSelectedScenes(sceneAttachments);
    }
  }, []); // Empty dependency array - only run on mount

  // Robust focus management that works across environments
  const focusTextarea = useCallback(() => {
    if (!textareaRef.current) return false;
    
    const element = textareaRef.current;
    
    // Check if element can receive focus
    if (element.disabled || element.readOnly) return false;
    
    // Check if already focused
    if (document.activeElement === element) return true;
    
    // Check if another input/textarea has focus (don't steal focus from other inputs)
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      if (activeEl !== element) return false;
    }
    
    try {
      // Use preventScroll to avoid jarring jumps
      element.focus({ preventScroll: true });
      
      // Verify focus was successful
      if (document.activeElement === element) {
        // Move cursor to end
        const length = element.value.length;
        element.setSelectionRange(length, length);
        return true;
      }
    } catch (e) {
      // Focus might fail in some browsers/situations
      console.debug('Focus failed:', e);
    }
    
    return false;
  }, []);

  // Auto-focus textarea after generation completes
  useEffect(() => {
    if (generationComplete && textareaRef.current) {
      let attempts = 0;
      const maxAttempts = 5;
      let rafId: number;
      let timeoutId: NodeJS.Timeout;
      
      const attemptFocus = () => {
        attempts++;
        
        if (focusTextarea() || attempts >= maxAttempts) {
          // Success or max attempts reached
          setGenerationComplete(false);
          return;
        }
        
        // Try again with exponential backoff
        const delay = Math.min(50 * Math.pow(2, attempts - 1), 500);
        timeoutId = setTimeout(attemptFocus, delay);
      };
      
      // Start with requestAnimationFrame to align with browser paint
      rafId = requestAnimationFrame(() => {
        attemptFocus();
      });
      
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timeoutId);
      };
    }
  }, [generationComplete, focusTextarea]);

  // Also refocus when isGenerating changes from true to false
  useEffect(() => {
    if (!isGenerating && textareaRef.current) {
      let rafId: number;
      let timeoutIds: NodeJS.Timeout[] = [];
      
      // Multi-strategy approach for maximum compatibility
      const strategies = [
        { delay: 0, method: 'immediate' },      // Try immediately
        { delay: 0, method: 'microtask' },      // After microtask queue
        { delay: 16, method: 'frame' },         // After ~1 frame (60fps)
        { delay: 100, method: 'short' },        // Short delay
        { delay: 300, method: 'medium' },       // Medium delay (original)
      ];
      
      const tryFocus = () => {
        // Only try to focus if nothing else important has focus
        const activeEl = document.activeElement;
        const shouldFocus = !activeEl || 
                           activeEl === document.body ||
                           activeEl.tagName === 'BODY';
        
        if (shouldFocus) {
          focusTextarea();
        }
      };
      
      // Execute strategies
      strategies.forEach(({ delay, method }) => {
        if (method === 'immediate') {
          tryFocus();
        } else if (method === 'microtask') {
          Promise.resolve().then(tryFocus);
        } else if (method === 'frame') {
          rafId = requestAnimationFrame(tryFocus);
        } else {
          const id = setTimeout(tryFocus, delay);
          timeoutIds.push(id);
        }
      });
      
      return () => {
        cancelAnimationFrame(rafId);
        timeoutIds.forEach(clearTimeout);
      };
    }
  }, [isGenerating, focusTextarea]);


  // Create media upload handlers
  const imageHandlers = createMediaUploadHandlers(
    uploadedImages,
    setUploadedImages,
    projectId
  );

  // Listen for insert events from Uploads panel
  useEffect(() => {
    const handler = (e: Event) => {
      const { url, name } = (e as CustomEvent).detail || {};
      if (typeof url === 'string' && url.length > 0) {
        // Check if this is an icon reference - handle differently than media files
        if (url.startsWith('[icon:')) {
          // Icon reference - just add to message, don't treat as uploaded media
          const reference = url; // Use the icon reference directly
          setMessage((prev) => {
            const newMessage = prev ? `${prev} ${reference}` : reference;
            // Extract and update icon list for preview
            const iconPattern = /\[icon:([^\]]+)\]/g;
            const icons: string[] = [];
            let match;
            while ((match = iconPattern.exec(newMessage)) !== null) {
              if (match[1]) {
                icons.push(match[1]);
              }
            }
            setSelectedIcons(icons);
            return newMessage;
          });
          return;
        }
        
        // Regular media file - add as uploadedMedia entry
        const cleanUrl = url.split('?')[0]?.split('#')[0] || url;
        const ext = cleanUrl.split('.').pop()?.toLowerCase() || '';
        const isVideo = /(mp4|webm|mov|m4v)$/i.test(ext);
        const isAudio = /(mp3|wav|ogg|m4a)$/i.test(ext);
        const type: UploadedMedia['type'] = isVideo ? 'video' : isAudio ? 'audio' : 'image';
        const id = nanoid();
        // Use the actual name if provided, otherwise fallback to URL
        const fileName = name || url.split('/').pop() || 'media';
        setUploadedImages((prev) => ([...prev, { id, file: new File([], fileName), status: 'uploaded', url, type, isLoaded: true }]));
      }
    };
    window.addEventListener('chat-insert-media-url', handler as EventListener);
    return () => window.removeEventListener('chat-insert-media-url', handler as EventListener);
  }, [setSelectedIcons]);

  // Wrap drag handlers to manage isDragOver state
  const handleDragOver = useCallback((e: React.DragEvent) => {
    imageHandlers.handleDragOver(e);
    setIsDragOver(true);
  }, [imageHandlers]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    imageHandlers.handleDragLeave(e);
    setIsDragOver(false);
  }, [imageHandlers]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // Check for Figma component drop
    if ((window as any).figmaDragData) {
      const figmaData = (window as any).figmaDragData;
      if (figmaData.type === 'figma-component' && figmaData.component) {
        const component = figmaData.component;
        // Create a message with full Figma reference (fileKey:nodeId format)
        const figmaMessage = `Create an animated version of my Figma design "${component.name}" (ID: ${component.fullId || component.id})`;
        
        // Add to existing message or set as new message
        setMessage((prev) => prev ? `${prev}\n${figmaMessage}` : figmaMessage);
        setIsDragOver(false);
        
        // AUTO-ENABLE Figma mode when component is dragged
        setIsFigmaMode(true);
        setFigmaModeSource('drag');
        toast.success('Figma mode enabled for component animation');
        
        // Clean up the drag data
        delete (window as any).figmaDragData;
        return;
      }
    }
    
    // Check for GitHub component drop
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (jsonData) {
        const data = JSON.parse(jsonData);
        // Timeline scene drop
        if (data.type === 'timeline-scene' && data.sceneId) {
          const mention = { id: String(data.sceneId), index: Number(data.index) || 0, name: String(data.name || '') };
          setSelectedScenes((prev) => {
            if (prev.some((s) => s.id === mention.id)) return prev;
            return [...prev, mention];
          });
          setIsDragOver(false);
          toast.success(`Attached ${mention.name || `Scene ${mention.index}`}`);
          return;
        }
        if (data.type === 'github-component') {
          // Handle GitHub component(s) drop
          let componentsToAdd: any[] = [];
          
          // Check for multiple components (new format)
          if (data.components && Array.isArray(data.components)) {
            componentsToAdd = data.components;
          } else if (data.component) {
            // Single component (backward compatibility)
            componentsToAdd = [data.component];
          }
          
          if (componentsToAdd.length > 0) {
            // Create message for all components
            const componentMessages = componentsToAdd.map(component => 
              `Animate my ${component.name} component from ${component.path}`
            );
            
            // Join with newlines if multiple, or just the single message
            const fullMessage = componentMessages.join('\n');
            
            // Add to existing message or set as new message
            setMessage((prev) => prev ? `${prev}\n${fullMessage}` : fullMessage);
            setIsDragOver(false);
            
            // AUTO-ENABLE GitHub mode when component is dragged
            setIsGitHubMode(true);
            setGitHubModeSource('drag');
            toast.success('GitHub mode enabled for component animation');
            
            return;
          }
        }
      }
    } catch (error) {
      // Not JSON data, continue with other handlers
    }
    
    // First handle file drops (existing behavior)
    imageHandlers.handleDrop(e);
    // Also handle URL/text drops (from Uploads panel drag)
    try {
      const url = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
      if (url && typeof url === 'string' && /^(https?:)?\/\//i.test(url)) {
        const urlParts = url.split('?')[0]?.split('#')[0];
        const ext = urlParts ? urlParts.split('.').pop()?.toLowerCase() ?? '' : '';
        const isVideo = /(mp4|webm|mov|m4v)$/i.test(ext);
        const isAudio = /(mp3|wav|ogg|m4a)$/i.test(ext);
        const type: UploadedMedia['type'] = isVideo ? 'video' : isAudio ? 'audio' : 'image';
        
        // Get the media name if available
        const mediaName = e.dataTransfer.getData('media/name') || '';
        
        const id = nanoid();
        // Create a proper File object with the correct name
        const fileName = mediaName || url.split('/').pop() || 'audio-file';
        const file = new File([], fileName, { type: isAudio ? 'audio/mpeg' : isVideo ? 'video/mp4' : 'image/jpeg' });
        
        setUploadedImages((prev) => ([...prev, { id, file, status: 'uploaded', url, type, isLoaded: true }]));
      }
    } catch {}
    setIsDragOver(false);
  }, [imageHandlers, setUploadedImages]);

  // Handle audio extraction from video
  const handleAudioExtract = useCallback(async (videoMedia: UploadedMedia) => {
    if (!videoMedia.url) {
      toast.error('Video not ready for audio extraction');
      return;
    }
    
    console.log('[ChatPanelG] Extracting audio from video:', videoMedia.file.name);
    
    // Create an audio track using the video URL (Remotion can extract audio from video)
    const audioTrack = {
      id: nanoid(),
      url: videoMedia.url, // Same URL - Remotion will handle audio extraction
      name: videoMedia.file.name.replace(/\.(mp4|mov|webm|avi|mkv)$/i, '') + ' (Audio)',
      duration: 30, // Default duration - will be updated when loaded
      startTime: 0,
      endTime: 30,
      timelineOffsetSec: 0,
      volume: 0.7, // Default volume
      fadeInDuration: 0.5, // Nice default fade
      fadeOutDuration: 0.5,
      playbackRate: 1
    };
    
    // Update project audio state
    updateProjectAudio(projectId, audioTrack);
    
    toast.success(`Audio extracted from ${videoMedia.file.name}`);
  }, [updateProjectAudio, projectId]);

  // Reset component state when projectId changes (for new projects)
  useEffect(() => {
    // Restore draft message and attachments from store
    const draft = useVideoState.getState().getDraftMessage(projectId);
    const draftAttachments = useVideoState.getState().getDraftAttachments(projectId);
    setMessage(draft);
    setIsGenerating(false);
    setGenerationPhase('thinking');
    setGenerationComplete(false);
    setUploadedImages(draftAttachments.map(convertFromDraftAttachment)); // Restore draft attachments when switching projects
    
    console.log('[ChatPanelG] Reset state for new project:', projectId);
  }, [projectId]);

  // Auto-mark first scene plan as generating and poll for completion
  useEffect(() => {
    const scenePlanMessages = componentMessages.filter(msg => 
      msg.kind === 'scene_plan' && !msg.isUser
    );
    
    if (scenePlanMessages.length > 0) {
      const firstScenePlan = scenePlanMessages[0];
      
      // Auto-generate Scene 1 with a small delay
      const timeoutId = setTimeout(() => {
        if (firstScenePlan?.id && projectId) {
          console.log('[ChatPanelG] Auto-marking first scene as generating:', firstScenePlan.id);
          setSceneGenerating(projectId, firstScenePlan.id, true);
          
          // Poll for completion by checking message updates
          let pollCount = 0;
          const maxPolls = 30; // 30 seconds max
          
          const pollInterval = setInterval(async () => {
            pollCount++;
            
            try {
              // Refetch messages to check if scene was created
              await utils.chat.getMessages.invalidate({ projectId });
              
              // Check if the message has been updated to show completion
              const currentMessages = await utils.chat.getMessages.fetch({ projectId });
              const updatedMessage = currentMessages.find(msg => msg.id === firstScenePlan.id);
              
              if (updatedMessage && (
                updatedMessage.content.includes('created successfully') ||
                updatedMessage.kind === 'status'
              )) {
                // Scene created successfully
                console.log('[ChatPanelG] Scene creation completed for:', firstScenePlan.id);
                setSceneGenerating(projectId, firstScenePlan.id, false);
                clearInterval(pollInterval);
              } else if (updatedMessage && (
                updatedMessage.content.includes('Failed')
              )) {
                // Scene creation failed
                console.log('[ChatPanelG] Scene creation failed for:', firstScenePlan.id);
                setSceneGenerating(projectId, firstScenePlan.id, false);
                clearInterval(pollInterval);
              } else if (pollCount >= maxPolls) {
                // Timeout - stop polling
                console.log('[ChatPanelG] Scene creation timeout for:', firstScenePlan.id);
                setSceneGenerating(projectId, firstScenePlan.id, false);
                clearInterval(pollInterval);
              }
            } catch (error) {
              console.error('[ChatPanelG] Error polling for scene creation:', error);
              setSceneGenerating(projectId, firstScenePlan.id, false);
              clearInterval(pollInterval);
            }
          }, 1000); // Poll every second
          
          // Store interval ID for cleanup
          return () => {
            clearInterval(pollInterval);
          };
        }
      }, 500);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [componentMessages, projectId, setSceneGenerating, utils]);



  // Check if content has multiple lines
  const hasMultipleLines = message.split('\n').length > 1 || message.includes('\n');

  // NOTE: useAutoFix moved to top of component to ensure consistent hook order

  // No need for pendingMessageRef - data will come from SSE
  
  // Handle revert action
  const [isReverting, setIsReverting] = useState(false);
  const revertMutation = api.generation.revertToIteration.useMutation();
  
  const handleRevert = useCallback(async (messageId: string) => {
    // No confirmation needed - ChatMessage component handles the two-click confirmation
    setIsReverting(true);
    
    try {
      // Get iterations for this message
      const iterations = await utils.generation.getMessageIterations.fetch({ 
        messageId 
      });
      
      if (iterations.length === 0) {
        toast.error('No scene changes found for this message');
        return;
      }
      
      console.log('[ChatPanelG] Found iterations:', iterations);
      
      // For now, revert all iterations linked to this message
      for (const iteration of iterations) {
        const result = await revertMutation.mutateAsync({
          projectId,
          iterationId: iteration.id,
          messageId,
        });
        
        console.log('[ChatPanelG] Revert result:', result);
        
        // Handle the reverted scene based on operation
        const responseData = result as any;
        const revertedScene = responseData.data;
        const operation = responseData.meta?.operation;
        
        if (revertedScene) {
          if (operation === 'scene.create') {
            // Scene was restored (was deleted)
            const currentScenes = getCurrentProps()?.scenes || [];
            const lastScene = currentScenes[currentScenes.length - 1];
            const startTime = lastScene ? (lastScene.start + lastScene.duration) : 0;
            
            const transformedScene = {
              id: revertedScene.id,
              type: 'custom' as const,
              start: startTime,
              duration: revertedScene.duration || 150,
              data: {
                code: revertedScene.tsxCode,
                name: revertedScene.name || 'Restored Scene',
                componentId: revertedScene.id,
                props: revertedScene.props || {}
              }
            };
            // Removed optimistic replace for stability.
            // Rely on DB invalidation + PreviewPanelG sync to prevent transient duplicates.
            // See memory-bank/sprints/sprint98_autofix_analysis/progress.md
            await utils.generation.getProjectScenes.invalidate({ projectId });
          } else {
            // Scene was updated
            updateScene(projectId, revertedScene.id, revertedScene);
          }
        }
      }
      
      // Refresh and show success
      await updateAndRefresh(projectId, (props) => props);
      toast.success('Successfully reverted to previous version');
      
    } catch (error) {
      console.error('[ChatPanelG] Revert error:', error);
      toast.error('Failed to revert changes');
    } finally {
      setIsReverting(false);
    }
  }, [projectId, revertMutation, utils, getCurrentProps, replace, updateScene, updateAndRefresh]);

  // Enhance prompt mutation
  const enhancePromptMutation = api.generation.enhancePrompt.useMutation({
    onSuccess: (result) => {
      setMessage(result.enhancedPrompt);
      // Auto-resize the textarea after setting enhanced prompt
      setTimeout(() => {
        adjustTextareaHeight();
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Move cursor to end
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 50);
    },
    onError: (error) => {
      console.error('Failed to enhance prompt:', error);
      toast.error('Failed to enhance prompt');
    }
  });

  // Restore scene mutation
  const restoreSceneMutation = api.generation.restoreScene.useMutation({
    onSuccess: () => {
      toast.success('Scene restored');
    },
    onError: (error) => {
      console.error('Failed to restore scene:', error);
      toast.error('Failed to restore scene');
    }
  });

  // Handle enhance prompt
  const handleEnhancePrompt = useCallback(async () => {
    if (!message.trim() || isEnhancing || isGenerating) return;
    
    setIsEnhancing(true);
    
    try {
      const currentProps = getCurrentProps();
      await enhancePromptMutation.mutateAsync({
        prompt: message.trim(),
        videoFormat: {
          format: currentProps?.meta?.format || 'landscape',
          width: currentProps?.meta?.width || 1920,
          height: currentProps?.meta?.height || 1080
        }
      });
      
      toast.success('Prompt enhanced!', {
        description: 'Your prompt has been expanded with more detail',
        duration: 2000
      });
    } finally {
      setIsEnhancing(false);
    }
  }, [message, isEnhancing, isGenerating, enhancePromptMutation]);

  // Use SSE generation hook
  const { generate: generateSSE, cleanup: cancelSSE } = useSSEGeneration({
    projectId,
    onMessageCreated: async (messageId, data) => {
      console.log('[ChatPanelG] ✅ SSE ready with data:', data);
      // messageId is undefined when creating new assistant message
      
      // Now trigger the actual generation using data from SSE
      if (data?.userMessage) {
        const { userMessage, imageUrls = [], videoUrls = [], audioUrls = [], modelOverride, useGitHub } = data;
        
        // Switch to generating phase when SSE is ready and we start the mutation
        setGenerationPhase('generating');
        
        try {
          // Extract scene IDs from selectedScenes
          const attachedSceneIds = selectedScenes.map(s => s.id);
          
          const result = await generateSceneMutation.mutateAsync({
            projectId,
            userMessage,
            userContext: {
              imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
              audioUrls: audioUrls.length > 0 ? audioUrls : undefined,
              sceneUrls: attachedSceneIds.length > 0 ? attachedSceneIds : undefined, // Pass attached scene IDs
              modelOverride: modelOverride,
              useGitHub: useGitHub,
            },
            // Don't pass assistantMessageId - let mutation create it
            metadata: {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          });
          
          console.log('[ChatPanelG] ✅ Generation completed:', result);
          
          // The result contains the actual response
          const responseData = result as any;
          
          // Check if the response indicates an error (success: false)
          if (responseData?.meta?.success === false || responseData?.error) {
            const errorMessage = responseData?.error?.message || '';
            console.log('[ChatPanelG] Generation failed with error:', errorMessage);
            
            // Check if this is a rate limit error
            if (errorMessage.includes('Daily limit reached') || 
                errorMessage.includes('Buy more prompts') ||
                errorMessage.includes('prompt limit') ||
                responseData?.error?.code === 'RATE_LIMITED') {
              console.log('[ChatPanelG] Rate limit reached, showing purchase modal');
              setIsPurchaseModalOpen(true);
              toast.error('You\'ve reached your daily prompt limit. Please purchase more prompts to continue.');
              return;
            } else {
              // Show other error messages
              toast.error(errorMessage || 'Failed to generate scene');
              return;
            }
          }
          
          // Get the assistant message ID from the response
          const assistantMessageId = responseData.assistantMessageId;
          
          // ✅ NEW: Get additional message IDs from scene planner
          const additionalMessageIds = responseData.additionalMessageIds || [];
          
          if (assistantMessageId) {
            // First, add the assistant message to VideoState since it doesn't exist yet
            const aiResponse = responseData.context?.chatResponse || 
                              responseData.chatResponse || 
                              responseData.message || 
                              'Scene generated successfully.';
            
            // Add the assistant message to VideoState
            addAssistantMessage(projectId, assistantMessageId, aiResponse);
            
            // Then update its status to success
            updateMessage(projectId, assistantMessageId, {
              status: 'success'
            });
            
            // Hide the pulsating message immediately when we have the real message
            setIsGenerating(false);
            setGenerationPhase('thinking'); // Reset phase
          }
          
          // ✅ NEW: Add scene plan messages to VideoState immediately
          if (additionalMessageIds.length > 0) {
            console.log(`[ChatPanelG] ✅ SCENE PLANNER: Adding ${additionalMessageIds.length} scene plan messages to VideoState:`, additionalMessageIds);
            
            // Force a re-fetch of messages to get the scene plan content from database
            await utils.chat.getMessages.invalidate({ projectId });
            
            // Note: We don't manually add these messages to VideoState because:
            // 1. They already exist in the database with proper content
            // 2. The invalidation above will trigger a refresh that includes them
            // 3. The syncDbMessages effect will automatically sync them to VideoState
          }
          
          // Check if this is a clarification response
          if (responseData.context?.needsClarification) {
            console.log('[ChatPanelG] ✅ Received clarification request:', responseData.context.chatResponse);
            
            // Save YouTube URL if this is a YouTube clarification
            const youtubeUrl = extractYouTubeUrl(userMessage);
            if (youtubeUrl) {
              console.log('[ChatPanelG] Saving YouTube URL for follow-up:', youtubeUrl);
              localStorage.setItem('pendingYouTubeUrl', youtubeUrl);
            }
            
            // No scene to process, clarification message already added above
            // ✅ FIX: Invalidate messages cache before early return so clarification appears immediately
            await utils.chat.getMessages.invalidate({ projectId });
            // Early return to skip scene processing
            return;
          }
          
          // Process scene normally
          const actualScene = responseData.data;
          const operation = responseData.meta?.operation;
          
          if (actualScene) {
              // Get current scenes to calculate start time
              const currentScenes = getCurrentProps()?.scenes || [];
              
              if (operation === 'scene.delete') {
                // For delete operations, remove the scene from VideoState
                deleteScene(projectId, actualScene.id);
                
                console.log('[ChatPanelG] ✅ Deleted scene from VideoState:', {
                  sceneId: actualScene.id,
                  sceneName: actualScene.name
                });
                
                // Invalidate the scenes query to ensure fresh data
                await utils.generation.getProjectScenes.invalidate({ projectId });
                // Offer undo using scene payload
                try {
                  toast.success('Scene deleted', {
                    action: {
                      label: 'Undo',
                      onClick: () => restoreSceneMutation.mutate({
                        projectId,
                        scene: {
                          id: actualScene.id,
                          name: actualScene.name,
                          tsxCode: (actualScene as any).tsxCode,
                          duration: actualScene.duration || 150,
                          order: (actualScene as any).order ?? 0,
                          props: (actualScene as any).props,
                          layoutJson: (actualScene as any).layoutJson,
                        }
                      })
                    }
                  } as any);
                } catch {}
                
              } else if (operation === 'scene.edit' || operation === 'scene.update' || operation === 'scene.trim') {
                // For edits and trims, use the updateScene method from VideoState
                updateScene(projectId, actualScene.id, actualScene);
                
                console.log('[ChatPanelG] ✅ Updated scene via updateScene:', {
                  sceneId: actualScene.id,
                  operation,
                  isTrim: operation === 'scene.trim' || responseData.meta?.editComplexity === 'duration'
                });
                
                // Invalidate the scenes query to ensure fresh data
                await utils.generation.getProjectScenes.invalidate({ projectId });
                
                // Call the callback if provided
                if (onSceneGenerated) {
                  onSceneGenerated(actualScene.id);
                }
              } else if (operation === 'scene.create' || !operation) {
                // For create operations
                const lastScene = currentScenes[currentScenes.length - 1];
                const startTime = lastScene ? (lastScene.start + lastScene.duration) : 0;
                
                // Transform database format to InputProps format
                const transformedScene = {
                  id: actualScene.id,
                  type: 'custom' as const,
                  start: startTime,
                  duration: actualScene.duration || 180,
                  data: {
                    code: actualScene.tsxCode,
                    name: actualScene.name || 'Generated Scene',
                    componentId: actualScene.id,
                    props: actualScene.props || {}
                  }
                };
                
                // Check if this is a welcome project
                const isWelcomeProject = currentScenes.length === 1 && 
                  (currentScenes[0]?.data?.name === 'Welcome Scene' ||
                   currentScenes[0]?.data?.isWelcomeScene === true ||
                   currentScenes[0]?.type === 'welcome');
                
                // If welcome project, replace the welcome scene; otherwise append
                const updatedScenes = isWelcomeProject 
                  ? [transformedScene]
                  : [...currentScenes, transformedScene];
                
                // Removed optimistic replace.
                // Rely on DB invalidation + PreviewPanelG sync for canonical ordering.
                // See memory-bank/sprints/sprint98_autofix_analysis/progress.md
                await utils.generation.getProjectScenes.invalidate({ projectId });
                // Callback can still be invoked with the new ID if needed
                if (onSceneGenerated) {
                  onSceneGenerated(transformedScene.id);
                }
              }
            }
          
        } catch (error: any) {
          console.error('[ChatPanelG] Generation failed:', error);
          console.log('[ChatPanelG] Error structure:', {
            message: error?.message,
            code: error?.code,
            cause: error?.data?.cause,
            data: error?.data,
            shape: error?.shape,
            fullError: JSON.stringify(error, null, 2)
          });
          
          // Check if this is a rate limit error from the mutation
          // In the catch block, we only have the error object
          const errorMessage = error?.message || '';
          
          // Check for specific error types
          const isTimeoutError = 
            errorMessage.toLowerCase().includes('timeout') ||
            errorMessage.toLowerCase().includes('timed out') ||
            errorMessage.includes('network request failed') ||
            errorMessage.includes('fetch failed') ||
            error?.code === 'TIMEOUT' ||
            error?.code === 'ECONNABORTED';
          
          const isTrimError = 
            errorMessage.toLowerCase().includes('trim') ||
            errorMessage.includes('duration') ||
            errorMessage.includes('Could not determine new duration');
          
          const isRateLimitError = 
            errorMessage.includes('Daily limit reached') ||
            errorMessage.includes('Buy more prompts') ||
            errorMessage.includes('prompt limit') ||
            error?.data?.cause?.code === 'RATE_LIMITED';
            
          console.log('[ChatPanelG] Error message:', errorMessage);
          console.log('[ChatPanelG] Is timeout error?', isTimeoutError);
          console.log('[ChatPanelG] Is trim error?', isTrimError);
          console.log('[ChatPanelG] Is rate limit error?', isRateLimitError);
          
          if (isTimeoutError) {
            console.log('[ChatPanelG] Timeout error detected');
            // Add a friendly timeout message to the chat
            const timeoutMessageId = nanoid();
            addAssistantMessage(projectId, timeoutMessageId, 
              "Oops, sorry I hit a timeout! 😅 That request was taking too long. Try again with a simpler prompt, or break it down into smaller steps."
            );
            updateMessage(projectId, timeoutMessageId, { status: 'error' });
            
            // Also show a toast with helpful guidance
            toast.error('Request timed out. Try a simpler prompt or break it into smaller steps.');
          } else if (isTrimError) {
            console.log('[ChatPanelG] Trim error detected');
            // Add a friendly trim error message to the chat
            const trimErrorMessageId = nanoid();
            addAssistantMessage(projectId, trimErrorMessageId, 
              "Sorry, I couldn't trim the scene! 🎬 Please specify a clear duration like '3 seconds' or '90 frames', or select a specific scene to trim."
            );
            updateMessage(projectId, trimErrorMessageId, { status: 'error' });
            
            // Also show a toast with helpful guidance
            toast.error('Trim failed. Please specify a duration like "3 seconds" or select a scene.');
          } else if (isRateLimitError) {
            console.log('[ChatPanelG] Rate limit error caught, showing purchase modal');
            setIsPurchaseModalOpen(true);
            // Also show a toast to confirm
            toast.error('You\'ve reached your daily prompt limit. Please purchase more prompts to continue.');
          } else {
            // Show generic error message
            toast.error(errorMessage || 'Failed to generate scene');
          }
          
          // No optimistic messages to clean up
        } finally {
          setIsGenerating(false);
          setGenerationPhase('thinking'); // Reset to thinking phase
          setGenerationComplete(true);
          
          // Always invalidate scenes to ensure UI is in sync with database
          await utils.generation.getProjectScenes.invalidate({ projectId });
          // Also invalidate project data so audio additions/edits reflect immediately in Timeline
          await utils.project.getById.invalidate({ id: projectId });
        }
      }
    },
    onComplete: () => {
      console.log('[ChatPanelG] SSE completed');
      
      // Auto-disable GitHub mode after generation if it was auto-enabled
      if (githubModeSource === 'auto' || githubModeSource === 'drag') {
        setIsGitHubMode(false);
        setGitHubModeSource(null);
        console.log('[ChatPanelG] Auto-disabled GitHub mode after generation');
      }
      
      // Auto-disable Figma mode after generation if it was auto-enabled
      if (figmaModeSource === 'auto' || figmaModeSource === 'drag') {
        setIsFigmaMode(false);
        setFigmaModeSource(null);
        console.log('[ChatPanelG] Auto-disabled Figma mode after generation');
      }
    },
    onError: (error: string) => {
      console.error('[ChatPanelG] SSE error:', error);
      
      // Check if this is a timeout error at the SSE level
      const isTimeoutError = 
        error.toLowerCase().includes('timeout') ||
        error.toLowerCase().includes('timed out') ||
        error.includes('Connection failed') ||
        error.includes('Connection lost');
      
      if (isTimeoutError) {
        console.log('[ChatPanelG] SSE timeout detected');
        // Add a friendly timeout message to the chat
        const timeoutMessageId = nanoid();
        addAssistantMessage(projectId, timeoutMessageId, 
          "Oops, sorry I hit a timeout! 😅 The connection took too long. Try again with a simpler prompt, or break it down into smaller steps."
        );
        updateMessage(projectId, timeoutMessageId, { status: 'error' });
        
        // Also show a toast
        toast.error('Connection timed out. Try a simpler prompt.');
      } else if (error.includes('RATE_LIMITED') || error.includes('Daily prompt limit reached')) {
        console.log('[ChatPanelG] Rate limit error from SSE, showing purchase modal');
        setIsPurchaseModalOpen(true);
      } else {
        toast.error(error);
      }
      
      setIsGenerating(false);
      setGenerationPhase('thinking'); // Reset to thinking phase
    }
  });

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      cancelSSE();
    };
  }, [cancelSSE]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages container */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
        <div className="space-y-4">
          {messages.map((msg, index) => {
            // Find all scene plan messages
            const scenePlanMessages = messages.filter(m => m.kind === 'scene_plan');
            const isFirstScenePlan = msg.kind === 'scene_plan' && scenePlanMessages[0]?.id === msg.id;
            const totalScenePlans = scenePlanMessages.length;
            
            return (
              <ChatMessage
                key={`${msg.id}-${index}`}
                message={{
                  id: msg.id,
                  message: msg.message,
                  isUser: msg.isUser,
                  timestamp: msg.timestamp,
                  status: msg.status,
                  kind: msg.kind,
                  imageUrls: msg.imageUrls,
                  videoUrls: msg.videoUrls,
                  audioUrls: msg.audioUrls,
                  sceneUrls: msg.sceneUrls,
                }}
                
                onImageClick={(imageUrl) => {
                  // TODO: Implement image click handler
                  console.log('Image clicked:', imageUrl);
                }}
                projectId={projectId}
                userId={userId}
                onRevert={isReverting ? undefined : handleRevert}
                onEditScenePlan={handleEditScenePlan}
                hasIterations={messageIterations?.[msg.id] ? messageIterations[msg.id]!.length > 0 : false}
                isFirstScenePlan={isFirstScenePlan}
                totalScenePlans={totalScenePlans}
              />
            );
          })}
          
          {/* Show pulsating message UI when generating */}
          {isGenerating && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 text-gray-900 rounded-2xl px-4 py-3 max-w-[80%]">
                <GeneratingMessage phase={generationPhase} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="p-4">


        {/* Media upload preview area */}
        <MediaUpload
          uploadedMedia={uploadedImages.filter(media => media.type !== 'scene')}
          onMediaChange={setUploadedImages}
          projectId={projectId}
          onAudioExtract={handleAudioExtract}
        />

        {/* Current operation indicator removed to prevent duplicate "Analyzing your request..." messages */}
        
        <form onSubmit={handleSubmit} className="flex items-end" autoComplete="off">
          <div 
            className={cn(
              "flex-1 relative rounded-2xl border bg-white shadow-sm transition-all",
              message.length > SAFE_CHARACTER_LIMIT 
                ? "border-red-400 border-2" 
                : "border-gray-300 focus-within:border-gray-400 focus-within:shadow-md",
              isDragOver && "border-orange-400 bg-orange-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Text area container with fixed height that stops before icons */}
            <div className="flex flex-col w-full">
              {/* Scene mentions (dragged from timeline) */}
              {selectedScenes.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
                  <span className="text-xs text-gray-500 mr-2">Scenes:</span>
                  {selectedScenes.map((s, i) => (
                    <div
                      key={`${s.id}-${i}`}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg shadow-sm"
                      title={s.name}
                    >
                      <span className="text-xs text-gray-700 font-medium">Scene {s.index}</span>
                      <span className="text-[10px] text-gray-500 ml-1 max-w-[120px] truncate">{s.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedScenes(prev => prev.filter(x => x.id !== s.id))}
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={`Remove ${s.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Icon previews */}
              {selectedIcons.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
                  <span className="text-xs text-gray-500 mr-2">Icons:</span>
                  {selectedIcons.map((iconName, index) => (
                    <div 
                      key={`${iconName}-${index}`}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      <Icon 
                        icon={iconName} 
                        width="16" 
                        height="16"
                        className="text-gray-700"
                      />
                      <span className="text-xs text-gray-700 font-mono">{iconName.split(':')[1] || iconName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          // Remove icon from message
                          const pattern = `[icon:${iconName}]`;
                          const newMessage = message.replace(pattern, '').trim();
                          setMessage(newMessage);
                          setSelectedIcons(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={`Remove ${iconName}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <textarea
                  key="chat-input"
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyDown}
                  placeholder={!message ? "Describe what you want to create" : ""}
                  className={cn(
                    "w-full resize-none bg-transparent border-none",
                    "px-3 py-1 text-sm leading-6",
                    "focus:outline-none focus:ring-0",
                    "rounded-t-2xl"
                  )}
                  style={{
                    height: '32px',
                    maxHeight: '480px',
                    overflowY: "auto"
                  }}
                />
                {/* Asset mention autocomplete */}
                {showMentionAutocomplete && (
                  <AssetMentionAutocomplete
                    suggestions={mentionSuggestions}
                    selectedIndex={mentionSelectedIndex}
                    onSelect={handleSelectMention}
                  />
                )}
              </div>

              {/* Icon row at bottom - completely separate from text area */}
              <div className="flex items-center justify-between px-3 py-1">
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Upload images"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>

                  <VoiceInput 
                    onTranscription={(text) => {
                      setMessage(prevMessage => {
                        const newMessage = prevMessage.trim() 
                          ? `${prevMessage} ${text}` 
                          : text;
                      return newMessage;
                    });
                  }}
                  />
                </div>

                <div className="flex gap-2 items-center">
                  {/* GitHub Component Mode Toggle - HIDDEN */}
                  {/* <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            setIsGitHubMode(!isGitHubMode);
                            setGitHubModeSource(isGitHubMode ? null : 'manual');
                          }}
                          className={cn(
                            "p-1 rounded-full transition-all duration-200",
                            isGitHubMode
                              ? "text-white bg-gray-900 hover:bg-gray-800"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          )}
                          aria-label="Toggle GitHub component search"
                        >
                          <Github className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isGitHubMode 
                            ? githubModeSource === 'drag' 
                              ? 'Stop searching repos (auto-enabled from drag)' 
                              : githubModeSource === 'auto'
                              ? 'Stop searching repos (auto-detected component)'
                              : 'Stop searching repos'
                            : 'Search repos'
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider> */}
                  
                  {/* Figma Mode Toggle - HIDDEN */}
                  {/* <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            setIsFigmaMode(!isFigmaMode);
                            setFigmaModeSource(isFigmaMode ? null : 'manual');
                          }}
                          className={cn(
                            "p-1 rounded-full transition-all duration-200",
                            isFigmaMode
                              ? "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          )}
                          aria-label="Toggle Figma design search"
                        >
                          <Icon 
                            icon="devicon:figma" 
                            className={cn(
                              "h-4 w-4 transition-all duration-200",
                              !isFigmaMode && "grayscale"
                            )}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {isFigmaMode 
                            ? figmaModeSource === 'drag' 
                              ? 'Stop searching Figma (auto-enabled from drag)' 
                              : figmaModeSource === 'auto'
                              ? 'Stop searching Figma (auto-detected design)'
                              : 'Stop searching Figma'
                            : 'Search Figma'
                          }
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider> */}
                  
                  {/* Enhance Prompt Button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleEnhancePrompt}
                          disabled={!message.trim() || isEnhancing || isGenerating}
                          className={cn(
                            "p-1 rounded-full transition-all duration-200",
                            message.trim() && !isEnhancing && !isGenerating
                              ? "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              : "text-gray-400 cursor-not-allowed"
                          )}
                          aria-label="Enhance prompt"
                        >
                          {isEnhancing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enhance Prompt</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    type="submit"
                    disabled={!message.trim() || isGenerating}
                    className={cn(
                      "w-8 h-8 rounded-full bg-black hover:bg-gray-800 p-0",
                      isGenerating && "opacity-60"
                    )}
                  >
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              {/* Character limit warning */}
              {message.length > SAFE_CHARACTER_LIMIT && (
                <div className="px-3 pb-2">
                  <p className="text-xs text-red-500">
                    {message.length.toLocaleString()} / {SAFE_CHARACTER_LIMIT.toLocaleString()} characters - Message may be too long
                  </p>
                </div>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,audio/*"
            multiple
            onChange={imageHandlers.handleFileSelect}
            className="hidden"
          />
        </form>
      </div>
      
      {/* Purchase Modal */}
      <PurchaseModal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
      />
    </div>
  );
}
