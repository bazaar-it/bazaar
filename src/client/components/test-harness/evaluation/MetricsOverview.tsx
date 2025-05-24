// src/client/components/test-harness/evaluation/MetricsOverview.tsx
// @ts-nocheck

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { api } from '~/trpc/react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Metrics Overview Component
 * 
 * Displays high-level metrics from component generation evaluation
 */
/**
 * Success Rate Chart Component
 * 
 * Displays a line chart showing success rate over time
 */
function SuccessRateChart({
  startDate,
  endDate
}: {
  startDate?: Date;
  endDate?: Date;
}) {
  const { data: timeSeriesData, isLoading } = api.evaluation.getSuccessRateTimeSeries.useQuery({
    startDate: startDate?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: endDate?.toISOString() || new Date().toISOString(),
  }, {
    enabled: true,
  });

  if (isLoading || !timeSeriesData || timeSeriesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {isLoading ? (
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        ) : (
          <span>No time series data available</span>
        )}
      </div>
    );
  }

  // Format the data for the chart
  const chartData = timeSeriesData.map(point => ({
    date: format(new Date(point.date), 'MMM dd'),
    successRate: (point.successRate * 100).toFixed(1),
    testCount: point.testCount
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} unit="%" />
        <Tooltip 
          formatter={(value: any) => [`${value}%`, 'Success Rate']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="successRate" 
          stroke="#3B82F6" 
          activeDot={{ r: 8 }}
          name="Success Rate"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Metrics Overview Component
 * 
 * Displays high-level metrics from component generation evaluation
 */
// Define interfaces for our data types
interface TimeSeriesDataPoint {
  date: string;
  successRate: number;
  testCount: number;
}

interface OverviewMetrics {
  totalTests: number;
  successfulTests: number;
  successRate: number;
  avgGenerationTime: number;
  mostCommonError: string;
}

export function MetricsOverview({
  startDate,
  endDate
}: {
  startDate?: Date;
  endDate?: Date;
}) {
  // Fetch overview metrics using tRPC
  const { data: overviewMetrics, isLoading } = api.evaluation.getOverviewMetrics.useQuery({
    startDate: startDate?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: endDate?.toISOString() || new Date().toISOString(),
  }, {
    enabled: true,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-10 bg-muted rounded w-1/3 mx-auto"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <CardDescription>Component generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-center">
            {overviewMetrics?.successRate !== undefined 
              ? `${(overviewMetrics.successRate * 100).toFixed(1)}%` 
              : 'N/A'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Avg. Generation Time</CardTitle>
          <CardDescription>End-to-end process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-center">
            {overviewMetrics?.avgGenerationTime !== undefined 
              ? `${(overviewMetrics.avgGenerationTime / 1000).toFixed(1)}s` 
              : 'N/A'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          <CardDescription>In selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-center">
            {overviewMetrics?.totalTests ?? 'N/A'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Most Common Error</CardTitle>
          <CardDescription>By frequency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-medium text-center truncate">
            {overviewMetrics?.mostCommonError ?? 'None'}
          </div>
        </CardContent>
      </Card>

      {/* Success rate over time chart */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Success Rate Over Time</CardTitle>
          <CardDescription>Daily success rate for the selected period</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : (
            <SuccessRateChart startDate={startDate} endDate={endDate} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
