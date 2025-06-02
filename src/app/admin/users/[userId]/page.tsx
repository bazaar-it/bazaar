"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";

export default function UsersManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{userId: string, userEmail: string} | null>(null);
  const usersPerPage = 20;

  // Debounce search term - only search after 500ms of no typing and minimum 2 characters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2 || searchTerm.length === 0) {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1); // Reset to first page on search
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users with pagination and search
  const { data: usersData, isLoading, refetch } = api.admin.getUsers.useQuery({
    page: currentPage,
    limit: usersPerPage,
    search: debouncedSearchTerm || undefined,
  });

  // Handle authentication
  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session?.user) {
    redirect('/login');
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Force immediate search on form submit
    if (searchTerm.length >= 2 || searchTerm.length === 0) {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }
  };

  const handleSearchClear = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setCurrentPage(1);
  };

  // Admin toggle mutation
  const toggleAdminMutation = api.admin.toggleUserAdmin.useMutation({
    onSuccess: () => {
      void refetch();
    },
    onError: (error) => {
      alert(`Error updating admin status: ${error.message}`);
    },
  });

  // Delete user mutation
  const deleteUserMutation = api.admin.deleteUser.useMutation({
    onSuccess: () => {
      void refetch();
      setDeleteConfirm(null);
    },
    onError: (error) => {
      alert(`Error deleting user: ${error.message}`);
      setDeleteConfirm(null);
    },
  });

  const handleDeleteUser = () => {
    if (deleteConfirm) {
      deleteUserMutation.mutate({ userId: deleteConfirm.userId });
    }
  };

  const UserRow = ({ user }: { user: any }) => {
    const handleAdminToggle = async () => {
      if (confirm(`${user.isAdmin ? 'Remove' : 'Grant'} admin access for ${user.name || user.email}?`)) {
        toggleAdminMutation.mutate({
          userId: user.id,
          isAdmin: !user.isAdmin,
        });
      }
    };

    return (
      <tr className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {user.image && (
              <img className="h-8 w-8 rounded-full mr-3" src={user.image} alt={user.name || 'User'} />
            )}
            <div>
              <div className="flex items-center">
                <div className="text-sm font-medium text-gray-900">
                  {user.name || 'No name'}
                </div>
                {user.isAdmin && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'No date'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {user.totalPrompts || 0} prompts
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex items-center space-x-2">
            <Link
              href={`/admin/users/${user.id}`}
              className="text-indigo-600 hover:text-indigo-900"
            >
              View
            </Link>
            <Link
              href={`/admin/users/${user.id}/edit`}
              className="text-indigo-600 hover:text-indigo-900"
            >
              Edit
            </Link>
            <button
              onClick={handleAdminToggle}
              disabled={toggleAdminMutation.isPending}
              className={`${
                user.isAdmin ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
              } ${toggleAdminMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {toggleAdminMutation.isPending ? 'Loading...' : user.isAdmin ? 'Remove Admin' : 'Make Admin'}
            </button>
            {!user.isAdmin && (
              <button
                onClick={() => setDeleteConfirm({userId: user.id, userEmail: user.email})}
                disabled={deleteUserMutation.isPending}
                className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  if (isLoading && !usersData) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage and view user accounts</p>
      </div>

      {/* Search and Actions */}
      <div className="mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 items-end">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={searchTerm.length > 0 && searchTerm.length < 2}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>

            {(searchTerm || debouncedSearchTerm) && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {searchTerm.length > 0 && searchTerm.length < 2 && (
          <p className="text-sm text-gray-500 mt-1">Type at least 2 characters to search</p>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Users {debouncedSearchTerm && `matching "${debouncedSearchTerm}"`}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {usersData?.total || 0} total users
                {debouncedSearchTerm && ` (${usersData?.users.length || 0} shown)`}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="text-gray-500">Loading...</div>
                  </td>
                </tr>
              ) : usersData?.users && usersData.users.length > 0 ? (
                usersData.users.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      {debouncedSearchTerm ? 'No users found matching your search.' : 'No users found.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersData?.totalPages && usersData.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === usersData.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * usersPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * usersPerPage, usersData.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{usersData.total}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === usersData.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delete User Account
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete the account for <strong>{deleteConfirm.userEmail}</strong>? 
              This action cannot be undone and will permanently remove all user data including projects, scenes, and messages.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteUserMutation.isPending}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteUserMutation.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 