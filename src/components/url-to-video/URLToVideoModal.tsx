"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Slider } from "~/components/ui/slider";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Checkbox } from "~/components/ui/checkbox";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useSSEGeneration } from "~/hooks/use-sse-generation";
import { useVideoState } from "~/stores/videoState";
import { MUSIC_LIBRARY, type UrlToVideoUserInputs } from "~/lib/types/url-to-video";
import { cn } from "~/lib/cn";
import { Loader2, CheckCircle2, AlertTriangle, Music, Globe2, Film, Play, Pause } from "lucide-react";

const MIN_DURATION = 20;
const MAX_DURATION = 40;
const DEFAULT_DURATION = 30;

const MUSIC_DESCRIPTIONS: Record<string, string> = {
  "cyberpunk-action-intro": "High-energy tech anthem with glitchy momentum",
  "action-trailer-glitch": "Intense glitch trailer for bold launches",
  "future-design": "Modern futuristic pulse for SaaS demos",
  "inspiring-ambient-lounge": "Calm atmosphere for thoughtful storytelling",
};

const MUSIC_OPTIONS = MUSIC_LIBRARY.map((track) => ({
  id: track.id,
  name: track.name,
  mood: track.mood,
  url: track.url,
  description: MUSIC_DESCRIPTIONS[track.id] ?? `${track.mood} soundtrack`,
}));

