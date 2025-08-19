'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Progress } from '~/components/ui/progress';
import { AlertTriangle, TrendingDown, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

type TimeRange = 'today' | 'week' | 'month' | 'lastWeek' | 'last30days';

export default function ErrorAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  
  const { data: stats, isLoading: statsLoading } = api.errorAnalytics.getErrorStats.useQuery({
    timeRange,
  });
  
  const { data: comparison } = api.errorAnalytics.getComparisonStats.useQuery();

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return <div>No data available</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Error Analytics</h1>
          <p className="text-gray-500">Track and analyze code generation failures</p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Last 7 days</SelectItem>
            <SelectItem value="lastWeek">Previous week</SelectItem>
            <SelectItem value="month">Last 30 days</SelectItem>
            <SelectItem value="last30days">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalMessages.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.summary.totalErrors.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.summary.errorRate}%</div>
              {comparison && (
                <span className={`text-xs px-2 py-1 rounded ${
                  comparison.trending === 'improving' ? 'bg-green-100 text-green-700' :
                  comparison.trending === 'worsening' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {comparison.trending === 'improving' ? '↓' : comparison.trending === 'worsening' ? '↑' : '→'}
                  {Math.abs(parseFloat(comparison.improvement))}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Failed Scenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.totalFailedScenes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Projects Affected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.uniqueProjectsAffected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Week Comparison */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle>Week-over-Week Comparison</CardTitle>
            <CardDescription>Error rate trends compared to last week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">This Week</p>
                <p className="text-xl font-bold">{comparison.thisWeek.errors} / {comparison.thisWeek.total}</p>
                <p className="text-sm text-gray-600">{comparison.thisWeek.rate}% error rate</p>
              </div>
              <div className="flex items-center justify-center">
                {comparison.trending === 'improving' ? (
                  <TrendingDown className="h-8 w-8 text-green-600" />
                ) : comparison.trending === 'worsening' ? (
                  <TrendingUp className="h-8 w-8 text-red-600" />
                ) : (
                  <div className="h-8 w-8 text-gray-400">→</div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Week</p>
                <p className="text-xl font-bold">{comparison.lastWeek.errors} / {comparison.lastWeek.total}</p>
                <p className="text-sm text-gray-600">{comparison.lastWeek.rate}% error rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Error Patterns</CardTitle>
          <CardDescription>Most common error types and their frequency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.errorPatterns.map((pattern, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="font-medium">{pattern.pattern}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{pattern.count} occurrences</span>
                  <span className="text-sm font-medium">{pattern.percentage}%</span>
                </div>
              </div>
              <Progress value={parseFloat(pattern.percentage)} className="h-2" />
              {pattern.examples.length > 0 && (
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800">View examples</summary>
                  <div className="mt-2 space-y-1 pl-4">
                    {pattern.examples.map((example, i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                        {example}...
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Daily Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Error Trend</CardTitle>
          <CardDescription>Number of errors per day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-2">
            {stats.dailyTrend.map((day) => {
              const maxCount = Math.max(...stats.dailyTrend.map(d => d.count));
              const height = (day.count / maxCount) * 100;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }}>
                    <div className="text-xs text-white text-center pt-1">{day.count}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 -rotate-45 origin-left">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Problematic Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Most Problematic Projects</CardTitle>
          <CardDescription>Projects with the highest error counts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topProblematicProjects.map((project, idx) => (
              <div key={project.projectId} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span className="text-sm font-mono">{project.projectId}</span>
                <span className="text-sm font-medium text-red-600">{project.errorCount} errors</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
          <CardDescription>Latest error messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats.recentErrors.map((error) => (
              <div key={error.id} className={`p-3 rounded-lg space-y-1 ${
                error.isAutoFixLoop ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
              }`}>
                <div className="flex justify-between items-start">
                  <span className="text-xs text-gray-500">
                    {new Date(error.createdAt).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {error.isAutoFixLoop && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        Auto-fix
                      </span>
                    )}
                    <span className="text-xs font-mono text-gray-400">
                      {error.projectId.substring(0, 8)}...
                    </span>
                  </div>
                </div>
                <div className="text-sm font-mono">{error.content}...</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}