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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-semibold mb-2">Changelog</h1>
        <p className="text-gray-400 mb-8">Product updates with short video summaries</p>
        <div className="flex items-center gap-3 mb-8">
          <input
            className="bg-transparent border border-gray-800 rounded-md px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
            placeholder="Search changelog..."
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value); }}
          />
          <select
            className="bg-transparent border border-gray-800 rounded-md px-3 py-2 text-sm"
            value={type}
            onChange={(e) => { setPage(1); setType(e.target.value as TypeFilter); }}
          >
            {TYPES.map(t => <option className="bg-black" key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {isLoading && <div className="text-gray-500">Loading…</div>}

        {!isLoading && data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.items.map(item => (
              <Link key={item.id} href={`/changelog/${item.id}`} className="block rounded-lg border border-gray-800 hover:border-gray-700 hover:bg-gray-950 transition">
                <div className="aspect-video w-full bg-gray-900 rounded-t-lg overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt="thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">No thumbnail</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] px-2 py-1 rounded border border-gray-800 uppercase text-gray-300">{item.type}</span>
                    <span className="text-xs text-gray-500">{item.version ? `v${item.version}` : formatDate(item.mergedAt as any)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mt-1">{item.description}</p>
                  <div className="text-xs text-gray-500 mt-3 flex items-center justify-between">
                    <span>{item.viewCount || 0} views</span>
                    <span>{formatDate(item.mergedAt as any)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && data && data.total > data.page * data.pageSize && (
          <div className="mt-8 flex justify-center">
            <button className="px-4 py-2 border border-gray-800 rounded-md hover:border-gray-700" onClick={() => setPage(p => p + 1)}>Load more</button>
          </div>
        )}
      </div>
    </div>
  );
}
