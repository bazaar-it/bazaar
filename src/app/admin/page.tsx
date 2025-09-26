//src/app/admin/page.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

type Timeframe = 'all' | '30d' | '7d' | '24h';

const timeframeLabels = {
  all: 'All Time',
  '30d': 'Last 30 Days', 
  '7d': 'Last 7 Days',
  '24h': 'Last 24 Hours'
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('30d');

  // Check admin access
  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();
  const { data: dashboardData, isLoading } = api.admin.getDashboardMetrics.useQuery();
  const { data: payingStats } = api.admin.getPayingUsersStats.useQuery({ timeframe: selectedTimeframe === 'all' ? '30d' : selectedTimeframe });

  // Handle authentication and admin access
  if (status === "loading" || adminCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    redirect('/login');
  }

  if (!adminCheck?.isAdmin) {
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
  }: {
    title: string;
    totalValue: number;
    totalLabel: string;
    summary?: MetricSummary;
    timeframe?: { key: Exclude<Timeframe, 'all'>; label: string };
    color?: "blue" | "green" | "purple" | "orange";
    href?: string;
    icon?: React.ReactNode;
  }) => {
    const colorClasses = {
      blue: "from-blue-500 to-indigo-600",
      green: "from-emerald-500 to-green-600", 
      purple: "from-purple-500 to-pink-600",
      orange: "from-orange-500 to-red-600"
    };

    const badge = buildBadgeInfo(summary);
    const totalLocale = totalValue.toLocaleString();
    const primaryValue = summary && timeframe ? summary.currentPeriod : totalValue;
    const primaryLocale = primaryValue.toLocaleString();

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
        <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
        
        {/* Icon background gradient */}
        {icon && (
          <div className={`absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full blur-2xl`} />
        )}
        
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {icon && (
                <div className={`p-2 bg-gradient-to-br ${colorClasses[color]} rounded-lg shadow-lg`}>
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
          <p className={`text-4xl font-bold text-white tracking-tight mb-1`}>
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

  const usersMetric = getMetricData('users');
  const promptsMetric = getMetricData('prompts');
  const scenesMetric = getMetricData('scenes');

  const usersTimeframe = usersMetric.timeframeKey ? { key: usersMetric.timeframeKey, label: timeframeMeta[usersMetric.timeframeKey].label } : undefined;
  const promptsTimeframe = promptsMetric.timeframeKey ? { key: promptsMetric.timeframeKey, label: timeframeMeta[promptsMetric.timeframeKey].label } : undefined;
  const scenesTimeframe = scenesMetric.timeframeKey ? { key: scenesMetric.timeframeKey, label: timeframeMeta[scenesMetric.timeframeKey].label } : undefined;

  const effectivePayingTimeframe = (selectedTimeframe === 'all' ? '30d' : selectedTimeframe) as Exclude<Timeframe, 'all'>;

  const payingSummary = payingStats
    ? {
        totalAllTime: payingStats.payingUsers || 0,
        currentPeriod: payingStats.payingUsers || 0,
        previousPeriod: payingStats.previousPayingUsers || 0,
        absoluteChange: (payingStats.payingUsers || 0) - (payingStats.previousPayingUsers || 0),
        percentChange: typeof payingStats.usersChangePct === 'number' ? payingStats.usersChangePct : null,
        averagePerDay: timeframeMeta[effectivePayingTimeframe].days > 0
          ? (payingStats.payingUsers || 0) / timeframeMeta[effectivePayingTimeframe].days
          : null,
      }
    : undefined;

  const formatPayingUsersDescription = () => {
    const euros = ((payingStats?.revenueCents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${timeframeLabels[effectivePayingTimeframe]} revenue • €${euros}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
      </div>
      
      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-400">Monitor key metrics and user feedback</p>
        </div>

        <TimeframeToggle />

        {/* Enhanced Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title={selectedTimeframe === 'all' ? 'Total Users' : 'New Users'}
            totalValue={usersMetric.total}
            totalLabel="Registered users"
            summary={usersMetric.summary}
            timeframe={usersTimeframe}
            color="blue"
            href="/admin/users"
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
            icon={
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
              </svg>
            }
          />

          <MetricCard
            title="Paying Users"
            totalValue={payingStats?.payingUsers || 0}
            totalLabel={formatPayingUsersDescription()}
            summary={payingSummary}
            timeframe={{ key: effectivePayingTimeframe, label: timeframeMeta[effectivePayingTimeframe].label }}
            color="orange"
            href="/admin/paywall-analytics"
            icon={
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Recent Feedback Section */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Feedback</h3>
            <Link
              href="/admin/feedback"
              className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              View All Feedback
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {dashboardData?.recentFeedback && dashboardData.recentFeedback.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recentFeedback.map((feedback) => (
                <div key={feedback.id} className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-gradient-to-b from-indigo-500 to-purple-600 hover:bg-gray-700/50 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-sm text-white font-semibold">
                          {feedback.name || 'Anonymous'}
                        </p>
                        {feedback.email && (
                          <p className="text-sm text-gray-400">
                            ({feedback.email})
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{feedback.content}</p>
                    </div>
                    <div className="text-xs text-gray-500 ml-4">
                      {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : 'No date'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500">No feedback received yet</div>
            </div>
          )}
        </div>

        {/* Loading State */}
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
      </div>
    </div>
  );
}
