"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import {
  DEFAULT_BRAND_THEME,
  ensureBrandThemeCopy,
  type BrandSceneStatus,
  type BrandSceneStatusEntry,
  type BrandTheme,
} from "~/lib/theme/brandTheme";
import { cn } from "~/lib/cn";
import { AlertCircle, CheckCircle2, Globe2, Loader2, Sparkles, Wand2 } from "lucide-react";

type ProjectSceneSummary = {
  id: string;
  name: string;
  order: number;
  duration: number;
};

type ProjectSummary = {
  id: string;
  title: string;
  updatedAt?: string;
  sceneCount: number;
  approxDurationSeconds: number;
  format?: string | null;
  isTokenized: boolean;
  scenes: ProjectSceneSummary[];
};

type PersonalizationTargetEntry = {
  id: string;
  companyName: string | null;
  websiteUrl: string;
  contactEmail: string | null;
  sector: string | null;
  status: "pending" | "extracting" | "ready" | "failed";
  notes: string | null;
  errorMessage: string | null;
  createdAt: string;
  extractedAt: string | null;
  brandTheme: BrandTheme | null;
};

type SceneStatusRow = {
  sceneId: string;
  sceneName: string;
  status: BrandSceneStatus;
  summary?: string;
  message?: string;
  updatedAt?: string;
};

type SceneStatusCounts = {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
};

const targetStatusBadge: Record<PersonalizationTargetEntry["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  extracting: "secondary",
  ready: "default",
  failed: "destructive",
};

const sceneStatusBadge: Record<BrandSceneStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "secondary",
  completed: "default",
  failed: "destructive",
};

const sceneStatusLabel: Record<BrandSceneStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  failed: "Failed",
};

