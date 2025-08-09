// src/app/admin/changelog/page.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

const TYPES = ["all","feature","fix","refactor","docs","style","test","chore"] as const;
const STATUSES = ["all","queued","processing","completed","failed"] as const;

type TypeFilter = typeof TYPES[number];
type StatusFilter = typeof STATUSES[number];

export default function AdminChangelogPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<TypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  const list = api.changelog.adminList.useQuery({ page, pageSize: 20, type, status, query: query || undefined });
  const createMut = api.changelog.create.useMutation();
  const updateMut = api.changelog.update.useMutation();
  const deleteMut = api.changelog.delete.useMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    // Build description from structured sections if provided
    const improvements = (fd.get('improvements') as string) || '';
    const fixes = (fd.get('fixes') as string) || '';
    const howTo = (fd.get('howto') as string) || '';
    const media = ((fd.get('media') as string) || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);

    let structuredDescription = (fd.get('description') as string) || '';
    if (improvements || fixes || howTo || media.length > 0) {
      const sections: string[] = [];
      if (improvements) sections.push(`## Improvements\n\n${improvements.trim()}\n`);
      if (fixes) sections.push(`## Fixes\n\n${fixes.trim()}\n`);
      if (howTo) sections.push(`## How to use\n\n${howTo.trim()}\n`);
      if (media.length > 0) {
        sections.push(`## Media\n\n${media.map((url) => url).join('\n')}`);
      }
      structuredDescription = sections.join('\n');
    }

    const isPublished = fd.get('published') === 'on';

    const payload = {
      title: (fd.get('title') as string) || '',
      description: structuredDescription,
      type: (fd.get('type') as any),
      repositoryFullName: (fd.get('repo') as string) || '',
      prNumber: Number(fd.get('prNumber') || 0) || undefined,
      videoUrl: (fd.get('videoUrl') as string) || undefined,
      thumbnailUrl: (fd.get('thumbnailUrl') as string) || undefined,
      status: isPublished ? 'completed' : ((fd.get('status') as any) || 'queued'),
      mergedAt: fd.get('mergedAt') ? new Date(fd.get('mergedAt') as string) : undefined,
      version: (fd.get('version') as string) || undefined,
    };

    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createMut.mutateAsync(payload as any);
    }

    setFormOpen(false);
    setEditing(null);
    list.refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Changelog Admin</h1>
            <p className="text-gray-600">Manage public changelog entries</p>
          </div>
          <button className="px-3 py-2 rounded-md bg-indigo-600 text-white" onClick={() => { setEditing(null); setFormOpen(true); }}>New Entry</button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <input className="border rounded-md px-3 py-2 text-sm" placeholder="Search..." value={query} onChange={(e) => { setPage(1); setQuery(e.target.value); }} />
          <select className="border rounded-md px-3 py-2 text-sm" value={type} onChange={(e) => { setPage(1); setType(e.target.value as TypeFilter); }}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="border rounded-md px-3 py-2 text-sm" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as StatusFilter); }}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Video</th>
                <th className="px-3 py-2">Views</th>
                <th className="px-3 py-2">Merged</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {!list.isLoading && list.data?.items?.length ? list.data.items.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2 text-gray-900">{item.title}</td>
                  <td className="px-3 py-2 text-center uppercase text-xs">{item.type}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border ${item.status === 'completed' ? 'border-green-300 text-green-700 bg-green-50' : 'border-gray-300 text-gray-700 bg-gray-50'}`}>
                      {item.status === 'completed' ? 'Published' : item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-blue-600">{item.videoUrl ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 text-center">{item.viewCount || 0}</td>
                  <td className="px-3 py-2 text-center">{item.mergedAt ? new Date(item.mergedAt as unknown as string).toLocaleDateString() : ''}</td>
                  <td className="px-3 py-2 text-right">
                    <button 
                      className={`px-2 py-1 ${item.status === 'completed' ? 'text-amber-600' : 'text-green-600'}`}
                      onClick={async () => {
                        const next = item.status === 'completed' ? 'queued' : 'completed';
                        await updateMut.mutateAsync({ id: item.id, status: next });
                        list.refetch();
                      }}
                    >
                      {item.status === 'completed' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button className="px-2 py-1 text-indigo-600" onClick={() => { setEditing(item); setFormOpen(true); }}>Edit</button>
                    <button className="px-2 py-1 text-red-600" onClick={async () => { await deleteMut.mutateAsync({ id: item.id }); list.refetch(); }}>Delete</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">{list.isLoading ? 'Loading…' : 'No entries'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Form drawer (simple modal) */}
        {formOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setFormOpen(false)}>
            <div className="bg-white rounded-lg w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit Entry' : 'New Entry'}</h2>
              <form onSubmit={onSubmit} className="space-y-3">
                <input name="title" defaultValue={editing?.title || ''} placeholder="Title" className="w-full border rounded px-3 py-2" required />
                <textarea name="description" defaultValue={editing?.description || ''} placeholder="Description" className="w-full border rounded px-3 py-2" rows={4} />
                <div className="flex gap-3">
                  <select name="type" defaultValue={editing?.type || 'feature'} className="border rounded px-3 py-2">
                    {TYPES.filter(t=>t!=='all').map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select name="status" defaultValue={editing?.status || 'completed'} className="border rounded px-3 py-2">
                    {STATUSES.filter(s=>s!=='all').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <input
                    type="date"
                    name="mergedAt"
                    defaultValue={editing?.mergedAt ? new Date(editing.mergedAt as unknown as string).toISOString().slice(0,10) : new Date().toISOString().slice(0,10)}
                    className="border rounded px-3 py-2"
                    aria-label="Date"
                  />
                  <input
                    name="version"
                    placeholder="Version (e.g., 1.4)"
                    defaultValue={editing?.version || ''}
                    className="border rounded px-3 py-2"
                    aria-label="Version"
                  />
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" name="published" defaultChecked={editing?.status === 'completed'} />
                    Published
                  </label>
                </div>
                <input name="repo" defaultValue={editing?.repositoryFullName || ''} placeholder="owner/repo" className="w-full border rounded px-3 py-2" required />
                <input name="prNumber" defaultValue={editing?.prNumber || ''} placeholder="PR number (optional)" className="w-full border rounded px-3 py-2" />
                <input name="videoUrl" defaultValue={editing?.videoUrl || ''} placeholder="Video URL (optional)" className="w-full border rounded px-3 py-2" />
                <input name="thumbnailUrl" defaultValue={editing?.thumbnailUrl || ''} placeholder="Thumbnail URL (optional)" className="w-full border rounded px-3 py-2" />

                {/* Structured sections matching Cursor-style blocks */}
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <textarea name="improvements" placeholder="Improvements (markdown, bullets or text)" className="w-full border rounded px-3 py-2" rows={4} />
                  <textarea name="fixes" placeholder="Fixes (markdown)" className="w-full border rounded px-3 py-2" rows={4} />
                  <textarea name="howto" placeholder="How to use (steps, shortcuts, UI path)" className="w-full border rounded px-3 py-2 md:col-span-2" rows={4} />
                  <textarea name="media" placeholder="Media URLs (one per line)" className="w-full border rounded px-3 py-2 md:col-span-2" rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="px-3 py-2" onClick={() => setFormOpen(false)}>Cancel</button>
                  <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
