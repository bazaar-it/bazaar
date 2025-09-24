import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import {
  ATTRIBUTION_COOKIE_NAME,
  type AttributionCookiePayload,
  type AttributionTouchPayload,
} from "~/lib/attribution/types";
import {
  signPayload,
  verifySignedPayload,
  validateTouchPayload,
} from "~/server/services/attribution/cookie";

const touchInputSchema = z.object({
  source: z.string().optional().nullable(),
  medium: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  term: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  landingPath: z.string().optional().nullable(),
  gclid: z.string().optional().nullable(),
  fbclid: z.string().optional().nullable(),
  capturedAt: z.string().optional(),
  userAgentHash: z.string().optional().nullable(),
});

const bodySchema = z.object({
  firstTouch: touchInputSchema.optional(),
  lastTouch: touchInputSchema.optional(),
});

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

function normalizeTouch(input: z.infer<typeof touchInputSchema> | undefined | null): AttributionTouchPayload | null {
  if (!input) return null;
  const source = (input.source ?? "").trim();
  const capturedAt = input.capturedAt?.trim() || new Date().toISOString();
  const payload: AttributionTouchPayload = {
    source: source || "unknown",
    medium: input.medium ?? null,
    campaign: input.campaign ?? null,
    term: input.term ?? null,
    content: input.content ?? null,
    referrer: input.referrer ?? null,
    landingPath: input.landingPath ?? null,
    gclid: input.gclid ?? null,
    fbclid: input.fbclid ?? null,
    capturedAt,
    userAgentHash: input.userAgentHash ?? null,
  };
  return validateTouchPayload(payload);
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const firstTouch = normalizeTouch(parsed.firstTouch);
  const lastTouch = normalizeTouch(parsed.lastTouch);

  if (!firstTouch) {
    return NextResponse.json({ error: "Missing attribution payload" }, { status: 400 });
  }

  const secret = getSecret();
  const existingCookie = cookies().get(ATTRIBUTION_COOKIE_NAME)?.value;
  const existingPayload = existingCookie ? verifySignedPayload(existingCookie, secret) : null;

  const payload: AttributionCookiePayload = existingPayload
    ? {
        version: 1,
        firstTouch: existingPayload.firstTouch,
        lastTouch: lastTouch ?? existingPayload.lastTouch ?? existingPayload.firstTouch,
      }
    : {
        version: 1,
        firstTouch,
        lastTouch: lastTouch ?? null,
      };

  const cookieValue = signPayload(payload, secret);
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: ATTRIBUTION_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
