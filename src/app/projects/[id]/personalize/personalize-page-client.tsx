"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import type { BrandTheme } from "~/lib/theme/brandTheme";
import type { PersonalizationTarget } from "~/data/sample-personalization-targets";
import { api } from "~/trpc/react";
import { toast } from "sonner";

interface PersonalizePageClientProps {
  project: {
    id: string;
    title: string;
    updatedAt?: string;
    sceneCount: number;
    approxDurationSeconds: number;
    format?: string | null;
    isTokenized: boolean;
  };
  brandTheme: BrandTheme;
  targets: PersonalizationTarget[];
}

const statusVariant: Record<PersonalizationTarget["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  scraped: "default",
  failed: "destructive",
  manual: "outline",
};

const sectorEmoji: Record<string, string> = {
  fintech: "💳",
  health: "🩺",
  creative: "🎨",
  ecommerce: "🛒",
  cybersecurity: "🛡️",
  logistics: "🚚",
  education: "🎓",
  analytics: "📊",
  venture: "🚀",
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

export function PersonalizePageClient({ project, brandTheme, targets }: PersonalizePageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [tokenizationSummary, setTokenizationSummary] = useState<string | null>(null);
  const resolvedAccents = brandTheme.colors.accents?.slice(0, 4) ?? [];

  const sectors = useMemo(() => {
    const map = new Map<string, number>();
    targets.forEach((target) => {
      map.set(target.sector, (map.get(target.sector) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [targets]);

  const tokenizeScenesMutation = api.project.tokenizeScenes.useMutation({
    onSuccess: (data) => {
      const message = `Tokenized ${data.updated}/${data.total} scenes${data.updated === data.total ? '' : ' (some already tokenized)'}.`;
      setTokenizationSummary(message);
      toast.success(message);
      router.refresh();
    },
    onError: (error) => {
      const message = error.message || 'Failed to tokenize scenes';
      setTokenizationSummary(message);
      toast.error(message);
    },
  });

  const handleTokenizeScenes = () => {
    setTokenizationSummary(null);
    tokenizeScenesMutation.mutate({ projectId: project.id });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="text-sm text-muted-foreground">
          Last updated {formatUpdatedAt(project.updatedAt)}
        </div>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-semibold">{project.title}</CardTitle>
              <CardDescription>
                {project.sceneCount} scenes · ~{project.approxDurationSeconds}s · {project.format ?? "landscape"}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              <div className="hidden h-20 w-32 items-center justify-center rounded-md border border-dashed border-muted-foreground/50 text-xs text-muted-foreground sm:flex">
                Preview placeholder
              </div>
              <Button
                variant={project.isTokenized ? "secondary" : "default"}
                size="sm"
                onClick={handleTokenizeScenes}
                disabled={tokenizeScenesMutation.isLoading}
              >
                {tokenizeScenesMutation.isLoading
                  ? "Converting scenes..."
                  : project.isTokenized
                    ? "Re-run tokenization"
                    : "Convert scenes automatically"}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Tokenization guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Convert scenes to BrandTheme tokens</DialogTitle>
                    <DialogDescription>
                      Run this once per master project before launching bulk personalization. It rewrites scenes so colors, fonts, and logos come from the shared theme.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 text-sm text-left">
                    <ol className="list-decimal space-y-2 pl-5">
                      <li>Export the current scene TSX (Workspace → Download code).</li>
                      <li>Run the “Brand tokenization” prompt from Sprint&nbsp;130 and swap hard-coded colors, fonts, and logo URLs for <code>theme.*</code> tokens.</li>
                      <li>Review the diff, test locally, then paste the updated TSX back into each scene.</li>
                      <li>Reload this page—the badge flips to green once every scene references <code>theme.</code>.</li>
                    </ol>
                    <p className="text-xs text-muted-foreground">
                      Fully-automated tokenization is planned; for now this manual pass keeps you in control of visual changes before bulk personalization.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Brand theme preview</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Primary</span>
                <span className="h-6 w-6 rounded-full border border-border" style={{ background: brandTheme.colors.primary }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Secondary</span>
                <span className="h-6 w-6 rounded-full border border-border" style={{ background: brandTheme.colors.secondary }} />
              </div>
              {resolvedAccents.map((accent, index) => (
                <div key={accent} className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Accent {index + 1}</span>
                  <span className="h-6 w-6 rounded-full border border-border" style={{ background: accent }} />
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Heading font</span>
                <div className="font-semibold">{brandTheme.fonts.heading.family}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Body font</span>
                <div>{brandTheme.fonts.body.family}</div>
              </div>
              {brandTheme.assets.logo?.light && (
                <Button variant="outline" size="sm" asChild>
                  <a href={brandTheme.assets.logo.light} target="_blank" rel="noreferrer">
                    View logo asset
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-2 text-sm">
            <p className="text-sm font-medium">Target sectors</p>
            <div className="grid gap-1">
              {sectors.map(([sector, count]) => (
                <div key={sector} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span>{sectorEmoji[sector] ?? '🏷️'}</span>
                    <span className="capitalize">{sector}</span>
                  </span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        {(tokenizationSummary || tokenizeScenesMutation.isLoading) && (
          <div className="px-6 pb-4 text-xs text-muted-foreground">
            {tokenizeScenesMutation.isLoading ? 'Converting scenes… This may take a minute.' : tokenizationSummary}
          </div>
        )}
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">1. Upload targets</TabsTrigger>
          <TabsTrigger value="review">2. Review & enrich</TabsTrigger>
          <TabsTrigger value="launch">3. Launch batch</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload your prospect list</CardTitle>
              <CardDescription>
                Drag in a CSV or JSON file with company name, website URL, and optional contact email. Use the sample dataset below to test the flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/40 px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">Upload coming soon</p>
                <p className="text-xs text-muted-foreground">For now, the sample targets drive the prototype.</p>
              </div>
              <Button variant="outline" size="sm" asChild className="self-start">
                <Link href="/sample-personalization-targets.json" target="_blank">
                  Download sample dataset
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="review" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Review & enrich targets</CardTitle>
              <CardDescription>
                Inspect scraped branding, tweak tokens, or remove companies before launching personalization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.map((target) => (
                      <TableRow key={target.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">{target.companyName}</TableCell>
                        <TableCell>
                          <a href={target.websiteUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                            {target.websiteUrl.replace(/^https?:\/\//, '')}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {sectorEmoji[target.sector] ? `${sectorEmoji[target.sector]} ${target.sector}` : target.sector}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[target.status]} className="capitalize">
                            {target.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs text-sm text-muted-foreground">
                          {target.notes}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Mock data</Badge>
                <span>Row actions (edit / rescrape) coming once APIs are wired.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="launch" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Launch personalization batch</CardTitle>
              <CardDescription>
                When connected, this step will enqueue renders with per-target brand themes and stream progress below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 px-4 py-3">
                  <p className="text-xs uppercase text-muted-foreground">Targets</p>
                  <p className="text-2xl font-semibold">{targets.length}</p>
                </div>
                <div className="rounded-lg border border-border/60 px-4 py-3">
                  <p className="text-xs uppercase text-muted-foreground">Estimated runtime</p>
                  <p className="text-base">~{Math.max(1, Math.ceil((targets.length * 2) / 5))} hours @ Lambda queue</p>
                </div>
              </div>
              <Button disabled className="w-full sm:w-auto">Prototype only — queue coming soon</Button>
              <div className="rounded-lg border border-dashed border-muted-foreground/40 px-4 py-6 text-center text-sm text-muted-foreground">
                Progress stream will appear here once the worker or n8n pipeline is connected.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