type UrlToVideoModalProps = {
  projectId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

function ensureProtocol(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function isValidUrl(rawUrl: string): boolean {
  if (!rawUrl.trim()) return false;
  try {
    const candidate = new URL(ensureProtocol(rawUrl));
    return Boolean(candidate.hostname);
  } catch {
    return false;
  }
}

type ProgressEntry = {
  id: string;
  message: string;
  kind: "assistant" | "scene";
};

export function URLToVideoModal({ projectId, isOpen, onOpenChange }: UrlToVideoModalProps) {
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION);
  const [problem, setProblem] = useState("");
  const [differentiators, setDifferentiators] = useState("");
  const [music, setMusic] = useState<typeof MUSIC_OPTIONS[number]["id"]>("future-design");
  const [mode, setMode] = useState<'multi-scene' | 'current-scenes'>("multi-scene");
  const [submittedMode, setSubmittedMode] = useState<'multi-scene' | 'current-scenes'>("multi-scene");
  const [step, setStep] = useState<"form" | "processing" | "complete">("form");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [assistantSummary, setAssistantSummary] = useState<string>("");
  const [hasStarted, setHasStarted] = useState(false);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const hasInitializedSelection = useRef(false);

  const addUserMessage = useVideoState((state) => state.addUserMessage);
  const projectScenes = useVideoState((state) => state.projects[projectId]?.props?.scenes || []);

  const sceneOptions = useMemo(() => {
    return projectScenes.map((scene: any, index: number) => {
      const sceneName = (scene.data?.name || scene.name || `Scene ${index + 1}`) as string;
      const durationFrames = scene.duration || 0;
      return {
        id: scene.id as string,
        name: sceneName,
        order: scene.order ?? index,
        durationFrames,
        durationSeconds: Math.round((durationFrames / 30) * 10) / 10,
      };
    });
  }, [projectScenes]);

  useEffect(() => {
    if (
      mode === 'current-scenes' &&
      sceneOptions.length > 0 &&
      !hasInitializedSelection.current
    ) {
      hasInitializedSelection.current = true;
      setSelectedSceneIds(sceneOptions.map((scene) => scene.id));
    }
  }, [mode, sceneOptions]);

  useEffect(() => {
    setSelectedSceneIds((prev) => {
      if (prev.length === 0) return prev;
      const available = new Set(sceneOptions.map((scene) => scene.id));
      const filtered = prev.filter((id) => available.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [sceneOptions]);

  const domainSummary = useMemo(() => {
    if (!url.trim()) return "";
    try {
      const parsed = new URL(ensureProtocol(url));
      return parsed.hostname;
    } catch {
      return "";
    }
  }, [url]);

  const handleClose = useCallback((nextOpen: boolean) => {
    if (!nextOpen && step === "processing") {
      return;
    }
    onOpenChange(nextOpen);
  }, [onOpenChange, step]);

  const stopPreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {}
      audioRef.current = null;
    }
    setPreviewingTrackId(null);
  }, []);

  const handlePreviewTrack = useCallback(
    (trackId: string) => {
      if (previewingTrackId === trackId) {
        stopPreview();
        return;
      }

      stopPreview();
      const track = MUSIC_OPTIONS.find((option) => option.id === trackId);
      if (!track) return;

      try {
        const audio = new Audio(track.url);
        audio.volume = 0.8;
        audio.play().catch(() => {
          /* noop */
        });
        audioRef.current = audio;
        setPreviewingTrackId(trackId);
        previewTimeoutRef.current = window.setTimeout(() => {
          stopPreview();
        }, 5000);
      } catch (err) {
        console.warn('[URLToVideoModal] Failed to preview audio', err);
        stopPreview();
      }
    },
    [previewingTrackId, stopPreview]
  );

  useEffect(() => () => stopPreview(), [stopPreview]);

  const resetState = useCallback(() => {
    setUrl("");
    setDuration(DEFAULT_DURATION);
    setProblem("");
    setDifferentiators("");
    setMusic("future-design");
    setMode('multi-scene');
    setSubmittedMode('multi-scene');
    setStep("form");
    setError(null);
    setProgress([]);
    setAssistantSummary("");
    setHasStarted(false);
    stopPreview();
    setSelectedSceneIds([]);
    hasInitializedSelection.current = false;
  }, [stopPreview]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (step !== "complete") {
      return;
    }
    const timer = window.setTimeout(() => {
      handleClose(false);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [step, handleClose]);

  const { generate, cleanup } = useSSEGeneration({
    projectId,
    onAssistantChunk: (message, isComplete) => {
      if (!message) return;
      const entry: ProgressEntry = {
        id: `assistant-${Date.now()}-${Math.random()}`,
        message,
        kind: "assistant",
      };
      setProgress((prev) => [...prev, entry]);
      if (isComplete) {
        setAssistantSummary((prevSummary) => {
          const combined = `${prevSummary}\n${message}`.trim();
          return combined;
        });
      }
    },
    onSceneProgress: (event) => {
      const entry: ProgressEntry = {
        id: `scene-${event.sceneIndex}-${event.progress}-${Date.now()}`,
        message:
          submittedMode === 'multi-scene'
            ? `Scene ${event.sceneIndex + 1}/${event.totalScenes} complete → ${event.sceneName}`
            : `Scene ${event.sceneIndex + 1}/${event.totalScenes} updated → ${event.sceneName}`,
        kind: "scene",
      };
      setProgress((prev) => [...prev, entry]);
    },
    onComplete: () => {
      setStep("complete");
    },
    onError: (err) => {
      setError(err);
      setStep("form");
      setHasStarted(false);
    },
  });

  useEffect(() => () => cleanup(), [cleanup]);

  const selectedMusic = useMemo(() => MUSIC_OPTIONS.find((option) => option.id === music) ?? MUSIC_OPTIONS[2], [music]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    stopPreview();

    const normalizedUrl = ensureProtocol(url);
    if (!isValidUrl(normalizedUrl)) {
      setError("Please enter a valid website URL");
      return;
    }

    if (mode === 'current-scenes' && selectedSceneIds.length === 0) {
      setError('Select at least one scene to update');
      return;
    }

    setSubmittedMode(mode);

    const selectedTrack = selectedMusic;

    const userInputsPayload: UrlToVideoUserInputs = {};
    const trimmedProblem = problem.trim();
    if (trimmedProblem) {
      userInputsPayload.problemStatement = trimmedProblem;
    }
    const trimmedDifferentiators = differentiators.trim();
    if (trimmedDifferentiators) {
      userInputsPayload.differentiators = trimmedDifferentiators;
    }
    if (mode === 'multi-scene') {
      userInputsPayload.musicPreferenceId = selectedTrack?.id;
      userInputsPayload.musicPreferenceName = selectedTrack?.name;
      userInputsPayload.requestedDurationSeconds = duration;
    }

    const summaryLines: string[] = [];

    if (mode === 'multi-scene') {
      summaryLines.push(`Generate a ${duration}s multi-scene video from ${normalizedUrl}.`);
      summaryLines.push(`Music preference: ${selectedTrack?.name || 'None selected'}${selectedTrack?.mood ? ` (${selectedTrack.mood})` : ''}.`);
    } else {
      const selectedNames = sceneOptions
        .filter((scene) => selectedSceneIds.includes(scene.id))
        .map((scene) => scene.name);
      summaryLines.push(`Apply ${domainSummary || normalizedUrl} branding to ${selectedNames.length} scene(s): ${selectedNames.join(', ')}.`);
      summaryLines.push('Focus on updating colors, typography, buttons, and supporting graphics to reflect the brand.');
    }

    if (userInputsPayload.problemStatement) {
      summaryLines.push(`Problem to highlight: ${userInputsPayload.problemStatement}`);
    }

    if (userInputsPayload.differentiators) {
      summaryLines.push(`Differentiators: ${userInputsPayload.differentiators}`);
    }

    const summary = summaryLines.join("\n");

    addUserMessage(projectId, summary);

    setStep("processing");
    setHasStarted(true);
    setProgress([]);
    setAssistantSummary("");

    generate(
      summary,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        websiteUrl: normalizedUrl,
        userInputs: userInputsPayload,
        mode,
        sceneIds: mode === 'current-scenes' ? selectedSceneIds : undefined,
      }
    );

    const storageKey = `bazaar:url-modal-dismissed:${projectId}`;
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {}
  }, [addUserMessage, duration, differentiators, domainSummary, generate, mode, music, problem, projectId, sceneOptions, selectedSceneIds, stopPreview, url]);

  const requiresSelection = mode === 'current-scenes' && selectedSceneIds.length === 0;
  const isSubmitDisabled = !url.trim() || step === "processing" || requiresSelection;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Launch from a URL</DialogTitle>
          <DialogDescription>
            {mode === 'multi-scene'
              ? "Paste a website and we&apos;ll extract the brand, pick the right multi-scene template, and stream progress here."
              : "Paste a website and we&apos;ll extract the brand, then apply its colors, fonts, and tone to the scenes you select."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : null}

        {step === "form" && (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <Label htmlFor="url" className="flex items-center gap-2 font-medium">
                <Globe2 className="h-4 w-4" /> Website URL
              </Label>
              <Input
                id="url"
                placeholder="https://yourwebsite.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                autoFocus
                autoComplete="off"
              />
              {domainSummary ? (
                <p className="text-xs text-muted-foreground">
                  We&apos;ll extract everything we can from <span className="font-medium text-foreground">{domainSummary}</span>.
                </p>
              ) : null}
            </div>

            <Tabs value={mode} onValueChange={(value) => setMode(value as 'multi-scene' | 'current-scenes')} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="multi-scene">Generate new video</TabsTrigger>
                <TabsTrigger value="current-scenes">Apply to current scenes</TabsTrigger>
              </TabsList>

              <TabsContent value="multi-scene" className="space-y-6">
                <div className="space-y-3">
                  <Label className="font-medium">Video Length</Label>
                  <Slider
                    value={[duration]}
                    min={MIN_DURATION}
                    max={MAX_DURATION}
                    step={2}
                    onValueChange={(values) => setDuration(values[0] ?? DEFAULT_DURATION)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>20s</span>
                    <span>{duration}s</span>
                    <span>40s</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="font-medium flex items-center gap-2"><Music className="h-4 w-4" /> Music vibe</Label>
                  <RadioGroup
                    value={music}
                    onValueChange={(value) => setMusic(value as typeof MUSIC_OPTIONS[number]["id"])}
                    className="grid gap-2 md:grid-cols-2"
                  >
                    {MUSIC_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className={cn(
                          "border rounded-md p-3 cursor-pointer transition",
                          option.id === music ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/40"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{option.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                          </div>
                          <Badge variant={option.id === music ? "default" : "secondary"}>{option.mood}</Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Preview</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={previewingTrackId === option.id ? 'Stop preview' : `Preview ${option.name}`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handlePreviewTrack(option.id);
                            }}
                          >
                            {previewingTrackId === option.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </Button>
                        </div>
                        <RadioGroupItem value={option.id} className="sr-only" />
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </TabsContent>

              <TabsContent value="current-scenes" className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-medium">Scenes to update</Label>
                  <ScrollArea className="max-h-56 rounded-md border">
                    <div className="p-2 space-y-2">
                      {sceneOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No scenes found in this project. Generate a scene before applying branding.</p>
                      ) : (
                        sceneOptions.map((scene) => {
                          const checked = selectedSceneIds.includes(scene.id);
                          return (
                            <label
                              key={scene.id}
                              htmlFor={`brand-scene-${scene.id}`}
                              className={cn(
                                'flex items-start gap-3 rounded-md border border-transparent p-2 text-sm transition hover:border-muted-foreground/30',
                                checked ? 'bg-primary/5 border-primary/40' : 'bg-background'
                              )}
                            >
                              <Checkbox
                                id={`brand-scene-${scene.id}`}
                                checked={checked}
                                onCheckedChange={(value) => {
                                  setSelectedSceneIds((prev) => {
                                    if (value === true) {
                                      return prev.includes(scene.id) ? prev : [...prev, scene.id];
                                    }
                                    return prev.filter((id) => id !== scene.id);
                                  });
                                }}
                              />
                              <div className="space-y-1">
                                <p className="font-medium text-foreground leading-tight">{scene.name}</p>
                                <p className="text-xs text-muted-foreground">Approx. {scene.durationSeconds}s</p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    Select the scenes that should adopt the extracted branding. We&apos;ll edit each selection in place.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="problem" className="font-medium">Problem statement (optional)</Label>
                <Textarea
                  id="problem"
                  placeholder="What pain should we emphasize?"
                  value={problem}
                  onChange={(event) => setProblem(event.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="differentiators" className="font-medium">Differentiators (optional)</Label>
                <Textarea
                  id="differentiators"
                  placeholder="What makes this product special?"
                  value={differentiators}
                  onChange={(event) => setDifferentiators(event.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {mode === 'multi-scene'
                  ? "We&apos;ll stream every scene as it generates—stick around!"
                  : "Branding updates stream live—keep this window open while we edit your scenes."}
              </div>
              <Button type="submit" disabled={isSubmitDisabled}>
                {hasStarted
                  ? mode === 'multi-scene'
                    ? 'Generating'
                    : 'Applying'
                  : mode === 'multi-scene'
                    ? 'Generate video'
                    : 'Apply branding'}
                {hasStarted ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "processing" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {submittedMode === 'multi-scene'
                ? 'Generating your multi-scene video…'
                : 'Updating selected scenes with new branding…'}
            </div>
            <div className="rounded-md border bg-muted/30 p-4 space-y-2 max-h-60 overflow-y-auto">
              {progress.length === 0 ? (
                <p className="text-xs text-muted-foreground">Waiting for extraction to finish…</p>
              ) : (
                progress.map((entry) => (
                  <p key={entry.id} className="text-xs text-muted-foreground">
                    {entry.kind === "scene" ? "🎬" : "🤖"} {entry.message}
                  </p>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {submittedMode === 'multi-scene'
                ? 'Keep this window open—scenes will appear in the timeline automatically as they finish.'
                : 'Keep this window open—scene updates will drop into the timeline as we finish each edit.'}
            </p>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>{submittedMode === 'multi-scene' ? 'Your video is ready!' : 'Branding applied!'}</span>
            </div>
            {assistantSummary ? (
              <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground whitespace-pre-wrap">
                {assistantSummary}
              </div>
            ) : null}
            <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground flex items-center gap-2">
              <Film className="h-4 w-4" />
              {submittedMode === 'multi-scene'
                ? 'Scenes were added to the project timeline. You can preview or edit them right away.'
                : 'Your selected scenes now reflect the new branding. Preview or tweak them instantly.'}
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>View my video</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
