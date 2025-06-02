//src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "~/components/AdminSidebar";

type Timeframe = 'all' | '30d' | '7d' | '24h';

const timeframeLabels = {
  all: 'All Time',
  '30d': 'Last 30 Days',
  '7d': 'Last 7 Days',
  '24h': 'Last 24 Hours'
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('all');
  const [activeSection, setActiveSection] = useState('homepage');

  // Check admin access
  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();
  const { data: dashboardData, isLoading } = api.admin.getDashboardMetrics.useQuery(
    undefined,
    {
      enabled: adminCheck?.isAdmin === true, // Only fetch if user is admin
    }
  );

  // Handle authentication and admin access
  if (status === "loading" || adminCheckLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session?.user) {
    redirect('/login');
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
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

  const MetricCard = ({ title, value, description, timeframe, clickable = false, href }: {
    title: string;
    value: number;
    description: string;
    timeframe: Timeframe;
    clickable?: boolean;
    href?: string;
  }) => {
    const CardContent = () => (
      <div className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 ${clickable ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>
      </div>
    );

    if (clickable && href) {
      return (
        <Link href={href}>
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

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {activeSection === 'homepage' && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h2>
            <p className="text-gray-600">Monitor key metrics and user feedback</p>
          </div>

          <TimeframeToggle />

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <MetricCard
              title="Total Users"
              value={
                selectedTimeframe === 'all' ? dashboardData?.users.all || 0 :
                selectedTimeframe === '30d' ? dashboardData?.users.last30Days || 0 :
                selectedTimeframe === '7d' ? dashboardData?.users.last7Days || 0 :
                dashboardData?.users.last24Hours || 0
              }
              description="Registered users in the system"
              timeframe={selectedTimeframe}
              clickable={true}
              href="/admin/users"
            />

            <MetricCard
              title="Projects Created"
              value={
                selectedTimeframe === 'all' ? dashboardData?.projects.all || 0 :
                selectedTimeframe === '30d' ? dashboardData?.projects.last30Days || 0 :
                selectedTimeframe === '7d' ? dashboardData?.projects.last7Days || 0 :
                dashboardData?.projects.last24Hours || 0
              }
              description="Video projects created"
              timeframe={selectedTimeframe}
            />

            <MetricCard
              title="Scenes Generated"
              value={
                selectedTimeframe === 'all' ? dashboardData?.scenes.all || 0 :
                selectedTimeframe === '30d' ? dashboardData?.scenes.last30Days || 0 :
                selectedTimeframe === '7d' ? dashboardData?.scenes.last7Days || 0 :
                dashboardData?.scenes.last24Hours || 0
              }
              description="Individual video scenes"
              timeframe={selectedTimeframe}
            />
          </div>

          {/* Recent Feedback Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
        </>
      )}
    </div>
  );
} 