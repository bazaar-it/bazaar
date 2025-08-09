// src/app/changelog/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

const TYPES = ["all","feature","fix","refactor","docs","style","test","chore"] as const;

type TypeFilter = typeof TYPES[number];

export default function PublicChangelogPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");

  const { data, isLoading } = api.changelog.list.useQuery({ page, pageSize: 20, type, query: query || undefined });

  const formatDate = (d?: string | Date | null) => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Changelog</h1>
            <p className="text-gray-600">Product updates with short video summaries</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              className="border rounded-md px-3 py-2 text-sm"
              placeholder="Search changelog..."
              value={query}
              onChange={(e) => { setPage(1); setQuery(e.target.value); }}
            />
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={type}
              onChange={(e) => { setPage(1); setType(e.target.value as TypeFilter); }}
            >
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {isLoading && <div className="text-gray-500">Loading…</div>}

        {!isLoading && data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.items.map(item => (
              <Link key={item.id} href={`/changelog/${item.id}`} className="block bg-white rounded-lg shadow-sm border hover:shadow-md transition">
                <div className="aspect-video w-full bg-gray-100 rounded-t-lg overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No thumbnail</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 uppercase">{item.type}</span>
                    <span className="text-xs text-gray-500">{item.version ? `v${item.version}` : formatDate(item.mergedAt as any)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">{item.description}</p>
                  <div className="text-xs text-gray-400 mt-3 flex items-center justify-between">
                    <span>{item.viewCount || 0} views</span>
                    <span>{formatDate(item.mergedAt as any)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && data && data.total > data.page * data.pageSize && (
          <div className="mt-6 flex justify-center">
            <button className="px-4 py-2 border rounded-md" onClick={() => setPage(p => p + 1)}>Load more</button>
          </div>
        )}
      </div>
    </div>
  );
}
