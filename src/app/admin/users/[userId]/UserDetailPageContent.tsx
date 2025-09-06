"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";

export default function UserDetailPageContent({ userId }: { userId: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch user details
  const { data: userDetails, isLoading: userLoading } = api.admin.getUserDetails.useQuery({
    userId: userId,
  }, {
    enabled: !!userId
  });

  // Fetch user activity timeline
  const { data: activityData, isLoading: activityLoading } = api.admin.getUserActivityTimeline.useQuery({
    userId: userId,
    days: 30,
  }, {
    enabled: !!userId
  });

  // Fetch user's projects
  const { data: userProjects, isLoading: projectsLoading } = api.admin.getUserProjects.useQuery({
    userId: userId,
    limit: 20,
    offset: 0,
  }, {
    enabled: !!userId
  });

  // Handle authentication and admin check
  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session?.user) {
    redirect('/login');
  }

  if (userLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading user details...</div>
        </div>
      </div>
    );
  }

  if (!userDetails) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <p className="text-gray-600 mb-4">The user you're looking for doesn't exist.</p>
          <Link
            href="/admin/users"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            ← Back to Users
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDaysAgo = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const then = new Date(date);
    const diffInMs = now.getTime() - then.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  const getOAuthIcon = (provider: string | null) => {
    switch (provider) {
      case 'google': return '🔵';
      case 'github': return '⚫';
      default: return '❓';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link
            href="/admin/users"
            className="text-indigo-600 hover:text-indigo-900 mb-2 inline-flex items-center"
          >
            ← Back to Users
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0 h-20 w-20">
            {userDetails.image ? (
              <img className="h-20 w-20 rounded-full" src={userDetails.image} alt="" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-2xl">
                  {userDetails.name?.charAt(0) || userDetails.email.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="ml-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {userDetails.name || 'Unnamed User'}
              </h2>
              {userDetails.isAdmin && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  Admin
                </span>
              )}
            </div>
            <p className="text-gray-600">{userDetails.email}</p>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className="mr-4">
                {getOAuthIcon(userDetails.oauthProvider)} {userDetails.oauthProvider || 'Unknown'} Login
              </span>
              <span>
                Joined {formatDate(userDetails.signupDate)}
              </span>
            </div>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{userDetails.totalProjects}</div>
            <div className="text-sm text-gray-600">Projects</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{userDetails.totalScenes}</div>
            <div className="text-sm text-gray-600">Scenes</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-600">{userDetails.totalUserPrompts}</div>
            <div className="text-sm text-gray-600">Prompts</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">{userDetails.totalImagesUploaded || 0}</div>
            <div className="text-sm text-gray-600">Images</div>
          </div>
        </div>

        {/* Additional Metrics */}
        {userDetails.totalErrorMessages > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <div className="text-lg font-semibold text-red-800">
              ⚠️ {userDetails.totalErrorMessages} Error Messages
            </div>
            <div className="text-sm text-red-600">This user has encountered errors</div>
          </div>
        )}

        {/* User's Projects Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Projects</h2>
          {projectsLoading ? (
            <div className="text-center py-4">Loading projects...</div>
          ) : userProjects?.projects.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No projects found</div>
          ) : (
            <div className="space-y-4">
              {userProjects?.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/admin/users/${userId}/projects/${project.id}`}
                  className="block"
                >
                  <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{project.title}</h3>
                        <p className="text-sm text-gray-500">
                          Created: {formatDate(project.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {project.totalScenes} scenes
                        </div>
                        <div className="text-sm text-gray-500">
                          {project.totalUserPrompts} prompts
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">First Activity:</span>
            <br />
            <span className="text-gray-600">{formatDaysAgo(userDetails.firstActivity)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Activity:</span>
            <br />
            <span className="text-gray-600">{formatDaysAgo(userDetails.lastActivity)}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Scene Iterations:</span>
            <br />
            <span className="text-gray-600">
              {userDetails.totalSceneIterations || 0} iterations
            </span>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">30-Day Activity Timeline</h3>
        
        {activityLoading ? (
          <div className="text-center py-8">Loading timeline...</div>
        ) : activityData && activityData.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
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
          <div className="text-center py-8 text-gray-500">
            No activity in the last 30 days
          </div>
        )}
      </div>
    </div>
  );
}
