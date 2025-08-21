"use client";

import { GitHubConnectionCard } from "./components/GitHubConnectionCard";

interface SettingsPageClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function SettingsPageClient({ user }: SettingsPageClientProps) {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600">Connect your GitHub to animate your actual components</p>
      </div>
      
      <GitHubConnectionCard userId={user.id} />
    </div>
  );
}