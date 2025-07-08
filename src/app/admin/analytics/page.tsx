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

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = api.admin.getAnalyticsData.useQuery(
    { timeframe: selectedTimeframe, metric: selectedMetric },
    { enabled: adminCheck?.isAdmin === true }
  );

  const { data: overviewData, isLoading: overviewLoading } = api.admin.getAnalyticsOverview.useQuery(
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

  const isLoading = analyticsLoading || overviewLoading || (comparisonMode && comparisonLoading);

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
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricOverviewCard
              metric="users"
              value={comparisonMode ? (comparisonData?.current.users || 0) : (overviewData?.metrics.users || 0)}
              previousValue={comparisonMode ? comparisonData?.previous.users : undefined}
              showComparison={comparisonMode}
              label="New Users"
              color={metricColors.users}
            />
            <MetricOverviewCard
              metric="projects"
              value={comparisonMode ? (comparisonData?.current.projects || 0) : (overviewData?.metrics.projects || 0)}
              previousValue={comparisonMode ? comparisonData?.previous.projects : undefined}
              showComparison={comparisonMode}
              label="Projects Created"
              color={metricColors.projects}
            />
            <MetricOverviewCard
              metric="scenes"
              value={comparisonMode ? (comparisonData?.current.scenes || 0) : (overviewData?.metrics.scenes || 0)}
              previousValue={comparisonMode ? comparisonData?.previous.scenes : undefined}
              showComparison={comparisonMode}
              label="Scenes Created"
              color={metricColors.scenes}
            />
            <MetricOverviewCard
              metric="prompts"
              value={comparisonMode ? (comparisonData?.current.prompts || 0) : (overviewData?.metrics.prompts || 0)}
              previousValue={comparisonMode ? comparisonData?.previous.prompts : undefined}
              showComparison={comparisonMode}
              label="Prompts Submitted"
              color={metricColors.prompts}
            />
          </div>

          {/* Main Chart */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {metricLabels[selectedMetric]} - {comparisonMode ? 'Period Comparison' : timeframeLabels[selectedTimeframe]}
              </h3>
              <div className="text-sm text-gray-500">
                {comparisonMode ? (
                  <span>
                    Current: {comparisonData?.currentData?.totalCount || 0} | 
                    Previous: {comparisonData?.previousData?.totalCount || 0}
                  </span>
                ) : (
                  <span>Total: {analyticsData?.totalCount || 0}</span>
                )}
              </div>
            </div>

            <div className="h-64">
              {comparisonMode ? (
                <ComparisonChart 
                  currentData={comparisonData?.currentData?.data || []} 
                  previousData={comparisonData?.previousData?.data || []}
                />
              ) : (
                <SimpleChart data={analyticsData?.data || []} />
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              {comparisonMode 
                ? 'Showing current week vs previous week comparison'
                : 'Click on metric cards above to change the chart data'
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}