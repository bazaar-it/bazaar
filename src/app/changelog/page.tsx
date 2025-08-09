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
          <div className="flex flex-col gap-16">
            {(data.items || []).map((item) => (
              <section key={item.id} id={item.version ? `v-${item.version}` : item.id} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                {/* Left rail: date + version */}
                <div className="text-sm text-gray-500 pt-2">
                  <div>{formatDate(item.mergedAt as any)}</div>
                  {item.version && (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md border border-gray-800 text-xs text-gray-300">v{item.version}</div>
                  )}
                </div>
                {/* Content */}
                <div className="rounded-lg border border-gray-800 overflow-hidden">
                  <div className="p-4 border-b border-gray-900 bg-gray-950/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] px-2 py-1 rounded border border-gray-800 uppercase text-gray-300">{item.type}</span>
                      <span className="text-xs text-gray-500">{item.repository || ''}</span>
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{item.title}</h2>
                  </div>
                  {/* Hero media */}
                  <div className="bg-black">
                    {item.videoUrl ? (
                      <div className="aspect-video w-full">
                        <video controls playsInline className="w-full h-full">
                          <source src={item.videoUrl} />
                        </video>
                      </div>
                    ) : item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="thumbnail" className="w-full object-cover" />
                    ) : null}
                  </div>
                  {/* Body (Markdown) */}
                  <div className="prose prose-invert max-w-none p-4">
                    {/* Use react-markdown already in deps */}
                    {require('react').createElement(require('react-markdown').default, {}, item.description || '')}
                  </div>
                  <div className="px-4 pb-4 text-xs text-gray-500 flex items-center justify-between">
                    <span>{item.viewCount || 0} views</span>
                    <span>{formatDate(item.mergedAt as any)}</span>
                  </div>
                </div>
              </section>
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
