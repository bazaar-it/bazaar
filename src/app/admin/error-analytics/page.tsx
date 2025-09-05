'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Progress } from '~/components/ui/progress';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { AlertTriangle, TrendingDown, TrendingUp, AlertCircle, CheckCircle, XCircle, Zap, DollarSign, Target, Shield, Power, PowerOff } from 'lucide-react';

type TimeRange = 'today' | 'week' | 'month' | 'lastWeek' | 'last30days';

export default function ErrorAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: stats, isLoading: statsLoading } = api.errorAnalytics.getErrorStats.useQuery({
    timeRange,
  });
  
  const { data: comparison } = api.errorAnalytics.getComparisonStats.useQuery();
  
  // New auto-fix metrics
  const { data: autoFixMetrics, isLoading: autoFixLoading } = api.errorAnalytics.getAutoFixMetrics.useQuery({
    timeRange,
  });
  
  // Kill switch status
  const { data: killSwitchStatus, isLoading: killSwitchLoading } = api.errorAnalytics.getKillSwitchStatus.useQuery();
  
  // System config mutation
  const systemConfigMutation = api.errorAnalytics.updateSystemConfig.useMutation({
    onSuccess: () => {
      // Refetch data after system config changes
      window.location.reload();
    }
  });

  if (statsLoading || autoFixLoading || killSwitchLoading) {
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
          <h1 className="text-3xl font-bold">Error Analytics Dashboard</h1>
          <p className="text-gray-500">Comprehensive auto-fix monitoring and system controls</p>
        </div>
        <div className="flex gap-3">
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
          
          {/* Kill Switch Status */}
          {killSwitchStatus && (
            <div className="flex items-center gap-2">
              <Badge variant={killSwitchStatus.inferredStatus.isLikelyActive ? "default" : "destructive"}>
                {killSwitchStatus.inferredStatus.isLikelyActive ? (
                  <>
                    <Power className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <PowerOff className="h-3 w-3 mr-1" />
                    Inactive
                  </>
                )}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="autofix">Auto-Fix Metrics</TabsTrigger>
          <TabsTrigger value="costs">Cost Analytics</TabsTrigger>
          <TabsTrigger value="controls">System Controls</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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

          {/* Error Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Error Patterns</CardTitle>
              <CardDescription>Most common error types and their frequency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.errorPatterns.slice(0, 10).map((pattern, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-sm">{pattern.pattern}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{pattern.count} occurrences</span>
                      <span className="text-sm font-medium">{pattern.percentage}%</span>
                    </div>
                  </div>
                  <Progress value={parseFloat(pattern.percentage)} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto-Fix Metrics Tab */}
        <TabsContent value="autofix" className="space-y-6">
          {autoFixMetrics && (
            <>
              {/* Auto-Fix Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Auto-Fix Triggers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{autoFixMetrics.summary.totalAutoFixTriggers}</div>
                    <p className="text-xs text-gray-500 mt-1">Total errors detected</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Successful Fixes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{autoFixMetrics.summary.totalAutoFixSuccesses}</div>
                    <p className="text-xs text-gray-500 mt-1">Automatically resolved</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{autoFixMetrics.summary.overallSuccessRate}%</div>
                    <p className="text-xs text-gray-500 mt-1">Overall effectiveness</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Scene Reverts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{autoFixMetrics.summary.totalSceneReverts}</div>
                    <p className="text-xs text-gray-500 mt-1">Failed fixes ({autoFixMetrics.summary.revertRate}%)</p>
                  </CardContent>
                </Card>
              </div>

              {/* Attempt Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Fix Attempt Analysis</CardTitle>
                  <CardDescription>Success rates by attempt number</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Attempt 1 (Quick Fix)</span>
                        <Badge variant="outline">{autoFixMetrics.attemptAnalysis.attempt1.percentage}%</Badge>
                      </div>
                      <Progress value={autoFixMetrics.attemptAnalysis.attempt1.percentage} className="h-2" />
                      <p className="text-xs text-gray-500">{autoFixMetrics.attemptAnalysis.attempt1.count} attempts</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Attempt 2 (Comprehensive)</span>
                        <Badge variant="outline">{autoFixMetrics.attemptAnalysis.attempt2.percentage}%</Badge>
                      </div>
                      <Progress value={autoFixMetrics.attemptAnalysis.attempt2.percentage} className="h-2" />
                      <p className="text-xs text-gray-500">{autoFixMetrics.attemptAnalysis.attempt2.count} attempts</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Attempt 3 (Rewrite)</span>
                        <Badge variant="outline">{autoFixMetrics.attemptAnalysis.attempt3.percentage}%</Badge>
                      </div>
                      <Progress value={autoFixMetrics.attemptAnalysis.attempt3.percentage} className="h-2" />
                      <p className="text-xs text-gray-500">{autoFixMetrics.attemptAnalysis.attempt3.count} attempts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Auto-Fix Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Auto-Fix Activity</CardTitle>
                  <CardDescription>Triggers, successes, and success rates over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end gap-1">
                    {autoFixMetrics.dailyTrend.map((day, idx) => {
                      const maxTriggers = Math.max(...autoFixMetrics.dailyTrend.map(d => d.triggers));
                      const height = maxTriggers > 0 ? (day.triggers / maxTriggers) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center space-y-1">
                          <div className="w-full relative" style={{ height: '200px' }}>
                            <div 
                              className="absolute bottom-0 w-full bg-red-200 rounded-t"
                              style={{ height: `${height}%` }}
                            />
                            <div 
                              className="absolute bottom-0 w-full bg-green-500 rounded-t"
                              style={{ height: `${height * (day.successRate / 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-center">
                            <div className="font-medium">{day.triggers}</div>
                            <div className="text-green-600 text-xs">{day.successRate}%</div>
                          </div>
                          <div className="text-xs text-gray-500 -rotate-45 origin-center">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-200 rounded"></div>
                      <span>Triggers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Successes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hotspot Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Auto-Fix Hotspot Projects</CardTitle>
                  <CardDescription>Projects requiring the most auto-fix interventions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {autoFixMetrics.hotspotProjects.slice(0, 10).map((project, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {project.projectId.substring(0, 8)}...
                          </Badge>
                          <div className="text-sm">
                            <span className="font-medium">{project.triggers} triggers</span>
                            <span className="text-gray-500"> · </span>
                            <span className="text-green-600">{project.successes} fixed</span>
                            {project.reverts > 0 && (
                              <>
                                <span className="text-gray-500"> · </span>
                                <span className="text-red-600">{project.reverts} reverted</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={project.successRate >= 80 ? "default" : project.successRate >= 60 ? "secondary" : "destructive"}
                        >
                          {project.successRate}% success
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Cost Analytics Tab */}
        <TabsContent value="costs" className="space-y-6">
          {autoFixMetrics && (
            <>
              {/* Cost Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Total API Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${autoFixMetrics.summary.totalApiCost}</div>
                    <p className="text-xs text-gray-500 mt-1">{autoFixMetrics.summary.totalApiCalls} API calls</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-500">Avg Cost per Fix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${autoFixMetrics.summary.avgCostPerFix}</div>
                    <p className="text-xs text-gray-500 mt-1">Per auto-fix attempt</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-500">Est. Cost Savings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">${autoFixMetrics.summary.estimatedCostSavings}</div>
                    <p className="text-xs text-gray-500 mt-1">Vs manual intervention</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-500">Net Savings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${
                      autoFixMetrics.summary.netSavings >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${autoFixMetrics.summary.netSavings}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {autoFixMetrics.summary.netSavings >= 0 ? 'Positive ROI' : 'Currently loss-making'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Cost Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Cost Analysis</CardTitle>
                  <CardDescription>Auto-fix spending and activity correlation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end gap-1">
                    {autoFixMetrics.dailyTrend.map((day, idx) => {
                      const maxCost = Math.max(...autoFixMetrics.dailyTrend.map(d => d.cost));
                      const height = maxCost > 0 ? (day.cost / maxCost) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center space-y-1">
                          <div className="w-full relative" style={{ height: '200px' }}>
                            <div 
                              className="absolute bottom-0 w-full bg-blue-500 rounded-t"
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <div className="text-xs text-center">
                            <div className="font-medium">${day.cost}</div>
                            <div className="text-gray-500 text-xs">{day.triggers} triggers</div>
                          </div>
                          <div className="text-xs text-gray-500 -rotate-45 origin-center">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Cost Efficiency Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Efficiency Insights</CardTitle>
                  <CardDescription>ROI analysis and optimization recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Cost Efficiency</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Auto-fix system shows positive ROI with ${autoFixMetrics.summary.netSavings} net savings 
                        by preventing {autoFixMetrics.summary.totalAutoFixSuccesses} manual interventions.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Success Rate Impact</h4>
                        <p className="text-sm text-gray-600">
                          Current {autoFixMetrics.summary.overallSuccessRate}% success rate. 
                          Improving to 90% could save an additional $
                          {((0.9 - autoFixMetrics.summary.overallSuccessRate/100) * 
                            autoFixMetrics.summary.totalAutoFixTriggers * 0.5).toFixed(2)} per period.
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Volume Trends</h4>
                        <p className="text-sm text-gray-600">
                          {autoFixMetrics.summary.totalAutoFixTriggers} total triggers in this period. 
                          Each successful fix saves approximately $0.50 in manual intervention costs.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* System Controls Tab */}
        <TabsContent value="controls" className="space-y-6">
          {/* Kill Switch Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Auto-Fix System Status
              </CardTitle>
              <CardDescription>Monitor and control the auto-fix system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {killSwitchStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">System Status</span>
                      <Badge variant={killSwitchStatus.inferredStatus.isLikelyActive ? "default" : "destructive"}>
                        {killSwitchStatus.inferredStatus.isLikelyActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Recent Activity (24h)</span>
                      <span className="text-sm font-mono">{killSwitchStatus.inferredStatus.recentActivity24h} triggers</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Weekly Activity</span>
                      <span className="text-sm font-mono">{killSwitchStatus.inferredStatus.weeklyActivity} triggers</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Health Status</span>
                      <Badge variant={killSwitchStatus.recommendations.healthStatus === 'healthy' ? "default" : "secondary"}>
                        {killSwitchStatus.recommendations.healthStatus}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">Production Mode</span>
                      <Badge variant={killSwitchStatus.serverConfig.productionMode ? "default" : "secondary"}>
                        {killSwitchStatus.serverConfig.productionMode ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">OpenAI API Key</span>
                      <Badge variant={killSwitchStatus.serverConfig.hasOpenAIKey ? "default" : "destructive"}>
                        {killSwitchStatus.serverConfig.hasOpenAIKey ? "Configured" : "Missing"}
                      </Badge>
                    </div>
                    {killSwitchStatus.recommendations.shouldCheck && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">Attention Required</span>
                        </div>
                        <p className="text-sm text-yellow-700">{killSwitchStatus.recommendations.shouldCheck}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Controls */}
          <Card>
            <CardHeader>
              <CardTitle>System Controls</CardTitle>
              <CardDescription>Administrative actions for the auto-fix system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => {
                    if (confirm('Are you sure you want to reset auto-fix metrics? This action cannot be undone.')) {
                      systemConfigMutation.mutate({
                        action: 'reset_metrics',
                        reason: 'Admin dashboard reset'
                      });
                    }
                  }}
                  disabled={systemConfigMutation.isPending}
                >
                  <Target className="h-4 w-4" />
                  Reset Metrics
                </Button>
                
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('This will disable auto-fix system-wide. Are you sure?')) {
                      systemConfigMutation.mutate({
                        action: 'disable_autofix',
                        reason: 'Admin emergency disable'
                      });
                    }
                  }}
                  disabled={systemConfigMutation.isPending}
                >
                  <PowerOff className="h-4 w-4" />
                  Emergency Disable
                </Button>
                
                <Button
                  variant="outline"
                  className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => {
                    systemConfigMutation.mutate({
                      action: 'enable_autofix',
                      reason: 'Admin enable from dashboard'
                    });
                  }}
                  disabled={systemConfigMutation.isPending}
                >
                  <Power className="h-4 w-4" />
                  Enable Auto-Fix
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client-Side Controls Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client-Side Controls</CardTitle>
              <CardDescription>Runtime kill switches and debugging tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold mb-2 text-blue-800">Browser Console Commands</h4>
                  <div className="space-y-2 text-sm">
                    <div className="font-mono bg-white p-2 rounded border">
                      <code>enableAutofixKillSwitch()</code>
                      <span className="text-gray-600 ml-2">// Disable auto-fix immediately</span>
                    </div>
                    <div className="font-mono bg-white p-2 rounded border">
                      <code>disableAutofixKillSwitch()</code>
                      <span className="text-gray-600 ml-2">// Re-enable auto-fix</span>
                    </div>
                    <div className="font-mono bg-white p-2 rounded border">
                      <code>autofixKillSwitchStatus()</code>
                      <span className="text-gray-600 ml-2">// Check kill switch status</span>
                    </div>
                    <div className="font-mono bg-white p-2 rounded border">
                      <code>getAutofixReport()</code>
                      <span className="text-gray-600 ml-2">// Get detailed metrics report</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold mb-2 text-yellow-800">Kill Switch Locations</h4>
                  <ul className="text-sm space-y-1 text-yellow-700">
                    <li>• <strong>Hardcoded Constant:</strong> AUTOFIX_KILL_SWITCH in useAutoFix.ts</li>
                    <li>• <strong>LocalStorage:</strong> 'autofix-kill-switch' key set to 'true'</li>
                    <li>• <strong>Rate Limiting:</strong> MAX_FIXES_PER_SESSION set to 0</li>
                    <li>• <strong>Circuit Breaker:</strong> Automatic disable after consecutive failures</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}