// src/app/changelog/[version]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function ChangelogVersionPage() {
  const params = useParams();
  const version = Array.isArray(params?.version) ? params.version[0]! : (params?.version as string);
  const { data, isLoading } = api.changelog.getByVersion.useQuery({ version });
  const router = useRouter();

  if (isLoading) return <div className="p-6 text-white">Loading…</div>;
  if (!data) return <div className="p-6 text-white">Not found</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-400">
          <Link href="/changelog" className="hover:text-gray-200">Changelog</Link>
          <span>/</span>
          <span>v{data.version || version}</span>
        </div>
        <h1 className="text-4xl font-semibold mb-2">{data.title}</h1>
        <div className="text-sm text-gray-400 mb-6">{new Date(data.mergedAt as any).toLocaleDateString()}</div>
        <div className="rounded-lg overflow-hidden ring-1 ring-gray-800 bg-gray-950">
          <div className="aspect-video w-full bg-black">
            {data.videoUrl ? (
              <video controls playsInline className="w-full h-full">
                <source src={data.videoUrl} />
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">No video</div>
            )}
          </div>
        </div>
        <div className="prose prose-invert max-w-none mt-8">
          <p className="whitespace-pre-wrap">{data.description}</p>
        </div>
      </div>
    </div>
  );
}
