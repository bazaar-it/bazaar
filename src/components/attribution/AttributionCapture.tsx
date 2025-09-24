"use client";

import { useEffect } from "react";

import { type AttributionTouchPayload } from "~/lib/attribution/types";

const STORAGE_KEY = "bazaar_attribution_fingerprint_v1";

async function hashUserAgent(agent: string): Promise<string | null> {
  if (!agent) return null;
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(agent);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (error) {
    console.error("[Attribution] Failed to hash user agent", error);
    return null;
  }
}

function normalizeHost(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (error) {
    return null;
  }
}

function buildFirstTouch(): AttributionTouchPayload {
  const now = new Date().toISOString();
  const location = window.location;
  const params = new URLSearchParams(location.search);
  const referrer = document.referrer || null;
  const referrerHost = referrer ? normalizeHost(referrer) : null;
  const sameHost = referrerHost ? referrerHost === location.hostname : false;

  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");
  const utmTerm = params.get("utm_term");
  const utmContent = params.get("utm_content");
  const gclid = params.get("gclid");
  const fbclid = params.get("fbclid");

  const source = utmSource || (!sameHost && referrerHost) || "direct";
  const medium = utmMedium || (!sameHost && referrer ? "referral" : null);

  return {
    source,
    medium,
    campaign: utmCampaign,
    term: utmTerm,
    content: utmContent,
    referrer: sameHost ? null : referrer,
    landingPath: `${location.pathname}${location.search}`.slice(0, 512),
    gclid,
    fbclid,
    capturedAt: now,
    userAgentHash: null,
  };
}

function fingerprintTouch(payload: AttributionTouchPayload | null): string | null {
  if (!payload) return null;
  try {
    return JSON.stringify(
      [
        payload.source,
        payload.medium,
        payload.campaign,
        payload.term,
        payload.content,
        payload.referrer,
        payload.landingPath,
        payload.gclid,
        payload.fbclid,
      ],
    );
  } catch (error) {
    console.error("[Attribution] Failed to serialize fingerprint", error);
    return null;
  }
}

function readStoredFingerprint(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredFingerprint(value: string | null) {
  try {
    if (value === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, value);
    }
  } catch (error) {
    console.warn("[Attribution] Unable to persist fingerprint", error);
  }
}

async function captureAttribution() {
  if (typeof window === "undefined") return;

  const firstTouch = buildFirstTouch();
  firstTouch.userAgentHash = await hashUserAgent(window.navigator.userAgent);

  const fingerprint = fingerprintTouch(firstTouch);
  if (!fingerprint) {
    return;
  }

  const previousFingerprint = readStoredFingerprint();
  if (previousFingerprint === fingerprint) {
    return;
  }

  writeStoredFingerprint(fingerprint);

  try {
    const response = await fetch("/api/attribution/capture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ firstTouch }),
      keepalive: true,
      credentials: "include",
    });

    if (!response.ok && response.status !== 204) {
      // Allow future retries if the request fails
      writeStoredFingerprint(null);
      console.warn("[Attribution] Failed to capture attribution", response.status);
    }
  } catch (error) {
    writeStoredFingerprint(null);
    console.error("[Attribution] Error capturing attribution", error);
  }
}

export function AttributionCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    void captureAttribution();
  }, []);

  return null;
}
