"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

interface UserAnalytics {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isAdmin: boolean;
  signupDate: Date;
  oauthProvider: string | null;
  totalProjects: number;
  totalScenes: number;
  totalMessages: number;
  totalUserPrompts: number;
  totalErrorMessages: number;
  promptsWithImages: number;
  totalImagesUploaded: number;
  firstActivity: Date | null;
  lastActivity: Date | null;
  totalSceneIterations: number;
  complexEdits: number;
  creativeEdits: number;
  surgicalEdits: number;
  userPreferences: number;
}

export default function UsersAnalytics() {
  const { data: session, status } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'signup_date' | 'last_activity' | 'total_projects' | 'total_prompts'>('last_activity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const usersPerPage = 20;

  // Check admin access
  const { data: adminCheck } = api.admin.checkAdminAccess.useQuery();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch user analytics with rich insights
  const { 
    data: analyticsData, 
    isLoading: analyticsLoading, 
    error: analyticsError 
  } = api.admin.getUserAnalytics.useQuery({
    limit: usersPerPage,
    offset: (currentPage - 1) * usersPerPage,
    sortBy,
    sortOrder,
  });

  // Fetch user activity timeline for selected user
  const { 
    data: activityData,
    isLoading: activityLoading 
  } = api.admin.getUserActivityTimeline.useQuery(
    { userId: selectedUserId!, days: 30 },
    { enabled: !!selectedUserId }
  );

  // Redirect if not authenticated
  if (status === "loading") {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!session?.user) {
    redirect("/login");
  }

  // Check admin access
  if (!adminCheck?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 text-lg">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const formatDaysAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays-1} days ago`;
    if (diffDays <= 30) return `${Math.floor(diffDays/7)} weeks ago`;
    return `${Math.floor(diffDays/30)} months ago`;
  };

  const getOAuthIcon = (provider: string | null) => {
    switch (provider) {
      case 'google':
        return '🌐';
      case 'github':
        return '🐙';
      default:
        return '❓';
    }
  };

  // 🚨 REMOVED: User classification badges as per feedback

  if (analyticsError) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error loading user analytics: {analyticsError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive insights into user behavior and engagement
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-blue-600">{analyticsData.totalCount}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.users.reduce((sum, u) => sum + Number(u.totalProjects || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Projects</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-purple-600">
              {analyticsData.users.reduce((sum, u) => sum + Number(u.totalUserPrompts || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Prompts</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-orange-600">
              {analyticsData.users.reduce((sum, u) => sum + Number(u.totalImagesUploaded || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Images</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="text-2xl font-bold text-red-600">
              {analyticsData.users.reduce((sum, u) => sum + Number(u.totalErrorMessages || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Error Messages</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="signup_date">Sign Up Date</option>
              <option value="last_activity">Last Activity</option>
              <option value="total_projects">Projects</option>
              <option value="total_prompts">Prompts</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {analyticsLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading user analytics...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Auth Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects & Content
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyticsData?.users.map((user) => {
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {user.image ? (
                              <img className="h-10 w-10 rounded-full" src={user.image} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-gray-600 font-semibold">
                                  {user.name?.charAt(0) || user.email.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {user.name || 'Unnamed User'}
                              {user.isAdmin && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">
                              Joined {formatDate(user.signupDate)}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">{getOAuthIcon(user.oauthProvider)}</span>
                          <div className="text-sm text-gray-900 capitalize">
                            {user.oauthProvider || 'Unknown'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>Last: {formatDaysAgo(user.lastActivity)}</div>
                          <div className="text-xs text-gray-500">
                            First: {formatDaysAgo(user.firstActivity)}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex gap-4">
                            <div>
                              <span className="font-medium">{user.totalProjects}</span>
                              <span className="text-gray-500 text-xs ml-1">projects</span>
                            </div>
                            <div>
                              <span className="font-medium">{user.totalScenes}</span>
                              <span className="text-gray-500 text-xs ml-1">scenes</span>
                            </div>
                          </div>
                          <div className="flex gap-4 mt-1">
                            <div>
                              <span className="font-medium">{user.totalUserPrompts}</span>
                              <span className="text-gray-500 text-xs ml-1">prompts</span>
                            </div>
                            {user.promptsWithImages > 0 && (
                              <div>
                                <span className="font-medium text-orange-600">{user.promptsWithImages}</span>
                                <span className="text-gray-500 text-xs ml-1">images</span>
                              </div>
                            )}
                            {user.totalErrorMessages > 0 && (
                              <div>
                                <span className="font-medium text-red-600">{user.totalErrorMessages}</span>
                                <span className="text-gray-500 text-xs ml-1">errors</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex gap-2">
                            {user.complexEdits > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {user.complexEdits} complex
                              </span>
                            )}
                            {user.creativeEdits > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {user.creativeEdits} creative
                              </span>
                            )}
                            {user.surgicalEdits > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {user.surgicalEdits} surgical
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Details
                          </Link>
                          {/* <button
                            onClick={() => setSelectedUserId(user.id)}
                            className="text-green-600 hover:text-green-900 text-sm"
                          >
                            Timeline
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {analyticsData && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex items-center">
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {Math.ceil(analyticsData.totalCount / usersPerPage)}
                  </span>
                </div>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!analyticsData.hasMore}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Timeline Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">30-Day Activity Timeline</h3>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              {activityLoading ? (
                <div className="text-center py-8">Loading timeline...</div>
              ) : activityData && activityData.length > 0 ? (
                <div className="space-y-3">
                  {activityData.map((day, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                      <div className="w-20 text-sm font-medium text-gray-600">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">{day.userPrompts}</span>
                          <span className="text-gray-500 ml-1">prompts</span>
                        </div>
                        <div>
                          <span className="font-medium">{day.scenesCreated}</span>
                          <span className="text-gray-500 ml-1">scenes</span>
                        </div>
                        <div>
                          <span className="font-medium">{day.imagesUploaded}</span>
                          <span className="text-gray-500 ml-1">images</span>
                        </div>
                        <div>
                          <span className="font-medium">{Math.round(day.avgSessionTime || 0)}</span>
                          <span className="text-gray-500 ml-1">min session</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No activity in the last 30 days</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 