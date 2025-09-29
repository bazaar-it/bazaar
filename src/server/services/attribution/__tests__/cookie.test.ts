import { describe, expect, it } from "@jest/globals";

import { type AttributionCookiePayload } from "~/lib/attribution/types";
import { signPayload, verifySignedPayload } from "../cookie";

describe("attribution cookie helpers", () => {
  const secret = "test-secret";

  const payload: AttributionCookiePayload = {
    version: 1,
    firstTouch: {
      source: "producthunt",
      medium: "community",
      campaign: "launch",
      term: null,
      content: null,
      referrer: "https://www.producthunt.com",
      landingPath: "/?utm_source=producthunt",
      gclid: null,
      fbclid: null,
      capturedAt: new Date().toISOString(),
      userAgentHash: "hash",
    },
  };

  it("signs and verifies payloads", () => {
    const value = signPayload(payload, secret);
    const verified = verifySignedPayload(value, secret);
    expect(verified).not.toBeNull();
    expect(verified?.firstTouch.source).toBe("producthunt");
    expect(verified?.lastTouch).toBeUndefined();
  });

  it("returns null for invalid signature", () => {
    const value = signPayload(payload, secret) + "tampered";
    const verified = verifySignedPayload(value, secret);
    expect(verified).toBeNull();
  });
});
