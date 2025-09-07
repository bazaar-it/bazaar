"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Heart, Plus, ChevronDown, ChevronRight, ChevronLeft, Shuffle } from "lucide-react";
import { cn } from "~/lib/cn";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import AppHeader from "~/components/AppHeader";
import { Player } from "@remotion/player";
import { transform } from "sucrase";
import { TEMPLATES } from "~/templates/registry";

type CategoryItem = {
  category: string | null;
  count: number;
};

type VideoFormat = 'landscape' | 'portrait' | 'square';

// Map selected format to composition dimensions for accurate previews
function getFormatDims(format: VideoFormat) {
  switch (format) {
    case 'portrait':
      return { width: 1080, height: 1920 };
    case 'square':
      return { width: 1080, height: 1080 };
    case 'landscape':
    default:
      return { width: 1920, height: 1080 };
  }
}

export default function CommunityPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [format, setFormat] = useState<VideoFormat>('landscape');
  const [activeTab, setActiveTab] = useState<'explore' | 'favorites' | 'mine'>("explore");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { data: session } = useSession();
  const [uiOpen, setUiOpen] = useState(true);
  // Local optimistic overrides for counters
  const [countOverrides, setCountOverrides] = useState<Record<string, { favoritesCount?: number; usageCount?: number }>>({});

  // Load favorites from localStorage after mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("community:favorites");
      if (raw) {
        setFavorites(new Set<string>(JSON.parse(raw)));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Fetch templates from community router (server filters format + search + category)
  const { data: communityList, isLoading } = api.community.listTemplates.useQuery({
    limit: 100,
    filter: {
      format,
      search: search || undefined,
      category: activeCategory || undefined,
    },
    sort: 'recent',
  });

  // Fetch user favorites and mine tabs (lazy)
  const { data: myFavorites = [] } = api.community.getUserFavorites.useQuery(undefined, {
    enabled: activeTab === 'favorites',
  });
  const { data: myTemplates = [] } = api.community.getUserTemplates.useQuery(undefined, {
    enabled: activeTab === 'mine',
  });

  const utils = api.useUtils();
  const createProject = api.project.create.useMutation();
  const addTemplateMutation = api.generation.addTemplate.useMutation();

  const favoriteMutation = api.community.favoriteTemplate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.community.listTemplates.invalidate(),
        utils.community.getUserFavorites.invalidate(),
      ]);
    },
    onError: () => {
      // Revert optimistic override on error
      toast.error('Failed to favorite');
    },
  });
  const unfavoriteMutation = api.community.unfavoriteTemplate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.community.listTemplates.invalidate(),
        utils.community.getUserFavorites.invalidate(),
      ]);
    },
    onError: () => {
      toast.error('Failed to unfavorite');
    },
  });
  function toggleFavorite(id: string, isHardcoded?: boolean) {
    setFavorites((prev) => {
      const next = new Set(prev);
      const willFav = !next.has(id);
      if (willFav) next.add(id); else next.delete(id);
      try { window.localStorage.setItem("community:favorites", JSON.stringify([...next])); } catch {}
      return next;
    });
    // Persist to server for community templates
    if (!isHardcoded) {
      // Optimistic counter update
      const current = countOverrides[id]?.favoritesCount ?? (combinedTemplates.find(t => t.id === id)?.favoritesCount ?? 0);
      const delta = favorites.has(id) ? -1 : 1; // if already favorited, we are unfavoriting
      const nextCount = Math.max(0, current + delta);
      setCountOverrides((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), favoritesCount: nextCount },
      }));

      if (!favorites.has(id)) {
        favoriteMutation.mutate({ templateId: id });
      } else {
        unfavoriteMutation.mutate({ templateId: id });
      }
    }
  }

  const useTemplateMutation = api.community.useTemplate.useMutation({
    onSuccess: async (_res, variables) => {
      // Optimistic uses counter bump
      const id = variables.templateId;
      const current = countOverrides[id]?.usageCount ?? (combinedTemplates.find(t => t.id === id)?.usageCount ?? 0);
      setCountOverrides((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), usageCount: current + 1 },
      }));
      await utils.community.listTemplates.invalidate();
    }
  });
  async function handleRemix(templateId: string, isHardcoded?: boolean, template?: any) {
    // Require auth
    if (!session?.user) {
      window.location.href = "/login?callbackUrl=/community";
      return;
    }
    try {
      setRemixingId(templateId);
      if (isHardcoded && template) {
        // Legacy path for hardcoded templates
        try {
          const project = await createProject.mutateAsync({ format: (template.supportedFormats?.[0] ?? 'landscape') as any });
          await addTemplateMutation.mutateAsync({
            projectId: project.projectId,
            templateId: template.id,
            templateName: template.name,
            templateCode: template.tsxCode,
            templateDuration: template.duration,
          });
          window.location.href = `/projects/${project.projectId}/generate`;
        } catch (e: any) {
          toast.error(`Remix failed: ${e?.message || 'Unknown error'}`);
        }
      } else {
        // Community template import flow
        try {
          const tpl = await utils.community.getTemplate.fetch({ templateId });
          const defaultFormat = (Array.isArray(tpl.template.supportedFormats) && (tpl.template.supportedFormats as any)[0]) || 'landscape';
          const project = await createProject.mutateAsync({ format: defaultFormat as any });
          await useTemplateMutation.mutateAsync({ templateId, projectId: project.projectId });
          window.location.href = `/projects/${project.projectId}/generate`;
        } catch (e: any) {
          toast.error(`Remix failed: ${e?.message || 'Unknown error'}`);
        }
      }
    } finally {
      setRemixingId(null);
    }
  }

  const sidebarWidth = sidebarOpen ? 260 : 60;

  // Sidebar category model
  const UI_SUBCATEGORIES = [
    "Accordions",
    "AI Chats",
    "Alerts",
    "Avatars",
    "Badges",
    "Buttons",
    "Calendars",
    "Cards",
    "Carousels",
    "Checkboxes",
    "Date Pickers",
    "Dialogs / Modals",
    "Dropdowns",
    "Empty States",
    "File Trees",
    "File Uploads",
    "Forms",
    "Icons",
    "Inputs",
    "Links",
    "Menus",
    "Notifications",
  ];

  // Helpers
  const normalize = (s?: string | null) => (s ?? "").toLowerCase();

  // Combine database templates and previous hardcoded templates for "All"
  type TemplateItem = {
    id: string;
    name: string;
    duration: number;
    tsxCode: string;
    supportedFormats?: Array<'landscape'|'portrait'|'square'>;
    isOfficial?: boolean;
    category?: string | null;
    thumbnailUrl?: string | null;
    usageCount?: number;
    favoritesCount?: number;
    creator?: { id: string; name: string | null } | null;
    isHardcoded?: boolean;
  };

  const combinedTemplates: TemplateItem[] = useMemo(() => {
    const list = communityList?.items ?? [];
    const fromCommunity: TemplateItem[] = list.map((t: any) => ({
      id: t.id,
      name: t.title,
      duration: 150,
      tsxCode: '',
      supportedFormats: t.supportedFormats as any,
      isOfficial: false,
      category: (t.category as any) ?? null,
      thumbnailUrl: (t.thumbnailUrl as any) ?? null,
      usageCount: (t.usesCount as any) ?? 0,
      favoritesCount: (t.favoritesCount as any) ?? 0,
      creator: null,
      isHardcoded: false,
    }));

    const fromHardcoded: TemplateItem[] = TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      duration: t.duration,
      tsxCode: t.getCode(),
      supportedFormats: t.supportedFormats,
      isOfficial: true,
      category: null,
      thumbnailUrl: null,
      usageCount: 0,
      favoritesCount: 0,
      creator: null,
      isHardcoded: true,
    }));

    // Tabs behavior
    if (activeTab === 'favorites') {
      // Build directly from server favorites to avoid relying on listTemplates filters
      const favs: TemplateItem[] = (myFavorites as any[]).map((f: any) => ({
        id: f.id,
        name: f.title,
        duration: 150,
        tsxCode: '',
        supportedFormats: f.supportedFormats as any,
        isOfficial: false,
        category: (f.category as any) ?? null,
        thumbnailUrl: (f.thumbnailUrl as any) ?? null,
        usageCount: (f.usesCount as any) ?? 0,
        favoritesCount: (f.favoritesCount as any) ?? 0,
        creator: null,
        isHardcoded: false,
      }));
      return favs;
    }
    if (activeTab === 'mine') {
      const mineIds = new Set(myTemplates.map((m: any) => m.id));
      return fromCommunity.filter((t) => mineIds.has(t.id));
    }
    // Explore shows both hardcoded and community
    return [...fromHardcoded, ...fromCommunity];
  }, [communityList, TEMPLATES, activeTab, myFavorites, myTemplates]);

  const countFor = (name: string) =>
    combinedTemplates.filter(t => normalize(t.category) === normalize(name)).length;

  const countForGroup = (names: string[]) =>
    combinedTemplates.filter(t => names.map(normalize).includes(normalize(t.category))).length;

  // Compute templates to display based on active category or subcategory
  const templates = useMemo(() => {
    // Filter by format first
    const byFormat = combinedTemplates.filter(t => {
      const list = (t.supportedFormats as any) as VideoFormat[] | undefined;
      return !list || list.length === 0 ? true : list.includes(format);
    });
    if (!activeCategory) return byFormat;
    const target = normalize(activeCategory);
    // Group header: only filter if there are matches, otherwise show all to avoid empty state
    if (target === normalize("UI Components")) {
      const set = new Set(UI_SUBCATEGORIES.map(normalize));
      const matches = byFormat.filter(t => set.has(normalize(t.category)));
      return matches.length > 0 ? matches : byFormat;
    }
    // Exact category match
    return byFormat.filter(t => normalize(t.category) === target);
  }, [activeCategory, combinedTemplates, format]);

  const handleCardClick = (id: string) => setSelectedTemplateId(id);
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return combinedTemplates.find(t => t.id === selectedTemplateId) || null;
  }, [selectedTemplateId, combinedTemplates]);
  const handleCloseModal = () => setSelectedTemplateId(null);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={session?.user as any} />
      <div className="flex flex-1 min-h-[calc(100vh-68px)]">
      {/* Sidebar */}
      <aside
        className={cn("border-r bg-white transition-all duration-200", sidebarOpen ? "px-3" : "px-0")}
        style={{ width: sidebarWidth }}
      >
        <div className="flex items-center justify-between h-12 px-2">
          {sidebarOpen ? (
            <div className="text-base font-semibold text-gray-800">Categories</div>
          ) : (
            <div />
          )}
          <button className="p-2" onClick={() => setSidebarOpen((v) => !v)} aria-label={sidebarOpen ? "Collapse" : "Expand"}>
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Categories */}
        <div className="mt-2 space-y-2">
          {/* Group: Categories */}
          <div>
            <button
              onClick={() => setActiveCategory(null)}
              className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 font-semibold text-gray-800",
                activeCategory === null && "bg-gray-100")}
            >
              <span className="truncate text-left">{sidebarOpen ? "All" : ""}</span>
              {sidebarOpen && <span className="text-gray-500">{combinedTemplates.length}</span>}
            </button>
            <button
              onClick={() => setActiveCategory("Text effects")}
              className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 font-semibold text-gray-800",
                activeCategory === "Text effects" && "bg-gray-100")}
            >
              <span className="truncate text-left">{sidebarOpen ? "Text effects" : ""}</span>
              {sidebarOpen && <span className="text-gray-500">{countFor("Text effects")}</span>}
            </button>
            <button
              onClick={() => setActiveCategory("Animations")}
              className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 font-semibold text-gray-800",
                activeCategory === "Animations" && "bg-gray-100")}
            >
              <span className="truncate text-left">{sidebarOpen ? "Animations" : ""}</span>
              {sidebarOpen && <span className="text-gray-500">{countFor("Animations")}</span>}
            </button>
            <button
              onClick={() => setActiveCategory("Backgrounds")}
              className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 font-semibold text-gray-800",
                activeCategory === "Backgrounds" && "bg-gray-100")}
            >
              <span className="truncate text-left">{sidebarOpen ? "Backgrounds" : ""}</span>
              {sidebarOpen && <span className="text-gray-500">{countFor("Backgrounds")}</span>}
            </button>
          </div>

          {/* Group: UI Components */}
          <div>
            <button
              onClick={() => {
                // Toggle dropdown; also set filter to group when selecting header
                setUiOpen((v) => !v);
                setActiveCategory("UI Components");
              }}
              className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-50 font-semibold text-gray-800",
                activeCategory === "UI Components" && "bg-gray-100")}
              aria-expanded={uiOpen}
            >
              <span className="truncate text-left flex items-center gap-2">
                {sidebarOpen && (uiOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />)}
                {sidebarOpen ? "UI Components" : ""}
              </span>
              {sidebarOpen && <span className="text-gray-500">{countForGroup(UI_SUBCATEGORIES)}</span>}
            </button>

            {/* Subcategories dropdown */}
            {sidebarOpen && uiOpen && (
              <div className="mt-1 pl-6 space-y-1">
                {UI_SUBCATEGORIES.map((name) => (
                  <button
                    key={name}
                    onClick={() => setActiveCategory(name)}
                    className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-gray-50",
                      activeCategory === name && "bg-gray-100")}
                  >
                    <span className="truncate text-left">{name}</span>
                    <span className="text-gray-500">{countFor(name)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Content */}
      <section className="flex-1 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Community Templates</h1>
            <div className="flex rounded-full border bg-white p-1">
              {(["explore","favorites","mine"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-full",
                    activeTab === tab ? "bg-black text-white" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {tab === 'explore' ? 'Explore' : tab === 'favorites' ? 'My Favorites' : 'My Templates'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['landscape','square','portrait'] as VideoFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={cn(
                  'px-3 py-1 rounded-full text-sm border',
                  format === f ? 'bg-black text-white border-black' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                )}
                aria-pressed={format === f}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full max-w-md rounded-md border px-3 py-2 text-sm"
          />
        </div>

        {isLoading ? (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
            }}
          >
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onOpen={() => handleCardClick(t.id)}
                onRemix={() => handleRemix(t.id, t.isHardcoded, t)}
                remixing={remixingId === t.id}
                isFavorited={favorites.has(t.id)}
                onFavorite={() => toggleFavorite(t.id, t.isHardcoded)}
                displayFormat={format}
                overrides={countOverrides[t.id]}
              />
            ))}
          </div>
        )}
      </section>

      <TemplateModal
        templateId={selectedTemplateId}
        onClose={handleCloseModal}
        onRemix={() => selectedTemplateId && handleRemix(selectedTemplateId, selectedTemplate?.isHardcoded, selectedTemplate)}
        remixing={!!remixingId && selectedTemplateId === remixingId}
        isFavorited={selectedTemplateId ? favorites.has(selectedTemplateId) : false}
        onFavorite={() => selectedTemplateId && toggleFavorite(selectedTemplateId, selectedTemplate?.isHardcoded)}
        fallbackTemplate={selectedTemplate || undefined}
        displayFormat={format}
      />
      </div>
    </div>
  );
}

