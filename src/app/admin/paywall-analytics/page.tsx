"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { format, subDays } from "date-fns";
import { ArrowUpIcon, ArrowDownIcon, UsersIcon, CreditCardIcon, CursorArrowRaysIcon, EyeIcon } from "@heroicons/react/24/outline";

// Define the expected event types
type PaywallEventType = 'viewed' | 'clicked_package' | 'initiated_checkout' | 'completed_purchase';

type PaywallAnalytics = {
  events: Record<string, number>;
  uniqueUsers: Record<string, number>;
  dailyStats: any[];
};

export default function PaywallAnalyticsPage() {
  const [dateRange, setDateRange] = useState(30); // Default to last 30 days
  
  // Fetch analytics data
  const { data: analytics, isLoading } = api.admin.getPaywallAnalytics.useQuery({
    startDate: subDays(new Date(), dateRange),
    endDate: new Date(),
  });

  // Safely access the dynamic properties with proper typing
  const viewed = (analytics?.uniqueUsers as Record<PaywallEventType, number>)?.viewed || 0;
  const clickedPackage = (analytics?.uniqueUsers as Record<PaywallEventType, number>)?.clicked_package || 0;
  const initiatedCheckout = (analytics?.uniqueUsers as Record<PaywallEventType, number>)?.initiated_checkout || 0;
  const completedPurchase = (analytics?.uniqueUsers as Record<PaywallEventType, number>)?.completed_purchase || 0;

  // Calculate conversion rates
  const conversionRate = viewed && completedPurchase
    ? ((completedPurchase / viewed) * 100).toFixed(1)
    : "0";

  const clickThroughRate = viewed && clickedPackage
    ? ((clickedPackage / viewed) * 100).toFixed(1)
    : "0";

  const checkoutRate = clickedPackage && initiatedCheckout
    ? ((initiatedCheckout / clickedPackage) * 100).toFixed(1)
    : "0";

  const completionRate = initiatedCheckout && completedPurchase
    ? ((completedPurchase / initiatedCheckout) * 100).toFixed(1)
    : "0";

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Paywall Analytics</h1>
        <p className="text-muted-foreground">Track how users interact with the payment system</p>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={dateRange === 7 ? "default" : "outline"}
          size="sm"
          onClick={() => setDateRange(7)}
        >
          Last 7 days
        </Button>
        <Button
          variant={dateRange === 30 ? "default" : "outline"}
          size="sm"
          onClick={() => setDateRange(30)}
        >
          Last 30 days
        </Button>
        <Button
          variant={dateRange === 90 ? "default" : "outline"}
          size="sm"
          onClick={() => setDateRange(90)}
        >
          Last 90 days
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse h-8 bg-gray-200 rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paywall Views</CardTitle>
                <EyeIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{viewed}</div>
                <p className="text-xs text-muted-foreground">
                  Unique users who saw the paywall
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Package Clicks</CardTitle>
                <CursorArrowRaysIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clickedPackage}</div>
                <p className="text-xs text-muted-foreground">
                  {clickThroughRate}% click-through rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Checkouts Started</CardTitle>
                <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{initiatedCheckout}</div>
                <p className="text-xs text-muted-foreground">
                  {checkoutRate}% of clicks proceed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                <Badge className="ml-auto" variant={Number(conversionRate) > 5 ? "default" : "secondary"}>
                  {conversionRate}%
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedPurchase}</div>
                <p className="text-xs text-muted-foreground">
                  {completionRate}% checkout completion
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>User journey from paywall view to purchase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Viewed Paywall</span>
                    <span className="text-sm text-muted-foreground">{viewed} users (100%)</span>
                  </div>
                  <div className="mt-2 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Clicked Package</span>
                    <span className="text-sm text-muted-foreground">{clickedPackage} users ({clickThroughRate}%)</span>
                  </div>
                  <div className="mt-2 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${clickThroughRate}%` }}></div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Started Checkout</span>
                    <span className="text-sm text-muted-foreground">{initiatedCheckout} users ({(viewed && initiatedCheckout ? (initiatedCheckout / viewed * 100).toFixed(1) : 0)}%)</span>
                  </div>
                  <div className="mt-2 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${viewed && initiatedCheckout ? (initiatedCheckout / viewed * 100) : 0}%` }}></div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completed Purchase</span>
                    <span className="text-sm text-muted-foreground">{completedPurchase} users ({conversionRate}%)</span>
                  </div>
                  <div className="mt-2 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${conversionRate}%` }}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Trends */}
          {analytics?.dailyStats && analytics.dailyStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Trends</CardTitle>
                <CardDescription>Aggregated daily statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.dailyStats.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span>{format(new Date(day.date), 'MMM dd')}</span>
                      <div className="flex gap-4">
                        <span className="text-muted-foreground">Views: {day.uniqueUsersHitPaywall}</span>
                        <span className="text-muted-foreground">Clicks: {day.uniqueUsersClickedPackage}</span>
                        <span className="font-medium">Purchases: {day.uniqueUsersCompletedPurchase}</span>
                        {day.totalRevenueCents > 0 && (
                          <span className="text-green-600">€{(day.totalRevenueCents / 100).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}