function formatUpdatedAt(updatedAt?: string) {
  if (!updatedAt) return "Unknown";
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(updatedAt));
  } catch (error) {
    return updatedAt;
  }
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs}s`;
  if (secs === 0) return `${minutes}m`;
  return `${minutes}m ${secs}s`;
}

function extractHostname(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch (error) {
    return url;
  }
}

function sanitizeBrandTheme(theme: BrandTheme | null | undefined): BrandTheme {
  if (!theme) {
    return DEFAULT_BRAND_THEME;
  }

  return {
    ...DEFAULT_BRAND_THEME,
    ...theme,
    colors: {
      ...DEFAULT_BRAND_THEME.colors,
      ...(theme.colors ?? {}),
      accents:
        theme.colors?.accents && theme.colors.accents.length > 0
          ? theme.colors.accents
          : DEFAULT_BRAND_THEME.colors.accents,
      neutrals: theme.colors?.neutrals ?? DEFAULT_BRAND_THEME.colors.neutrals,
      textDefault: theme.colors?.textDefault ?? DEFAULT_BRAND_THEME.colors.textDefault,
    },
    fonts: {
      heading: {
        ...DEFAULT_BRAND_THEME.fonts.heading,
        ...(theme.fonts?.heading ?? {}),
      },
      body: {
        ...DEFAULT_BRAND_THEME.fonts.body,
        ...(theme.fonts?.body ?? {}),
      },
      mono: theme.fonts?.mono ?? DEFAULT_BRAND_THEME.fonts.mono,
    },
    assets: {
      ...DEFAULT_BRAND_THEME.assets,
      ...(theme.assets ?? {}),
    },
    copy: ensureBrandThemeCopy(theme.copy),
    variants: theme.variants ?? {},
    meta: {
      sceneStatuses: {},
      ...theme.meta,
    },
  };
}

function buildSceneStatusRows(
  scenes: ProjectSceneSummary[],
  target: PersonalizationTargetEntry | null,
  overrides?: Record<string, BrandSceneStatusEntry>,
): SceneStatusRow[] {
  const metaStatuses = (target?.brandTheme as BrandTheme | null)?.meta?.sceneStatuses ?? {};

  return scenes.map((scene, index) => {
    const fallbackName = scene.name || `Scene ${index + 1}`;
    const override = overrides?.[scene.id];
    const entry = override ?? metaStatuses[scene.id];
    const status: BrandSceneStatus = entry?.status ?? "pending";

    return {
      sceneId: scene.id,
      sceneName: fallbackName,
      status,
      summary: entry?.summary,
      message: entry?.message,
      updatedAt: entry?.updatedAt,
    };
  });
}

function summarizeSceneStatuses(rows: SceneStatusRow[]): SceneStatusCounts {
  return rows.reduce<SceneStatusCounts>(
    (acc, row) => {
      if (row.status === "completed") acc.completed += 1;
      else if (row.status === "in_progress") acc.inProgress += 1;
      else if (row.status === "failed") acc.failed += 1;
      else acc.pending += 1;
      return acc;
    },
    { pending: 0, inProgress: 0, completed: 0, failed: 0 },
  );
}

interface PersonalizePageClientProps {
  project: ProjectSummary;
  brandTheme: BrandTheme;
  targets: PersonalizationTargetEntry[];
}

export function PersonalizePageClient({ project, brandTheme, targets }: PersonalizePageClientProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [tokenizationSummary, setTokenizationSummary] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(targets[0]?.id ?? null);
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>(project.scenes.map((scene) => scene.id));
  const [localStatuses, setLocalStatuses] = useState<Record<string, Record<string, BrandSceneStatusEntry>>>({});

  const tokenizeScenesMutation = api.project.tokenizeScenes.useMutation({
    onSuccess: (data) => {
      const message = `Tokenized ${data.updated}/${data.total} scenes${data.updated === data.total ? "" : " (some were already token-ready)"}.`;
      setTokenizationSummary(message);
      toast.success(message);
      router.refresh();
    },
    onError: (error) => {
      const message = error.message || "Failed to tokenize scenes";
      setTokenizationSummary(message);
      toast.error(message);
    },
  });

  const createTargetMutation = api.personalizationTargets.createFromUrl.useMutation({
    onSuccess: async () => {
      toast.success("Started brand extraction");
      setNewUrl("");
      setNewCompanyName("");
      setNewContactEmail("");
      await utils.personalizationTargets.list.invalidate({ projectId: project.id });
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to extract branding");
    },
  });

  const brandifyScenesMutation = api.project.applyBrandToScenes.useMutation({
    onError: (error) => {
      toast.error(error.message || "Failed to personalize scenes");
    },
  });

  useEffect(() => {
    if (!selectedTargetId || targets.some((target) => target.id === selectedTargetId)) {
      return;
    }
    setSelectedTargetId(targets[0]?.id ?? null);
  }, [selectedTargetId, targets]);

  useEffect(() => {
    setSelectedSceneIds(project.scenes.map((scene) => scene.id));
  }, [project.scenes, selectedTargetId]);

  const targetSummaries = useMemo(() => {
    const map = new Map<string, { rows: SceneStatusRow[]; counts: SceneStatusCounts; theme: BrandTheme }>();
    targets.forEach((target) => {
      const overrides = localStatuses[target.id];
      const rows = buildSceneStatusRows(project.scenes, target, overrides);
      map.set(target.id, {
        rows,
        counts: summarizeSceneStatuses(rows),
        theme: sanitizeBrandTheme(target.brandTheme as BrandTheme | null),
      });
    });
    return map;
  }, [targets, project.scenes, localStatuses]);

  const selectedTarget = useMemo(
    () => targets.find((target) => target.id === selectedTargetId) ?? null,
    [targets, selectedTargetId],
  );

  const selectedSummary = selectedTargetId ? targetSummaries.get(selectedTargetId) : undefined;
  const selectedTheme = selectedSummary?.theme ?? sanitizeBrandTheme(selectedTarget?.brandTheme ?? brandTheme);
  const sceneStatusRows = selectedSummary?.rows ?? buildSceneStatusRows(project.scenes, selectedTarget, undefined);
  const sceneStatusCounts = selectedSummary?.counts ?? summarizeSceneStatuses(sceneStatusRows);
  const totalScenes = project.scenes.length;
  const completedPercent = totalScenes === 0 ? 0 : Math.round((sceneStatusCounts.completed / totalScenes) * 100);

  const resolvedAccents = selectedTheme.colors.accents?.slice(0, 4) ?? [];

  const handleTokenizeScenes = () => {
    setTokenizationSummary(null);
    tokenizeScenesMutation.mutate({ projectId: project.id });
  };

  const handleAddUrl = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newUrl.trim()) return;

    createTargetMutation.mutate({
      projectId: project.id,
      websiteUrl: newUrl.trim(),
      companyName: newCompanyName.trim() || undefined,
      contactEmail: newContactEmail.trim() || undefined,
    });
  };

  const toggleScene = (sceneId: string, checked: boolean | string) => {
    const isChecked = checked === true;
    setSelectedSceneIds((prev) => {
      if (isChecked) {
        if (prev.includes(sceneId)) return prev;
        return [...prev, sceneId];
      }
      return prev.filter((id) => id !== sceneId);
    });
  };

  const handleSelectAllScenes = () => {
    setSelectedSceneIds(project.scenes.map((scene) => scene.id));
  };

  const handleClearScenes = () => {
    setSelectedSceneIds([]);
  };

  const handleApplyBrand = async () => {
    if (!selectedTarget || selectedSceneIds.length === 0) {
      toast.error("Select at least one scene to personalize");
      return;
    }

    const targetId = selectedTarget.id;
    const timestamp = new Date().toISOString();
    setLocalStatuses((prev) => ({
      ...prev,
      [targetId]: {
        ...(prev[targetId] ?? {}),
        ...selectedSceneIds.reduce<Record<string, BrandSceneStatusEntry>>((acc, sceneId) => {
          acc[sceneId] = {
            status: "in_progress",
            updatedAt: timestamp,
          };
          return acc;
        }, {}),
      },
    }));

    try {
      const sceneIds = selectedSceneIds.length === project.scenes.length ? undefined : selectedSceneIds;
      const result = await brandifyScenesMutation.mutateAsync({
        projectId: project.id,
        targetId,
        sceneIds,
      });

      const resultTimestamp = new Date().toISOString();
      const overrides = result.results.reduce<Record<string, BrandSceneStatusEntry>>((acc, entry) => {
        acc[entry.sceneId] = entry.error
          ? {
              status: "failed",
              message: entry.error,
              updatedAt: resultTimestamp,
            }
          : {
              status: "completed",
              summary: entry.summary,
              updatedAt: resultTimestamp,
            };
        return acc;
      }, {});

      setLocalStatuses((prev) => ({
        ...prev,
        [targetId]: {
          ...(prev[targetId] ?? {}),
          ...overrides,
        },
      }));

      toast.success(
        `Personalized ${result.updated}/${result.total} scenes for ${selectedTarget.companyName ?? extractHostname(selectedTarget.websiteUrl)}`,
      );

      await utils.personalizationTargets.list.invalidate({ projectId: project.id });
      router.refresh();

      setLocalStatuses((prev) => {
        const clone = { ...prev };
        delete clone[targetId];
        return clone;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to personalize scenes";
      setLocalStatuses((prev) => ({
        ...prev,
        [targetId]: {
          ...(prev[targetId] ?? {}),
          ...selectedSceneIds.reduce<Record<string, BrandSceneStatusEntry>>((acc, sceneId) => {
            acc[sceneId] = {
              status: "failed",
              message,
              updatedAt: new Date().toISOString(),
            };
            return acc;
          }, {}),
        },
      }));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="px-2 text-sm">
            <Link href={`/projects/${project.id}/generate`}>
              ← Back to editor
            </Link>
          </Button>
          <Badge variant={project.isTokenized ? "default" : "destructive"}>
            {project.isTokenized ? "Scenes token-ready" : "Scenes need token pass"}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">Last updated {formatUpdatedAt(project.updatedAt)}</div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Add brand from website</CardTitle>
              <CardDescription>Paste a homepage URL to capture colors, copy, fonts, and logo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleAddUrl}>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Website URL</label>
                  <Input
                    placeholder="https://acme.com"
                    value={newUrl}
                    onChange={(event) => setNewUrl(event.target.value)}
                    required
                    disabled={createTargetMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company (optional)</label>
                  <Input
                    placeholder="Company name"
                    value={newCompanyName}
                    onChange={(event) => setNewCompanyName(event.target.value)}
                    disabled={createTargetMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact email (optional)</label>
                  <Input
                    type="email"
                    placeholder="hello@company.com"
                    value={newContactEmail}
                    onChange={(event) => setNewContactEmail(event.target.value)}
                    disabled={createTargetMutation.isPending}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!newUrl.trim() || createTargetMutation.isPending}
                  className="w-full"
                >
                  {createTargetMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe2 className="mr-2 h-4 w-4" />
                  )}
                  {createTargetMutation.isPending ? "Extracting…" : "Extract brand theme"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  The extractor uses Playwright to snapshot the site, detect CSS tokens, logos, and marketing copy.
                </p>
              </form>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Captured brands</CardTitle>
              <CardDescription>Pick a brand to view copy, assets, and scene personalization status.</CardDescription>
            </CardHeader>
            <Separator />
            <ScrollArea className="max-h-[420px]">
              <div className="flex flex-col divide-y">
                {targets.map((target) => {
                  const summary = targetSummaries.get(target.id);
                  const completed = summary?.counts.completed ?? 0;
                  const failed = summary?.counts.failed ?? 0;
                  const inProgress = summary?.counts.inProgress ?? 0;
                  const pending = summary?.counts.pending ?? 0;
                  const total = project.scenes.length;
                  const isActive = target.id === selectedTargetId;
                  const label = target.companyName ?? extractHostname(target.websiteUrl);

                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setSelectedTargetId(target.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left transition",
                        isActive ? "bg-muted" : "hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium leading-tight">{label}</p>
                          <p className="text-xs text-muted-foreground">{extractHostname(target.websiteUrl)}</p>
                        </div>
                        <Badge variant={targetStatusBadge[target.status]} className="capitalize">
                          {target.status}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{completed}/{total} ready</span>
                        {failed > 0 && <span className="text-destructive">• {failed} failed</span>}
                        {inProgress > 0 && <span>• {inProgress} running</span>}
                        {pending > 0 && <span>• {pending} pending</span>}
                      </div>
                    </button>
                  );
                })}
                {targets.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No brands captured yet. Add a URL above to get started.
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold">{project.title}</CardTitle>
                <CardDescription>
                  {project.sceneCount} scenes · ~{formatDuration(project.approxDurationSeconds)} · {project.format ?? "landscape"}
                </CardDescription>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Button
                  variant={project.isTokenized ? "secondary" : "default"}
                  size="sm"
                  onClick={handleTokenizeScenes}
                  disabled={tokenizeScenesMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {tokenizeScenesMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  {tokenizeScenesMutation.isPending
                    ? "Converting scenes…"
                    : project.isTokenized
                      ? "Re-run tokenization"
                      : "Convert scenes automatically"}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      Tokenization guide
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Convert scenes to BrandTheme tokens</DialogTitle>
                      <DialogDescription>
                        Run this once per master project before launching bulk personalization. It ensures scenes read from the shared theme.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm text-left">
                      <ol className="list-decimal space-y-2 pl-5">
                        <li>Download each scene’s TSX and replace hard-coded styles with <code>theme.*</code>.</li>
                        <li>Use the tokenizer prompt (Sprint 130) or run the automatic pass above.</li>
                        <li>Verify animations still look correct in the Generate workspace.</li>
                        <li>Return here and refresh—the badge flips green once every scene references <code>theme.</code>.</li>
                      </ol>
                      <p className="text-xs text-muted-foreground">
                        Automated conversion is still experimental; review diffs in Git before shipping.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            {tokenizationSummary && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{tokenizationSummary}</p>
              </CardContent>
            )}
          </Card>

          {selectedTarget ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Brand snapshot</CardTitle>
                  <CardDescription>
                    Pulled from {extractHostname(selectedTarget.websiteUrl)} on {formatUpdatedAt(selectedTarget.extractedAt ?? selectedTarget.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Palette</p>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Primary</span>
                        <span className="h-6 w-6 rounded-full border border-border" style={{ background: selectedTheme.colors.primary }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Secondary</span>
                        <span className="h-6 w-6 rounded-full border border-border" style={{ background: selectedTheme.colors.secondary }} />
                      </div>
                      {resolvedAccents.map((accent, index) => (
                        <div key={accent} className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">Accent {index + 1}</span>
                          <span className="h-6 w-6 rounded-full border border-border" style={{ background: accent }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typography</p>
                    <div className="grid gap-1">
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Heading</span>
                        <div className="font-semibold">{selectedTheme.fonts.heading.family}</div>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">Body</span>
                        <div>{selectedTheme.fonts.body.family}</div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Voice & copy</p>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{selectedTheme.copy.brand.name}</p>
                      {selectedTheme.copy.brand.tagline && (
                        <p className="text-sm text-muted-foreground">{selectedTheme.copy.brand.tagline}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Hero headline</p>
                      <p>{selectedTheme.copy.hero.headline}</p>
                    </div>
                  </div>
                  {selectedTheme.assets.logo?.light && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo</p>
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedTheme.assets.logo.light} target="_blank" rel="noreferrer">
                          View logo asset
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Scene personalization</CardTitle>
                  <CardDescription>
                    Apply brand colors, fonts, logos, and copy to selected scenes using the edit LLM pipeline.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row">
                    <div className="w-full max-w-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Scene targeting</p>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="xs" onClick={handleSelectAllScenes} disabled={project.scenes.length === 0}>
                            Select all
                          </Button>
                          <Button variant="ghost" size="xs" onClick={handleClearScenes} disabled={selectedSceneIds.length === 0}>
                            Clear
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="max-h-60 rounded-md border">
                        <div className="flex flex-col divide-y">
                          {project.scenes.map((scene, index) => (
                            <label
                              key={scene.id}
                              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/60"
                            >
                              <Checkbox
                                checked={selectedSceneIds.includes(scene.id)}
                                onCheckedChange={(checked) => toggleScene(scene.id, checked)}
                              />
                              <div className="overflow-hidden">
                                <p className="text-sm font-medium leading-tight">
                                  {scene.name || `Scene ${index + 1}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Order {(scene.order ?? index) + 1} · {scene.duration} frames
                                </p>
                              </div>
                            </label>
                          ))}
                          {project.scenes.length === 0 && (
                            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                              This project has no scenes yet.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Edit status</p>
                          <p className="text-xs text-muted-foreground">Tracks the LLM edit pass per scene.</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {sceneStatusCounts.completed}/{totalScenes} scenes personalized
                        </div>
                      </div>
                      <Progress value={completedPercent} className="h-2" />
                      <ScrollArea className="max-h-64 rounded-md border">
                        <div className="flex flex-col divide-y">
                          {sceneStatusRows.map((row) => (
                            <div key={row.sceneId} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                              <div className="space-y-1">
                                <p className="font-medium leading-tight">{row.sceneName}</p>
                                {row.summary && (
                                  <p className="text-xs text-muted-foreground">{row.summary}</p>
                                )}
                                {row.message && (
                                  <p className="text-xs text-destructive">{row.message}</p>
                                )}
                              </div>
                              <Badge variant={sceneStatusBadge[row.status]} className="capitalize">
                                {sceneStatusLabel[row.status]}
                              </Badge>
                            </div>
                          ))}
                          {sceneStatusRows.length === 0 && (
                            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                              No scenes to personalize.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-md border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Sparkles className="h-4 w-4" />
                      <span>Pipeline steps</span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>URL extraction ({sceneStatusCounts.completed + sceneStatusCounts.inProgress + sceneStatusCounts.failed > 0 ? "done" : selectedTarget.status})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {brandifyScenesMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : sceneStatusCounts.failed > 0 ? (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-primary" />
                        )}
                        <span>
                          Scene edits {brandifyScenesMutation.isPending ? "running" : `(${sceneStatusCounts.completed}/${totalScenes} ready)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
                    <p className="text-xs text-muted-foreground">
                      The brand editor preserves structure and timings while swapping copy, colors, fonts, and logos.
                    </p>
                    <Button
                      onClick={handleApplyBrand}
                      disabled={brandifyScenesMutation.isPending || selectedSceneIds.length === 0}
                    >
                      {brandifyScenesMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {brandifyScenesMutation.isPending ? "Personalizing scenes…" : "Apply brand edits"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Select a brand target to review extracted data and personalize scenes.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Target log</CardTitle>
              <CardDescription>Audit the extraction pipeline for this project.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Extracted</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((target) => (
                    <TableRow key={target.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {target.companyName || "—"}
                        {target.contactEmail && (
                          <div className="text-xs text-muted-foreground">{target.contactEmail}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <a
                          href={target.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {target.websiteUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant={targetStatusBadge[target.status]} className="capitalize">
                          {target.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {target.extractedAt ? formatUpdatedAt(target.extractedAt) : "—"}
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        {target.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {targets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        No targets yet. Add a website to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
