"use client";

import { type ComponentType, type SVGProps, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

const timeframeLabels: Record<Timeframe, string> = {
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  all: "All Time",
};

const timeframeOrder: Timeframe[] = ["24h", "7d", "30d", "all"];

const metricColors: Record<MetricKey, string> = {
  users: "#3B82F6",
  projects: "#10B981",
  scenes: "#8B5CF6",
  prompts: "#F97316",
};

const metricIcons: Record<MetricKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  users: Users,
  projects: BarChart3,
  scenes: Video,
  prompts: Sparkles,
};

type Timeframe = "24h" | "7d" | "30d" | "all";
type MetricKey = "users" | "projects" | "scenes" | "prompts";

type SeriesPoint = {
  label: string;
  timestamp: string;
  users: number;
  projects: number;
  scenes: number;
  prompts: number;
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("7d");

  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();
  const isAdmin = adminCheck?.isAdmin === true;

  const metricsEnabled = isAdmin;
  const timeframeForSeries = selectedTimeframe === "all" ? "30d" : selectedTimeframe;
  const templatesTimeframe = selectedTimeframe === "all" ? "all" : selectedTimeframe;

  const { data: dashboardMetrics } = api.admin.getDashboardMetrics.useQuery(undefined, {
    enabled: metricsEnabled,
  });

  const usersSeriesQuery = api.admin.getAnalyticsData.useQuery(
    { timeframe: timeframeForSeries, metric: "users" },
    { enabled: metricsEnabled }
  );
  const projectsSeriesQuery = api.admin.getAnalyticsData.useQuery(
    { timeframe: timeframeForSeries, metric: "projects" },
    { enabled: metricsEnabled }
  );
  const scenesSeriesQuery = api.admin.getAnalyticsData.useQuery(
    { timeframe: timeframeForSeries, metric: "scenes" },
    { enabled: metricsEnabled }
  );
  const promptsSeriesQuery = api.admin.getAnalyticsData.useQuery(
    { timeframe: timeframeForSeries, metric: "prompts" },
    { enabled: metricsEnabled }
  );

  const { data: topTemplates, isLoading: templatesLoading } = api.admin.getTopTemplates.useQuery(
    { timeframe: templatesTimeframe, limit: 8 },
    { enabled: metricsEnabled }
  );

  const { data: engagementStats, isLoading: engagementLoading } = api.admin.getUserEngagementStats.useQuery(undefined, {
    enabled: metricsEnabled,
    refetchInterval: 300_000,
  });

  if (status === "loading" || adminCheckLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/login");
  }

  if (!isAdmin) {
    redirect("/admin");
  }

  const combinedSeries: SeriesPoint[] = useMemo(() => {
    const map = new Map<string, SeriesPoint>();

    const merge = (
      series: typeof usersSeriesQuery.data | undefined,
      key: MetricKey,
    ) => {
      series?.data?.forEach((point) => {
        const id = point.timestamp ?? `${point.label}-${key}`;
        const entry = map.get(id) ?? {
          label: point.label,
          timestamp: point.timestamp ?? point.label,
          users: 0,
          projects: 0,
          scenes: 0,
          prompts: 0,
        };
        entry[key] = point.count;
        entry.label = point.label;
        entry.timestamp = point.timestamp ?? entry.timestamp;
        map.set(id, entry);
      });
    };

    merge(usersSeriesQuery.data, "users");
    merge(projectsSeriesQuery.data, "projects");
    merge(scenesSeriesQuery.data, "scenes");
    merge(promptsSeriesQuery.data, "prompts");

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [
    usersSeriesQuery.data,
    projectsSeriesQuery.data,
    scenesSeriesQuery.data,
    promptsSeriesQuery.data,
  ]);

  const sparklineSeries = useMemo(() => {
    const base = combinedSeries.length > 0 ? combinedSeries : undefined;
    return {
      users: base?.map((point) => ({ label: point.label, value: point.users })) ?? [],
      projects: base?.map((point) => ({ label: point.label, value: point.projects })) ?? [],
      scenes: base?.map((point) => ({ label: point.label, value: point.scenes })) ?? [],
      prompts: base?.map((point) => ({ label: point.label, value: point.prompts })) ?? [],
    } satisfies Record<MetricKey, { label: string; value: number }[]>;
  }, [combinedSeries]);

  const getMetricSummary = (key: MetricKey) => {
    const metric = dashboardMetrics?.[key] as
      | {
          all?: number;
          last30Days?: number;
          last7Days?: number;
          last24Hours?: number;
          prev30Days?: number;
          prev7Days?: number;
          prev24Hours?: number;
        }
      | undefined;

    if (!metric) {
      return {
        total: 0,
        current: 0,
        previous: null as number | null,
        changePercent: null as number | null,
      };
    }

    const current = (() => {
      switch (selectedTimeframe) {
        case "24h":
          return metric.last24Hours ?? 0;
        case "7d":
          return metric.last7Days ?? 0;
        case "30d":
          return metric.last30Days ?? 0;
        case "all":
          return metric.all ?? 0;
      }
    })();

    const previous = (() => {
      switch (selectedTimeframe) {
        case "24h":
          return metric.prev24Hours ?? null;
        case "7d":
          return metric.prev7Days ?? null;
        case "30d":
          return metric.prev30Days ?? null;
        case "all":
          return null;
      }
    })();

    const changePercent =
      previous && previous !== 0
        ? ((current - previous) / previous) * 100
        : null;

    return {
      total: metric.all ?? 0,
      current,
      previous,
      changePercent,
    };
  };

  const growthLoading =
    usersSeriesQuery.isLoading ||
    projectsSeriesQuery.isLoading ||
    scenesSeriesQuery.isLoading ||
    promptsSeriesQuery.isLoading;

  return (
    <div className="container mx-auto space-y-8 py-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Truthful metrics for product and growth decisions.
            </p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            {combinedSeries.length} datapoints
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {timeframeOrder.map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {timeframeLabels[timeframe]}
            </button>
          ))}
        </div>
      </header>

      <section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(["users", "projects", "scenes", "prompts"] as MetricKey[]).map((key) => {
            const summary = getMetricSummary(key);
            const Icon = metricIcons[key];
            const sparkline = sparklineSeries[key];
            const showChange = summary.changePercent !== null;
            const changePositive = (summary.changePercent ?? 0) >= 0;

            return (
              <Card key={key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {metricTitleLookup[key]}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {selectedTimeframe === "all"
                        ? "All-time"
                        : `${timeframeLabels[selectedTimeframe]}`}
                    </CardDescription>
                  </div>
                  <span className="rounded-full bg-muted p-2 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold">
                      {summary.total.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      total
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{summary.current.toLocaleString()} this period</span>
                    {showChange && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          changePositive ? "text-emerald-500" : "text-red-500"
                        }`}
                      >
                        {changePositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(summary.changePercent ?? 0).toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="h-16">
                    {sparkline.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkline}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={metricColors[key]}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No data
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Growth Trends</CardTitle>
            <CardDescription>
              Aggregated activity over {timeframeLabels[timeframeForSeries]}.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[360px]">
            {growthLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading chart…
              </div>
            ) : combinedSeries.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No activity recorded for this timeframe.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedSeries}>
                  <defs>
                    {(Object.keys(metricColors) as MetricKey[]).map((key) => (
                      <linearGradient key={key} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metricColors[key]} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={metricColors[key]} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload ? (
                        <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
                          <p className="font-medium">{label}</p>
                          {payload.map((item) => (
                            <p key={item.dataKey} className="flex items-center gap-2">
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span>
                                {metricTitleLookup[item.dataKey as MetricKey]}: {item.value?.toLocaleString()}
                              </span>
                            </p>
                          ))}
                        </div>
                      ) : null
                    }
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="users" stroke={metricColors.users} fill={`url(#color-users)`} />
                  <Area type="monotone" dataKey="projects" stroke={metricColors.projects} fill={`url(#color-projects)`} />
                  <Area type="monotone" dataKey="scenes" stroke={metricColors.scenes} fill={`url(#color-scenes)`} />
                  <Area type="monotone" dataKey="prompts" stroke={metricColors.prompts} fill={`url(#color-prompts)`} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Top Templates</CardTitle>
                <CardDescription>Most frequently used templates</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Timeframe: {timeframeLabels[templatesTimeframe]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {templatesLoading ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                Loading templates…
              </div>
            ) : !topTemplates || topTemplates.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No template usage recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {topTemplates.map((template, index) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 p-3 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{template.name ?? "Untitled Template"}</p>
                        <p className="text-xs text-muted-foreground">ID: {template.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{template.usageCount?.toLocaleString() ?? 0}</p>
                      <p className="text-xs text-muted-foreground">uses</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Engagement Snapshot</CardTitle>
                <CardDescription>User retention and prompt activity</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Updated every 5 minutes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {engagementLoading ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                Loading engagement metrics…
              </div>
            ) : !engagementStats ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No engagement data available.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <EngagementTile
                    label="Never Returned After Signup"
                    value={`${engagementStats.engagement.usersNeverReturnedPercentage ?? "0"}%`}
                    description={`${engagementStats.engagement.usersNeverReturned?.toLocaleString() ?? 0} of ${
                      engagementStats.totalUsers?.toLocaleString() ?? 0
                    } users`}
                    tone="destructive"
                  />
                  <EngagementTile
                    label="Signed Up, No Prompts"
                    value={`${engagementStats.engagement.usersNoPromptsPercentage ?? "0"}%`}
                    description={`${engagementStats.engagement.usersNoPrompts?.toLocaleString() ?? 0} users`}
                    tone="warning"
                  />
                  <EngagementTile
                    label="Never Used Templates"
                    value={`${engagementStats.engagement.usersNoTemplatesPercentage ?? "0"}%`}
                    description={`${engagementStats.engagement.usersNoTemplates?.toLocaleString() ?? 0} users`}
                    tone="info"
                  />
                  <EngagementTile
                    label="Super Prompt Creators (500+)"
                    value={`${engagementStats.engagement.usersOver500PromptsPercentage ?? "0"}%`}
                    description={`${engagementStats.engagement.usersOver500Prompts?.toLocaleString() ?? 0} users`}
                    tone="success"
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Prompt Volume Distribution</h3>
                  <div className="space-y-2">
                    {promptDistributionRanges.map(({ key, label, color }) => {
                      const count = engagementStats.engagement[key] ?? 0;
                      const percentage = engagementStats.engagement[`${key}Percentage` as keyof typeof engagementStats.engagement] ?? "0";
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{label}</span>
                            <span className="text-muted-foreground">{percentage}% • {count.toLocaleString()} users</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${Number(percentage)}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

const metricTitleLookup: Record<MetricKey, string> = {
  users: "New Users",
  projects: "Projects",
  scenes: "Scenes",
  prompts: "Prompts",
};

const promptDistributionRanges: Array<{ key: keyof EngagementBreakdown; label: string; color: string }> = [
  { key: "usersNoPrompts", label: "No prompts", color: "#ef4444" },
  { key: "usersUnder5Prompts", label: "1–4 prompts", color: "#f97316" },
  { key: "users5To10Prompts", label: "5–10 prompts", color: "#f59e0b" },
  { key: "users10To20Prompts", label: "11–20 prompts", color: "#84cc16" },
  { key: "users20To50Prompts", label: "21–50 prompts", color: "#22c55e" },
  { key: "users50To100Prompts", label: "51–100 prompts", color: "#2dd4bf" },
  { key: "users100To200Prompts", label: "101–200 prompts", color: "#38bdf8" },
  { key: "users200To500Prompts", label: "201–500 prompts", color: "#6366f1" },
  { key: "usersOver500Prompts", label: "500+ prompts", color: "#a855f7" },
];

type EngagementBreakdown = {
  usersNeverReturned?: number;
  usersNeverReturnedPercentage?: string;
  usersNoPrompts?: number;
  usersNoPromptsPercentage?: string;
  usersNoTemplates?: number;
  usersNoTemplatesPercentage?: string;
  usersUnder5Prompts?: number;
  usersUnder5PromptsPercentage?: string;
  users5To10Prompts?: number;
  users5To10PromptsPercentage?: string;
  users10To20Prompts?: number;
  users10To20PromptsPercentage?: string;
  users20To50Prompts?: number;
  users20To50PromptsPercentage?: string;
  users50To100Prompts?: number;
  users50To100PromptsPercentage?: string;
  users100To200Prompts?: number;
  users100To200PromptsPercentage?: string;
  users200To500Prompts?: number;
  users200To500PromptsPercentage?: string;
  usersOver500Prompts?: number;
  usersOver500PromptsPercentage?: string;
};

type EngagementTileProps = {
  label: string;
  value: string;
  description: string;
  tone: "destructive" | "warning" | "info" | "success";
};

function EngagementTile({ label, value, description, tone }: EngagementTileProps) {
  const toneClasses: Record<EngagementTileProps["tone"], string> = {
    destructive: "border-red-500/20 bg-red-500/5 text-red-600",
    warning: "border-orange-500/20 bg-orange-500/5 text-orange-600",
    info: "border-yellow-500/20 bg-yellow-500/5 text-yellow-700",
    success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
  };

  return (
    <div className={`space-y-1 rounded-lg border p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
