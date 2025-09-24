export type AttributionTouchPayload = {
  source: string;
  medium?: string | null;
  campaign?: string | null;
  term?: string | null;
  content?: string | null;
  referrer?: string | null;
  landingPath?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  capturedAt: string;
  userAgentHash?: string | null;
};

export type AttributionCookiePayload = {
  version: 1;
  firstTouch: AttributionTouchPayload;
  lastTouch?: AttributionTouchPayload | null;
};

export const ATTRIBUTION_COOKIE_NAME = "bazaar_attribution";
