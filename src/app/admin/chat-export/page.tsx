"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { Download, TrendingUp, MessageSquare, Clock } from "lucide-react";

export default function ChatExportPage() {
  const [filters, setFilters] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null,
    format: 'json' as 'json' | 'csv' | 'jsonl',
    includeUserInfo: false,
    anonymize: false,
    roleFilter: 'both' as 'user' | 'assistant' | 'both',
    includeMetadata: true,
    includeIds: true,
  });

  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('30d');

  const exportMutation = api.admin.exportChatHistory.useMutation({
    onSuccess: (data) => {
      // Create blob and trigger download
      const blob = new Blob(
        [typeof data === 'string' ? data : JSON.stringify(data, null, 2)],
        { type: filters.format === 'csv' ? 'text/csv' : 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.${filters.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  const analytics = api.admin.getChatAnalytics.useQuery({
    timeframe: analyticsTimeframe,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Chat History Export & Analysis
        </h1>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="text-blue-500 w-8 h-8" />
              <span className="text-sm text-gray-500">{analyticsTimeframe}</span>
            </div>
            <p className="text-2xl font-bold">{analytics.data?.totalConversations || 0}</p>
            <p className="text-sm text-gray-600">Total Conversations</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-green-500 w-8 h-8" />
              <span className="text-sm text-gray-500">Avg</span>
            </div>
            <p className="text-2xl font-bold">{analytics.data?.averageLength || 0}</p>
            <p className="text-sm text-gray-600">Messages per Chat</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-red-500 text-2xl">⚠️</div>
              <span className="text-sm text-gray-500">Error</span>
            </div>
            <p className="text-2xl font-bold">{analytics.data?.errorRate?.toFixed(1) || 0}%</p>
            <p className="text-sm text-gray-600">Error Rate</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-purple-500 w-8 h-8" />
              <span className="text-sm text-gray-500">Peak</span>
            </div>
            <p className="text-2xl font-bold">
              {analytics.data?.peakUsageHours?.[0] 
                ? `${analytics.data.peakUsageHours[0]}:00`
                : 'N/A'}
            </p>
            <p className="text-sm text-gray-600">Peak Hour</p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="mb-8">
          <div className="flex space-x-2 bg-white p-1 rounded-lg shadow w-fit">
            {(['24h', '7d', '30d', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setAnalyticsTimeframe(tf)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  analyticsTimeframe === tf
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tf === 'all' ? 'All Time' : tf}
              </button>
            ))}
          </div>
        </div>

        {/* Export Controls */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-6">Export Chat Data</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters({
                  ...filters,
                  startDate: e.target.value ? new Date(e.target.value) : null
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters({
                  ...filters,
                  endDate: e.target.value ? new Date(e.target.value) : null
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <select
                value={filters.format}
                onChange={(e) => setFilters({
                  ...filters,
                  format: e.target.value as 'json' | 'csv' | 'jsonl'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="json">JSON (for analysis)</option>
                <option value="csv">CSV (for Excel)</option>
                <option value="jsonl">JSONL (for LLM training)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message Role Filter
              </label>
              <select
                value={filters.roleFilter}
                onChange={(e) => setFilters({
                  ...filters,
                  roleFilter: e.target.value as 'user' | 'assistant' | 'both'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="both">Both User & Assistant</option>
                <option value="user">User Messages Only</option>
                <option value="assistant">Assistant Messages Only</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.includeUserInfo}
                onChange={(e) => setFilters({
                  ...filters,
                  includeUserInfo: e.target.checked
                })}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Include User Info</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.anonymize}
                onChange={(e) => setFilters({
                  ...filters,
                  anonymize: e.target.checked
                })}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Anonymize Data</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.includeMetadata}
                onChange={(e) => setFilters({
                  ...filters,
                  includeMetadata: e.target.checked
                })}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Include Metadata</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.includeIds}
                onChange={(e) => setFilters({
                  ...filters,
                  includeIds: e.target.checked
                })}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Include IDs</span>
            </label>
          </div>
          
          <button
            onClick={() => exportMutation.mutate(filters)}
            disabled={exportMutation.isPending}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Chat History
              </>
            )}
          </button>
        </div>

        {/* Top User Requests */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Top User Requests</h2>
            <div className="space-y-3">
              {analytics.data?.topPhrases?.slice(0, 10).map((phrase, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-gray-700">{phrase.text}</span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {phrase.count} times
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Common Intents</h2>
            <div className="space-y-3">
              {analytics.data?.topIntents?.map((intent, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-gray-700 capitalize">
                    {intent.intent.replace('-', ' ')}
                  </span>
                  <div className="w-32 bg-gray-200 rounded-full h-4 relative">
                    <div 
                      className="bg-blue-500 h-4 rounded-full"
                      style={{ 
                        width: `${(intent.count / (analytics.data?.topIntents?.[0]?.count || 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}