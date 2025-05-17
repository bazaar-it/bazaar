//src/client/components/test-harness/evaluation/ErrorAnalysis.tsx

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { api } from '~/trpc/react';
import { Badge } from '~/components/ui/badge';

/**
 * Error Analysis Component
 * 
 * Identifies and displays common error patterns in component generation
 */
export function ErrorAnalysis({
  startDate,
  endDate
}: {
  startDate?: Date;
  endDate?: Date;
}) {
  // Fetch error metrics using tRPC
  const { data: errorMetrics, isLoading } = api.evaluation.getErrorMetrics.useQuery({
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

  if (!errorMetrics || errorMetrics.commonErrorTypes.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">No error data available for the selected time period.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Error Distribution by Stage</CardTitle>
          <CardDescription>Identifying which pipeline stage has the most failures</CardDescription>
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
          <CardTitle>Common Error Types</CardTitle>
          <CardDescription>Most frequent errors by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Error Type</th>
                  <th className="text-center p-2">Count</th>
                  <th className="text-center p-2">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {errorMetrics.commonErrorTypes.map((error, index) => {
                  const percentage = ((error.count / errorMetrics.totalErrors) * 100).toFixed(1);
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">{error.type || 'Unknown'}</td>
                      <td className="p-2 text-center">{error.count}</td>
                      <td className="p-2 text-center">{percentage}%</td>
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
          <CardTitle>Failures by Pipeline Stage</CardTitle>
          <CardDescription>Where in the process failures occur</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Stage</th>
                  <th className="text-center p-2">Failures</th>
                  <th className="text-center p-2">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {errorMetrics.errorsByStage.map((stage, index) => {
                  const percentage = ((stage.count / errorMetrics.totalErrors) * 100).toFixed(1);
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2 capitalize">{stage.stage || 'Unknown'}</td>
                      <td className="p-2 text-center">{stage.count}</td>
                      <td className="p-2 text-center">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Recent Failures</CardTitle>
          <CardDescription>Details of recent component generation failures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Timestamp</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Stage</th>
                  <th className="text-left p-2">Error Type</th>
                  <th className="text-left p-2">Error Message</th>
                </tr>
              </thead>
              <tbody>
                {errorMetrics.recentFailures.map((failure, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">{new Date(failure.timestamp).toLocaleString()}</td>
                    <td className="p-2">{failure.category}</td>
                    <td className="p-2 capitalize">{failure.errorStage || 'Unknown'}</td>
                    <td className="p-2">{failure.errorType || 'Unknown'}</td>
                    <td className="p-2 max-w-[300px] truncate">{failure.errorMessage || 'No message'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
