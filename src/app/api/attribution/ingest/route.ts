import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, type InferInsertModel } from "drizzle-orm";

import {
  ATTRIBUTION_COOKIE_NAME,
  type AttributionCookiePayload,
} from "~/lib/attribution/types";
import { verifySignedPayload } from "~/server/services/attribution/cookie";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { userAttribution } from "~/server/db/schema";

type UserAttributionInsert = InferInsertModel<typeof userAttribution>;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildInsertPayload(userId: string, payload: AttributionCookiePayload) {
  const first = payload.firstTouch;
  const last = payload.lastTouch ?? null;

  return {
    userId,
    firstTouchSource: first.source,
    firstTouchMedium: first.medium,
    firstTouchCampaign: first.campaign,
    firstTouchTerm: first.term,
    firstTouchContent: first.content,
    firstTouchReferrer: first.referrer,
    firstTouchLandingPath: first.landingPath,
    firstTouchGclid: first.gclid,
    firstTouchFbclid: first.fbclid,
    firstTouchUserAgentHash: first.userAgentHash,
    firstTouchAt: parseTimestamp(first.capturedAt) ?? new Date(),
    lastTouchSource: last?.source ?? null,
    lastTouchMedium: last?.medium ?? null,
    lastTouchCampaign: last?.campaign ?? null,
    lastTouchTerm: last?.term ?? null,
    lastTouchContent: last?.content ?? null,
    lastTouchReferrer: last?.referrer ?? null,
    lastTouchLandingPath: last?.landingPath ?? null,
    lastTouchGclid: last?.gclid ?? null,
    lastTouchFbclid: last?.fbclid ?? null,
    lastTouchUserAgentHash: last?.userAgentHash ?? null,
    lastTouchAt: last ? parseTimestamp(last.capturedAt) : null,
    updatedAt: new Date(),
  } satisfies Partial<UserAttributionInsert>;
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = new NextResponse(null, { status: 204 });
  const secret = getSecret();
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return response;
  }

  const payload = verifySignedPayload(cookieValue, secret);

  cookieStore.delete({ name: ATTRIBUTION_COOKIE_NAME, path: "/" });
  response.cookies.set({
    name: ATTRIBUTION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge: 0,
  });

  if (!payload) {
    return response;
  }

  const userId = session.user.id;
  try {
    const [existing] = await db
      .select()
      .from(userAttribution)
      .where(eq(userAttribution.userId, userId))
      .limit(1);

    const upsertPayload = buildInsertPayload(userId, payload);

    if (!existing) {
      await db.insert(userAttribution).values(upsertPayload).onConflictDoNothing();
      return response;
    }

    const shouldUpdateFirstTouch = existing.firstTouchSource === "unknown";

    const updatePayload: Partial<UserAttributionInsert> = {
      updatedAt: new Date(),
    };

    if (shouldUpdateFirstTouch) {
      Object.assign(updatePayload, {
        firstTouchSource: upsertPayload.firstTouchSource,
        firstTouchMedium: upsertPayload.firstTouchMedium,
        firstTouchCampaign: upsertPayload.firstTouchCampaign,
        firstTouchTerm: upsertPayload.firstTouchTerm,
        firstTouchContent: upsertPayload.firstTouchContent,
        firstTouchReferrer: upsertPayload.firstTouchReferrer,
        firstTouchLandingPath: upsertPayload.firstTouchLandingPath,
        firstTouchGclid: upsertPayload.firstTouchGclid,
        firstTouchFbclid: upsertPayload.firstTouchFbclid,
        firstTouchUserAgentHash: upsertPayload.firstTouchUserAgentHash,
        firstTouchAt: upsertPayload.firstTouchAt,
      });
    }

    if (upsertPayload.lastTouchSource) {
      Object.assign(updatePayload, {
        lastTouchSource: upsertPayload.lastTouchSource,
        lastTouchMedium: upsertPayload.lastTouchMedium,
        lastTouchCampaign: upsertPayload.lastTouchCampaign,
        lastTouchTerm: upsertPayload.lastTouchTerm,
        lastTouchContent: upsertPayload.lastTouchContent,
        lastTouchReferrer: upsertPayload.lastTouchReferrer,
        lastTouchLandingPath: upsertPayload.lastTouchLandingPath,
        lastTouchGclid: upsertPayload.lastTouchGclid,
        lastTouchFbclid: upsertPayload.lastTouchFbclid,
        lastTouchUserAgentHash: upsertPayload.lastTouchUserAgentHash,
        lastTouchAt: upsertPayload.lastTouchAt,
      });
    }

    if (Object.keys(updatePayload).length > 1) {
      await db
        .update(userAttribution)
        .set(updatePayload)
        .where(eq(userAttribution.userId, userId));
    }
  } catch (error) {
    console.error(`[Attribution] Failed to persist attribution for user ${session.user.id}`, error);
  }

  return response;
}
