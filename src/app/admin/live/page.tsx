// src/app/admin/live/page.tsx
import { auth } from "~/server/auth";
import { db, metrics } from "~/server/db";
import { getCurrentLiveStatus, type LiveStatusTags } from "~/lib/utils/liveStatus";
import { revalidatePath } from "next/cache";

async function getLiveStatus() { return getCurrentLiveStatus(); }

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('unauthorized');
  // Admin check is already enforced by /admin layout, so simply return session
  return session;
}

export default async function AdminLivePage() {
  await requireAdmin();
  const status = await getLiveStatus();

  async function updateLiveStatus(formData: FormData) {
    'use server';
    await requireAdmin();
    const liveStr = formData.get('live');
    const url = String(formData.get('url') || '') || undefined;
    const platform = String(formData.get('platform') || 'x');
    const live = liveStr === 'on';
    const tags: LiveStatusTags = { url, platform, source: 'admin' };
    await db.insert(metrics).values({
      name: 'live_status',
      value: live ? 1 : 0,
      tags,
    });
    revalidatePath('/admin/live');
  }

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-6">Live Stream Status</h1>
      <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700 max-w-2xl">
        <div className="mb-4">
          <p className="text-sm text-gray-300">Current:</p>
          <p className="text-lg font-semibold">
            {status.live ? (
              <span className="text-red-400">Live</span>
            ) : (
              <span className="text-gray-300">Offline</span>
            )}
            <span className="ml-3 text-sm text-gray-400">(source: {status.source})</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Updated: {new Date(status.updatedAt).toLocaleString()}</p>
          {status.url && (
            <p className="text-sm text-gray-300 mt-2">URL: <a className="text-indigo-300 underline" href={status.url} target="_blank" rel="noreferrer">{status.url}</a></p>
          )}
        </div>

        <form action={updateLiveStatus} className="space-y-4">
          <div className="flex items-center gap-3">
            <input id="live" name="live" type="checkbox" defaultChecked={status.live} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-400" />
            <label htmlFor="live" className="text-sm">Show “We’re Live on X” badge on homepage</label>
          </div>
          <div>
            <label htmlFor="url" className="block text-sm text-gray-300 mb-1">Live URL</label>
            <input id="url" name="url" type="url" defaultValue={status.url} placeholder="https://x.com/your_handle" className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-xs text-gray-500 mt-1">If empty, falls back to LIVE_URL_DEFAULT.</p>
          </div>
          <div>
            <label htmlFor="platform" className="block text-sm text-gray-300 mb-1">Platform</label>
            <select id="platform" name="platform" defaultValue="x" className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="x">X</option>
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
            </select>
          </div>
          <div className="pt-2">
            <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-medium">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
