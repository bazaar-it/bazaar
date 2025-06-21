//src/app/admin/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAdminAuthTRPC } from "../../lib/use-admin-auth-trpc";
import { redirect } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";
import { Button } from "@bazaar/ui";
import { Input } from "@bazaar/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@bazaar/ui";
import { Badge } from "@bazaar/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@bazaar/ui";
import { Skeleton } from "@bazaar/ui";
import { Search, Filter, X, ChevronDown, ChevronUp, Users, Activity, Calendar, Folder, Shield } from "lucide-react";

// Enhanced filter state type
interface FilterState {
  searchTerm: string;
  authProvider: 'all' | 'google' | 'github' | 'unknown';
  activityFilter: 'all' | 'today' | 'week' | 'month' | 'never';
  signupDateFilter: 'all' | 'today' | 'week' | 'month' | 'older';
  projectsFilter: 'all' | 'none' | 'low' | 'medium' | 'high';
  adminFilter: 'all' | 'admin' | 'user';
  sortBy: 'signup_date' | 'last_activity' | 'total_projects' | 'total_prompts';
  sortOrder: 'asc' | 'desc';
}

const defaultFilters: FilterState = {
  searchTerm: '',
  authProvider: 'all',
  activityFilter: 'all',
  signupDateFilter: 'all',
  projectsFilter: 'all',
  adminFilter: 'all',
  sortBy: 'signup_date',
  sortOrder: 'desc',
};

