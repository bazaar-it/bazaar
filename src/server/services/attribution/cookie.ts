import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from "crypto";
import { Buffer } from "buffer";
import { z } from "zod";

import {
  type AttributionCookiePayload,
  type AttributionTouchPayload,
} from "~/lib/attribution/types";

const touchSchema = z.object({
  source: z.string().min(1),
  medium: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  term: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  landingPath: z.string().optional().nullable(),
  gclid: z.string().optional().nullable(),
  fbclid: z.string().optional().nullable(),
  capturedAt: z.string(),
  userAgentHash: z.string().optional().nullable(),
});

const cookiePayloadSchema = z.object({
  version: z.literal(1),
  firstTouch: touchSchema,
  lastTouch: touchSchema.optional().nullable(),
});

type RawCookiePayload = z.infer<typeof cookiePayloadSchema>;

const ENCODING = "base64url";

export function validateTouchPayload(payload: AttributionTouchPayload): AttributionTouchPayload {
  const parsed = touchSchema.parse(payload);
  return parsed;
}

export function validateCookiePayload(payload: AttributionCookiePayload): AttributionCookiePayload {
  const parsed = cookiePayloadSchema.parse(payload);
  return parsed;
}

export function serializeCookiePayload(payload: AttributionCookiePayload): string {
  const canonical: RawCookiePayload = {
    version: 1,
    firstTouch: sanitizeTouch(payload.firstTouch),
    lastTouch: payload.lastTouch ? sanitizeTouch(payload.lastTouch) : undefined,
  };
  return JSON.stringify(canonical);
}

export function deserializeCookiePayload(raw: string): AttributionCookiePayload {
  const parsed = cookiePayloadSchema.parse(JSON.parse(raw));
  return parsed;
}

export function signPayload(payload: AttributionCookiePayload, secret: string): string {
  const serialized = serializeCookiePayload(payload);
  const hmac = createHmac("sha256", secret);
  hmac.update(serialized);
  const signature = hmac.digest(ENCODING);
  const encodedPayload = Buffer.from(serialized).toString(ENCODING);
  return `${encodedPayload}.${signature}`;
}

export function verifySignedPayload(value: string, secret: string): AttributionCookiePayload | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  try {
    const raw = Buffer.from(encodedPayload, ENCODING).toString();
    const expectedSignature = createHmac("sha256", secret).update(raw).digest(ENCODING);
    if (!timingSafeEqual(signature, expectedSignature)) {
      return null;
    }
    return deserializeCookiePayload(raw);
  } catch (error) {
    console.error("[Attribution] Failed to verify cookie payload:", error);
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return nodeTimingSafeEqual(bufferA, bufferB);
}

function sanitizeTouch(payload: AttributionTouchPayload): AttributionTouchPayload {
  const sanitize = (value: string | null | undefined, max = 512) => {
    if (value == null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, max);
  };

  return {
    source: sanitize(payload.source, 128) ?? "unknown",
    medium: sanitize(payload.medium, 128),
    campaign: sanitize(payload.campaign, 256),
    term: sanitize(payload.term, 256),
    content: sanitize(payload.content, 256),
    referrer: sanitize(payload.referrer, 512),
    landingPath: sanitize(payload.landingPath, 512),
    gclid: sanitize(payload.gclid, 256),
    fbclid: sanitize(payload.fbclid, 256),
    capturedAt: payload.capturedAt,
    userAgentHash: sanitize(payload.userAgentHash, 128),
  };
}
