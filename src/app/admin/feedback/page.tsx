"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

const PAGE_SIZE = 20;

export default function AdminFeedbackPage() {
  const { data: session, status } = useSession();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: adminCheck, isLoading: adminCheckLoading } = api.admin.checkAdminAccess.useQuery();
  const { data: feedbackEntries, isLoading, isFetching } = api.admin.getRecentFeedback.useQuery({ limit }, {
    enabled: adminCheck?.isAdmin === true,
  });

  const authLoading = status === "loading" || adminCheckLoading;
  const isAuthenticated = Boolean(session?.user);
  const isAdmin = adminCheck?.isAdmin === true;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-lg text-gray-300">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    redirect("/login");
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">🙅‍♀️</div>
          <h1 className="mb-2 text-2xl font-bold text-white">Admin access required</h1>
          <p className="text-gray-400">You need admin privileges to view customer feedback.</p>
        </div>
      </div>
    );
  }

  const handleLoadMore = () => {
    setLimit((current) => current + PAGE_SIZE);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text">
            Feedback Inbox
          </h1>
          <p className="text-gray-400">
            Review customer feedback, status, and follow-up priorities in one place.
          </p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-700/60 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Latest submissions</h2>
              <p className="text-sm text-gray-400">
                Showing {feedbackEntries?.length ?? 0} of {limit} requested entries
                {isFetching ? " • refreshing" : ""}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-gray-400">Loading feedback…</div>
          ) : feedbackEntries && feedbackEntries.length > 0 ? (
            <ul className="divide-y divide-gray-800">
              {feedbackEntries.map((entry) => {
                const prioritizedFeatures = entry.prioritizedFeatures ?? [];

                return (
                  <li key={entry.id} className="px-6 py-5 transition-colors hover:bg-gray-800/50">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1 min-w-[240px]">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                          <span className="font-semibold text-white">{entry.name || "Anonymous"}</span>
                          {entry.email && (
                            <span className="text-gray-400">({entry.email})</span>
                          )}
                          {entry.status && (
                            <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">
                              {entry.status}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-gray-300 whitespace-pre-line">
                          {entry.content || "No message provided."}
                        </p>
                        {prioritizedFeatures.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                            {prioritizedFeatures.map((feature) => (
                              <span
                                key={feature}
                                className="rounded-md border border-gray-700/70 bg-gray-800/60 px-2 py-1"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {entry.createdAt
                          ? new Date(entry.createdAt).toLocaleString()
                          : "Unknown date"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-500">
              No feedback entries yet.
            </div>
          )}

          <div className="border-t border-gray-800 px-6 py-4 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isFetching}
            >
              {isFetching ? "Loading…" : "Load more"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
