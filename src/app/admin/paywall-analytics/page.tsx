"use client";

import { useState, useMemo } from "react";
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
  
  // Memoize the dates to prevent re-fetching on every render
  const queryDates = useMemo(() => ({
    startDate: subDays(new Date(), dateRange),
    endDate: new Date(),
  }), [dateRange]);
  
  // Fetch analytics data
  const { data: analytics, isLoading } = api.admin.getPaywallAnalytics.useQuery(queryDates);

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
        <h1 className="text-3xl font-bold text-white">Paywall Analytics</h1>
        <p className="text-gray-400">Track how users interact with the payment system</p>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 flex gap-2">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            dateRange === 7
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700'
          }`}
          onClick={() => setDateRange(7)}
        >
          Last 7 days
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            dateRange === 30
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700'
          }`}
          onClick={() => setDateRange(30)}
        >
          Last 30 days
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
            dateRange === 90
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700'
          }`}
          onClick={() => setDateRange(90)}
        >
          Last 90 days
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-400">Loading...</div>
              </div>
              <div className="mt-4">
                <div className="animate-pulse h-8 bg-gray-700 rounded w-20"></div>
                <div className="animate-pulse h-4 bg-gray-700 rounded w-32 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-400">Paywall Views</div>
                <EyeIcon className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{viewed}</div>
                <p className="text-xs text-gray-500">
                  Unique users who saw the paywall
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-400">Package Clicks</div>
                <CursorArrowRaysIcon className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{clickedPackage}</div>
                <p className="text-xs text-gray-500">
                  {clickThroughRate}% click-through rate
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-400">Checkouts Started</div>
                <CreditCardIcon className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{initiatedCheckout}</div>
                <p className="text-xs text-gray-500">
                  {checkoutRate}% of clicks proceed
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium text-gray-400">Conversions</div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  Number(conversionRate) > 5 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {conversionRate}%
                </span>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{completedPurchase}</div>
                <p className="text-xs text-gray-500">
                  {completionRate}% checkout completion
                </p>
              </div>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 p-6 mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Conversion Funnel</h3>
              <p className="text-sm text-gray-400">User journey from paywall view to purchase</p>
            </div>
            <div>
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Viewed Paywall</span>
                    <span className="text-sm text-gray-500">{viewed} users (100%)</span>
                  </div>
                  <div className="mt-2 h-4 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Clicked Package</span>
                    <span className="text-sm text-gray-500">{clickedPackage} users ({clickThroughRate}%)</span>
                  </div>
                  <div className="mt-2 h-4 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${clickThroughRate}%` }}></div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Started Checkout</span>
                    <span className="text-sm text-gray-500">{initiatedCheckout} users ({(viewed && initiatedCheckout ? (initiatedCheckout / viewed * 100).toFixed(1) : 0)}%)</span>
                  </div>
                  <div className="mt-2 h-4 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${viewed && initiatedCheckout ? (initiatedCheckout / viewed * 100) : 0}%` }}></div>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Completed Purchase</span>
                    <span className="text-sm text-gray-500">{completedPurchase} users ({conversionRate}%)</span>
                  </div>
                  <div className="mt-2 h-4 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600" style={{ width: `${conversionRate}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Trends */}
          {analytics?.dailyStats && analytics.dailyStats.length > 0 && (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Daily Trends</h3>
                <p className="text-sm text-gray-400">Aggregated daily statistics</p>
              </div>
              <div>
                <div className="space-y-2">
                  {analytics.dailyStats.slice(-7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-700/30 transition-colors">
                      <span className="text-gray-300">{format(new Date(day.date), 'MMM dd')}</span>
                      <div className="flex gap-4">
                        <span className="text-gray-500">Views: {day.uniqueUsersHitPaywall}</span>
                        <span className="text-gray-500">Clicks: {day.uniqueUsersClickedPackage}</span>
                        <span className="font-medium text-gray-200">Purchases: {day.uniqueUsersCompletedPurchase}</span>
                        {day.totalRevenueCents > 0 && (
                          <span className="text-emerald-400">€{(day.totalRevenueCents / 100).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}