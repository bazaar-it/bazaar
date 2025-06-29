//src/app/admin/page.tsx
"use client";

import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();

  // Check admin access
  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();
  const { data: dashboardData, isLoading } = api.admin.getDashboardMetrics.useQuery();

  // Handle authentication and admin access
  if (status === "loading" || adminCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    redirect('/login');
  }

  // Simplified dashboard for debugging
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor key metrics and user feedback</p>
          
          {/* Debug Info */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Debug:</strong> User: {session?.user?.email} | Admin: {adminCheck?.isAdmin ? 'Yes' : 'No'}
            </p>
          </div>
        </div>

        {/* Simple Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-blue-600">{dashboardData?.users?.all || 0}</p>
            <p className="text-sm text-gray-500">Registered users</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Projects</h3>
            <p className="text-3xl font-bold text-green-600">{dashboardData?.projects?.all || 0}</p>
            <p className="text-sm text-gray-500">Total projects</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Scenes</h3>
            <p className="text-3xl font-bold text-purple-600">{dashboardData?.scenes?.all || 0}</p>
            <p className="text-sm text-gray-500">Generated scenes</p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            href="/admin/users"
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-gray-900">User Management</h3>
            <p className="text-sm text-gray-500 mt-1">Manage user accounts</p>
          </Link>

          <Link 
            href="/admin/analytics"
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-gray-900">Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">View detailed analytics</p>
          </Link>

          <Link 
            href="/admin/email-marketing"
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-gray-900">Email Marketing</h3>
            <p className="text-sm text-gray-500 mt-1">Send email campaigns</p>
          </Link>

          <Link 
            href="/admin/testing"
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <h3 className="font-medium text-gray-900">AI Testing</h3>
            <p className="text-sm text-gray-500 mt-1">Test AI functionality</p>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-8 text-center">
            <div className="text-gray-500">Loading dashboard data...</div>
          </div>
        )}
      </div>
    </div>
  );
} 