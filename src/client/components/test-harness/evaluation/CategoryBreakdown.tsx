//src/client/components/test-harness/evaluation/CategoryBreakdown.tsx

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { api } from '~/trpc/react';
import { Badge } from '~/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Category Breakdown Component
 * 
 * Displays metrics broken down by animation category
 */
export function CategoryBreakdown({
  startDate,
  endDate
}: {
  startDate?: Date;
  endDate?: Date;
}) {
  // Fetch category-specific metrics using tRPC
  const { data: categoryMetrics, isLoading } = api.evaluation.getCategoryMetrics.useQuery({
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

  if (!categoryMetrics || Object.keys(categoryMetrics.successRateByCategory).length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">No category data available for the selected time period.</p>
      </div>
    );
  }

  // Sort categories by success rate (highest first)
  const sortedCategories = Object.entries(categoryMetrics.successRateByCategory)
    .sort(([, rateA], [, rateB]) => (rateB) - (rateA));

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Success Rate by Category</CardTitle>
          <CardDescription>Comparing performance across different animation types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {Object.keys(categoryMetrics.successRateByCategory).length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No category data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(categoryMetrics.successRateByCategory).map(([category, rate]) => ({
                    category,
                    successRate: Math.round((rate) * 100),
                    testCount: categoryMetrics.categoryDetails[category]?.count || 0
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="category" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'successRate') return `${value}%`;
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="successRate" name="Success Rate" fill="#3B82F6" />
                  <Bar dataKey="testCount" name="Test Count" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Detailed metrics by animation category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Category</th>
                  <th className="text-center p-2">Success Rate</th>
                  <th className="text-center p-2">Avg Time (s)</th>
                  <th className="text-center p-2">Test Count</th>
                  <th className="text-center p-2">Complexity</th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map(([category, successRate]) => {
                  const details = categoryMetrics.categoryDetails[category];
                  return (
                    <tr key={category} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{category}</td>
                      <td className="p-2 text-center">
                        <Badge 
                          variant={successRate >= 0.8 ? "default" : successRate >= 0.5 ? "secondary" : "destructive"} 
                          className={`w-20 ${successRate >= 0.8 ? 'bg-green-500' : successRate >= 0.5 ? 'bg-yellow-500' : ''}`}
                        >
                          {(successRate * 100).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        {details?.avgTime ? (details.avgTime / 1000).toFixed(1) : 'N/A'}
                      </td>
                      <td className="p-2 text-center">{details?.count || 0}</td>
                      <td className="p-2 text-center">{details?.avgComplexity?.toFixed(1) || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
