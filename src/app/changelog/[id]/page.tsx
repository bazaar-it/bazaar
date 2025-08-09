// src/app/changelog/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "~/trpc/react";

function formatDate(d?: string | Date | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function ChangelogDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0]! : (params?.id as string);
  const { data, isLoading } = api.changelog.getById.useQuery({ id });

  if (isLoading) return <div className="p-6 text-white">Loading…</div>;
  if (!data) return <div className="p-6 text-white">Not found</div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-[220px_1fr] gap-12">
        {/* Left timeline rail */}
        <div className="relative">
          <div className="sticky top-24">
            <div className="text-sm text-gray-400 mb-2">{formatDate(data.mergedAt as any)}</div>
            {data.version && (
              <div className="inline-flex items-center px-2 py-1 rounded-md border border-gray-700 text-xs text-gray-200">{data.version}</div>
            )}
          </div>
          <div className="absolute left-[7px] top-0 bottom-0 border-l border-gray-800" />
          <div className="absolute left-0 top-28 w-3 h-3 rounded-full bg-white" />
        </div>

        {/* Right content */}
        <div>
          <div className="mb-6">
            <Link href="/changelog" className="text-gray-400 hover:text-gray-200 text-sm">← Back to changelog</Link>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-4">{data.title}</h1>
          <div className="text-sm text-gray-400 mb-8">
            <span className="uppercase text-xs px-2 py-1 rounded border border-gray-800 mr-2">{data.type}</span>
            {data.repositoryFullName}
          </div>

          {/* Hero video / media */}
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

          {/* Body */}
          <div className="prose prose-invert max-w-none mt-8">
            <p className="whitespace-pre-wrap">{data.description}</p>
          </div>

          <div className="mt-8 text-sm text-gray-500">PR #{data.prNumber} • {data.viewCount || 0} views</div>
        </div>
      </div>
    </div>
  );
}
