"use client";
import { useEffect, useState } from 'react';

type LiveStatus = {
  live: boolean;
  url?: string;
  updatedAt: string;
  source?: string;
};

export default function LiveBadge({ pollMs = 60000 }: { pollMs?: number }) {
  const [status, setStatus] = useState<LiveStatus | null>(null);

  async function fetchStatus(signal?: AbortSignal) {
    try {
      const res = await fetch('/api/live-status', { signal, cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as LiveStatus;
      setStatus(json);
    } catch (err) {
      // ignore
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetchStatus(ctrl.signal);
    const id = setInterval(() => fetchStatus(ctrl.signal), pollMs);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [pollMs]);

  if (!status?.live) return null;

  const href = status.url || '#';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 shadow-sm hover:bg-red-100 transition-colors"
      aria-label="The boys are live"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
      </span>
      <span className="text-sm font-medium">The boys are live</span>
    </a>
  );
}