function initialsFromName(name?: string | null) {
  const n = (name ?? "?").trim();
  if (!n) return "?";
  return n.charAt(0).toUpperCase();
}

function TemplateCard({ template, onOpen, onRemix, remixing, isFavorited, onFavorite, displayFormat, overrides }: { template: any; onOpen: () => void; onRemix?: () => void; remixing?: boolean; isFavorited?: boolean; onFavorite?: () => void; displayFormat: VideoFormat; overrides?: { favoritesCount?: number; usageCount?: number } }) {
  const [hovered, setHovered] = useState(false);
  const format = displayFormat;

  const avatar = useMemo(() => {
    const letter = initialsFromName(template.creator?.name);
    const colors = ["bg-indigo-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-sky-500"];
    const color = colors[letter.charCodeAt(0) % colors.length];
    return { letter, color } as const;
  }, [template.creator?.name]);

  const favorites = overrides?.favoritesCount ?? template.favoritesCount ?? 0;
  const uses = overrides?.usageCount ?? template.usageCount ?? 0;
  const isBazaarTemplate = !template?.creator && template?.isOfficial;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      <div className={cn(
        format === 'portrait' ? 'w-full bg-gray-100 aspect-[9/16]' :
        format === 'square' ? 'w-full bg-gray-100 aspect-square' :
        'w-full bg-gray-100 aspect-video'
      )}>
        {hovered ? (
          <TemplateHoverVideo tsxCode={template.tsxCode} duration={template.duration} format={format} />
        ) : template.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={template.thumbnailUrl} alt={template.name} className="h-full w-full object-cover" />
        ) : (
          <TemplateFrameThumbnail tsxCode={template.tsxCode} duration={template.duration} format={format} />
        )}

        {/* Hover actions */}
        <div
          className={cn(
            "pointer-events-none absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity",
            hovered && "pointer-events-auto opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton aria-label="Favorite" onClick={onFavorite}>
            <Heart className={cn("h-4 w-4", isFavorited ? "fill-red-500 text-red-500" : "")} />
          </IconButton>
          <IconButton aria-label="Remix" onClick={onRemix} disabled={remixing}>
            <Plus className={cn("h-4 w-4", remixing && "animate-pulse") } />
          </IconButton>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        <div
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-full",
            isBazaarTemplate
              ? "bg-white text-black border border-gray-200 font-semibold"
              : cn(avatar.color, "text-white")
          )}
          style={isBazaarTemplate ? { fontFamily: 'Inter, ui-sans-serif, system-ui' } : undefined}
        >
          <span className="text-sm font-medium">{isBazaarTemplate ? "B" : avatar.letter}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-900">{template.name}</div>
        </div>
        <div className="ml-2 shrink-0 flex items-center gap-3 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5" aria-hidden /> {favorites}
          </span>
          <span className="inline-flex items-center gap-1">
            <Shuffle className="h-3.5 w-3.5" aria-hidden /> {uses}
          </span>
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "rounded-md bg-white/90 p-1.5 text-gray-700 shadow ring-1 ring-gray-200 hover:bg-white",
        props.className
      )}
    >
      {children}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="aspect-video w-full bg-gray-100 animate-pulse" />
      <div className="px-3 py-2">
        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

