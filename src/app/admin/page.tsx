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

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getUserChange = () => {
    const current = selectedTimeframe === 'all' ? dashboardData?.users?.all || 0 :
                   selectedTimeframe === '30d' ? dashboardData?.users?.last30Days || 0 :
                   selectedTimeframe === '7d' ? dashboardData?.users?.last7Days || 0 :
                   dashboardData?.users?.last24Hours || 0;
    
    // Get the equivalent previous period for proper comparison
    const previous = selectedTimeframe === 'all' ? 0 : // No change calculation for "all time"
                    selectedTimeframe === '30d' ? dashboardData?.users?.prev30Days || 0 :
                    selectedTimeframe === '7d' ? dashboardData?.users?.prev7Days || 0 :
                    dashboardData?.users?.prev24Hours || 0;
    
    // Debug logging
    if (selectedTimeframe === '30d') {
      console.log('Users 30d Debug:', {
        current,
        previous,
        dashboardData: dashboardData?.users
      });
    }
    
    return selectedTimeframe === 'all' ? 0 : calculateChange(current, previous);
  };

  const getScenesChange = () => {
    const current = selectedTimeframe === 'all' ? dashboardData?.scenes?.all || 0 :
                   selectedTimeframe === '30d' ? dashboardData?.scenes?.last30Days || 0 :
                   selectedTimeframe === '7d' ? dashboardData?.scenes?.last7Days || 0 :
                   dashboardData?.scenes?.last24Hours || 0;
    
    // Get the equivalent previous period for proper comparison
    const previous = selectedTimeframe === 'all' ? 0 : // No change calculation for "all time"
                    selectedTimeframe === '30d' ? dashboardData?.scenes?.prev30Days || 0 :
                    selectedTimeframe === '7d' ? dashboardData?.scenes?.prev7Days || 0 :
                    dashboardData?.scenes?.prev24Hours || 0;
    
    return selectedTimeframe === 'all' ? 0 : calculateChange(current, previous);
  };

  const getPromptsValue = () => {
    return selectedTimeframe === 'all' ? dashboardData?.prompts?.all || 0 :
           selectedTimeframe === '30d' ? dashboardData?.prompts?.last30Days || 0 :
           selectedTimeframe === '7d' ? dashboardData?.prompts?.last7Days || 0 :
           dashboardData?.prompts?.last24Hours || 0;
  };

  const getPromptsChange = () => {
    const current = getPromptsValue();
    
    // Get the equivalent previous period for proper comparison
    const previous = selectedTimeframe === 'all' ? 0 : // No change calculation for "all time"
                    selectedTimeframe === '30d' ? dashboardData?.prompts?.prev30Days || 0 :
                    selectedTimeframe === '7d' ? dashboardData?.prompts?.prev7Days || 0 :
                    dashboardData?.prompts?.prev24Hours || 0;
    
    return selectedTimeframe === 'all' ? 0 : calculateChange(current, previous);
  };

  const MetricCard = ({ 
    title, 
    value, 
    description, 
    change, 
    color = "blue",
    href 
  }: {
    title: string;
    value: number;
    description: string;
    change?: number;
    color?: "blue" | "green" | "purple" | "orange";
    href?: string;
  }) => {
    const colorClasses = {
      blue: "text-blue-600",
      green: "text-green-600", 
      purple: "text-purple-600",
      orange: "text-orange-600"
    };

    const CardContent = () => (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
          {change !== undefined && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              change >= 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {change >= 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>
        <p className={`text-3xl font-bold ${colorClasses[color]} mb-1`}>{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{description}</p>
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
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
      {(Object.keys(timeframeLabels) as Timeframe[]).map((timeframe) => (
        <button
          key={timeframe}
          onClick={() => setSelectedTimeframe(timeframe)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            selectedTimeframe === timeframe
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {timeframeLabels[timeframe]}
        </button>
      ))}
    </div>
  );

  const formatPayingUsersDescription = () => {
    const periodLabel = selectedTimeframe === 'all' ? timeframeLabels['30d'] : timeframeLabels[selectedTimeframe];
    const euros = ((payingStats?.revenueCents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${periodLabel} revenue • €${euros}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor key metrics and user feedback</p>
        </div>

        <TimeframeToggle />

        {/* Enhanced Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Users"
            value={
              selectedTimeframe === 'all' ? dashboardData?.users?.all || 0 :
              selectedTimeframe === '30d' ? dashboardData?.users?.last30Days || 0 :
              selectedTimeframe === '7d' ? dashboardData?.users?.last7Days || 0 :
              dashboardData?.users?.last24Hours || 0
            }
            description="Registered users"
            change={getUserChange()}
            color="blue"
            href="/admin/users"
          />

          <MetricCard
            title="Total Prompts"
            value={getPromptsValue()}
            description="Prompts submitted"
            change={getPromptsChange()}
            color="green"
            href="/admin/analytics"
          />

          <MetricCard
            title="Scenes Generated"
            value={
              selectedTimeframe === 'all' ? dashboardData?.scenes?.all || 0 :
              selectedTimeframe === '30d' ? dashboardData?.scenes?.last30Days || 0 :
              selectedTimeframe === '7d' ? dashboardData?.scenes?.last7Days || 0 :
              dashboardData?.scenes?.last24Hours || 0
            }
            description="AI-generated scenes"
            change={getScenesChange()}
            color="purple"
          />

          {/* Paying users card */}
          <MetricCard
            title="Paying Users"
            value={payingStats?.payingUsers || 0}
            description={formatPayingUsersDescription()}
            change={payingStats?.usersChangePct}
            color="orange"
            href="/admin/paywall-analytics"
          />
        </div>

        {/* Recent Feedback Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Recent Feedback</h3>
            <Link
              href="/admin/feedback"
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 border border-indigo-600 hover:border-indigo-500 rounded-md transition-colors"
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
                <div key={feedback.id} className="border-l-4 border-indigo-500 pl-4 py-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm text-gray-900 font-medium">
                          {feedback.name || 'Anonymous'}
                        </p>
                        {feedback.email && (
                          <p className="text-sm text-gray-500">
                            ({feedback.email})
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{feedback.content}</p>
                    </div>
                    <div className="text-xs text-gray-400 ml-4">
                      {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : 'No date'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No feedback received yet
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-8 text-center">
            <div className="text-gray-500">Loading dashboard data...</div>
          </div>
        )}
      </div>
    </div>
  );
} 