Sprint 120 – Livestream (Manual Toggle Setup)

Overview
- Goal: Show a site‑wide “The boys are live” badge when streaming, with a link to X.
- Current mode: Manual control via admin page and API. Webhook automation planned for later.

User‑Facing Behavior
- Badge appears on:
  - Project header (next to the logo) across the app.
  - Marketing homepage (under hero section).
- Badge text: “The boys are live”.
- Badge links to X: https://x.com/Bazaar___it (configurable).

Admin Controls (Manual)
- Admin page: /admin/live (admins only)
  - Toggle live on/off.
  - Set the live URL (defaults to env fallback if empty).
- API (for scripts):
  - GET /api/live-status → { live: boolean, url?: string, updatedAt: string }
  - POST /api/live-status (secured)
    - Auth: Authorization: Bearer LIVE_STATUS_SECRET (or `?token=<secret>`)
    - Body examples:
      - { "live": true, "url": "https://x.com/Bazaar___it" }
      - { "live": false }

Environment Variables
- LIVE_STATUS_SECRET: Long random token for secure POST.
- LIVE_URL_DEFAULT: Fallback URL for the badge (e.g., https://x.com/Bazaar___it).
- LIVE_FORCE (optional): "true" or "false" to force status (testing/emergency).

How It Works (Manual Mode)
- Admin toggle inserts a row in the existing `metrics` table with name `live_status`.
- The LiveBadge component polls GET /api/live-status every 20–30s and shows/hides accordingly.
- Link target is the last provided URL (or `LIVE_URL_DEFAULT`).

Files
- API: src/app/api/live-status/route.ts (GET/POST; secret‑protected)
- Badge: src/components/marketing/LiveBadge.tsx (reusable client component)
- Homepage: src/app/(marketing)/home/page.tsx (includes badge)
- App header (projects): src/components/AppHeader.tsx (includes badge)
- Admin page: src/app/admin/live/page.tsx (toggle UI)
- Env schema: src/env.js (added LIVE_* vars)
- Example envs: .env.example (documented LIVE_* vars)

Manual Ops – Quick Recipes
- Turn ON (admin UI): Visit /admin/live, check “Live”, set URL, Save.
- Turn OFF (admin UI): Visit /admin/live, uncheck “Live”, Save.
- Turn ON (cURL):
  curl -X POST "https://bazaar.it/api/live-status?token=SECRET" \
       -H "Content-Type: application/json" \
       -d '{"live":true, "url":"https://x.com/Bazaar___it"}'
- Turn OFF (cURL):
  curl -X POST "https://bazaar.it/api/live-status?token=SECRET" \
       -H "Content-Type: application/json" \
       -d '{"live":false}'
- Check state:
  curl "https://bazaar.it/api/live-status"

Future: Webhook Automation (Optional)
- Source: Restream (or Zapier/Make connected to Restream) → POST to /api/live-status on start/stop.
- Accepted payloads:
  - { "type":"stream.started", "url":"https://x.com/Bazaar___it" }
  - { "type":"stream.stopped" }
  - { "status":"live" | "offline" }
- Auth: Use `Authorization: Bearer <LIVE_STATUS_SECRET>` or `?token=<secret>`.
- Switch to auto by configuring Restream; the badge will update automatically.

Notes & Guardrails
- Polling interval: 20s on project header, 30s on homepage (adjustable).
- If DB is unavailable, API falls back to env values.
- LIVE_FORCE overrides everything (use sparingly; unset after testing).

Changelog
- Added live status API and admin page for manual control.
- Wired LiveBadge into homepage and project AppHeader.
- Documented envs and migration‑less storage in `metrics`.

