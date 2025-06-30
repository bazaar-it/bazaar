//src/app/admin/exports/page.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, Video, Clock, CheckCircle, XCircle, Loader2, TrendingUp, FileVideo } from "lucide-react";

type Timeframe = 'all' | '30d' | '7d' | '24h';

const timeframeLabels = {
  all: 'All Time',
  '30d': 'Last 30 Days', 
  '7d': 'Last 7 Days',
  '24h': 'Last 24 Hours'
};

const formatLabels = {
  mp4: 'MP4',
  webm: 'WebM',
  gif: 'GIF'
};

const qualityLabels = {
  high: 'High',
  medium: 'Medium',
  low: 'Low'
};

export default function AdminExportsPage() {
  const { data: session, status } = useSession();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('30d');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Check admin access
  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();
  
  // Get export statistics
  const { data: exportStats, isLoading: statsLoading } = api.admin.getExportStats.useQuery({
    timeframe: selectedTimeframe
  });
  
  // Get recent exports with pagination
  const { data: recentExportsData, isLoading: exportsLoading } = api.admin.getRecentExports.useQuery({
    page: currentPage,
    pageSize,
    timeframe: selectedTimeframe
  });

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

  const TimeframeToggle = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
      {(Object.keys(timeframeLabels) as Timeframe[]).map((timeframe) => (
        <button
          key={timeframe}
          onClick={() => {
            setSelectedTimeframe(timeframe);
            setCurrentPage(1); // Reset to first page
          }}
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

  const MetricCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon,
    trend 
  }: {
    title: string;
    value: number | string;
    description: string;
    icon: any;
    trend?: { value: number; isPositive: boolean };
  }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="p-3 bg-indigo-50 rounded-lg">
          <Icon className="h-6 w-6 text-indigo-600" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <TrendingUp className={`h-4 w-4 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`} />
          <span className={`ml-1 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}% from last period
          </span>
        </div>
      )}
    </div>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
      rendering: { color: 'bg-blue-100 text-blue-800', icon: Loader2 },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.rendering;
    const StatusIcon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <StatusIcon className={`mr-1 h-3 w-3 ${status === 'rendering' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Export Analytics</h1>
          <p className="text-gray-600">Monitor video export activity and performance</p>
        </div>

        <TimeframeToggle />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 mb-8">
          <MetricCard
            title="Total Exports"
            value={exportStats?.totalExports || 0}
            description="Video exports"
            icon={Download}
            trend={exportStats?.exportsTrend}
          />
          <MetricCard
            title="Success Rate"
            value={`${exportStats?.successRate || 0}%`}
            description="Successful exports"
            icon={CheckCircle}
            trend={exportStats?.successRateTrend}
          />
          <MetricCard
            title="Avg Duration"
            value={`${exportStats?.avgDuration || 0}s`}
            description="Average render time"
            icon={Clock}
          />
          <MetricCard
            title="Total Minutes"
            value={exportStats?.totalMinutesExported || 0}
            description="Video minutes exported"
            icon={Video}
          />
        </div>

        {/* Format Distribution */}
        {exportStats?.formatDistribution && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Export Formats</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(exportStats.formatDistribution).map(([format, data]) => (
                <div key={format} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{data.count}</div>
                  <div className="text-sm text-gray-500">{formatLabels[format as keyof typeof formatLabels] || format}</div>
                  <div className="text-xs text-gray-400">{data.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Exports Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Exports</h3>
          </div>
          
          {exportsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading exports...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Format
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quality
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Downloads
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentExportsData?.exports.map((export_) => (
                      <tr key={export_.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {export_.user?.name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {export_.user?.name || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {export_.user?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{export_.project?.name || 'Untitled'}</div>
                          <div className="text-xs text-gray-500">{export_.projectId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileVideo className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-900">
                              {formatLabels[export_.format as keyof typeof formatLabels] || export_.format}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {qualityLabels[export_.quality as keyof typeof qualityLabels] || export_.quality}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round((export_.duration || 0) / 30)}s
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={export_.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(export_.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {export_.downloadCount || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {recentExportsData && recentExportsData.pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, recentExportsData.pagination.totalCount)} of {recentExportsData.pagination.totalCount} exports
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(recentExportsData.pagination.totalPages, prev + 1))}
                      disabled={currentPage === recentExportsData.pagination.totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}