// src/app/dashboard/page.tsx
"use client";

import { ChatPanelPlaceholder } from "~/components/client/ChatPanelPlaceholder";
import { PlayerShell } from "~/components/client/PlayerShell";

/**
 * Dashboard
 * ┌──────────────┬───────────────────────────────┐
 * │ Chat (33 %)  │ Remotion Player (67 %)        │
 * └──────────────┴───────────────────────────────┘
 * • On small screens it stacks vertically.
 */
export default function Dashboard() {
  return (
    <div className="grid h-screen gap-px bg-border grid-cols-1 md:grid-cols-3">
      {/* Chat panel — 1 / 3 on md+ */}
      <section className="md:col-span-1 h-full overflow-hidden bg-background p-4">
        <ChatPanelPlaceholder />
      </section>

      {/* Preview panel — 2 / 3 on md+ */}
      <section className="md:col-span-2 h-full overflow-hidden bg-muted p-4">
        <PlayerShell />
      </section>
    </div>
  );
}