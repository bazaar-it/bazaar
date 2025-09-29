//src/app/admin/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WheelEvent, TouchEvent as ReactTouchEvent } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Timeframe = 'all' | '30d' | '7d' | '24h';

const timeframeLabels = {
  all: 'All Time',
  '30d': 'Last 30 Days', 
  '7d': 'Last 7 Days',
  '24h': 'Last 24 Hours'
};

const metricColorPalettes = {
  blue: {
    gradient: "from-blue-500 to-indigo-600",
    stroke: "#60a5fa",
    fillFrom: "rgba(96, 165, 250, 0.35)",
    fillTo: "rgba(59, 130, 246, 0.05)",
  },
  green: {
    gradient: "from-emerald-500 to-green-600",
    stroke: "#34d399",
    fillFrom: "rgba(52, 211, 153, 0.35)",
    fillTo: "rgba(16, 185, 129, 0.05)",
  },
  purple: {
    gradient: "from-purple-500 to-pink-600",
    stroke: "#c084fc",
    fillFrom: "rgba(192, 132, 252, 0.35)",
    fillTo: "rgba(168, 85, 247, 0.05)",
  },
  orange: {
    gradient: "from-orange-500 to-red-600",
    stroke: "#fb923c",
    fillFrom: "rgba(251, 146, 60, 0.35)",
    fillTo: "rgba(249, 115, 22, 0.05)",
  },
} as const;