function TemplateFrameThumbnail({ tsxCode, duration, format }: { tsxCode?: string; duration?: number; format: VideoFormat }) {
  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const [errored, setErrored] = useState(false);

  // Compile TSX code client-side to a component for frame capture
  useEffect(() => {
    let cancelled = false as boolean;
    let blobUrl: string | null = null;
    async function compile() {
      if (!tsxCode) {
        setErrored(true);
        return;
      }
      try {
        // Basic guardrails
        const dangerous = [/eval\s*\(/, /Function\s*\(/, /document\.write/, /window\.location/];
        for (const p of dangerous) {
          if (p.test(tsxCode)) throw new Error("Unsafe template code");
        }
        const { code } = transform(tsxCode, { transforms: ["typescript", "jsx"], jsxRuntime: "classic", production: false });
        const blob = new Blob([code], { type: "application/javascript" });
        blobUrl = URL.createObjectURL(blob);
        const mod = await import(/* webpackIgnore: true */ blobUrl);
        if (!cancelled && mod?.default && typeof mod.default === "function") {
          setComponent(() => mod.default as React.ComponentType);
        } else if (!cancelled) {
          setErrored(true);
        }
      } catch {
        if (!cancelled) setErrored(true);
      } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      }
    }
    compile();
    return () => {
      cancelled = true;
    };
  }, [tsxCode]);

  if (errored || !component) {
    return <div className="flex h-full w-full items-center justify-center text-gray-400">No thumbnail</div>;
  }

  const safeInitialFrame = Math.min(15, Math.floor((duration ?? 150) / 2));
  const dims = getFormatDims(format);

  return (
    <Player
      component={component}
      durationInFrames={duration ?? 150}
      fps={30}
      compositionWidth={dims.width}
      compositionHeight={dims.height}
      controls={false}
      showVolumeControls={false}
      autoPlay={false}
      initialFrame={safeInitialFrame}
      style={{ width: "100%", height: "100%", pointerEvents: "none", objectFit: "cover" }}
    />
  );
}

function TemplateHoverVideo({ tsxCode, duration, format }: { tsxCode?: string; duration?: number; format: VideoFormat }) {
  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false as boolean;
    let blobUrl: string | null = null;
    async function compile() {
      if (!tsxCode) {
        setErrored(true);
        return;
      }
      try {
        const { code } = transform(tsxCode, { transforms: ["typescript", "jsx"], jsxRuntime: "classic", production: false });
        const blob = new Blob([code], { type: "application/javascript" });
        blobUrl = URL.createObjectURL(blob);
        const mod = await import(/* webpackIgnore: true */ blobUrl);
        if (!cancelled && mod?.default && typeof mod.default === "function") {
          setComponent(() => mod.default as React.ComponentType);
        } else if (!cancelled) {
          setErrored(true);
        }
      } catch {
        if (!cancelled) setErrored(true);
      } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      }
    }
    compile();
    return () => {
      cancelled = true;
    };
  }, [tsxCode]);

  if (errored || !component) {
    return <div className="flex h-full w-full items-center justify-center text-gray-400">No preview</div>;
  }

  const dims = getFormatDims(format);
  return (
    <Player
      component={component}
      durationInFrames={duration ?? 150}
      fps={30}
      compositionWidth={dims.width}
      compositionHeight={dims.height}
      controls={false}
      showVolumeControls={false}
      autoPlay
      loop
      style={{ width: "100%", height: "100%", pointerEvents: "none", objectFit: "contain", background: 'black' }}
    />
  );
}

