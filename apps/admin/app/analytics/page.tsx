//src/app/admin/analytics/page.tsx
"use client";

import { useState } from "react";
import { api } from "../../lib/api";
import { useAdminAuthTRPC } from "../../lib/use-admin-auth-trpc";
import { redirect } from "next/navigation";

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

export default function AnalyticsPage() {
  const { isAuthenticated, isAdmin, user, isLoading: authLoading } = useAdminAuthTRPC();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('7d');
  const [selectedMetric, setSelectedMetric] = useState<Metric>('users');

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = api.admin.getAnalyticsData.useQuery(
    { timeframe: selectedTimeframe, metric: selectedMetric },
    { enabled: isAuthenticated && isAdmin }
  );

  const { data: overviewData, isLoading: overviewLoading } = api.admin.getAnalyticsOverview.useQuery(
    { timeframe: selectedTimeframe },
    { enabled: isAuthenticated && isAdmin }
  );

  // Handle authentication and admin access
  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-4">Please login on the main app first, then return here.</p>
          <a
            href="http://localhost:3000/login"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Login on Main App
          </a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin dashboard.</p>
          <a
            href="http://localhost:3000"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Return to Main App
          </a>
        </div>
      </div>
    );
  }

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
    color 
  }: { 
    metric: Metric; 
    value: number; 
    label: string; 
    color: string; 
  }) => (
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
      <p className="text-xs text-gray-500">in {timeframeLabels[selectedTimeframe]}</p>
    </div>
  );

  const isLoading = analyticsLoading || overviewLoading;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard - Analytics</h1>
        <p className="text-gray-600">Platform usage metrics and growth trends</p>
      </div>

      {/* Timeframe Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {(['24h', '7d', '30d'] as const).map((timeframe) => (
          <button
            key={timeframe}
            onClick={() => setSelectedTimeframe(timeframe)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedTimeframe === timeframe
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {timeframeLabels[timeframe]}
          </button>
        ))}
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
              value={overviewData?.metrics.users || 0}
              label="New Users"
              color={metricColors.users}
            />
            <MetricOverviewCard
              metric="projects"
              value={overviewData?.metrics.projects || 0}
              label="Projects Created"
              color={metricColors.projects}
            />
            <MetricOverviewCard
              metric="scenes"
              value={overviewData?.metrics.scenes || 0}
              label="Scenes Created"
              color={metricColors.scenes}
            />
            <MetricOverviewCard
              metric="prompts"
              value={overviewData?.metrics.prompts || 0}
              label="Prompts Submitted"
              color={metricColors.prompts}
            />
          </div>

          {/* Main Chart */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {metricLabels[selectedMetric]} - {timeframeLabels[selectedTimeframe]}
              </h3>
              <div className="text-sm text-gray-500">
                Total: {analyticsData?.totalCount || 0}
              </div>
            </div>

            <div className="h-64">
              <SimpleChart data={analyticsData?.data || []} />
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              Click on metric cards above to change the chart data
            </div>
          </div>
        </>
      )}
    </div>
  );
} 