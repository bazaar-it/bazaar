//src/app/admin/analytics/page.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { CalendarIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from "lucide-react";

type Timeframe = '24h' | '7d' | '30d';
type Metric = 'users' | 'projects' | 'scenes' | 'prompts';

const timeframeLabels = {
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days'
};

const metricLabels = {
  users: 'New Users',
  projects: 'Projects Created',
  scenes: 'Scenes Created',
  prompts: 'Prompts Submitted'
};

const metricColors = {
  users: 'rgb(59, 130, 246)', // blue
  projects: 'rgb(16, 185, 129)', // green
  scenes: 'rgb(245, 158, 11)', // yellow
  prompts: 'rgb(139, 92, 246)' // purple
};

// Helper to format date ranges
const getDateRangeLabel = (startDate: Date, endDate: Date) => {
  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString(undefined, formatOptions)} - ${endDate.toLocaleDateString(undefined, formatOptions)}`;
};

// Calculate custom date ranges for comparison
const getCustomDateRange = (periodType: 'current' | 'previous') => {
  const now = new Date();
  const endDate = periodType === 'current' ? new Date(now) : new Date(now.setDate(now.getDate() - 7));
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6); // 7 days including today
  return { startDate, endDate };
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('7d');
  const [selectedMetric, setSelectedMetric] = useState<Metric>('users');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{
    current: { startDate: Date; endDate: Date };
    previous: { startDate: Date; endDate: Date };
  }>({
    current: getCustomDateRange('current'),
    previous: getCustomDateRange('previous')
  });

  // Check admin access
  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();

  // New endpoints
  const { data: trends, isLoading: trendsLoading } = api.admin.getTrends.useQuery(
    { timeframe: selectedTimeframe },
    { enabled: adminCheck?.isAdmin === true }
  );
  const { data: wow, isLoading: wowLoading } = api.admin.getWoW.useQuery(
    { weeks: 1 },
    { enabled: adminCheck?.isAdmin === true }
  );
  const { data: topTemplates } = api.admin.getTopTemplates.useQuery(
    { timeframe: selectedTimeframe as any, limit: 10 },
    { enabled: adminCheck?.isAdmin === true }
  );
  const { data: monetization } = api.admin.getMonetizationFunnel.useQuery(
    { timeframe: selectedTimeframe },
    { enabled: adminCheck?.isAdmin === true }
  );

  // Fetch comparison data when in comparison mode
  const { data: comparisonData, isLoading: comparisonLoading } = api.admin.getAnalyticsComparison.useQuery(
    {
      metric: selectedMetric,
      currentStart: customDateRange.current.startDate.toISOString(),
      currentEnd: customDateRange.current.endDate.toISOString(),
      previousStart: customDateRange.previous.startDate.toISOString(),
      previousEnd: customDateRange.previous.endDate.toISOString(),
    },
    { enabled: adminCheck?.isAdmin === true && comparisonMode }
  );

  // Handle authentication and admin access
  if (status === "loading" || adminCheckLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session?.user) {
    redirect('/login');
  }

  if (!adminCheck?.isAdmin) {
    redirect('/admin');
  }

  const ComparisonChart = ({ currentData, previousData }: { currentData: any[]; previousData: any[] }) => {
    if (!currentData || currentData.length === 0) return <div className="text-gray-500">No data available</div>;

    const maxValue = Math.max(
      ...currentData.map(d => d.count),
      ...(previousData || []).map(d => d.count)
    );
    const chartHeight = 200;

    return (
      <div className="w-full">
        <div className="flex items-end space-x-1" style={{ height: chartHeight }}>
          {currentData.map((point, index) => {
            const currentHeight = maxValue > 0 ? (point.count / maxValue) * (chartHeight - 20) : 0;
            const previousPoint = previousData?.[index];
            const previousHeight = previousPoint && maxValue > 0 ? (previousPoint.count / maxValue) * (chartHeight - 20) : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex justify-center mb-1 relative">
                  {/* Previous period bar (ghosted) */}
                  {previousPoint && (
                    <div
                      className="absolute opacity-30 rounded-t transition-all duration-300 min-w-[4px]"
                      style={{ 
                        height: previousHeight + 'px',
                        backgroundColor: metricColors[selectedMetric],
                        width: '60%',
                        left: '20%'
                      }}
                      title={`Previous: ${previousPoint.label}: ${previousPoint.count}`}
                    />
                  )}
                  {/* Current period bar */}
                  <div
                    className="relative rounded-t transition-all duration-300 hover:opacity-80 min-w-[4px]"
                    style={{ 
                      height: currentHeight + 'px',
                      backgroundColor: metricColors[selectedMetric],
                      width: '60%',
                      boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
                    }}
                    title={`Current: ${point.label}: ${point.count}`}
                  />
                </div>
                <div className="text-xs text-gray-500 text-center transform -rotate-45 origin-center mt-2">
                  {point.label}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: metricColors[selectedMetric] }}
            />
            <span className="text-gray-700">Current Period</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded opacity-30" 
              style={{ backgroundColor: metricColors[selectedMetric] }}
            />
            <span className="text-gray-500">Previous Period</span>
          </div>
        </div>
      </div>
    );
  };

  const SimpleChart = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return <div className="text-gray-500">No data available</div>;

    const maxValue = Math.max(...data.map(d => d.count));
    const chartHeight = 200;

    return (
      <div className="w-full">
        <div className="flex items-end space-x-1" style={{ height: chartHeight }}>
          {data.map((point, index) => {
            const barHeight = maxValue > 0 ? (point.count / maxValue) * (chartHeight - 20) : 0;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex justify-center mb-1">
                  <div
                    className="bg-indigo-500 rounded-t transition-all duration-300 hover:bg-indigo-600 min-w-[4px]"
                    style={{ 
                      height: barHeight + 'px',
                      backgroundColor: metricColors[selectedMetric]
                    }}
                    title={`${point.label}: ${point.count}`}
                  />
                </div>
                <div className="text-xs text-gray-500 text-center transform -rotate-45 origin-center mt-2">
                  {point.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const MetricOverviewCard = ({ 
    metric, 
    value, 
    label, 
    color,
    previousValue,
    showComparison 
  }: { 
    metric: Metric; 
    value: number; 
    label: string; 
    color: string;
    previousValue?: number;
    showComparison?: boolean;
  }) => {
    const percentChange = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
    const isPositive = percentChange > 0;
    const isNeutral = percentChange === 0;
    
    return (
      <div 
        className={`bg-white rounded-lg shadow p-6 border border-gray-200 cursor-pointer transition-all ${
          selectedMetric === metric ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-lg'
        }`}
        onClick={() => setSelectedMetric(metric)}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500">{label}</h3>
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value.toLocaleString()}</div>
        {showComparison && previousValue !== undefined ? (
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">vs previous</p>
            <div className={`flex items-center gap-1 text-xs font-medium ${
              isPositive ? 'text-green-600' : isNeutral ? 'text-gray-500' : 'text-red-600'
            }`}>
              {isPositive ? <TrendingUpIcon className="w-3 h-3" /> : 
               isNeutral ? <MinusIcon className="w-3 h-3" /> : 
               <TrendingDownIcon className="w-3 h-3" />}
              <span>{Math.abs(percentChange).toFixed(1)}%</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">in {timeframeLabels[selectedTimeframe]}</p>
        )}
      </div>
    );
  };

  const isLoading = trendsLoading || wowLoading || (comparisonMode && comparisonLoading);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard - Analytics</h1>
        <p className="text-gray-600">Platform usage metrics and growth trends</p>
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Timeframe Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['24h', '7d', '30d'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => {
                setSelectedTimeframe(timeframe);
                setComparisonMode(false); // Reset comparison when changing timeframe
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedTimeframe === timeframe && !comparisonMode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {timeframeLabels[timeframe]}
            </button>
          ))}
        </div>

        {/* Comparison Toggle */}
        <button
          onClick={() => setComparisonMode(!comparisonMode)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            comparisonMode
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          {comparisonMode ? 'Comparing Periods' : 'Compare 7-Day Periods'}
        </button>

        {/* Date Range Display */}
        {comparisonMode && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-medium">
              {getDateRangeLabel(customDateRange.current.startDate, customDateRange.current.endDate)}
            </span>
            <span className="text-gray-400">vs</span>
            <span>
              {getDateRangeLabel(customDateRange.previous.startDate, customDateRange.previous.endDate)}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading analytics data...</div>
        </div>
      ) : (
        <>
          {/* WoW Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="text-sm text-gray-500 mb-2">Export Success Rate</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{((wow?.exportSuccess.current || 0) * 100).toFixed(0)}%</div>
              <div className="text-xs text-gray-500">vs {(wow ? (wow.exportSuccess.previous*100).toFixed(0) : '0')}% last {wow?.windowDays || 7} days</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="text-sm text-gray-500 mb-2">Paying Users</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{wow?.payingUsers.current || 0}</div>
              <div className="text-xs text-gray-500">vs {wow?.payingUsers.previous || 0} last {wow?.windowDays || 7} days</div>
            </div>
          </div>

          {/* Main Chart */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Trends - {timeframeLabels[selectedTimeframe]}</h3>
              <div className="text-sm text-gray-500">
                {(() => {
                  const totals = {
                    exports: (trends?.exports ?? []).reduce((s: number, d: any) => s + (d?.count ?? 0), 0),
                    prompts: (trends?.prompts ?? []).reduce((s: number, d: any) => s + (d?.count ?? 0), 0),
                    conversions: (trends?.conversions ?? []).reduce((s: number, d: any) => s + (d?.count ?? 0), 0),
                  };
                  return (
                    <span>Totals — E: {totals.exports} | P: {totals.prompts} | C: {totals.conversions}</span>
                  );
                })()}
              </div>
            </div>

            <div className="h-64">
              {/* 3 mini charts stacked: Exports / Prompts / Conversions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Exports</div>
                  <SimpleChart data={trends?.exports || []} />
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Prompts</div>
                  <SimpleChart data={trends?.prompts || []} />
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Conversions</div>
                  <SimpleChart data={trends?.conversions || []} />
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              {'Exports / Prompts / Conversions over time'}
            </div>
          </div>

          {/* Top Templates */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Templates</h3>
              <div className="text-sm text-gray-500">Last: {timeframeLabels[selectedTimeframe]}</div>
            </div>
            {topTemplates && topTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topTemplates.map((t) => (
                  <div key={t.id} className="border rounded-lg p-3 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                      {t.thumbnailUrl ? (<img src={t.thumbnailUrl} alt="thumb" className="w-full h-full object-cover" />) : (<span className="text-xs text-gray-400">No thumb</span>)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{t.name}</div>
                      <div className="text-xs text-gray-500">Usage: {t.usageCount}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No template usage yet</div>
            )}
          </div>

          {/* Monetization Funnel */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Monetization Funnel</h3>
              <div className="text-sm text-gray-500">{timeframeLabels[selectedTimeframe]}</div>
            </div>
            {monetization ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Viewed</div>
                    <div className="text-xl font-semibold">{monetization.counts.viewed}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Clicked</div>
                    <div className="text-xl font-semibold">{monetization.counts.clicked}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Initiated</div>
                    <div className="text-xl font-semibold">{monetization.counts.initiated}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-xs text-gray-500">Completed</div>
                    <div className="text-xl font-semibold">{monetization.counts.completed}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Viewed → Clicked</span>
                    <span className="font-medium">{Math.round((monetization.conversion.viewed_to_clicked || 0) * 100)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Clicked → Initiated</span>
                    <span className="font-medium">{Math.round((monetization.conversion.clicked_to_initiated || 0) * 100)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Initiated → Completed</span>
                    <span className="font-medium">{Math.round((monetization.conversion.initiated_to_completed || 0) * 100)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Overall</span>
                    <span className="font-medium">{Math.round((monetization.conversion.overall || 0) * 100)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No monetization data</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}