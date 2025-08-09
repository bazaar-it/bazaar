// src/app/changelog/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { api } from "~/trpc/react";

export default function ChangelogDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0]! : (params?.id as string);
  const { data, isLoading } = api.changelog.getById.useQuery({ id });

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!data) return <div className="p-6">Not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 uppercase">{data.type}</span>
          </div>
          <div className="text-sm text-gray-500 mt-2">{data.repositoryFullName} • {data.mergedAt ? new Date(data.mergedAt as unknown as string).toLocaleDateString() : ''}</div>
        </div>

        <div className="aspect-video w-full bg-black">
          {data.videoUrl ? (
            <video controls playsInline className="w-full h-full">
              <source src={data.videoUrl} />
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No video</div>
          )}
        </div>

        <div className="p-6">
          <p className="text-gray-700 whitespace-pre-wrap">{data.description}</p>
          <div className="mt-4 text-sm text-gray-500">PR #{data.prNumber} • Views: {data.viewCount || 0}</div>
        </div>
      </div>
    </div>
  );
}