function TemplateModal({ templateId, onClose, onRemix, remixing, isFavorited, onFavorite, fallbackTemplate, displayFormat }: { templateId: string | null; onClose: () => void; onRemix?: () => void; remixing?: boolean; isFavorited?: boolean; onFavorite?: () => void; fallbackTemplate?: any; displayFormat: VideoFormat }) {
  const open = Boolean(templateId);
  // Try to load community template details (scenes) to render preview
  const { data: communityDetails } = api.community.getTemplate.useQuery(
    { templateId: templateId as string },
    { enabled: open && !!templateId }
  );
  const template = fallbackTemplate;
  const firstSceneTsx = communityDetails?.scenes?.[0]?.tsxCode ?? (template as any)?.tsxCode;
  const firstSceneDuration = communityDetails?.scenes?.[0]?.duration ?? (template as any)?.duration;

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <DialogContent className="w-[80vw] max-w-none p-0 rounded-2xl overflow-hidden gap-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pr-20 py-3 border-b bg-white gap-3">
          {/* Left: Title + Creator */}
          <div className="flex items-center gap-3 min-w-0">
            <DialogTitle className="truncate whitespace-nowrap overflow-hidden max-w-[45vw]">
              {(template as any)?.name ?? "Template"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {(() => {
                const isBazaar = (template as any)?.isOfficial || !(template as any)?.creator || (template as any)?.creator?.id === 'system-changelog';
                const name = isBazaar ? "Bazaar" : (template as any)?.creator?.name || "?";
                const letter = initialsFromName(name);
                return (
                  <div
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded-full border",
                      isBazaar ? "bg-white text-black border-gray-200" : "bg-indigo-500 text-white border-transparent"
                    )}
                    style={isBazaar ? { fontFamily: 'Inter, ui-sans-serif, system-ui' } : undefined}
                  >
                    <span className="text-xs font-semibold">{isBazaar ? "B" : letter}</span>
                  </div>
                );
              })()}
              <div className="text-sm text-gray-800 font-medium truncate max-w-[20vw]">
                {((template as any)?.isOfficial || !(template as any)?.creator) ? 'Bazaar' : ((template as any)?.creator?.name || (template as any)?.creator?.id)}
              </div>
            </div>
          </div>
          {/* Right: Buttons only */}
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={onRemix} disabled={remixing}>
              <Plus className="mr-1 h-4 w-4" /> {remixing ? "Remixing…" : "Remix"}
            </Button>
            <Button size="sm" variant="outline" onClick={onFavorite}>
              <Heart className={cn("mr-1 h-4 w-4", isFavorited ? "fill-red-500 text-red-500" : "")} /> {isFavorited ? "Favorited" : "Favorite"}
            </Button>
          </div>
        </div>

        {/* Full-width preview at 80vw */}
        <div className="w-full" style={{ maxHeight: '85vh' }}>
          <div className={cn(
            displayFormat === 'portrait' ? 'w-full aspect-[9/16] m-0' :
            displayFormat === 'square' ? 'w-full aspect-square m-0' :
            'w-full aspect-video m-0'
          )}>
            {template && (
              <TemplateHoverVideo tsxCode={firstSceneTsx} duration={firstSceneDuration} format={displayFormat} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