type MetricColorKey = keyof typeof metricColorPalettes;

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('30d');
  const [activeView, setActiveView] = useState<'overview' | 'growth'>('overview');

  // Check admin access
  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();
  const { data: dashboardData, isLoading } = api.admin.getDashboardMetrics.useQuery();

  const analyticsTimeframe: '24h' | '7d' | '30d' | 'all' = selectedTimeframe;

  const { data: usersAnalytics, isLoading: usersAnalyticsLoading } = api.admin.getAnalyticsData.useQuery(
    { timeframe: analyticsTimeframe, metric: 'users' },
    { enabled: adminCheck?.isAdmin === true }
  );

  const { data: promptsAnalytics, isLoading: promptsAnalyticsLoading } = api.admin.getAnalyticsData.useQuery(
    { timeframe: analyticsTimeframe, metric: 'prompts' },
    { enabled: adminCheck?.isAdmin === true }
  );

  const { data: scenesAnalytics, isLoading: scenesAnalyticsLoading } = api.admin.getAnalyticsData.useQuery(
    { timeframe: analyticsTimeframe, metric: 'scenes' },
    { enabled: adminCheck?.isAdmin === true }
  );

  const timeframeMeta: Record<Exclude<Timeframe, 'all'>, { label: string; days: number }> = {
    '30d': { label: timeframeLabels['30d'], days: 30 },
    '7d': { label: timeframeLabels['7d'], days: 7 },
    '24h': { label: timeframeLabels['24h'], days: 1 },
  };

  const SMALL_BASELINE_THRESHOLD = 10;

  type MetricSummary = {
    totalAllTime: number;
    currentPeriod: number;
    previousPeriod: number;
    absoluteChange: number;
    percentChange: number | null;
    averagePerDay: number | null;
  };

  type MetricApiShape = {
    all?: number;
    last30Days?: number;
    last7Days?: number;
    last24Hours?: number;
    prev30Days?: number;
    prev7Days?: number;
    prev24Hours?: number;
    timeframes?: Partial<Record<Exclude<Timeframe, 'all'>, MetricSummary>>;
  } | undefined;

  type SparklinePoint = {
    label: string;
    value: number;
    timestamp?: string;
  };

  const formatSignedNumber = (value: number) => {
    if (value > 0) return `+${value.toLocaleString()}`;
    if (value < 0) return `-${Math.abs(value).toLocaleString()}`;
    return '0';
  };

  const formatSignedPercent = (value: number | null) => {
    if (value === null) return null;
    const rounded = Math.round(Math.abs(value));
    if (rounded === 0) return null;
    return `${value >= 0 ? '+' : '-'}${rounded}%`;
  };

  const formatAveragePerDay = (value: number | null) => {
    if (value === null) return null;
    const rounded = value >= 10
      ? Math.round(value)
      : value >= 1
        ? Number(value.toFixed(1))
        : Number(value.toFixed(2));
    return rounded.toLocaleString();
  };

  const buildSummaryFromLegacy = (
    metric: MetricApiShape,
    timeframe: Exclude<Timeframe, 'all'>,
    totalAllTime: number,
  ): MetricSummary => {
    if (metric?.timeframes?.[timeframe]) {
      return metric.timeframes[timeframe]!;
    }

    const current = timeframe === '30d'
      ? metric?.last30Days ?? 0
      : timeframe === '7d'
        ? metric?.last7Days ?? 0
        : metric?.last24Hours ?? 0;

    const previous = timeframe === '30d'
      ? metric?.prev30Days ?? 0
      : timeframe === '7d'
        ? metric?.prev7Days ?? 0
        : metric?.prev24Hours ?? 0;

    const absoluteChange = current - previous;
    const percentChange = previous > 0 ? (absoluteChange / previous) * 100 : null;
    const averagePerDay = timeframeMeta[timeframe].days > 0
      ? current / timeframeMeta[timeframe].days
      : null;

    return {
      totalAllTime,
      currentPeriod: current,
      previousPeriod: previous,
      absoluteChange,
      percentChange,
      averagePerDay,
    };
  };

  const getMetricData = (metricKey: 'users' | 'prompts' | 'scenes') => {
    const metric = dashboardData?.[metricKey] as MetricApiShape;
    const total = metric?.all ?? 0;

    if (selectedTimeframe === 'all') {
      return { total, summary: undefined, timeframeKey: undefined as undefined };
    }

    const timeframeKey = selectedTimeframe as Exclude<Timeframe, 'all'>;
    const summary = buildSummaryFromLegacy(metric, timeframeKey, total);

    return { total, summary, timeframeKey };
  };

  const buildBadgeInfo = (summary?: MetricSummary) => {
    if (!summary) return null;

    const { previousPeriod, absoluteChange, percentChange, currentPeriod } = summary;

    if (previousPeriod <= SMALL_BASELINE_THRESHOLD) {
      if (absoluteChange !== 0) {
        return { text: formatSignedNumber(absoluteChange), isPositive: absoluteChange >= 0 };
      }
      if (currentPeriod === 0) {
        return null;
      }
      return { text: formatSignedNumber(currentPeriod), isPositive: currentPeriod >= 0 };
    }

    const percentText = formatSignedPercent(percentChange);
    if (percentText) {
      const isPositive = (percentChange ?? 0) >= 0;
      const magnitude = percentText.replace(/^[+-]/, '');
      return { text: `${isPositive ? '↑' : '↓'} ${magnitude}`, isPositive };
    }

    if (absoluteChange === 0) {
      return null;
    }

    return { text: formatSignedNumber(absoluteChange), isPositive: absoluteChange >= 0 };
  };

  const MetricCard = ({
    title,
    totalValue,
    totalLabel,
    summary,
    timeframe,
    color = "blue",
    href,
    icon,
    chartData,
    chartCaption,
    chartAriaLabel,
    isChartLoading,
  }: {
    title: string;
    totalValue: number;
    totalLabel: string;
    summary?: MetricSummary;
    timeframe?: { key: Exclude<Timeframe, 'all'>; label: string };
    color?: MetricColorKey;
    href?: string;
    icon?: React.ReactNode;
    chartData?: SparklinePoint[];
    chartCaption?: string;
    chartAriaLabel?: string;
    isChartLoading?: boolean;
  }) => {
    const palette = metricColorPalettes[color];
    const badge = buildBadgeInfo(summary);
    const totalLocale = totalValue.toLocaleString();
    const primaryValue = summary && timeframe ? summary.currentPeriod : totalValue;
    const primaryLocale = primaryValue.toLocaleString();
    const hasChartData = !!chartData && chartData.length > 0;
    const gradientId = `metric-gradient-${title.replace(/\s+/g, '-').toLowerCase()}`;

    const absoluteText = summary ? formatSignedNumber(summary.absoluteChange) : null;
    const percentText = summary && summary.percentChange !== null && Math.abs(summary.percentChange) >= 1
      ? formatSignedPercent(summary.percentChange)
      : null;
    const averageText = summary?.averagePerDay !== null && summary?.averagePerDay !== undefined
      ? formatAveragePerDay(summary.averagePerDay)
      : null;

    const CardContent = () => (
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-700 overflow-hidden group">
        {/* Gradient overlay for depth */}
        <div className={`absolute inset-0 bg-gradient-to-br ${palette.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />

        {/* Icon background gradient */}
        {icon && (
          <div className={`absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br ${palette.gradient} opacity-10 rounded-full blur-2xl`} />
        )}

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {icon && (
                <div className={`p-2 bg-gradient-to-br ${palette.gradient} rounded-lg shadow-lg`}>
                  {icon}
                </div>
              )}
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h3>
            </div>
            {badge && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                badge.isPositive
                  ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-400 border border-red-500/30'
              }`}>
                {badge.text}
              </span>
            )}
          </div>
          <p className="text-4xl font-bold text-white tracking-tight mb-1">
            {primaryLocale}
          </p>
          {summary && timeframe ? (
            <div className="space-y-1.5">
              <p className="text-sm text-gray-300">
                <span className="text-gray-400">Total:</span> <span className="text-gray-100 font-medium">{totalLocale}</span>
              </p>
              <p className="text-sm text-gray-400">
                <span className="text-gray-400">Previous {timeframe.label.toLowerCase()}:</span> {summary.previousPeriod.toLocaleString()}
              </p>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <span className="text-gray-400">Change:</span>
                {absoluteText && (
                  <span className={summary.absoluteChange >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                    {absoluteText}
                  </span>
                )}
                {percentText && (
                  <span className={summary.percentChange && summary.percentChange >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                    {percentText}
                  </span>
                )}
              </p>
              {averageText && (
                <p className="text-xs text-gray-500">≈ {averageText} per day</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{totalLocale} total • {totalLabel}</p>
          )}

          {(hasChartData || isChartLoading) && (
            <div className="mt-6">
              <div className="h-24" role="img" aria-label={chartAriaLabel}>
                {isChartLoading ? (
                  <div className="flex h-full items-center justify-center text-xs text-gray-500">
                    Loading trend...
                  </div>
                ) : hasChartData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={palette.fillFrom} />
                          <stop offset="100%" stopColor={palette.fillTo} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" hide tick={{ fill: '#9ca3af' }} padding={{ left: 4, right: 4 }} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ strokeOpacity: 0 }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const value = payload[0]?.value as number | undefined;
                          return (
                            <div className="rounded-md border border-gray-700 bg-gray-900/90 px-3 py-2 text-xs text-gray-100 shadow-xl">
                              <div className="font-medium">{label}</div>
                              <div className="text-sm font-semibold">{typeof value === 'number' ? value.toLocaleString() : '--'}</div>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={palette.stroke}
                        strokeWidth={2}
                        fill={`url(#${gradientId})`}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-600">
                    Not enough data yet
                  </div>
                )}
              </div>
              {chartCaption && (
                <p className="mt-2 text-xs text-gray-500">{chartCaption}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );

    if (href) {
      return (
        <Link href={href} className="block">
          <CardContent />
        </Link>
      );
    }

    return <CardContent />;
  };

  const TimeframeToggle = () => (
    <div className="flex space-x-1 bg-gray-800/50 backdrop-blur-sm p-1 rounded-xl mb-8 w-fit border border-gray-700/50 shadow-lg">
      {(Object.keys(timeframeLabels) as Timeframe[]).map((timeframe) => (
        <button
          key={timeframe}
          onClick={() => setSelectedTimeframe(timeframe)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            selectedTimeframe === timeframe
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          }`}
        >
          {timeframeLabels[timeframe]}
        </button>
      ))}
    </div>
  );

  const ViewToggle = () => (
    <div className="flex space-x-1 bg-gray-800/30 backdrop-blur-sm p-1 rounded-xl mb-8 w-fit border border-gray-700/40 shadow-lg">
      {([
        { key: 'overview', label: 'Overview' },
        { key: 'growth', label: 'Growth' },
      ] as const).map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setActiveView(key)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            activeView === key
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const usersMetric = getMetricData('users');
  const promptsMetric = getMetricData('prompts');
  const scenesMetric = getMetricData('scenes');

  const usersTimeframe = usersMetric.timeframeKey ? { key: usersMetric.timeframeKey, label: timeframeMeta[usersMetric.timeframeKey].label } : undefined;
  const promptsTimeframe = promptsMetric.timeframeKey ? { key: promptsMetric.timeframeKey, label: timeframeMeta[promptsMetric.timeframeKey].label } : undefined;
  const scenesTimeframe = scenesMetric.timeframeKey ? { key: scenesMetric.timeframeKey, label: timeframeMeta[scenesMetric.timeframeKey].label } : undefined;

  const usersSparkline = useMemo<SparklinePoint[]>(() => {
    return usersAnalytics?.data?.map((point) => ({
      label: point.label,
      value: point.count,
      timestamp: point.timestamp,
    })) ?? [];
  }, [usersAnalytics]);

  const promptsSparkline = useMemo<SparklinePoint[]>(() => {
    return promptsAnalytics?.data?.map((point) => ({
      label: point.label,
      value: point.count,
      timestamp: point.timestamp,
    })) ?? [];
  }, [promptsAnalytics]);

  const scenesSparkline = useMemo<SparklinePoint[]>(() => {
    return scenesAnalytics?.data?.map((point) => ({
      label: point.label,
      value: point.count,
      timestamp: point.timestamp,
    })) ?? [];
  }, [scenesAnalytics]);

  type GrowthPoint = {
    label: string;
    cumulative: number;
    delta: number;
    timestamp?: string;
    index: number;
    dateMs?: number;
  };

  const usersGrowthData = useMemo<GrowthPoint[]>(() => {
    return usersAnalytics?.data?.map((point, index) => ({
      label: point.label,
      cumulative: point.cumulative,
      delta: point.count,
      timestamp: point.timestamp,
      index,
      dateMs: point.timestamp ? new Date(point.timestamp).getTime() : undefined,
    })) ?? [];
  }, [usersAnalytics]);

  const promptsGrowthData = useMemo<GrowthPoint[]>(() => {
    return promptsAnalytics?.data?.map((point, index) => ({
      label: point.label,
      cumulative: point.cumulative,
      delta: point.count,
      timestamp: point.timestamp,
      index,
      dateMs: point.timestamp ? new Date(point.timestamp).getTime() : undefined,
    })) ?? [];
  }, [promptsAnalytics]);

  const scenesGrowthData = useMemo<GrowthPoint[]>(() => {
    return scenesAnalytics?.data?.map((point, index) => ({
      label: point.label,
      cumulative: point.cumulative,
      delta: point.count,
      timestamp: point.timestamp,
      index,
      dateMs: point.timestamp ? new Date(point.timestamp).getTime() : undefined,
    })) ?? [];
  }, [scenesAnalytics]);

  const sparklineWindowLabel = timeframeLabels[selectedTimeframe];

  const sparklineCaption = `Sparkline window: ${sparklineWindowLabel}`;

  const chartCaptionForCards = selectedTimeframe === 'all' ? sparklineCaption : undefined;

  const buildSparklineAriaLabel = (metricLabel: string) => (
    selectedTimeframe === 'all'
      ? `${metricLabel} trend for ${timeframeLabels['30d']} (sparkline fallback for all-time view)`
      : `${metricLabel} trend for ${sparklineWindowLabel}`
  );

  const resolveFinalTotal = (data: GrowthPoint[], fallback: number) => {
    if (data.length > 0) {
      const lastPoint = data[data.length - 1];
      return lastPoint.cumulative;
    }
    return fallback;
  };

  const usersGrowthTotal = resolveFinalTotal(
    usersGrowthData,
    usersAnalytics?.totalCount ?? usersMetric.summary?.currentPeriod ?? usersMetric.total,
  );

  const promptsGrowthTotal = resolveFinalTotal(
    promptsGrowthData,
    promptsAnalytics?.totalCount ?? promptsMetric.summary?.currentPeriod ?? promptsMetric.total,
  );

  const scenesGrowthTotal = resolveFinalTotal(
    scenesGrowthData,
    scenesAnalytics?.totalCount ?? scenesMetric.summary?.currentPeriod ?? scenesMetric.total,
  );

  const growthCharts = [
    {
      key: 'users' as const,
      title: 'Total Users',
      description: 'Cumulative registered accounts',
      color: 'blue' as MetricColorKey,
      data: usersGrowthData,
      total: usersGrowthTotal,
      loading: usersAnalyticsLoading,
    },
    {
      key: 'prompts' as const,
      title: 'Total Prompts',
      description: 'Cumulative user prompts',
      color: 'green' as MetricColorKey,
      data: promptsGrowthData,
      total: promptsGrowthTotal,
      loading: promptsAnalyticsLoading,
    },
    {
      key: 'scenes' as const,
      title: 'Total Scenes',
      description: 'Cumulative AI-generated scenes',
      color: 'purple' as MetricColorKey,
      data: scenesGrowthData,
      total: scenesGrowthTotal,
      loading: scenesAnalyticsLoading,
    },
  ];

  const [growthRanges, setGrowthRanges] = useState<Record<string, { startIndex: number; endIndex: number }>>({});
  const [growthActiveIndex, setGrowthActiveIndex] = useState<Record<string, number>>({});
  const [growthHover, setGrowthHover] = useState<Record<string, string | null>>({});
  const pinchStateRef = useRef<Record<string, { initialDistance: number; startRange: { startIndex: number; endIndex: number } }>>({});

  useEffect(() => {
    if (activeView !== 'growth') {
      return;
    }

    setGrowthRanges({
      users: { startIndex: 0, endIndex: Math.max(usersGrowthData.length - 1, 0) },
      prompts: { startIndex: 0, endIndex: Math.max(promptsGrowthData.length - 1, 0) },
      scenes: { startIndex: 0, endIndex: Math.max(scenesGrowthData.length - 1, 0) },
    });

    setGrowthHover({});
    setGrowthActiveIndex({});
  }, [
    usersGrowthData.length,
    promptsGrowthData.length,
    scenesGrowthData.length,
    activeView,
    selectedTimeframe,
  ]);

  const authLoading = status === "loading" || adminCheckLoading;
  const isAuthenticated = Boolean(session?.user);
  const isAdmin = adminCheck?.isAdmin === true;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    redirect('/login');
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin dashboard.</p>

          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const overviewSection = (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title={selectedTimeframe === 'all' ? 'Total Users' : 'New Users'}
          totalValue={usersMetric.total}
          totalLabel="Registered users"
          summary={usersMetric.summary}
          timeframe={usersTimeframe}
          color="blue"
          href="/admin/users"
          chartData={usersSparkline}
          chartCaption={chartCaptionForCards}
          chartAriaLabel={buildSparklineAriaLabel('User sign-ups')}
          isChartLoading={usersAnalyticsLoading}
          icon={
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        <MetricCard
          title={selectedTimeframe === 'all' ? 'Total Prompts' : 'Prompts this period'}
          totalValue={promptsMetric.total}
          totalLabel="Prompts submitted"
          summary={promptsMetric.summary}
          timeframe={promptsTimeframe}
          color="green"
          href="/admin/analytics"
          chartData={promptsSparkline}
          chartCaption={chartCaptionForCards}
          chartAriaLabel={buildSparklineAriaLabel('Prompts submitted')}
          isChartLoading={promptsAnalyticsLoading}
          icon={
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        />

        <MetricCard
          title={selectedTimeframe === 'all' ? 'Scenes Generated' : 'Scenes this period'}
          totalValue={scenesMetric.total}
          totalLabel="AI-generated scenes"
          summary={scenesMetric.summary}
          timeframe={scenesTimeframe}
          color="purple"
          chartData={scenesSparkline}
          chartCaption={chartCaptionForCards}
          chartAriaLabel={buildSparklineAriaLabel('Scenes generated')}
          isChartLoading={scenesAnalyticsLoading}
          icon={
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
            </svg>
          }
        />

      </div>

      {isLoading && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gray-800 rounded-lg">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-400">Loading dashboard data...</span>
          </div>
        </div>
      )}
    </>
  );

  const growthSection = (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Cumulative Growth</h2>
        <p className="text-sm text-gray-400">{`Total users, prompts, and scenes over ${sparklineWindowLabel.toLowerCase()}. Scroll to zoom, drag to pan.`}</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {growthCharts.map((chart) => {
          const palette = metricColorPalettes[chart.color];
          const gradientId = `growth-gradient-${chart.key}`;
          const data = chart.data;
          const hasData = data.length > 0;
          const currentRange = growthRanges[chart.key] ?? {
            startIndex: 0,
            endIndex: Math.max(data.length - 1, 0),
          };
          const domainStart = Math.max(0, Math.min(currentRange.startIndex, Math.max(data.length - 1, 0)));
          const domainEnd = Math.max(domainStart, Math.min(currentRange.endIndex, Math.max(data.length - 1, 0)));
          const hoveredLabel = growthHover[chart.key] ?? null;
          const displayIndex = Math.min(domainEnd, data.length - 1);
          const displayTotal = displayIndex >= 0 ? data[displayIndex]?.cumulative ?? chart.total : chart.total;

          const tickFormatter = (value: number) => {
            const idx = Math.max(0, Math.min(Math.round(value), data.length - 1));
            return data[idx]?.label ?? '';
          };

          const ticks = (() => {
            if (!hasData) return [] as number[];
            const desiredTicks = Math.min(6, domainEnd - domainStart + 1);
            if (desiredTicks <= 1) {
              return [domainStart, domainEnd];
            }
            const step = Math.max(1, Math.floor((domainEnd - domainStart) / (desiredTicks - 1)));
            const values: number[] = [];
            for (let i = domainStart; i <= domainEnd; i += step) {
              values.push(i);
            }
            if (values[values.length - 1] !== domainEnd) {
              values.push(domainEnd);
            }
            return values;
          })();

          const len = data.length;

          const updateRange = (startIndex: number, endIndex: number) => {
            if (!hasData) return;
            const clampedStart = Math.max(0, Math.min(startIndex, len - 1));
            const clampedEnd = Math.max(clampedStart, Math.min(endIndex, len - 1));
            setGrowthRanges(prev => ({
              ...prev,
              [chart.key]: { startIndex: clampedStart, endIndex: clampedEnd },
            }));
          };

          const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
            if (!hasData) return;
            event.preventDefault();

            const span = Math.max(1, currentRange.endIndex - currentRange.startIndex);

            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
              const shift = Math.sign(event.deltaX) * Math.ceil(Math.abs(event.deltaX) / 80);
              if (shift === 0) return;
              updateRange(currentRange.startIndex + shift, currentRange.endIndex + shift);
              return;
            }

            const zoomIn = event.deltaY < 0;
            if (zoomIn && span <= 1) return;

            const center = growthActiveIndex[chart.key] ?? Math.round((currentRange.startIndex + currentRange.endIndex) / 2);

            let newSpan = Math.round(span * (zoomIn ? 0.8 : 1.25));
            newSpan = Math.max(1, Math.min(newSpan, len - 1));

            if (!zoomIn && newSpan >= len - 1) {
              updateRange(0, len - 1);
              return;
            }

            let newStart = center - Math.floor(newSpan / 2);
            let newEnd = center + Math.ceil(newSpan / 2);
            if (newSpan % 2 === 0) {
              newEnd -= 1;
            }

            if (newStart < 0) {
              newEnd += -newStart;
              newStart = 0;
            }
            if (newEnd > len - 1) {
              const offset = newEnd - (len - 1);
              newStart = Math.max(0, newStart - offset);
              newEnd = len - 1;
            }

            updateRange(newStart, newEnd);
          };

          const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
            if (event.touches.length !== 2 || !hasData) return;
            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const distance = Math.hypot(dx, dy);
            pinchStateRef.current[chart.key] = {
              initialDistance: distance,
              startRange: { ...currentRange },
            };
          };

          const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
            const pinchState = pinchStateRef.current[chart.key];
            if (!pinchState || event.touches.length !== 2 || !hasData) return;
            event.preventDefault();

            const dx = event.touches[0].clientX - event.touches[1].clientX;
            const dy = event.touches[0].clientY - event.touches[1].clientY;
            const distance = Math.hypot(dx, dy);
            if (distance <= 0) return;

            const scale = distance / pinchState.initialDistance;
            const startSpan = Math.max(1, pinchState.startRange.endIndex - pinchState.startRange.startIndex);
            let newSpan = Math.round(startSpan / scale);
            newSpan = Math.max(1, Math.min(newSpan, len - 1));

            const center = growthActiveIndex[chart.key] ?? Math.round((pinchState.startRange.startIndex + pinchState.startRange.endIndex) / 2);

            let newStart = center - Math.floor(newSpan / 2);
            let newEnd = center + Math.ceil(newSpan / 2);
            if (newSpan % 2 === 0) {
              newEnd -= 1;
            }

            if (newStart < 0) {
              newEnd += -newStart;
              newStart = 0;
            }
            if (newEnd > len - 1) {
              const offset = newEnd - (len - 1);
              newStart = Math.max(0, newStart - offset);
              newEnd = len - 1;
            }

            updateRange(newStart, newEnd);
          };

          const handleTouchEnd = () => {
            delete pinchStateRef.current[chart.key];
          };

          const handleDoubleClick = () => {
            if (!hasData) return;
            updateRange(0, len - 1);
          };

          return (
            <div
              key={chart.key}
              className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700/70"
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              style={{ touchAction: 'none' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-200">{chart.title}</h3>
                  <p className="text-xs text-gray-500">{chart.description}</p>
                  {hoveredLabel && (
                    <p className="text-[11px] text-gray-400 mt-1">Hover: {hoveredLabel}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-white">{displayTotal.toLocaleString()}</span>
              </div>
              <div className="h-72" role="img" aria-label={`${chart.title} cumulative chart`}>
                {chart.loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">Loading chart…</div>
                ) : hasData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data}
                      margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
                      onMouseMove={(state) => {
                        if (state?.activeLabel) {
                          setGrowthHover(prev => ({ ...prev, [chart.key]: String(state.activeLabel) }));
                        }
                        if (state?.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                          setGrowthActiveIndex(prev => ({ ...prev, [chart.key]: state.activeTooltipIndex as number }));
                        }
                      }}
                      onMouseLeave={() => {
                        setGrowthHover(prev => ({ ...prev, [chart.key]: null }));
                      }}
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={palette.fillFrom} />
                          <stop offset="100%" stopColor={palette.fillTo} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                      <XAxis
                        type="number"
                        dataKey="index"
                        domain={[domainStart, domainEnd]}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        stroke="rgba(148, 163, 184, 0.3)"
                        tickFormatter={tickFormatter}
                        ticks={ticks}
                      />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} stroke="rgba(148, 163, 184, 0.3)" allowDecimals={false} />
                      <Tooltip
                        cursor={{ stroke: palette.stroke, strokeOpacity: 0.2 }}
                        formatter={(_value, _name, payload) => {
                          const payloadPoint = payload?.payload as GrowthPoint | undefined;
                          if (!payloadPoint) {
                            return ['0', 'Total'];
                          }
                          return [payloadPoint.cumulative.toLocaleString(), 'Total'];
                        }}
                        labelFormatter={(value) => {
                          const idx = Math.max(0, Math.min(Math.round(Number(value)), data.length - 1));
                          const point = data[idx];
                          if (!point) return '';
                          const delta = point.delta ? `${point.delta >= 0 ? '+' : '-'}${Math.abs(point.delta).toLocaleString()}` : null;
                          return delta ? `${point.label} • Δ ${delta}` : point.label;
                        }}
                        wrapperStyle={{ outline: 'none' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke={palette.stroke}
                        strokeWidth={2.5}
                        fill={`url(#${gradientId})`}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">No data in this window</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-400">Monitor key metrics and user feedback</p>
        </div>

        <TimeframeToggle />
        <ViewToggle />

        {activeView === 'overview' ? overviewSection : growthSection}
      </div>
    </div>
  );
}
