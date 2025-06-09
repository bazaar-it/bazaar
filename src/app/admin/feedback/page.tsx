//src/app/admin/feedback/page.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { ArrowLeft, MessageSquare, User, Calendar, Filter, X } from "lucide-react";

type StatusFilter = 'all' | 'pending' | 'resolved' | 'archived';

export default function AdminFeedbackPage() {
  const { data: session, status } = useSession();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Check admin access
  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();
  
  // Get feedback data
  const { data: feedbackData, isLoading, refetch } = api.admin.getRecentFeedback.useQuery(
    { limit: 50 },
    {
      enabled: adminCheck?.isAdmin === true,
    }
  );

  // Handle authentication and admin access
  if (status === "loading" || adminCheckLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session?.user) {
    redirect('/login');
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
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

  const clearFilters = () => {
    setStatusFilter('all');
    refetch();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'resolved': return 'default';
      case 'pending': return 'secondary';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredFeedback = feedbackData?.filter(feedback => {
    if (statusFilter !== 'all' && feedback.status !== statusFilter) {
      return false;
    }
    return true;
  }) || [];

  const activeFiltersCount = statusFilter !== 'all' ? 1 : 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <MessageSquare className="h-8 w-8 text-indigo-600" />
              <span>User Feedback</span>
            </h1>
            <p className="text-gray-600 mt-2">Monitor and manage user feedback and support requests</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-sm">
              {filteredFeedback.length} {filteredFeedback.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">Filters</CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount} active
                </Badge>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.length > 0 ? (
          filteredFeedback.map((feedback) => (
            <Card key={feedback.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {feedback.name || 'Anonymous User'}
                      </h3>
                      {feedback.email && (
                        <p className="text-sm text-gray-500">{feedback.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={getStatusBadgeVariant(feedback.status)}>
                      {feedback.status || 'pending'}
                    </Badge>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : 'No date'}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700 leading-relaxed">{feedback.content}</p>
                </div>

                {feedback.prioritizedFeatures && feedback.prioritizedFeatures.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Prioritized Features:</h4>
                    <div className="flex flex-wrap gap-2">
                      {feedback.prioritizedFeatures.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
              <p className="text-gray-500 mb-4">
                {activeFiltersCount > 0 
                  ? "No feedback matches your current filters. Try adjusting your search criteria."
                  : "No feedback has been received yet."
                }
              </p>
              {activeFiltersCount > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
