"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function EditUser() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  // Handle missing userId
  if (!userId) {
    redirect('/admin/users');
  }

  // Fetch user data
  const { data: user, isLoading: userLoading } = api.admin.getUser.useQuery({ userId });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    image: '',
  });
  const [isFormReady, setIsFormReady] = useState(false);

  // Update mutation
  const updateMutation = api.admin.updateUser.useMutation({
    onSuccess: () => {
      router.push(`/admin/users/${userId}`);
    },
    onError: (error) => {
      alert(`Error updating user: ${error.message}`);
    },
  });

  // Handle authentication
  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session?.user) {
    redirect('/login');
  }

  // Initialize form data when user loads
  if (user && !isFormReady) {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      image: user.image || '',
    });
    setIsFormReady(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updateData: any = {};
    if (formData.name !== user?.name) updateData.name = formData.name;
    if (formData.email !== user?.email) updateData.email = formData.email;
    if (formData.image !== user?.image) updateData.image = formData.image || null;

    if (Object.keys(updateData).length === 0) {
      alert('No changes to save');
      return;
    }

    updateMutation.mutate({
      userId,
      data: updateData,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (userLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading user data...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">User Not Found</h2>
          <p className="mt-2 text-gray-600">The user you're looking for doesn't exist.</p>
          <Link href="/admin/users" className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard - Edit User</h1>
          <p className="text-gray-600">Update user information</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/admin/users`}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition"
          >
            Cancel
          </Link>
        </div>
      </div>

      {/* Edit Form */}
      <div className="max-w-2xl">
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current User Preview */}
            <div className="flex items-center mb-6 p-4 bg-gray-50 rounded-lg">
              {user.image && (
                <img className="h-12 w-12 rounded-full mr-4" src={user.image} alt={user.name || 'User'} />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">Editing: {user.name || 'No name'}</h3>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500">User ID: {user.id}</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-sm text-gray-500">Projects: {user.projectCount}</span>
                  <span className="text-sm text-gray-500">Prompts: {user.promptCount}</span>
                </div>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter user's name"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Enter user's email address"
                required
              />
            </div>

            {/* Image URL Field */}
            <div>
              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                Profile Image URL
              </label>
              <input
                type="url"
                id="image"
                value={formData.image}
                onChange={(e) => handleInputChange('image', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="https://example.com/image.jpg"
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to remove profile image
              </p>
            </div>

            {/* Image Preview */}
            {formData.image && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Preview
                </label>
                <img 
                  src={formData.image} 
                  alt="Profile preview" 
                  className="h-16 w-16 rounded-full border border-gray-300"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Link
                href={`/admin/users`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 