export default function UsersAnalytics() {
  const { isAuthenticated, isAdmin, user, isLoading: authLoading } = useAdminAuthTRPC();
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
  const pageSize = 20;

  // Count active filters
  useEffect(() => {
    const count = Object.entries(filters).filter(([key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') return false;
      if (key === 'searchTerm') return value.trim() !== '';
      return value !== 'all';
    }).length;
    setActiveFiltersCount(count);
  }, [filters]);

  // Enhanced user analytics query with all filters
  const { 
    data: userAnalytics, 
    isLoading, 
    error,
    refetch 
  } = api.admin.getUserAnalytics.useQuery({
    limit: pageSize,
    offset: currentPage * pageSize,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    searchTerm: filters.searchTerm || undefined,
    authProvider: filters.authProvider,
    activityFilter: filters.activityFilter,
    signupDateFilter: filters.signupDateFilter,
    projectsFilter: filters.projectsFilter,
    adminFilter: filters.adminFilter,
  }, {
    enabled: isAuthenticated && isAdmin
  });

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0); // Reset to first page when filters change
  };

  const clearAllFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(0);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getOAuthIcon = (provider: string | null) => {
    switch (provider) {
      case 'google':
        return '🟢';
      case 'github':
        return '⚫';
      default:
        return '❓';
    }
  };

  const getProjectCountBadge = (count: number) => {
    if (count === 0) return <Badge variant="outline">No Projects</Badge>;
    if (count <= 2) return <Badge variant="secondary">{count} Projects</Badge>;
    if (count <= 10) return <Badge variant="default">{count} Projects</Badge>;
    return <Badge variant="destructive">{count} Projects</Badge>;
  };

  const getActivityBadge = (lastActivity: Date | null) => {
    if (!lastActivity) return <Badge variant="outline">Never Active</Badge>;
    
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffHours = (now.getTime() - activity.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) return <Badge variant="default">Active Today</Badge>;
    if (diffHours < 168) return <Badge variant="secondary">Active This Week</Badge>;
    if (diffHours < 720) return <Badge variant="outline">Active This Month</Badge>;
    return <Badge variant="destructive">Inactive</Badge>;
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-4">Please login on the main app first, then return here.</p>
          <a
            href="http://localhost:3000/login"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Login on Main App
          </a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin dashboard.</p>
          <a
            href="http://localhost:3000"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Return to Main App
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Analytics</h1>
            <p className="text-muted-foreground">
              Monitor user engagement, activity patterns, and project metrics
            </p>
          </div>
        </div>

        {/* Enhanced Filters Panel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <CardTitle className="text-lg">Filters</CardTitle>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary">{activeFiltersCount} active</Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {activeFiltersCount > 0 && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {showFilters && (
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={filters.searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFilter('searchTerm', e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Filter Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Auth Provider Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    Auth Provider
                  </label>
                  <Select value={filters.authProvider} onValueChange={(value: any) => updateFilter('authProvider', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      <SelectItem value="google">🟢 Google</SelectItem>
                      <SelectItem value="github">⚫ GitHub</SelectItem>
                      <SelectItem value="unknown">❓ Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Activity Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Activity className="h-4 w-4 mr-1" />
                    Activity
                  </label>
                  <Select value={filters.activityFilter} onValueChange={(value: any) => updateFilter('activityFilter', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activity</SelectItem>
                      <SelectItem value="today">Active Today</SelectItem>
                      <SelectItem value="week">Active This Week</SelectItem>
                      <SelectItem value="month">Active This Month</SelectItem>
                      <SelectItem value="never">Never Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Signup Date Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Signup Date
                  </label>
                  <Select value={filters.signupDateFilter} onValueChange={(value: any) => updateFilter('signupDateFilter', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Signups</SelectItem>
                      <SelectItem value="today">Signed Up Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last 30 Days</SelectItem>
                      <SelectItem value="older">Older than 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Projects Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Folder className="h-4 w-4 mr-1" />
                    Project Count
                  </label>
                  <Select value={filters.projectsFilter} onValueChange={(value: any) => updateFilter('projectsFilter', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Project Counts</SelectItem>
                      <SelectItem value="none">No Projects</SelectItem>
                      <SelectItem value="low">1-2 Projects</SelectItem>
                      <SelectItem value="medium">3-10 Projects</SelectItem>
                      <SelectItem value="high">10+ Projects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Admin Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    User Type
                  </label>
                  <Select value={filters.adminFilter} onValueChange={(value: any) => updateFilter('adminFilter', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admin">Admins Only</SelectItem>
                      <SelectItem value="user">Regular Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Options */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <div className="flex space-x-2">
                    <Select value={filters.sortBy} onValueChange={(value: any) => updateFilter('sortBy', value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="signup_date">Signup Date</SelectItem>
                        <SelectItem value="last_activity">Last Activity</SelectItem>
                        <SelectItem value="total_projects">Project Count</SelectItem>
                        <SelectItem value="total_prompts">Prompt Count</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filters.sortOrder} onValueChange={(value: any) => updateFilter('sortOrder', value)}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">↓</SelectItem>
                        <SelectItem value="asc">↑</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Results Summary */}
      {userAnalytics && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {userAnalytics.users.length} of {userAnalytics.totalCount} users
            {userAnalytics.appliedFilters && activeFiltersCount > 0 && (
              <span className="ml-1">(filtered)</span>
            )}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      )}

      {/* Users Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3" />
                    <div className="h-3 w-1/2" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-20" />
                    <div className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600">Error loading user analytics: {error.message}</p>
              <Button onClick={() => refetch()} className="mt-2">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {userAnalytics?.users.map((user: any) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="block"
                >
                  <div
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || "User"}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        {user.isAdmin && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border border-background" />
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{user.name || "Unnamed User"}</h3>
                          {user.isAdmin && <Badge variant="destructive" className="text-xs">Admin</Badge>}
                          <span className="text-lg">{getOAuthIcon(user.oauthProvider)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-right">
                        <p className="font-medium">Joined {formatDate(user.signupDate)}</p>
                        <p className="text-muted-foreground">Last active: {formatDate(user.lastActivity)}</p>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-1">
                        {getProjectCountBadge(user.totalProjects)}
                        {getActivityBadge(user.lastActivity)}
                      </div>

                      <div className="text-right space-y-1">
                        <p className="text-xs text-muted-foreground">{user.totalUserPrompts} prompts</p>
                        <p className="text-xs text-muted-foreground">{user.totalScenes} scenes</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {userAnalytics?.users.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found matching your filters</p>
                  {activeFiltersCount > 0 && (
                    <Button variant="outline" onClick={clearAllFilters} className="mt-2">
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {userAnalytics && userAnalytics.totalCount > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {Math.ceil(userAnalytics.totalCount / pageSize)}
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!userAnalytics.hasMore}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}