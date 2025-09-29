"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const BASE_KEY = "bazaar_attribution_ingested_v1";

function getKey(userId: string | undefined | null) {
  return userId ? `${BASE_KEY}_${userId}` : BASE_KEY;
}

function markIngested(key: string) {
  try {
    window.sessionStorage.setItem(key, "true");
  } catch (error) {
    console.warn("[Attribution] Unable to mark ingestion flag", error);
  }
}

function wasIngested(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function AttributionIngestor() {
  const { status, data } = useSession();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status !== "authenticated") return;

    const key = getKey(data?.user?.id);
    if (wasIngested(key)) return;

    const controller = new AbortController();

    const ingest = async () => {
      try {
        const response = await fetch("/api/attribution/ingest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          keepalive: true,
          signal: controller.signal,
        });

        if (response.status === 401) {
          return;
        }

        if (response.ok || response.status === 204) {
          markIngested(key);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[Attribution] Failed to ingest attribution", error);
      }
    };

    void ingest();

    return () => {
      controller.abort();
    };
  }, [status, data?.user?.id]);

  return null;
}
