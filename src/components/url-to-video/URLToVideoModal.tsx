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
  const [step, setStep] = useState<"form" | "processing" | "complete">("form");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [assistantSummary, setAssistantSummary] = useState<string>("");
  const [hasStarted, setHasStarted] = useState(false);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);

  const addUserMessage = useVideoState((state) => state.addUserMessage);

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
    setStep("form");
    setError(null);
    setProgress([]);
    setAssistantSummary("");
    setHasStarted(false);
    stopPreview();
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
        message: `Scene ${event.sceneIndex + 1}/${event.totalScenes} complete → ${event.sceneName}`,
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

    const selectedTrack = selectedMusic;
    const userInputs: UrlToVideoUserInputs = {
      problemStatement: problem.trim() || undefined,
      differentiators: differentiators.trim() || undefined,
      musicPreferenceId: selectedTrack?.id,
      musicPreferenceName: selectedTrack?.name,
      requestedDurationSeconds: duration,
    };

    const summaryLines = [
      `Generate a ${duration}s multi-scene video from ${normalizedUrl}.`,
      `Music preference: ${selectedTrack?.name || 'None selected'}${selectedTrack?.mood ? ` (${selectedTrack.mood})` : ''}.`,
    ];

    if (userInputs.problemStatement) {
      summaryLines.push(`Problem to highlight: ${userInputs.problemStatement}`);
    }

    if (userInputs.differentiators) {
      summaryLines.push(`Differentiators: ${userInputs.differentiators}`);
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
        userInputs,
      }
    );

    const storageKey = `bazaar:url-modal-dismissed:${projectId}`;
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {}
  }, [addUserMessage, duration, differentiators, generate, problem, projectId, selectedMusic, stopPreview, url]);

  const isSubmitDisabled = !url.trim() || step === "processing";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Launch from a URL</DialogTitle>
          <DialogDescription>
            Paste a website and we&apos;ll extract the brand, pick the right multi-scene template, and stream progress here.
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

            <DialogFooter className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">We&apos;ll stream every scene as it generates—stick around!</div>
              <Button type="submit" disabled={isSubmitDisabled}>
                {hasStarted ? "Generating" : "Generate video"}
                {hasStarted ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "processing" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating your multi-scene video…
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
              Keep this window open—scenes will appear in the timeline automatically as they finish.
            </p>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>Your video is ready!</span>
            </div>
            {assistantSummary ? (
              <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground whitespace-pre-wrap">
                {assistantSummary}
              </div>
            ) : null}
            <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground flex items-center gap-2">
              <Film className="h-4 w-4" />
              Scenes were added to the project timeline. You can preview or edit them right away.
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
