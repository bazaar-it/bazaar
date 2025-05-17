//src/client/components/test-harness/evaluation/PerformanceMetricsView.tsx

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { api } from '~/trpc/react';

/**
 * Performance Metrics View Component
 * 
 * Displays timing metrics for component generation pipeline
 */
export function PerformanceMetricsView({
  startDate,
  endDate
}: {
  startDate?: Date;
  endDate?: Date;
}) {
  // Fetch performance metrics using tRPC
  const { data: performanceMetrics, isLoading } = api.evaluation.getPerformanceMetrics.useQuery({
    startDate: startDate?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: endDate?.toISOString() || new Date().toISOString(),
  }, {
    enabled: true,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!performanceMetrics) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">No performance data available for the selected time period.</p>
      </div>
    );
  }

  // Transform timing metrics for display
  const stageMetrics = [
    { 
      stage: 'Time to First Token', 
      avgTime: performanceMetrics.avgTimeToFirstToken,
      p90Time: performanceMetrics.p90TimeToFirstToken
    },
    { 
      stage: 'Code Generation', 
      avgTime: performanceMetrics.avgCodeGenTime,
      p90Time: performanceMetrics.p90CodeGenTime
    },
    { 
      stage: 'Validation', 
      avgTime: performanceMetrics.avgValidationTime,
      p90Time: performanceMetrics.p90ValidationTime
    },
    { 
      stage: 'Build', 
      avgTime: performanceMetrics.avgBuildTime,
      p90Time: performanceMetrics.p90BuildTime
    },
    { 
      stage: 'Upload', 
      avgTime: performanceMetrics.avgUploadTime,
      p90Time: performanceMetrics.p90UploadTime
    },
    { 
      stage: 'Total', 
      avgTime: performanceMetrics.avgTotalTime,
      p90Time: performanceMetrics.p90TotalTime
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Pipeline Stage Timing</CardTitle>
          <CardDescription>Average time spent in each stage of component generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {/* Implement chart - could use recharts or other library */}
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Chart visualization will go here
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance By Stage</CardTitle>
          <CardDescription>Detailed timing metrics for each pipeline stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Pipeline Stage</th>
                  <th className="text-center p-2">Avg Time (s)</th>
                  <th className="text-center p-2">p90 Time (s)</th>
                  <th className="text-center p-2">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {stageMetrics.map((metric) => {
                  const percentOfTotal = metric.stage !== 'Total' && performanceMetrics.avgTotalTime > 0
                    ? (metric.avgTime / performanceMetrics.avgTotalTime * 100).toFixed(1)
                    : '-';
                  
                  return (
                    <tr key={metric.stage} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{metric.stage}</td>
                      <td className="p-2 text-center">
                        {(metric.avgTime / 1000).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        {(metric.p90Time / 1000).toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        {percentOfTotal !== '-' ? `${percentOfTotal}%` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
          <CardDescription>How generation times have changed over the selected period</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {/* Implement time-series chart */}
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Time-series chart will go here
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
